// Independent adjudication.
//
// THE central governance guarantee: the executor does not decide whether it
// succeeded. `adjudicate()` reads the work order and the evidence manifest, and
// deliberately ignores the executor's own `completed` event as a success signal.
// A run where the harness says "done" but produced no test evidence adjudicates
// to `fail`, not `pass`.

import { riskRank } from './risk.js';

export const VERDICTS = Object.freeze(['pass', 'fail', 'escalate']);

/**
 * @param {object} workOrder
 * @param {object} manifest   from EvidenceManifest#build()
 * @param {object} [context]
 * @param {object[]} [context.events]
 * @param {boolean} [context.humanApprovalRecorded=false]
 * @returns {{verdict: string, reasons: string[], merge_path: string, missing: string[]}}
 */
export function adjudicate(workOrder, manifest, context = {}) {
  const { events = [], humanApprovalRecorded = false } = context;
  const reasons = [];
  const missing = [];

  // 1. Required evidence must be PRESENT. Absence is failure, never a pass by
  //    default — this is the fail-closed rule applied to adjudication itself.
  const requiredNames = [
    ...workOrder.required_evidence.tests,
    ...workOrder.required_evidence.security_scans,
    ...workOrder.required_evidence.artifacts,
  ];
  const byName = new Map();
  for (const entry of manifest.entries) {
    // Last write wins per gate name: a re-run after a fix is the result of record.
    byName.set(entry.name, entry);
  }
  for (const name of requiredNames) {
    if (!byName.has(name)) {
      missing.push(name);
      reasons.push(`required evidence '${name}' was not produced`);
    }
  }

  // 2. Every produced gate must have passed.
  const failed = manifest.entries.filter(
    (entry) => byName.get(entry.name) === entry && entry.outcome !== 'pass',
  );
  for (const entry of failed) {
    reasons.push(`gate '${entry.name}' outcome=${entry.outcome}`);
  }

  // A resumed run carries its predecessor's terminal event in the stream — the
  // crash it recovered from. Only the LAST terminal event describes where the
  // run actually ended; judging on "did a crash ever appear" would make every
  // successful recovery adjudicate as a failure.
  const TERMINALS = new Set(['completed', 'stopped', 'crashed']);
  let finalTerminal = null;
  for (let i = events.length - 1; i >= 0; i--) {
    if (TERMINALS.has(events[i].type)) {
      finalTerminal = events[i];
      break;
    }
  }

  // 3. A pass claim with no evidence at all is a self-certification attempt.
  const claimedComplete = finalTerminal?.type === 'completed';
  if (claimedComplete && manifest.entries.length === 0) {
    reasons.push(
      'executor emitted `completed` with an empty evidence manifest ' +
        '(self-certification is not a verdict)',
    );
  }

  // 4. Terminal states the executor reported that are failures on their face.
  const crashed = finalTerminal?.type === 'crashed';
  const stopped = finalTerminal?.type === 'stopped';
  // Both the 100% breach and the 90% escalation checkpoint stop the run; either
  // way the work is unfinished and a human owns the next decision.
  const budgetExceeded =
    stopped && String(finalTerminal.reason ?? '').startsWith('budget_');

  let verdict;
  if (crashed) {
    verdict = 'escalate';
    reasons.push('executor crashed');
  } else if (budgetExceeded) {
    verdict = 'escalate';
    reasons.push('run stopped on budget exhaustion');
  } else if (reasons.length > 0) {
    // Gate failures escalate rather than silently fail when the work order says so.
    verdict =
      workOrder.stop_conditions.on_gate_failure === 'escalate' ? 'escalate' : 'fail';
  } else if (stopped) {
    verdict = 'escalate';
    reasons.push('run stopped before completion');
  } else if (!claimedComplete) {
    verdict = 'escalate';
    reasons.push('executor never reported completion');
  } else {
    verdict = 'pass';
  }

  // 5. Merge path. Never `merge` without a recorded human approval where the
  //    tier demands one, and never for a prohibited policy.
  let mergePath;
  if (verdict !== 'pass') {
    mergePath = verdict === 'escalate' ? 'escalate' : 'fail';
  } else if (workOrder.merge_policy === 'prohibited') {
    mergePath = 'blocked';
    reasons.push(`merge_policy=prohibited for risk tier ${workOrder.risk_tier}`);
  } else if (workOrder.human_approval_required && !humanApprovalRecorded) {
    mergePath = 'awaiting_human_approval';
  } else {
    mergePath = 'pr_ready';
  }

  // 6. Belt and braces: R2+ never reaches pr_ready without approval, whatever
  //    the flags above computed.
  if (
    riskRank(workOrder.risk_tier) >= riskRank('R2') &&
    mergePath === 'pr_ready' &&
    !humanApprovalRecorded
  ) {
    mergePath = 'awaiting_human_approval';
  }

  return Object.freeze({
    verdict,
    reasons,
    missing,
    merge_path: mergePath,
    adjudicated_against: manifest.entries_sha256,
  });
}
