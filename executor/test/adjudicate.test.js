import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { adjudicate } from '../src/adjudicate.js';
import { EvidenceManifest } from '../src/evidence.js';
import { createWorkOrder } from '../src/work-order.js';

function order(overrides = {}) {
  const result = createWorkOrder({
    work_order_id: 'WO-ADJ',
    initiative: 'pilot',
    repository: 'orryx-delivery-dashboard',
    objective: 'x',
    acceptance_criteria: ['x'],
    risk_tier: 'R1',
    required_evidence: { tests: ['npm-test'] },
    ...overrides,
  });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  return result.workOrder;
}

function manifestWith(workOrder, entries) {
  const manifest = new EvidenceManifest(workOrder, { clock: () => 'now' });
  for (const entry of entries) manifest.add(entry);
  return manifest.build();
}

describe('adjudicate', () => {
  it('passes when required evidence is present and green', () => {
    const wo = order();
    const manifest = manifestWith(wo, [
      { kind: 'test', name: 'npm-test', outcome: 'pass', produced_by: 'fake' },
    ]);
    const verdict = adjudicate(wo, manifest, {
      events: [{ type: 'completed' }],
    });
    assert.equal(verdict.verdict, 'pass');
    assert.equal(verdict.merge_path, 'pr_ready');
  });

  it('IGNORES a completion claim that has no evidence behind it', () => {
    const wo = order();
    const manifest = manifestWith(wo, []);
    const verdict = adjudicate(wo, manifest, { events: [{ type: 'completed' }] });
    assert.notEqual(verdict.verdict, 'pass');
    assert.ok(verdict.reasons.some((r) => r.includes('self-certification')));
    assert.ok(verdict.missing.includes('npm-test'));
  });

  it('fails closed when a required gate was simply never run', () => {
    const wo = order({ required_evidence: { tests: ['npm-test', 'lint'] } });
    const manifest = manifestWith(wo, [
      { kind: 'test', name: 'npm-test', outcome: 'pass', produced_by: 'fake' },
    ]);
    const verdict = adjudicate(wo, manifest, { events: [{ type: 'completed' }] });
    assert.notEqual(verdict.verdict, 'pass');
    assert.deepEqual(verdict.missing, ['lint']);
  });

  it('escalates on a failing gate', () => {
    const wo = order();
    const manifest = manifestWith(wo, [
      { kind: 'test', name: 'npm-test', outcome: 'fail', produced_by: 'fake' },
    ]);
    const verdict = adjudicate(wo, manifest, { events: [{ type: 'completed' }] });
    assert.equal(verdict.verdict, 'escalate');
    assert.equal(verdict.merge_path, 'escalate');
  });

  it('lets a re-run of a gate supersede its earlier failure', () => {
    const wo = order();
    const manifest = manifestWith(wo, [
      { kind: 'test', name: 'npm-test', outcome: 'fail', produced_by: 'fake' },
      { kind: 'test', name: 'npm-test', outcome: 'pass', produced_by: 'fake' },
    ]);
    const verdict = adjudicate(wo, manifest, { events: [{ type: 'completed' }] });
    assert.equal(verdict.verdict, 'pass');
  });

  it('escalates a crash regardless of evidence', () => {
    const wo = order();
    const manifest = manifestWith(wo, [
      { kind: 'test', name: 'npm-test', outcome: 'pass', produced_by: 'fake' },
    ]);
    const verdict = adjudicate(wo, manifest, {
      events: [{ type: 'crashed' }],
    });
    assert.equal(verdict.verdict, 'escalate');
  });

  it('escalates budget exhaustion', () => {
    const wo = order();
    const manifest = manifestWith(wo, [
      { kind: 'test', name: 'npm-test', outcome: 'pass', produced_by: 'fake' },
    ]);
    const verdict = adjudicate(wo, manifest, {
      events: [{ type: 'stopped', reason: 'budget_exceeded' }],
    });
    assert.equal(verdict.verdict, 'escalate');
    assert.ok(verdict.reasons.some((r) => r.includes('budget')));
  });

  it('never reaches pr_ready at R2 without a recorded human approval', () => {
    // R2 needs an `evaluated`-or-better executor; build it that way.
    const built = createWorkOrder(
      {
        work_order_id: 'WO-R2',
        initiative: 'pilot',
        repository: 'orryx-delivery-dashboard',
        objective: 'x',
        acceptance_criteria: ['x'],
        risk_tier: 'R2',
        required_evidence: { tests: ['npm-test'] },
      },
      { executorTrustLevel: 'evaluated' },
    );
    assert.equal(built.ok, true);
    const manifest = manifestWith(built.workOrder, [
      { kind: 'test', name: 'npm-test', outcome: 'pass', produced_by: 'fake' },
    ]);
    const withoutApproval = adjudicate(built.workOrder, manifest, {
      events: [{ type: 'completed' }],
    });
    assert.equal(withoutApproval.merge_path, 'awaiting_human_approval');

    const withApproval = adjudicate(built.workOrder, manifest, {
      events: [{ type: 'completed' }],
      humanApprovalRecorded: true,
    });
    assert.equal(withApproval.merge_path, 'pr_ready');
  });

  it('escalates when the executor never reported completion', () => {
    const wo = order();
    const manifest = manifestWith(wo, [
      { kind: 'test', name: 'npm-test', outcome: 'pass', produced_by: 'fake' },
    ]);
    const verdict = adjudicate(wo, manifest, { events: [{ type: 'progressing' }] });
    assert.equal(verdict.verdict, 'escalate');
  });

  it('binds the verdict to the exact evidence hash it judged', () => {
    const wo = order();
    const manifest = manifestWith(wo, [
      { kind: 'test', name: 'npm-test', outcome: 'pass', produced_by: 'fake' },
    ]);
    const verdict = adjudicate(wo, manifest, { events: [{ type: 'completed' }] });
    assert.equal(verdict.adjudicated_against, manifest.entries_sha256);
    assert.match(verdict.adjudicated_against, /^[a-f0-9]{64}$/);
  });
});
