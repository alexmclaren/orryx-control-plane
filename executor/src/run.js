// The runner: the only place an adapter is ever invoked.
//
// Order matters, and every step before `adapter.run()` is a refusal opportunity.
// By the time harness code executes, the repository has been cleared, the tier
// ceiling applied, the budget armed and the watchdog started. By the time a
// verdict exists, the harness has had no say in it.
//
//   1. config validation        -> refuse on invalid/unsafe config
//   2. repository eligibility   -> refuse PHI / unclassified repos
//   3. executor contract        -> refuse malformed adapters
//   4. compatibility            -> refuse capability mismatches
//   5. budget + watchdog armed
//   6. adapter.run()            <- the only untrusted code
//   7. adjudication on evidence -> the executor's claim is not consulted
//
// Everything the adapter can do to change the outcome, it does by producing
// evidence. There is no path from "the harness said so" to `pass`.

import { BudgetLedger } from './budget.js';
import { EventStream } from './events.js';
import { EvidenceManifest } from './evidence.js';
import { StructuredLogger } from './logging.js';
import { adjudicate } from './adjudicate.js';
import { assertExecutorContract, compatibilityProblems } from './executor.js';
import { eligibilityFor } from './eligibility.js';
import { riskRank } from './risk.js';

/** Default interval after which a silent executor is presumed hung. */
export const DEFAULT_HEARTBEAT_TIMEOUT_SECONDS = 300;

function refusal(reason, detail) {
  return Object.freeze({
    ok: false,
    refused: true,
    reason,
    detail,
    verdict: 'fail',
    merge_path: 'blocked',
  });
}

/**
 * @param {object} params
 * @param {object} params.workOrder     already built via createWorkOrder()
 * @param {object} params.executor      adapter INSTANCE
 * @param {object} params.config        validated config
 * @param {object} [params.resumeFrom]  persisted run state
 * @param {object} [params.clocks]      {wall: ()=>number, iso: ()=>string}
 * @param {function} [params.logSink]
 * @param {boolean} [params.humanApprovalRecorded=false]
 */
export async function runWorkOrder({
  workOrder,
  executor,
  config,
  resumeFrom = null,
  clocks = {},
  logSink,
  humanApprovalRecorded = false,
  heartbeatTimeoutSeconds = DEFAULT_HEARTBEAT_TIMEOUT_SECONDS,
}) {
  const wallClock = clocks.wall ?? (() => Date.now());
  const isoClock = clocks.iso ?? (() => new Date().toISOString());

  const logger = new StructuredLogger({
    ...(logSink ? { sink: logSink } : {}),
    clock: isoClock,
    base: {
      work_order_id: workOrder.work_order_id,
      repository: workOrder.repository,
      risk_tier: workOrder.risk_tier,
      executor: executor?.id ?? 'unknown',
    },
  });

  // --- 2. Repository eligibility -------------------------------------------
  if (config.enforce_repository_eligibility) {
    const eligibility = eligibilityFor(workOrder.repository, executor.trustLevel);
    if (!eligibility.delegation_allowed) {
      logger.error('refused: repository not delegable', {
        data_class: eligibility.data_class,
        reasons: eligibility.reasons,
      });
      return refusal('repository_not_delegable', eligibility.reasons.join('; '));
    }
    if (riskRank(workOrder.risk_tier) > riskRank(eligibility.max_risk_tier)) {
      const detail =
        `risk tier ${workOrder.risk_tier} exceeds the ${eligibility.max_risk_tier} ` +
        `ceiling for data class '${eligibility.data_class}'`;
      logger.error('refused: tier above data-class ceiling', { detail });
      return refusal('tier_above_data_class_ceiling', detail);
    }
  }

  // --- 3/4. Adapter contract and compatibility ------------------------------
  const contractProblems = assertExecutorContract(executor.constructor);
  if (contractProblems.length > 0) {
    logger.error('refused: adapter violates the executor contract', {
      problems: contractProblems,
    });
    return refusal('invalid_executor', contractProblems.join('; '));
  }

  const executorConfig = config.executors[executor.id];
  if (!executorConfig?.enabled) {
    logger.error('refused: executor disabled by feature flag', {});
    return refusal('executor_disabled', `executor '${executor.id}' is not enabled`);
  }

  const compatProblems = compatibilityProblems(executor.constructor, workOrder);
  if (compatProblems.length > 0) {
    logger.error('refused: executor incompatible with work order', {
      problems: compatProblems,
    });
    return refusal('incompatible_executor', compatProblems.join('; '));
  }

  if (resumeFrom && !executor.capabilities.resumable) {
    return refusal(
      'not_resumable',
      `executor '${executor.id}' does not declare resumability`,
    );
  }

  // --- 5. Arm budget, event stream, evidence, watchdog ----------------------
  const events = resumeFrom?.events
    ? EventStream.restore(resumeFrom.events, { clock: isoClock, resuming: true })
    : new EventStream({ clock: isoClock });

  const ledger = resumeFrom?.budget
    ? BudgetLedger.restore(workOrder.budget, resumeFrom.budget, { clock: wallClock })
    : new BudgetLedger(workOrder.budget, { clock: wallClock });

  const evidence = new EvidenceManifest(workOrder, { clock: isoClock });
  if (resumeFrom?.evidence) evidence.restoreEntries(resumeFrom.evidence);

  const controller = new AbortController();
  let lastActivityAt = wallClock();

  const emit = (type, payload = {}) => {
    lastActivityAt = wallClock();
    const event = events.emit(type, payload);
    logger.info(`event:${type}`, { seq: event.seq, ...payload });
    return event;
  };

  /** Budget + liveness check, run after every adapter-emitted event. */
  const enforce = () => {
    const status = ledger.check();
    for (const dimension of status.newWarnings) {
      if (!events.terminated) {
        emit('budget_warning', {
          dimension,
          fraction: status.fractions[dimension],
        });
      }
    }
    if (status.state === 'exceeded' && !controller.signal.aborted) {
      controller.abort('budget_exceeded');
      return 'budget_exceeded';
    }
    // execution-budgets.yaml maps the 90% checkpoint to `pause_and_escalate`.
    // With no human attached to an autonomous run, "pause and ask" can only be
    // honoured as "stop and escalate" — continuing to 100% would spend the rest
    // of the budget answering a question nobody was there to answer.
    if (status.state === 'escalate' && !controller.signal.aborted) {
      if (!events.terminated) {
        emit('approval_required', {
          reason: 'budget_escalation_threshold',
          fractions: status.fractions,
        });
      }
      controller.abort('budget_escalation');
      return 'budget_escalation';
    }
    const silentFor = (wallClock() - lastActivityAt) / 1000;
    if (silentFor > heartbeatTimeoutSeconds && !controller.signal.aborted) {
      controller.abort('watchdog_timeout');
      return 'watchdog_timeout';
    }
    return null;
  };

  const wrappedEmit = (type, payload) => {
    const event = emit(type, payload);
    enforce();
    return event;
  };

  const recordSpend = (delta) => {
    ledger.record(delta);
    enforce();
  };

  // --- 6. The only untrusted call -------------------------------------------
  let outcome;
  try {
    outcome = await executor.run({
      workOrder,
      emit: wrappedEmit,
      evidence,
      signal: controller.signal,
      resumeFrom: resumeFrom?.executor ?? null,
      recordSpend,
    });
  } catch (error) {
    // An adapter that throws has crashed, whatever it intended. Never let an
    // exception path skip adjudication — that would be an unjudged run.
    if (!events.terminated) {
      emit('crashed', { error: String(error?.message ?? error) });
    }
    outcome = { status: 'crashed', resumeState: resumeFrom?.executor ?? null };
  }

  // The adapter may have returned without emitting a terminal event.
  // Fill it in rather than adjudicating an open-ended run.
  if (!events.terminated) {
    if (controller.signal.aborted) {
      emit('stopped', { reason: controller.signal.reason ?? 'aborted' });
    } else {
      emit('stopped', { reason: 'executor_returned_without_terminal_event' });
    }
  }

  // --- 7. Independent adjudication ------------------------------------------
  const budgetSpent = ledger.spent;
  const manifest = evidence.build({ events: events.events, budget: budgetSpent });
  const verdict = adjudicate(workOrder, manifest, {
    events: events.events,
    humanApprovalRecorded,
  });

  logger.info('adjudicated', {
    verdict: verdict.verdict,
    merge_path: verdict.merge_path,
    reasons: verdict.reasons,
  });

  const resumable =
    outcome.status !== 'completed' &&
    executor.capabilities.resumable &&
    outcome.resumeState !== null &&
    outcome.resumeState !== undefined;

  return Object.freeze({
    ok: true,
    refused: false,
    work_order_id: workOrder.work_order_id,
    executor: executor.id,
    executor_status: outcome.status,
    verdict: verdict.verdict,
    merge_path: verdict.merge_path,
    reasons: verdict.reasons,
    missing_evidence: verdict.missing,
    budget_spent: budgetSpent,
    events: events.events,
    manifest,
    resumable,
    // Everything needed to continue this run in a later process.
    resume_state: resumable
      ? Object.freeze({
          events: events.events,
          budget: ledger.snapshot(),
          evidence: manifest.entries,
          executor: outcome.resumeState,
        })
      : null,
  });
}
