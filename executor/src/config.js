// Configuration and feature flags.
//
// Every non-default executor is off unless explicitly switched on, and switching
// one on requires more than a truthy env var: the config must also name the
// isolation mode and the provider credential source, because those are the two
// decisions that make an autonomous harness safe or unsafe.

export const ISOLATION_MODES = Object.freeze([
  'none', // host filesystem, host permissions — only ever legal for the fake
  'worktree', // disposable git worktree on the host (still host permissions)
  'container', // container/VM boundary
]);

export const CREDENTIAL_SOURCES = Object.freeze([
  'none',
  'api_key', // metered provider key: the only source legal outside local pilots
  'subscription', // personal Claude Pro/Max login — local experimentation only
]);

export const DEFAULT_CONFIG = Object.freeze({
  executors: Object.freeze({
    fake: Object.freeze({
      enabled: true,
      isolation: 'none',
      credential_source: 'none',
    }),
    'prime-agent': Object.freeze({
      enabled: false, // OFF. Flipping this alone is not enough — see validateConfig.
      isolation: 'container',
      credential_source: 'api_key',
      endpoint: null,
    }),
  }),
  // Repository eligibility is data-class driven, not a flat denylist — see
  // eligibility.js. This flag only controls whether the runner consults it,
  // and turning it off is itself a governance change, not a config tweak.
  enforce_repository_eligibility: true,
});

/**
 * @returns {{ok: true, config: object} | {ok: false, errors: string[]}}
 */
export function validateConfig(input = {}) {
  const errors = [];
  const merged = {
    ...DEFAULT_CONFIG,
    ...input,
    executors: { ...DEFAULT_CONFIG.executors, ...(input.executors ?? {}) },
  };

  if (merged.enforce_repository_eligibility !== true) {
    errors.push(
      'enforce_repository_eligibility may not be disabled: it is the control that ' +
        'keeps PHI repositories out of delegated execution',
    );
  }

  for (const [id, entry] of Object.entries(merged.executors)) {
    if (typeof entry.enabled !== 'boolean') {
      errors.push(`executors.${id}.enabled must be a boolean`);
    }
    if (!ISOLATION_MODES.includes(entry.isolation)) {
      errors.push(
        `executors.${id}.isolation must be one of ${ISOLATION_MODES.join('|')}`,
      );
    }
    if (!CREDENTIAL_SOURCES.includes(entry.credential_source)) {
      errors.push(
        `executors.${id}.credential_source must be one of ${CREDENTIAL_SOURCES.join('|')}`,
      );
    }
    if (!entry.enabled) continue;

    // Rules that only bite once something is actually switched on.
    if (id !== 'fake' && entry.isolation === 'none') {
      errors.push(
        `executors.${id}: isolation 'none' is not permitted for a real executor — ` +
          `model-generated shell and Python run with the invoking user's permissions`,
      );
    }
    if (entry.credential_source === 'subscription' && !entry.local_experiment_ack) {
      errors.push(
        `executors.${id}: credential_source 'subscription' requires ` +
          `local_experiment_ack=true — a personal Claude plan is not a production ` +
          `dependency (see docs/pilot/prime-agent-pilot-runbook.md)`,
      );
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, config: Object.freeze(merged) };
}

/**
 * Read config from the environment. Absent variables mean "keep the default",
 * which for every real executor means disabled.
 */
export function configFromEnv(env = process.env) {
  const overrides = {};
  if (env.ORRYX_EXECUTOR_PRIME_AGENT_ENABLED === 'true') {
    overrides.executors = {
      'prime-agent': {
        ...DEFAULT_CONFIG.executors['prime-agent'],
        enabled: true,
        isolation: env.ORRYX_EXECUTOR_PRIME_AGENT_ISOLATION ?? 'container',
        credential_source: env.ORRYX_EXECUTOR_PRIME_AGENT_CREDENTIALS ?? 'api_key',
        local_experiment_ack: env.ORRYX_EXECUTOR_LOCAL_EXPERIMENT_ACK === 'true',
        endpoint: env.ORRYX_EXECUTOR_PRIME_AGENT_ENDPOINT ?? null,
      },
    };
  }
  return validateConfig(overrides);
}

// Repository eligibility lives in eligibility.js; re-exported here so callers
// have one import for "may this run at all?".
export { eligibilityFor, dataClassFor, providerPermitted } from './eligibility.js';
