// Deterministic fake executor.
//
// Exists so the control plane's governance can be tested end-to-end without a
// model, a network, or a subscription. It is scripted: the caller supplies the
// exact sequence of steps, including the misbehaviour to simulate (claiming
// completion with no evidence, crashing mid-run, burning budget).
//
// This is the reference implementation of the contract. If a step is possible
// here and impossible in a real adapter, the contract is wrong, not the adapter.

import { Executor } from '../executor.js';

export class FakeExecutor extends Executor {
  static id = 'fake';
  static trustLevel = 'experimental';
  static available = true;
  static capabilities = Object.freeze({
    resumable: true,
    heartbeat: true,
    subagents: false,
    reports_tokens: true,
    reports_cost: true,
    isolated_runtime: false,
    structured_events: true,
  });

  #script;

  /**
   * @param {object[]} script  steps, each one of:
   *   {emit: 'progressing', payload?: {}}
   *   {evidence: {kind, name, outcome, content?}}
   *   {spend: {cost_usd?, tokens?, iterations?}}
   *   {crash: 'message'}
   *   {checkpoint: {...}}   marks resumable state; a later resume starts after it
   */
  constructor(script = []) {
    super();
    this.#script = script;
  }

  async run({ workOrder, emit, evidence, signal, resumeFrom, recordSpend }) {
    emit('accepted', { executor: FakeExecutor.id, work_order_id: workOrder.work_order_id });

    const startIndex = resumeFrom?.next_step ?? 0;
    if (startIndex > 0) {
      emit('progressing', { note: `resumed at step ${startIndex}` });
    } else {
      emit('planning', { acceptance_criteria: workOrder.acceptance_criteria.length });
    }

    let checkpoint = resumeFrom ?? null;

    for (let i = startIndex; i < this.#script.length; i++) {
      if (signal.aborted) {
        emit('stopped', { reason: signal.reason ?? 'aborted' });
        return { status: 'stopped', resumeState: checkpoint };
      }

      const step = this.#script[i];

      if (step.spend) recordSpend(step.spend);

      if (step.emit) emit(step.emit, step.payload ?? {});

      if (step.evidence) {
        const record = evidence.add({ ...step.evidence, produced_by: FakeExecutor.id });
        emit('evidence_produced', { name: record.name, outcome: record.outcome });
        if (record.outcome !== 'pass') {
          emit('gate_failed', { name: record.name, outcome: record.outcome });
        }
      }

      if (step.checkpoint) {
        checkpoint = { ...step.checkpoint, next_step: i + 1 };
        emit('resumable', { checkpoint: step.checkpoint });
      }

      if (step.crash) {
        emit('crashed', { error: step.crash });
        return { status: 'crashed', resumeState: checkpoint };
      }
    }

    emit('completed', { executor: FakeExecutor.id });
    return { status: 'completed', resumeState: null };
  }
}
