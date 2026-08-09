// Prime Agent adapter — STUB. Feature-flagged off. Not wired to a live harness.
//
// Why a stub and not an implementation:
//
//   Prime Agent's own documentation states it "executes model-generated Python
//   and project commands with your user permissions ... they are not a security
//   sandbox" (github.com/PrimeIntellect-ai/prime-agent, accessed 2026-08-09).
//   Under constraint 4 that makes it equivalent to local user access, so it may
//   only run behind an isolation boundary this repository does not yet provide
//   on this host (WSL2 has only the docker-desktop distro; the Docker daemon is
//   not running — verified 2026-08-09).
//
// What this class DOES do today: it holds the integration contract, so that the
// day the boundary exists the work is wiring `#invoke`, not redesigning
// governance. Everything above it — permissions, budgets, adjudication — is
// already exercised by FakeExecutor in the test suite.
//
// Mapping to Prime Agent's documented surface, for whoever implements #invoke:
//
//   Prime Agent concept        -> executor contract
//   ---------------------------------------------------------------
//   JSON mode / RPC mode       -> emit(): parse into typed events
//   daemon-backed session      -> long-running run(); process death is survivable
//   `attach` / `--resume`      -> resumeFrom.session_id
//   `/heartbeat`               -> emit('heartbeat')
//   `rlm(...)` sub-agents      -> capabilities.subagents
//   JSONL worker snapshots     -> resumeState
//   `/refine` self-improvement -> MUST be confined to the agent-improvable set;
//                                 see docs/adr/ADR-0001 governance boundary.

import { Executor } from '../executor.js';

export class PrimeAgentExecutor extends Executor {
  static id = 'prime-agent';

  // Stays 'experimental' until the pilot exit criteria are met. This alone caps
  // it at R1 work via TRUST_LEVELS in risk.js.
  static trustLevel = 'experimental';

  // Flipped on only by the runner, from validated config. Never a literal true.
  static available = false;

  static capabilities = Object.freeze({
    resumable: true, // daemon + JSONL snapshots (documented)
    heartbeat: true, // /heartbeat (documented)
    subagents: true, // rlm() (documented)
    reports_tokens: false, // NOT VERIFIED — leave false so token budgets are refused
    reports_cost: false, // NOT VERIFIED
    isolated_runtime: false, // explicitly not a sandbox, per upstream docs
    structured_events: true, // JSON/RPC mode (documented)
  });

  #config;

  constructor(config) {
    super();
    this.#config = config;
  }

  async run({ emit }) {
    // Fail closed and loudly. A stub that silently returns `completed` would be
    // the exact self-certification failure this whole module exists to prevent.
    emit('blocked', {
      reason: 'not_implemented',
      detail:
        'PrimeAgentExecutor is a contract stub. Live integration requires a ' +
        'container/VM isolation boundary and a metered API credential; see ' +
        'docs/pilot/prime-agent-pilot-runbook.md.',
      configured_isolation: this.#config?.isolation ?? null,
      configured_credential_source: this.#config?.credential_source ?? null,
    });
    emit('stopped', { reason: 'not_implemented' });
    return { status: 'stopped', resumeState: null };
  }
}
