import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BudgetLedger } from '../src/budget.js';
import { EventStream } from '../src/events.js';
import { redact, redactString } from '../src/redact.js';
import { StructuredLogger } from '../src/logging.js';

function fixedClock(startMs = 0) {
  let now = startMs;
  return { clock: () => now, advance: (ms) => (now += ms) };
}

describe('BudgetLedger', () => {
  const budget = {
    cost_usd: 10,
    wall_clock_seconds: 100,
    tokens: null,
    max_iterations: 4,
  };

  it('reports ok below the warning threshold', () => {
    const { clock } = fixedClock();
    const ledger = new BudgetLedger(budget, { clock });
    ledger.record({ cost_usd: 1 });
    assert.equal(ledger.check().state, 'ok');
  });

  it('warns at 75% and escalates at 90% of a dimension', () => {
    const { clock } = fixedClock();
    const ledger = new BudgetLedger(budget, { clock });
    ledger.record({ cost_usd: 7.5 });
    assert.equal(ledger.check().state, 'warn');
    ledger.record({ cost_usd: 1.6 });
    assert.equal(ledger.check().state, 'escalate');
  });

  it('marks the run exceeded once a limit is reached', () => {
    const { clock } = fixedClock();
    const ledger = new BudgetLedger(budget, { clock });
    ledger.record({ cost_usd: 10 });
    const status = ledger.check();
    assert.equal(status.state, 'exceeded');
    assert.deepEqual(status.breaches, ['cost_usd']);
  });

  it('counts wall-clock against the limit without any adapter cooperation', () => {
    const { clock, advance } = fixedClock();
    const ledger = new BudgetLedger(budget, { clock });
    advance(101_000);
    assert.equal(ledger.check().state, 'exceeded');
  });

  it('treats a zero limit as "not permitted at all"', () => {
    const { clock } = fixedClock();
    const ledger = new BudgetLedger(
      { cost_usd: 0, wall_clock_seconds: 0, tokens: null, max_iterations: 0 },
      { clock },
    );
    assert.equal(ledger.check().state, 'ok'); // nothing consumed yet
    ledger.record({ cost_usd: 0.01 });
    assert.equal(ledger.check().state, 'exceeded');
  });

  it('warns once per dimension, not once per check', () => {
    const { clock } = fixedClock();
    const ledger = new BudgetLedger(budget, { clock });
    ledger.record({ cost_usd: 8 });
    assert.deepEqual(ledger.check().newWarnings, ['cost_usd']);
    assert.deepEqual(ledger.check().newWarnings, []);
  });

  it('restores spend across a resume so a resumed run does not get a fresh budget', () => {
    const { clock } = fixedClock();
    const first = new BudgetLedger(budget, { clock });
    first.record({ cost_usd: 9 });
    const resumed = BudgetLedger.restore(budget, first.snapshot(), { clock });
    resumed.record({ cost_usd: 1 });
    assert.equal(resumed.check().state, 'exceeded');
  });

  it('rejects negative deltas', () => {
    const ledger = new BudgetLedger(budget, { clock: () => 0 });
    assert.throws(() => ledger.record({ cost_usd: -5 }), /non-negative/);
  });
});

describe('EventStream', () => {
  it('numbers events monotonically', () => {
    const stream = new EventStream({ clock: () => '2026-08-09T00:00:00Z' });
    stream.emit('accepted');
    stream.emit('planning');
    assert.deepEqual(
      stream.events.map((e) => e.seq),
      [0, 1],
    );
  });

  it('refuses emission after a terminal event', () => {
    const stream = new EventStream({ clock: () => 'now' });
    stream.emit('completed');
    assert.throws(() => stream.emit('progressing'), /after terminal event/);
  });

  it('rejects unknown event types', () => {
    const stream = new EventStream({ clock: () => 'now' });
    assert.throws(() => stream.emit('looks-fine'), /Unknown event type/);
  });

  it('restores sequence and terminal state', () => {
    const stream = new EventStream({ clock: () => 'now' });
    stream.emit('accepted');
    stream.emit('progressing');
    const restored = EventStream.restore(stream.events, { clock: () => 'now' });
    assert.equal(restored.emit('completed').seq, 2);
    assert.equal(restored.terminated, 'completed');
  });
});

describe('redaction', () => {
  it('redacts provider keys and JWTs', () => {
    assert.match(
      redactString('key sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAA end'),
      /sk-ant-\*\*\*REDACTED\*\*\*/,
    );
    assert.match(redactString('AKIAIOSFODNN7EXAMPLE'), /AKIA\*\*\*REDACTED\*\*\*/);
    assert.match(
      redactString('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVP'),
      /REDACTED-JWT/,
    );
  });

  it('redacts by key name even when the value looks innocuous', () => {
    const out = redact({ password: 'hunter2', nested: { api_key: 'abc' } });
    assert.equal(out.password, '***REDACTED***');
    assert.equal(out.nested.api_key, '***REDACTED***');
  });

  it('survives cyclic structures', () => {
    const cyclic = { name: 'run' };
    cyclic.self = cyclic;
    assert.doesNotThrow(() => redact(cyclic));
  });
});

describe('StructuredLogger', () => {
  it('emits one redacted JSON line per record', () => {
    const lines = [];
    const logger = new StructuredLogger({
      sink: (line) => lines.push(line),
      clock: () => '2026-08-09T00:00:00Z',
      base: { run: 'r1' },
    });
    logger.info('started', { token: 'sk-ant-api03-SHOULDNOTAPPEARHERE00000' });
    assert.equal(lines.length, 1);
    const record = JSON.parse(lines[0]);
    assert.equal(record.run, 'r1');
    assert.equal(record.token, '***REDACTED***');
    assert.ok(!lines[0].includes('SHOULDNOTAPPEARHERE'));
  });

  it('honours the minimum level', () => {
    const lines = [];
    const logger = new StructuredLogger({
      sink: (line) => lines.push(line),
      minLevel: 'warn',
    });
    logger.info('quiet');
    logger.error('loud');
    assert.equal(lines.length, 1);
  });
});
