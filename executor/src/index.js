// Public surface of @orryx/executor.
//
// The control plane imports from here and nowhere deeper, so adapter internals
// can move without touching callers.

export {
  CRITICAL_DOMAINS,
  RISK_TIERS,
  TIER_CEILINGS,
  TRUST_LEVELS,
  inferMinimumTier,
  isRiskTier,
  maxTierForTrust,
  riskRank,
} from './risk.js';

export {
  DEFAULT_PERMISSIONS,
  MERGE_POLICIES,
  WORK_ORDER_SCHEMA_VERSION,
  assertWorkOrder,
  createWorkOrder,
} from './work-order.js';

export {
  EVENT_SCHEMA_VERSION,
  EVENT_TYPES,
  EventStream,
  TERMINAL_EVENTS,
  isTerminal,
} from './events.js';

export { BudgetLedger, ESCALATE_FRACTION, WARN_FRACTION } from './budget.js';
export { EVIDENCE_KINDS, EvidenceManifest, OUTCOMES, sha256 } from './evidence.js';
export { VERDICTS, adjudicate } from './adjudicate.js';
export { redact, redactString } from './redact.js';
export { LEVELS, StructuredLogger } from './logging.js';

export {
  CAPABILITY_KEYS,
  DEFAULT_CAPABILITIES,
  Executor,
  assertExecutorContract,
  compatibilityProblems,
} from './executor.js';

export {
  CREDENTIAL_SOURCES,
  DEFAULT_CONFIG,
  ISOLATION_MODES,
  configFromEnv,
  validateConfig,
} from './config.js';

export {
  DATA_CLASSES,
  DELEGATION_CEILING,
  PROVIDER_POLICY,
  REPO_DATA_CLASS,
  dataClassFor,
  eligibilityFor,
  providerPermitted,
} from './eligibility.js';

export { DEFAULT_HEARTBEAT_TIMEOUT_SECONDS, runWorkOrder } from './run.js';

export { FakeExecutor } from './adapters/fake-executor.js';
export { PrimeAgentExecutor } from './adapters/prime-agent-executor.js';
