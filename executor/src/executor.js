// The provider-neutral executor contract.
//
// Anything that can take a work order and produce evidence implements this:
// Claude Code, Prime Agent, a bare API loop, a human running commands by hand.
// The control plane depends on this file and on nothing a harness ships.

/**
 * Capabilities an adapter declares so the control plane can refuse work the
 * harness cannot honour, rather than discovering it mid-run.
 */
export const CAPABILITY_KEYS = Object.freeze([
  'resumable', // can continue after process death from persisted state
  'heartbeat', // emits liveness independent of progress
  'subagents', // can fan out to child agents
  'reports_tokens', // returns token counts (else token budgets are unenforceable)
  'reports_cost', // returns cost deltas
  'isolated_runtime', // runs in a sandbox/container the adapter itself controls
  'structured_events', // native structured output rather than scraped prose
]);

export const DEFAULT_CAPABILITIES = Object.freeze(
  Object.fromEntries(CAPABILITY_KEYS.map((key) => [key, false])),
);

/**
 * Base class. Subclasses override `run`. The base deliberately provides no
 * default execution: an adapter that forgets to implement it fails loudly
 * rather than silently succeeding with no work done.
 */
export class Executor {
  /** @type {string} stable identifier recorded in evidence provenance */
  static id = 'abstract';

  /** @type {'experimental'|'evaluated'|'trusted'} */
  static trustLevel = 'experimental';

  /** @type {Record<string, boolean>} */
  static capabilities = DEFAULT_CAPABILITIES;

  /** @type {boolean} whether this adapter can actually be invoked */
  static available = false;

  get id() {
    return this.constructor.id;
  }

  get trustLevel() {
    return this.constructor.trustLevel;
  }

  get capabilities() {
    return this.constructor.capabilities;
  }

  /**
   * Execute a bounded work order.
   *
   * @param {object} params
   * @param {object} params.workOrder    frozen, already validated and clamped
   * @param {(type: string, payload?: object) => object} params.emit
   * @param {import('./evidence.js').EvidenceManifest} params.evidence
   * @param {AbortSignal} params.signal  aborted on budget exhaustion or watchdog
   * @param {object|null} params.resumeFrom  persisted state, or null for a fresh run
   * @param {(delta: object) => void} params.recordSpend
   * @returns {Promise<{status: 'completed'|'stopped'|'crashed', resumeState?: object}>}
   */
  // eslint-disable-next-line no-unused-vars
  async run(params) {
    throw new Error(`${this.constructor.id}: run() is not implemented`);
  }
}

/**
 * Validate an adapter against the contract before it is ever handed a work
 * order. Catches a malformed adapter at registration rather than at run time.
 */
export function assertExecutorContract(ExecutorClass) {
  const problems = [];
  if (typeof ExecutorClass !== 'function') {
    return ['not a class'];
  }
  if (!ExecutorClass.id || ExecutorClass.id === 'abstract') {
    problems.push('static id must be set to a stable non-abstract identifier');
  }
  if (!['experimental', 'evaluated', 'trusted'].includes(ExecutorClass.trustLevel)) {
    problems.push(`invalid trustLevel: ${ExecutorClass.trustLevel}`);
  }
  const capabilities = ExecutorClass.capabilities ?? {};
  for (const key of CAPABILITY_KEYS) {
    if (typeof capabilities[key] !== 'boolean') {
      problems.push(`capabilities.${key} must be a boolean`);
    }
  }
  if (typeof ExecutorClass.prototype?.run !== 'function') {
    problems.push('must implement run()');
  }
  return problems;
}

/**
 * Reasons this executor cannot take this work order. Empty array means it can.
 * Checked by the runner before any adapter code executes.
 */
export function compatibilityProblems(ExecutorClass, workOrder) {
  const problems = [];
  if (!ExecutorClass.available) {
    problems.push(`executor '${ExecutorClass.id}' is not available in this environment`);
  }
  if (workOrder.executor_trust_level !== ExecutorClass.trustLevel) {
    problems.push(
      `work order was clamped for trust level '${workOrder.executor_trust_level}' ` +
        `but executor '${ExecutorClass.id}' is '${ExecutorClass.trustLevel}'`,
    );
  }
  if (workOrder.budget.tokens !== null && !ExecutorClass.capabilities.reports_tokens) {
    problems.push(
      `work order sets a token budget but '${ExecutorClass.id}' does not report tokens`,
    );
  }
  return problems;
}
