import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dataClassFor,
  eligibilityFor,
  providerPermitted,
} from '../src/eligibility.js';
import { configFromEnv, validateConfig } from '../src/config.js';

describe('repository eligibility', () => {
  it('classifies orryx-flow as PHI despite the platform-style name', () => {
    assert.equal(dataClassFor('orryx-flow'), 'phi');
  });

  it('never delegates PHI repositories to an experimental executor', () => {
    for (const repo of ['orryx-flow', 'Clinical_trials', 'companion']) {
      const eligibility = eligibilityFor(repo, 'experimental');
      assert.equal(eligibility.delegation_allowed, false, repo);
      assert.equal(eligibility.max_risk_tier, null, repo);
    }
  });

  it('does not delegate unclassified repositories', () => {
    const eligibility = eligibilityFor('some-repo-nobody-registered');
    assert.equal(eligibility.data_class, 'unknown');
    assert.equal(eligibility.delegation_allowed, false);
  });

  it('allows R1 delegation for platform and marketing repos', () => {
    assert.equal(
      eligibilityFor('orryx-delivery-dashboard', 'experimental').max_risk_tier,
      'R1',
    );
    assert.equal(eligibilityFor('orryx-website', 'experimental').max_risk_tier, 'R1');
  });

  it('allows Pillarworks backend delegation but caps it at R1 while experimental', () => {
    const eligibility = eligibilityFor('pillarworks-build-mvp', 'experimental');
    assert.equal(eligibility.data_class, 'regulated_non_phi');
    assert.equal(eligibility.max_risk_tier, 'R1');
  });

  it('keeps non-Anthropic providers away from PHI code and permits them elsewhere', () => {
    assert.equal(providerPermitted('orryx-flow', 'openai'), false);
    assert.equal(providerPermitted('Clinical_trials', 'google'), false);
    assert.equal(providerPermitted('orryx-flow', 'anthropic'), true);
    assert.equal(providerPermitted('pillarworks-build-mvp', 'openai'), true);
  });
});

describe('config validation', () => {
  it('has every real executor disabled by default', () => {
    const { ok, config } = validateConfig();
    assert.equal(ok, true);
    assert.equal(config.executors['prime-agent'].enabled, false);
  });

  it('refuses to enable a real executor with no isolation', () => {
    const result = validateConfig({
      executors: {
        'prime-agent': {
          enabled: true,
          isolation: 'none',
          credential_source: 'api_key',
        },
      },
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("isolation 'none' is not permitted")));
  });

  it('refuses subscription credentials without an explicit local-experiment ack', () => {
    const result = validateConfig({
      executors: {
        'prime-agent': {
          enabled: true,
          isolation: 'container',
          credential_source: 'subscription',
        },
      },
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('local_experiment_ack')));
  });

  it('refuses to let repository eligibility enforcement be switched off', () => {
    const result = validateConfig({ enforce_repository_eligibility: false });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('may not be disabled')));
  });

  it('keeps prime-agent off when the env var is absent', () => {
    const result = configFromEnv({});
    assert.equal(result.ok, true);
    assert.equal(result.config.executors['prime-agent'].enabled, false);
  });

  it('enables prime-agent from the environment only with a valid combination', () => {
    const bad = configFromEnv({
      ORRYX_EXECUTOR_PRIME_AGENT_ENABLED: 'true',
      ORRYX_EXECUTOR_PRIME_AGENT_ISOLATION: 'none',
    });
    assert.equal(bad.ok, false);

    const good = configFromEnv({
      ORRYX_EXECUTOR_PRIME_AGENT_ENABLED: 'true',
      ORRYX_EXECUTOR_PRIME_AGENT_ISOLATION: 'container',
      ORRYX_EXECUTOR_PRIME_AGENT_CREDENTIALS: 'api_key',
    });
    assert.equal(good.ok, true);
    assert.equal(good.config.executors['prime-agent'].enabled, true);
  });
});
