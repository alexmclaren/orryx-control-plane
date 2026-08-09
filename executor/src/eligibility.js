// Portfolio-wide delegation eligibility.
//
// The estate is not uniform, and a single "is this repo safe to delegate?" flag
// would flatten distinctions that governance treats as compliance failures
// rather than style issues (E:\Orryx\CLAUDE.md §4). Three axes matter:
//
//   1. Data class      — PHI vs regulated-non-PHI vs ordinary.
//   2. Provider set    — PHI repos are Claude-and-local only on code.
//                        (E:\Orryx\CLAUDE.md §5; E:\Triora\CLAUDE.md §5;
//                         Clinical_trials b72f026 removed cross-vendor review
//                         as a *security fix* — do not reintroduce it.)
//   3. Blast radius    — a marketing site and a clinical platform fail differently.
//
// Sources are repository documents, not inference. Where a repo is unknown, the
// default is the most restrictive class, because an unclassified repo in a
// portfolio containing a live PHI platform is not a safe default to guess at.

export const DATA_CLASSES = Object.freeze([
  'phi', // patient/health information
  'regulated_non_phi', // professional-liability domains (e.g. construction QS output)
  'platform', // shared internal technology
  'marketing', // public-facing content, no customer data
  'unknown',
]);

/** Providers permitted to see code from each data class. */
export const PROVIDER_POLICY = Object.freeze({
  phi: Object.freeze(['anthropic', 'local']),
  regulated_non_phi: Object.freeze(['anthropic', 'openai', 'google', 'local']),
  platform: Object.freeze(['anthropic', 'openai', 'google', 'local']),
  marketing: Object.freeze(['anthropic', 'openai', 'google', 'local']),
  unknown: Object.freeze(['anthropic', 'local']),
});

/**
 * Highest risk tier that may be delegated to a harness of each trust level,
 * per data class. `null` means no delegation at all.
 *
 * PHI is null for `experimental` on purpose: an unproven harness that executes
 * model-generated shell with the user's permissions has no business in a repo
 * whose governing document mandates 10-year audit retention and region-locked
 * data. That is a policy position, not a technical limit, and it is the one
 * line the pilot must not be allowed to erode.
 */
export const DELEGATION_CEILING = Object.freeze({
  phi: Object.freeze({ experimental: null, evaluated: null, trusted: 'R1' }),
  regulated_non_phi: Object.freeze({
    experimental: 'R1',
    evaluated: 'R1',
    trusted: 'R2',
  }),
  platform: Object.freeze({ experimental: 'R1', evaluated: 'R2', trusted: 'R2' }),
  marketing: Object.freeze({ experimental: 'R1', evaluated: 'R2', trusted: 'R2' }),
  unknown: Object.freeze({ experimental: null, evaluated: null, trusted: null }),
});

/**
 * Repository classification, seeded from repository evidence.
 * Keys are lowercased repo names as they appear in
 * orryx-delivery-dashboard/registry/repos.json.
 */
export const REPO_DATA_CLASS = Object.freeze({
  // --- PHI: Triora-grade constraints (E:\Orryx\CLAUDE.md §4) ---
  clinical_trials: 'phi',
  'orryx-flow': 'phi', // orryx-* prefix, but a healthcare product
  companion: 'phi',
  'care-companion-venture': 'phi',
  'brisbane-gynae-fertility': 'phi',

  // --- Pillarworks: construction, not PHI, professional-liability exposure ---
  'pillarworks-build-mvp': 'regulated_non_phi',
  'pillarworks-enterprise-website': 'marketing',
  'pillarworks_brand_identity': 'marketing',

  // --- Platform ---
  'orryx-brain': 'platform',
  'orryx-core': 'platform',
  'orryx-control-plane': 'platform',
  'orryx-mcp-gateway': 'platform',
  'orryx-standards': 'platform',
  'orryx-state': 'platform',
  'orryx-mission-control': 'platform',
  'orryx-engineering': 'platform',
  'orryx-knowledge': 'platform',
  'orryx-governance': 'platform',
  'orryx-compass': 'platform',
  'orryx-delivery-dashboard': 'platform',
  'orryx-product-template': 'platform',

  // --- Marketing / public surface ---
  'orryx-website': 'marketing',
  'orryx-repair-intelligence': 'platform',
  'trialmatch-ai---website': 'marketing',
});

export function dataClassFor(repository) {
  return REPO_DATA_CLASS[String(repository).toLowerCase()] ?? 'unknown';
}

/**
 * @returns {{
 *   repository: string,
 *   data_class: string,
 *   delegation_allowed: boolean,
 *   max_risk_tier: string|null,
 *   allowed_providers: readonly string[],
 *   reasons: string[]
 * }}
 */
export function eligibilityFor(repository, trustLevel = 'experimental') {
  const dataClass = dataClassFor(repository);
  const ceiling = DELEGATION_CEILING[dataClass][trustLevel] ?? null;
  const reasons = [];

  if (dataClass === 'unknown') {
    reasons.push(
      `repository '${repository}' is not classified in REPO_DATA_CLASS; ` +
        'unclassified repositories are not delegable',
    );
  } else if (ceiling === null) {
    reasons.push(
      `data class '${dataClass}' does not permit delegation to a '${trustLevel}' executor`,
    );
  }

  return Object.freeze({
    repository,
    data_class: dataClass,
    delegation_allowed: ceiling !== null,
    max_risk_tier: ceiling,
    allowed_providers: PROVIDER_POLICY[dataClass],
    reasons,
  });
}

/** Is `provider` permitted to see this repository's code? */
export function providerPermitted(repository, provider) {
  return PROVIDER_POLICY[dataClassFor(repository)].includes(provider);
}
