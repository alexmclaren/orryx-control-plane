// Risk tiers and the permission ceilings they impose.
//
// These are CONSTITUTIONAL. They are derived from, and must stay consistent with:
//   - orryx-standards/CLAUDE.base.md §5 (quality gates), §7 (human review boundaries)
//   - orryx-standards/.claude/config/governance.yaml  -> escalation.critical_domains
//   - orryx-standards/.claude/config/execution-budgets.yaml -> approval_checkpoints.mandatory
//   - orryx-governance/policies/deployment-gates.yaml -> production.approval_required
//
// An executor adapter MUST NOT be able to widen any of this. The control plane
// computes the ceiling; the adapter only ever receives the already-clamped result.

/** Domains that governance.yaml marks as requiring human review, verbatim. */
export const CRITICAL_DOMAINS = Object.freeze([
  'authentication',
  'authorization',
  'payment',
  'data-migration',
  'patient-data',
  'clinical-logic',
  'compliance',
  'privacy',
  'security',
]);

/**
 * Risk tiers, lowest to highest.
 *
 * R0 documentation, comments, non-executable assets
 * R1 tests, dev tooling, isolated refactors with no behavioural change
 * R2 ordinary product code — behaviour changes, but no critical domain
 * R3 critical domains (see CRITICAL_DOMAINS), production data, migrations,
 *    anything touching PHI. Never delegable to an unproven harness.
 */
export const RISK_TIERS = Object.freeze(['R0', 'R1', 'R2', 'R3']);

export function isRiskTier(value) {
  return RISK_TIERS.includes(value);
}

export function riskRank(tier) {
  const i = RISK_TIERS.indexOf(tier);
  if (i === -1) throw new Error(`Unknown risk tier: ${tier}`);
  return i;
}

/**
 * Per-tier ceiling. A work order may request LESS than this, never more.
 *
 * merge_policy values:
 *   pr_required          - executor may open a PR; merge is a separate human/CI act
 *   pr_required_approval - PR plus a recorded human approval before merge
 *   prohibited           - executor may not produce a mergeable branch at all
 *
 * Note there is deliberately no `auto_merge` value anywhere in this file.
 * Constraint: no worker may directly merge, at any tier.
 */
export const TIER_CEILINGS = Object.freeze({
  R0: Object.freeze({
    merge_policy: 'pr_required',
    max_secrets_policy: 'none',
    network: 'allowlist',
    git_push_protected: false,
    human_approval_required: false,
    max_cost_usd: 2,
    max_wall_clock_seconds: 900,
    max_iterations: 3,
  }),
  R1: Object.freeze({
    merge_policy: 'pr_required',
    max_secrets_policy: 'none',
    network: 'allowlist',
    git_push_protected: false,
    human_approval_required: false,
    max_cost_usd: 15,
    max_wall_clock_seconds: 3600,
    max_iterations: 5,
  }),
  R2: Object.freeze({
    merge_policy: 'pr_required_approval',
    max_secrets_policy: 'scoped_test_only',
    network: 'allowlist',
    git_push_protected: false,
    human_approval_required: true,
    max_cost_usd: 50,
    max_wall_clock_seconds: 7200,
    max_iterations: 5,
  }),
  R3: Object.freeze({
    merge_policy: 'prohibited',
    max_secrets_policy: 'none',
    network: 'none',
    git_push_protected: false,
    human_approval_required: true,
    max_cost_usd: 0,
    max_wall_clock_seconds: 0,
    max_iterations: 0,
  }),
});

/**
 * The highest tier an executor of a given trust level may be handed.
 *
 * `experimental` covers any harness that has not completed the pilot exit
 * criteria in docs/pilot/prime-agent-pilot-runbook.md. Prime Agent is
 * experimental: its own README states it is not a security sandbox.
 */
export const TRUST_LEVELS = Object.freeze({
  experimental: 'R1',
  evaluated: 'R2',
  trusted: 'R2',
});

export function maxTierForTrust(trustLevel) {
  const tier = TRUST_LEVELS[trustLevel];
  if (!tier) throw new Error(`Unknown executor trust level: ${trustLevel}`);
  return tier;
}

/**
 * Infer the minimum defensible tier from the domains a work order declares.
 * Used to catch under-classification: a work order that says R1 but touches
 * `patient-data` is re-classified upward, never downward.
 */
export function inferMinimumTier(domains = []) {
  return domains.some((d) => CRITICAL_DOMAINS.includes(d)) ? 'R3' : 'R0';
}
