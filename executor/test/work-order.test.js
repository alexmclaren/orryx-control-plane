import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createWorkOrder, DEFAULT_PERMISSIONS } from '../src/work-order.js';

const base = {
  work_order_id: 'WO-2026-001',
  initiative: 'prime-agent-pilot',
  repository: 'orryx-delivery-dashboard',
  objective: 'Add a unit test for the gates collector',
  acceptance_criteria: ['test/gates.test.js gains a passing case'],
  risk_tier: 'R1',
  required_evidence: { tests: ['npm-test'] },
};

describe('createWorkOrder', () => {
  it('accepts a minimal valid order and applies deny-all defaults', () => {
    const result = createWorkOrder(base);
    assert.equal(result.ok, true);
    const wo = result.workOrder;
    assert.equal(wo.permissions.network, 'none');
    assert.equal(wo.permissions.secrets_policy, 'none');
    assert.equal(wo.permissions.git.may_push, false);
    assert.equal(wo.permissions.git.may_commit, false);
    assert.equal(wo.permissions.git.may_push_protected, false);
    assert.deepEqual(wo.permissions.filesystem.write, []);
  });

  it('always includes the governance deny globs, even if the caller adds their own', () => {
    const result = createWorkOrder({
      ...base,
      permissions: { filesystem: { deny: ['custom/**'] } },
    });
    assert.equal(result.ok, true);
    for (const glob of DEFAULT_PERMISSIONS.filesystem.deny) {
      assert.ok(
        result.workOrder.permissions.filesystem.deny.includes(glob),
        `expected deny list to retain ${glob}`,
      );
    }
    assert.ok(result.workOrder.permissions.filesystem.deny.includes('custom/**'));
  });

  it('rejects a request to push to protected branches', () => {
    const result = createWorkOrder({
      ...base,
      permissions: { git: { may_push_protected: true } },
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('never grantable')));
  });

  it('rejects a budget above the tier ceiling rather than silently clamping it', () => {
    const result = createWorkOrder({ ...base, budget: { cost_usd: 10_000 } });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('exceeds R1 ceiling')));
  });

  it('rejects a merge policy more permissive than the tier allows', () => {
    const result = createWorkOrder({
      ...base,
      risk_tier: 'R2',
      merge_policy: 'pr_required',
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('more permissive')));
  });

  it('re-classifies upward when declared domains imply a critical domain', () => {
    const result = createWorkOrder({ ...base, domains: ['patient-data'] });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('below the minimum R3')));
  });

  it('refuses to hand R2+ work to an experimental executor', () => {
    const result = createWorkOrder(
      { ...base, risk_tier: 'R2', required_evidence: { tests: ['npm-test'] } },
      { executorTrustLevel: 'experimental' },
    );
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("trust level 'experimental'")));
  });

  it('requires test evidence above R0', () => {
    const { required_evidence, ...withoutEvidence } = base;
    void required_evidence;
    const result = createWorkOrder(withoutEvidence);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('required_evidence.tests')));
  });

  it('permits R0 documentation work with no test evidence', () => {
    const { required_evidence, ...rest } = base;
    void required_evidence;
    const result = createWorkOrder({ ...rest, risk_tier: 'R0' });
    assert.equal(result.ok, true);
    assert.equal(result.workOrder.merge_policy, 'pr_required');
  });

  it('rejects allowlisted networking with an empty allowlist', () => {
    const result = createWorkOrder({
      ...base,
      permissions: { network: 'allowlist', network_allowlist: [] },
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('non-empty network_allowlist')));
  });

  it('freezes the resulting work order so an adapter cannot mutate its own limits', () => {
    const { workOrder } = createWorkOrder(base);
    assert.throws(() => {
      'use strict';
      workOrder.budget.cost_usd = 999;
    });
    assert.throws(() => {
      'use strict';
      workOrder.permissions.git.may_push_protected = true;
    });
  });
});
