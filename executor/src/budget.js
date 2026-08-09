// Budget enforcement: wall clock, cost, tokens, iterations.
//
// The control plane enforces these, not the harness. A harness that reports its
// own spend is a harness that can under-report it; every figure here is either
// measured locally (wall clock) or accumulated from adapter-reported deltas that
// are treated as a floor, never a ceiling.
//
// Thresholds mirror orryx-standards/.claude/config/execution-budgets.yaml:
//   75% -> warn_and_review, 90% -> pause_and_escalate, 100% -> stop.

export const WARN_FRACTION = 0.75;
export const ESCALATE_FRACTION = 0.9;

export class BudgetLedger {
  #budget;
  #clock;
  #startedAt;
  #spent = { cost_usd: 0, tokens: 0, iterations: 0 };
  #warned = new Set();

  /**
   * @param {object} budget  work order budget block
   * @param {() => number} clock  monotonic-ish millisecond clock (injectable)
   */
  constructor(budget, { clock = () => Date.now(), startedAt = null } = {}) {
    this.#budget = budget;
    this.#clock = clock;
    this.#startedAt = startedAt ?? clock();
  }

  get startedAt() {
    return this.#startedAt;
  }

  get elapsedSeconds() {
    return (this.#clock() - this.#startedAt) / 1000;
  }

  get spent() {
    return { ...this.#spent, wall_clock_seconds: this.elapsedSeconds };
  }

  /** Record consumption. Deltas must be non-negative — a refund is a bug, not a feature. */
  record({ cost_usd = 0, tokens = 0, iterations = 0 } = {}) {
    if (cost_usd < 0 || tokens < 0 || iterations < 0) {
      throw new Error('Budget deltas must be non-negative');
    }
    this.#spent.cost_usd += cost_usd;
    this.#spent.tokens += tokens;
    this.#spent.iterations += iterations;
  }

  /** Fractions of each limit consumed. Null limits (e.g. tokens) yield 0. */
  fractions() {
    const f = (used, limit) =>
      limit === null || limit === undefined || limit === 0 ? 0 : used / limit;
    return {
      cost_usd: f(this.#spent.cost_usd, this.#budget.cost_usd),
      wall_clock_seconds: f(this.elapsedSeconds, this.#budget.wall_clock_seconds),
      tokens: f(this.#spent.tokens, this.#budget.tokens),
      iterations: f(this.#spent.iterations, this.#budget.max_iterations),
    };
  }

  /**
   * @returns {{state: 'ok'|'warn'|'escalate'|'exceeded', breaches: string[], newWarnings: string[]}}
   *
   * A zero-valued limit means "not permitted at all" (R3 ceilings are zero), so
   * any consumption at all is a breach rather than a division by zero.
   */
  check() {
    const fractions = this.fractions();
    const breaches = [];
    const atOrOver = [];
    const escalating = [];

    for (const [key, fraction] of Object.entries(fractions)) {
      const limit =
        key === 'iterations' ? this.#budget.max_iterations : this.#budget[key];
      if (limit === null || limit === undefined) continue;
      const used =
        key === 'wall_clock_seconds' ? this.elapsedSeconds : this.#spent[key];
      if (limit === 0) {
        if (used > 0) breaches.push(key);
        continue;
      }
      if (fraction >= 1) breaches.push(key);
      else if (fraction >= ESCALATE_FRACTION) escalating.push(key);
      else if (fraction >= WARN_FRACTION) atOrOver.push(key);
    }

    // Warn once per dimension; a per-tick warning stream is noise, not signal.
    const newWarnings = [...atOrOver, ...escalating].filter(
      (key) => !this.#warned.has(key),
    );
    for (const key of newWarnings) this.#warned.add(key);

    let state = 'ok';
    if (breaches.length > 0) state = 'exceeded';
    else if (escalating.length > 0) state = 'escalate';
    else if (atOrOver.length > 0) state = 'warn';

    return { state, breaches, newWarnings, fractions };
  }

  /** Serialisable state, so a resumed run does not get a fresh budget. */
  snapshot() {
    return {
      started_at: this.#startedAt,
      spent: { ...this.#spent },
      warned: [...this.#warned],
    };
  }

  static restore(budget, snapshot, { clock = () => Date.now() } = {}) {
    const ledger = new BudgetLedger(budget, {
      clock,
      startedAt: snapshot.started_at,
    });
    ledger.#spent = { ...snapshot.spent };
    ledger.#warned = new Set(snapshot.warned ?? []);
    return ledger;
  }
}
