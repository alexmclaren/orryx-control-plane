// Integration tests: the whole runner path, driven by the scripted FakeExecutor.
// No network, no model, no credentials. Every governance guarantee that the
// design claims is asserted here against a harness that actively misbehaves.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FakeExecutor } from '../src/adapters/fake-executor.js';
import { PrimeAgentExecutor } from '../src/adapters/prime-agent-executor.js';
import { createWorkOrder } from '../src/work-order.js';
import { runWorkOrder } from '../src/run.js';
import { validateConfig } from '../src/config.js';

function clocks(startMs = 0) {
  let now = startMs;
  return {
    wall: () => now,
    iso: () => new Date(now).toISOString(),
    advance: (ms) => (now += ms),
  };
}

function order(overrides = {}) {
  const result = createWorkOrder({
    work_order_id: 'WO-RUN-1',
    initiative: 'prime-agent-pilot',
    repository: 'orryx-delivery-dashboard',
    objective: 'Add a regression test',
    acceptance_criteria: ['a new test passes'],
    risk_tier: 'R1',
    required_evidence: { tests: ['npm-test'] },
    ...overrides,
  });
  assert.equal(result.ok, true, JSON.stringify(result.errors ?? []));
  return result.workOrder;
}

const enabledConfig = (() => {
  const result = validateConfig();
  assert.equal(result.ok, true);
  return result.config;
})();

const silentSink = () => {};

describe('runWorkOrder — happy path', () => {
  it('passes and reaches pr_ready when the harness produces real evidence', async () => {
    const c = clocks();
    const executor = new FakeExecutor([
      { spend: { cost_usd: 0.4, iterations: 1 } },
      {
        evidence: {
          kind: 'test',
          name: 'npm-test',
          outcome: 'pass',
          content: '12 passing',
        },
      },
    ]);

    const result = await runWorkOrder({
      workOrder: order(),
      executor,
      config: enabledConfig,
      clocks: c,
      logSink: silentSink,
    });

    assert.equal(result.ok, true);
    assert.equal(result.verdict, 'pass');
    assert.equal(result.merge_path, 'pr_ready');
    assert.equal(result.executor_status, 'completed');
    assert.equal(result.manifest.entries.length, 1);
    assert.match(result.manifest.entries[0].content_sha256, /^[a-f0-9]{64}$/);
  });
});

describe('runWorkOrder — the harness cannot self-certify', () => {
  it('refuses to pass a run that claims completion with no evidence', async () => {
    const executor = new FakeExecutor([]); // emits accepted/planning/completed only
    const result = await runWorkOrder({
      workOrder: order(),
      executor,
      config: enabledConfig,
      clocks: clocks(),
      logSink: silentSink,
    });

    assert.equal(result.executor_status, 'completed'); // the harness says done
    assert.notEqual(result.verdict, 'pass'); // the control plane disagrees
    assert.ok(result.missing_evidence.includes('npm-test'));
  });

  it('refuses to pass when the harness reports a green gate it did not run', async () => {
    // The adapter emits `evidence_produced` as a bare event with no manifest
    // entry behind it. Adjudication reads the manifest, not the event stream.
    const executor = new FakeExecutor([
      { emit: 'evidence_produced', payload: { name: 'npm-test', outcome: 'pass' } },
    ]);
    const result = await runWorkOrder({
      workOrder: order(),
      executor,
      config: enabledConfig,
      clocks: clocks(),
      logSink: silentSink,
    });
    assert.notEqual(result.verdict, 'pass');
    assert.ok(result.missing_evidence.includes('npm-test'));
  });
});

describe('runWorkOrder — budget enforcement', () => {
  it('aborts and escalates when cost exceeds the budget mid-run', async () => {
    const executor = new FakeExecutor([
      { spend: { cost_usd: 14 } },
      { emit: 'progressing' },
      // Would have produced evidence, but must never get here.
      { evidence: { kind: 'test', name: 'npm-test', outcome: 'pass' } },
    ]);

    const result = await runWorkOrder({
      workOrder: order({ budget: { cost_usd: 15 } }),
      executor,
      config: enabledConfig,
      clocks: clocks(),
      logSink: silentSink,
    });

    assert.equal(result.executor_status, 'stopped');
    assert.equal(result.verdict, 'escalate');
    assert.equal(result.manifest.entries.length, 0);
    assert.ok(result.events.some((e) => e.type === 'budget_warning'));
  });

  it('stops a run that blows the wall-clock budget without adapter cooperation', async () => {
    const c = clocks();
    const executor = new FakeExecutor([
      { emit: 'progressing' },
      { emit: 'progressing' },
      { evidence: { kind: 'test', name: 'npm-test', outcome: 'pass' } },
    ]);

    // Jump the clock past the budget before the adapter's second step.
    const originalWall = c.wall;
    let calls = 0;
    c.wall = () => {
      calls += 1;
      return calls > 6 ? originalWall() + 4_000_000 : originalWall();
    };

    const result = await runWorkOrder({
      workOrder: order({ budget: { wall_clock_seconds: 3600 } }),
      executor,
      config: enabledConfig,
      clocks: c,
      logSink: silentSink,
    });

    assert.equal(result.verdict, 'escalate');
    assert.notEqual(result.executor_status, 'completed');
  });
});

describe('runWorkOrder — failure, crash and resume', () => {
  it('escalates a failing gate rather than reporting success', async () => {
    const executor = new FakeExecutor([
      {
        evidence: {
          kind: 'test',
          name: 'npm-test',
          outcome: 'fail',
          content: '1 failing',
        },
      },
    ]);
    const result = await runWorkOrder({
      workOrder: order(),
      executor,
      config: enabledConfig,
      clocks: clocks(),
      logSink: silentSink,
    });
    assert.equal(result.verdict, 'escalate');
    assert.ok(result.events.some((e) => e.type === 'gate_failed'));
  });

  it('survives an adapter that throws, and still adjudicates', async () => {
    class ThrowingExecutor extends FakeExecutor {
      static id = 'fake';
      async run({ emit }) {
        emit('accepted');
        throw new Error('kernel died');
      }
    }
    const result = await runWorkOrder({
      workOrder: order(),
      executor: new ThrowingExecutor(),
      config: enabledConfig,
      clocks: clocks(),
      logSink: silentSink,
    });
    assert.equal(result.executor_status, 'crashed');
    assert.equal(result.verdict, 'escalate');
    assert.ok(result.events.some((e) => e.type === 'crashed'));
  });

  it('resumes an interrupted run without resetting the budget', async () => {
    const c = clocks();
    const script = [
      { spend: { cost_usd: 5 } },
      { checkpoint: { stage: 'tests-written' } },
      { crash: 'process killed' },
    ];
    const first = await runWorkOrder({
      workOrder: order(),
      executor: new FakeExecutor(script),
      config: enabledConfig,
      clocks: c,
      logSink: silentSink,
    });

    assert.equal(first.executor_status, 'crashed');
    assert.equal(first.resumable, true);
    assert.equal(first.resume_state.executor.next_step, 2);
    assert.equal(first.budget_spent.cost_usd, 5);

    // Same work order, continued: the remaining script produces the evidence.
    const continued = [
      ...script.slice(0, 2),
      { spend: { cost_usd: 1 } },
      { evidence: { kind: 'test', name: 'npm-test', outcome: 'pass', content: 'ok' } },
    ];
    const second = await runWorkOrder({
      workOrder: order(),
      executor: new FakeExecutor(continued),
      config: enabledConfig,
      resumeFrom: first.resume_state,
      clocks: c,
      logSink: silentSink,
    });

    assert.equal(second.verdict, 'pass');
    // Spend carried across the resume: 5 from run one plus 1 from run two.
    assert.equal(second.budget_spent.cost_usd, 6);
    // The resumed stream carries run one's history as a prefix and numbers the
    // new events after it, rather than restarting at zero and losing the trail.
    assert.deepEqual(
      second.events.slice(0, first.events.length).map((e) => e.seq),
      first.events.map((e) => e.seq),
    );
    assert.ok(second.events.at(-1).seq > first.events.at(-1).seq);
    assert.ok(second.events.some((e) => e.type === 'crashed'));
    assert.equal(second.events.at(-1).type, 'completed');
  });
});

describe('runWorkOrder — refusals before any adapter code runs', () => {
  it('refuses a PHI repository outright', async () => {
    // The work order itself is legal; the repository is not delegable.
    const result = await runWorkOrder({
      workOrder: order({ repository: 'orryx-flow' }),
      executor: new FakeExecutor([
        { evidence: { kind: 'test', name: 'npm-test', outcome: 'pass' } },
      ]),
      config: enabledConfig,
      clocks: clocks(),
      logSink: silentSink,
    });

    assert.equal(result.refused, true);
    assert.equal(result.reason, 'repository_not_delegable');
    assert.equal(result.merge_path, 'blocked');
  });

  it('refuses an unclassified repository', async () => {
    const result = await runWorkOrder({
      workOrder: order({ repository: 'brand-new-repo' }),
      executor: new FakeExecutor([]),
      config: enabledConfig,
      clocks: clocks(),
      logSink: silentSink,
    });
    assert.equal(result.refused, true);
    assert.equal(result.reason, 'repository_not_delegable');
  });

  it('refuses a disabled executor', async () => {
    const result = await runWorkOrder({
      workOrder: order(),
      executor: new PrimeAgentExecutor(enabledConfig.executors['prime-agent']),
      config: enabledConfig,
      clocks: clocks(),
      logSink: silentSink,
    });
    assert.equal(result.refused, true);
    assert.equal(result.reason, 'executor_disabled');
  });

  it('refuses a token budget an executor cannot report against', async () => {
    class NoTokenExecutor extends FakeExecutor {
      static id = 'fake';
      static capabilities = Object.freeze({
        ...FakeExecutor.capabilities,
        reports_tokens: false,
      });
    }
    const result = await runWorkOrder({
      workOrder: order({ budget: { tokens: 100_000 } }),
      executor: new NoTokenExecutor([]),
      config: enabledConfig,
      clocks: clocks(),
      logSink: silentSink,
    });
    assert.equal(result.refused, true);
    assert.equal(result.reason, 'incompatible_executor');
  });
});

describe('PrimeAgentExecutor stub', () => {
  it('is unavailable and never claims completion', async () => {
    assert.equal(PrimeAgentExecutor.available, false);
    assert.equal(PrimeAgentExecutor.trustLevel, 'experimental');
    // Declared honestly: upstream states it is not a security sandbox.
    assert.equal(PrimeAgentExecutor.capabilities.isolated_runtime, false);
    assert.equal(PrimeAgentExecutor.capabilities.reports_tokens, false);

    const config = validateConfig({
      executors: {
        'prime-agent': {
          enabled: true,
          isolation: 'container',
          credential_source: 'api_key',
        },
      },
    });
    assert.equal(config.ok, true);

    const result = await runWorkOrder({
      workOrder: order(),
      executor: new PrimeAgentExecutor(config.config.executors['prime-agent']),
      config: config.config,
      clocks: clocks(),
      logSink: silentSink,
    });

    // Enabled in config, but `available` is still false: the stub cannot run.
    assert.equal(result.refused, true);
    assert.equal(result.reason, 'incompatible_executor');
  });
});
