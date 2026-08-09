// Work order: the structured instruction the control plane hands an executor.
//
// Two rules govern everything below.
//
//   1. FAIL CLOSED. Every permission defaults to deny. A field the caller
//      forgot is a denial, never an allowance.
//   2. THE CEILING WINS. The caller's request is intersected with the tier
//      ceiling (risk.js) and with the executor's trust level. Narrowing is
//      silent and always legal; widening is a validation error, never a clamp,
//      because a silent clamp lets an over-broad work order look accepted.

import {
  TIER_CEILINGS,
  inferMinimumTier,
  isRiskTier,
  maxTierForTrust,
  riskRank,
} from './risk.js';

export const WORK_ORDER_SCHEMA_VERSION = '1.0.0';

/** Deny-all baseline. Anything not explicitly granted is refused. */
export const DEFAULT_PERMISSIONS = Object.freeze({
  filesystem: Object.freeze({
    // Absolute or repo-relative globs the executor may read/write.
    // Empty read set means "the worktree root only", resolved by the runner.
    read: Object.freeze([]),
    write: Object.freeze([]),
    // Never writable regardless of tier — these carry governance, not code.
    deny: Object.freeze([
      '**/.env',
      '**/.env.*',
      '**/*.pem',
      '**/*.key',
      '**/id_rsa*',
      '**/.git/config',
      '**/.github/workflows/**',
      '**/CLAUDE.md',
      '**/CLAUDE.base.md',
      '**/AGENTS.md',
      '**/AGENTS.base.md',
      '**/.claude/config/**',
      '**/policies/**',
    ]),
  }),
  network: 'none', // none | allowlist
  network_allowlist: Object.freeze([]),
  git: Object.freeze({
    branch_prefix: 'wt/',
    may_commit: false,
    may_push: false,
    protected_branches: Object.freeze(['main', 'master', 'develop']),
    may_push_protected: false, // never true; kept explicit so the denial is auditable
  }),
  secrets_policy: 'none', // none | scoped_test_only
});

export const MERGE_POLICIES = Object.freeze([
  'pr_required',
  'pr_required_approval',
  'prohibited',
]);

function fail(errors, message) {
  errors.push(message);
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

/**
 * Build a validated, frozen work order.
 *
 * @param {object} input           caller-supplied fields
 * @param {object} [opts]
 * @param {string} [opts.executorTrustLevel='experimental']
 * @returns {{ok: true, workOrder: object} | {ok: false, errors: string[]}}
 */
export function createWorkOrder(input = {}, opts = {}) {
  const errors = [];
  const trustLevel = opts.executorTrustLevel ?? 'experimental';

  for (const field of [
    'work_order_id',
    'initiative',
    'repository',
    'objective',
    'risk_tier',
  ]) {
    if (!input[field] || typeof input[field] !== 'string') {
      fail(errors, `missing or non-string required field: ${field}`);
    }
  }

  if (!Array.isArray(input.acceptance_criteria) || input.acceptance_criteria.length === 0) {
    fail(errors, 'acceptance_criteria must be a non-empty array');
  }

  if (input.risk_tier && !isRiskTier(input.risk_tier)) {
    fail(errors, `risk_tier must be one of R0|R1|R2|R3, got: ${input.risk_tier}`);
  }

  // Bail before ceiling maths — the rest of the checks need a valid tier.
  if (errors.length > 0) return { ok: false, errors };

  const declaredDomains = Array.isArray(input.domains) ? input.domains : [];
  const inferredTier = inferMinimumTier(declaredDomains);
  const tier =
    riskRank(inferredTier) > riskRank(input.risk_tier) ? inferredTier : input.risk_tier;

  if (tier !== input.risk_tier) {
    // Upward re-classification is not an error, but it must be visible.
    // The caller asked for less scrutiny than the declared domains justify.
    fail(
      errors,
      `risk_tier ${input.risk_tier} is below the minimum ${inferredTier} implied by ` +
        `domains [${declaredDomains.join(', ')}]; declare ${inferredTier} explicitly`,
    );
  }

  const ceiling = TIER_CEILINGS[tier];
  const maxTier = maxTierForTrust(trustLevel);
  if (riskRank(tier) > riskRank(maxTier)) {
    fail(
      errors,
      `executor trust level '${trustLevel}' may not be handed ${tier} work ` +
        `(maximum ${maxTier})`,
    );
  }

  const requested = input.permissions ?? {};
  const permissions = {
    filesystem: {
      read: Object.freeze([...(requested.filesystem?.read ?? [])]),
      write: Object.freeze([...(requested.filesystem?.write ?? [])]),
      deny: Object.freeze([
        ...DEFAULT_PERMISSIONS.filesystem.deny,
        ...(requested.filesystem?.deny ?? []),
      ]),
    },
    network: requested.network ?? DEFAULT_PERMISSIONS.network,
    network_allowlist: Object.freeze([...(requested.network_allowlist ?? [])]),
    git: {
      ...DEFAULT_PERMISSIONS.git,
      ...(requested.git ?? {}),
      // Not overridable. Ever. Constraint: no direct write to protected branches.
      may_push_protected: false,
      protected_branches: Object.freeze([
        ...DEFAULT_PERMISSIONS.git.protected_branches,
        ...(requested.git?.protected_branches ?? []),
      ]),
    },
    secrets_policy: requested.secrets_policy ?? DEFAULT_PERMISSIONS.secrets_policy,
  };

  if (permissions.network === 'allowlist' && permissions.network_allowlist.length === 0) {
    fail(errors, 'network=allowlist requires a non-empty network_allowlist');
  }
  if (permissions.network !== 'none' && ceiling.network === 'none') {
    fail(errors, `risk tier ${tier} forbids network access`);
  }
  if (
    permissions.secrets_policy !== 'none' &&
    ceiling.max_secrets_policy === 'none'
  ) {
    fail(errors, `risk tier ${tier} forbids any secrets policy other than 'none'`);
  }
  if (requested.git?.may_push_protected === true) {
    fail(errors, 'may_push_protected is never grantable');
  }

  const requestedBudget = input.budget ?? {};
  const budget = {
    cost_usd: requestedBudget.cost_usd ?? ceiling.max_cost_usd,
    wall_clock_seconds:
      requestedBudget.wall_clock_seconds ?? ceiling.max_wall_clock_seconds,
    // Token budgets are optional: not every provider reports them, and a
    // provider that does not must not therefore appear unbounded.
    tokens: requestedBudget.tokens ?? null,
    max_iterations: requestedBudget.max_iterations ?? ceiling.max_iterations,
  };

  if (budget.cost_usd > ceiling.max_cost_usd) {
    fail(
      errors,
      `budget.cost_usd ${budget.cost_usd} exceeds ${tier} ceiling ${ceiling.max_cost_usd}`,
    );
  }
  if (budget.wall_clock_seconds > ceiling.max_wall_clock_seconds) {
    fail(
      errors,
      `budget.wall_clock_seconds ${budget.wall_clock_seconds} exceeds ${tier} ceiling ` +
        `${ceiling.max_wall_clock_seconds}`,
    );
  }
  if (budget.max_iterations > ceiling.max_iterations) {
    fail(
      errors,
      `budget.max_iterations ${budget.max_iterations} exceeds ${tier} ceiling ` +
        `${ceiling.max_iterations}`,
    );
  }

  const mergePolicy = input.merge_policy ?? ceiling.merge_policy;
  if (!MERGE_POLICIES.includes(mergePolicy)) {
    fail(errors, `merge_policy must be one of ${MERGE_POLICIES.join('|')}`);
  } else if (
    MERGE_POLICIES.indexOf(mergePolicy) < MERGE_POLICIES.indexOf(ceiling.merge_policy)
  ) {
    // Lower index == more permissive.
    fail(
      errors,
      `merge_policy '${mergePolicy}' is more permissive than the ${tier} ceiling ` +
        `'${ceiling.merge_policy}'`,
    );
  }

  const required = input.required_evidence ?? {};
  const requiredEvidence = {
    tests: Array.isArray(required.tests) ? [...required.tests] : [],
    security_scans: Array.isArray(required.security_scans)
      ? [...required.security_scans]
      : [],
    artifacts: Array.isArray(required.artifacts) ? [...required.artifacts] : [],
  };

  // §5 of CLAUDE.base.md makes gates non-bypassable. A work order above R0 that
  // asks for no tests at all is a governance bypass dressed as an omission.
  if (tier !== 'R0' && requiredEvidence.tests.length === 0) {
    fail(errors, `risk tier ${tier} requires at least one entry in required_evidence.tests`);
  }

  if (errors.length > 0) return { ok: false, errors };

  const workOrder = deepFreeze({
    schema_version: WORK_ORDER_SCHEMA_VERSION,
    work_order_id: input.work_order_id,
    initiative: input.initiative,
    repository: input.repository,
    objective: input.objective,
    acceptance_criteria: [...input.acceptance_criteria],
    risk_tier: tier,
    domains: [...declaredDomains],
    permissions,
    budget,
    required_evidence: requiredEvidence,
    stop_conditions: {
      // Mirrors CLAUDE.base.md §1.3.1 `loop-stop-conditions`. Same five exits.
      max_iterations: budget.max_iterations,
      no_progress_iterations: input.stop_conditions?.no_progress_iterations ?? 2,
      on_gate_failure: input.stop_conditions?.on_gate_failure ?? 'escalate',
      on_budget_exceeded: 'stop', // not overridable
    },
    escalation_conditions: {
      confidence_below: input.escalation_conditions?.confidence_below ?? 0.85,
      critical_domain_touched: true, // not overridable
      human_review_boundary_hit: true, // not overridable
    },
    merge_policy: mergePolicy,
    human_approval_required: ceiling.human_approval_required,
    executor_trust_level: trustLevel,
    created_at: input.created_at ?? null,
  });

  return { ok: true, workOrder };
}

/** Convenience assertion for callers that treat an invalid order as a bug. */
export function assertWorkOrder(input, opts) {
  const result = createWorkOrder(input, opts);
  if (!result.ok) {
    throw new Error(`Invalid work order:\n  - ${result.errors.join('\n  - ')}`);
  }
  return result.workOrder;
}
