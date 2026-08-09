# DR-2026-003 — Autonomous executor runtime: Prime Agent and the provider-neutral boundary

**Status:** Accepted — *defer adoption, build the boundary now*
**Date:** 2026-08-09
**Scope:** Portfolio-wide (Orryx platform, Pillarworks, Triora, Consulting, Care Companion)
**Supersedes:** nothing. First decision record on delegated agent execution.
**Related:** `executor/` (this repo), `docs/pilot/prime-agent-pilot-runbook.md`,
`reports/ASSESSMENT-2026-002-prime-agent-executor.md`

---

## Context

The proposal was to adopt Prime Agent as an execution runtime beneath a control
plane, with the control plane retaining governance. Inspection changed the shape
of the question in two ways that matter more than the answer.

**1. The named control plane is not a control plane.** `orryx-flow` is a Clinical
Workflow Operating System for healthcare clinics — FastAPI, PostgreSQL, React,
43 REST endpoints, patient journeys, clinical task routing. Its "orchestration
layer" (`ARCHITECTURE.md`) orchestrates *clinical work between humans in a
clinic*, not AI agents. It is also a PHI product carrying Triora-grade
constraints (`E:\Orryx\CLAUDE.md` §4). It is the single worst repository in the
estate to place an experimental harness beneath, and it has no executor
abstraction to place one beneath in the first place.

The governance functions the proposal attributes to "Flow" exist, but spread
across four repositories: `orryx-standards` (protocol, risk language, budgets),
`orryx-governance` (deployment gates, compliance), `orryx-control-plane` (task
packets, human-action queue), `orryx-delivery-dashboard` (gate observation).

**2. The governance is largely declarative, not enforced.**
`orryx-standards/.claude/config/governance.yaml` declares six governance systems
at `enforcement_level: hard` and wires thirteen hooks. **Nine of those thirteen
hook scripts do not exist**, and no `settings.json` anywhere in `orryx-standards`
registers hooks with Claude Code. Real enforcement today is GitHub Actions CI,
`orryx-flow`'s git pre-commit hook, and the discipline of whoever is reading
`CLAUDE.base.md` at the time.

That second finding is decisive. Adding an autonomous harness beneath a governance
layer that is mostly prose would not delegate execution under governance; it would
delegate execution under the *appearance* of governance.

## Decision

**Defer adoption of Prime Agent. Build the provider-neutral executor boundary now.**

Three parts:

1. **Adopt** a provider-neutral executor interface, work-order and event schemas,
   budget enforcement, evidence manifests and independent adjudication, as
   executable code in `orryx-control-plane/executor/`. Landed with this record.
2. **Defer** live Prime Agent integration behind a feature flag that is off, with
   a stub adapter that holds the contract and cannot claim success. Revisit when
   the prerequisites below are met.
3. **Reject** any path that places a delegated harness in a PHI repository, or
   that makes a personal Claude subscription a production dependency.

## Options considered

| # | Option | Verdict |
|---|---|---|
| A | Retain the current Claude Code workflow unchanged | Rejected — real gaps in resumability, budget enforcement and independent adjudication |
| B | Integrate Prime Agent now | Rejected — four days old at time of review, not a security sandbox by its own documentation, no Linux host on this machine |
| C | Build a minimal internal harness | Rejected as a *harness*; adopted as a *boundary* — writing the interface is cheap and reversible, writing a model loop is neither |
| D | Another open-source harness (OpenHands, SWE-agent, Aider, OpenClaw) | Deferred — same isolation prerequisite applies to all; the boundary makes the choice reversible |
| **E** | **Provider-neutral boundary now, harness choice later** | **Chosen** |

The full scored matrix is in
`reports/ASSESSMENT-2026-002-prime-agent-executor.md` §4.

## Rationale

**The boundary is the durable asset; the harness is not.** Prime Agent is four
days into public release (repo created 2026-05-08, public 2026-08-05, 404 open
issues at 9,352 stars on 2026-08-09). Whatever is chosen, it will be replaced.
The interface, the work-order schema, the tier ceilings and the adjudicator will
not be. Building them first costs one session and makes the harness decision a
config change rather than a migration.

**Deferral is not free, so it should not be indefinite.** The gaps Prime Agent
would address are real: no resumability across process death, no machine-enforced
budget ceiling, no structured event stream, no independent adjudication of
executor claims. The code landed with this record closes the last three *for any
executor* and makes the first testable. That converts "we might adopt Prime Agent
one day" into "we can evaluate any harness in an afternoon".

**The isolation prerequisite is not negotiable.** Prime Agent's documentation
states it "executes model-generated Python and project commands with your user
permissions … they are **not** a security sandbox". Constraint 4 treats that as
equivalent to local user access. This machine has WSL2 with only the
`docker-desktop` distro and a stopped Docker daemon — there is no host to run it
on safely today. This is a prerequisite, not an objection.

**The subscription question has a clear answer and an unclear future.** Anthropic
withdrew third-party subscription OAuth in April 2026, then paused the change on
2026-06-15; subscription credits are documented as sized for "individual
experimentation" and are per-user, not pooled. A capability whose availability
reversed twice in four months is a fine basis for a local experiment and an
unacceptable basis for a delivery pipeline.

## Consequences

**Accepted:**
- One new zero-dependency Node package in this repo (`executor/`, ~1,100 lines
  including tests). No runtime dependencies, so no supply-chain surface added.
- Delegated execution is capped at R1 across the portfolio until a harness
  completes the pilot. This is deliberately conservative and will feel slow.
- PHI repositories (`orryx-flow`, `Clinical_trials`, `companion`,
  `care-companion-venture`, `brisbane-gynae-fertility`) are excluded from
  delegated execution entirely at `experimental` and `evaluated` trust. Work in
  those repositories continues under the current interactive Claude Code workflow.

**Gained:**
- An executor cannot self-certify. `adjudicate()` reads the evidence manifest and
  ignores the executor's own completion claim; a `completed` event with an empty
  manifest adjudicates to `escalate`, with a test asserting exactly that.
- Budgets are enforced by the control plane using its own clock, not by
  adapter cooperation.
- Repository eligibility is data-class driven and cannot be disabled by config —
  `enforce_repository_eligibility: false` is a validation error.

**Not addressed by this record:**
- The nine missing governance hooks. Out of scope here, but they are the reason
  adoption is deferred, and they should be filed as their own work.
- Container/VM isolation. A prerequisite for any harness, owned by whoever sets
  up the pilot host.

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Boundary is built and never used | Medium | Pilot runbook has a dated go/no-go; the code is ~1,100 lines and deletable in one commit |
| Prime Agent matures faster than we evaluate | Low | Deferral is time-boxed by the runbook, not open-ended |
| R1 ceiling proves too restrictive to be useful | Medium | Ceiling is one constant in `eligibility.js`; raising it is a reviewed change, not a rewrite |
| `/refine` self-improvement rewrites governance | High | Governance boundary below; constitutional files are in the permanent deny list |
| Someone enables the flag without isolation | High | `validateConfig` rejects `isolation: 'none'` for any real executor |

## Governance boundary

Non-negotiable, human-controlled, never writable by any harness:

- prohibited operations, security policies, production-access rules
- secret-handling rules, protected-branch controls, financial ceilings
- healthcare and privacy constraints, required evidence, required tests
- risk-tier definitions, approval and merge authorities

Enforced in code by `DEFAULT_PERMISSIONS.filesystem.deny`, which always includes
`**/CLAUDE.md`, `**/CLAUDE.base.md`, `**/AGENTS*.md`, `**/.claude/config/**`,
`**/policies/**`, `**/.github/workflows/**` and all `.env`/key patterns —
concatenated with, never replaced by, any caller-supplied deny list.

Agent-improvable, subject to review: repository navigation notes, build/test
commands, debugging procedures, failure-pattern recognition, planning templates,
specialist agent definitions, low-risk workflow skills, context-compression
guidance. Any refinement must be versioned, attributable, testable and
revertible by ID.

## Reversal plan

1. `git revert` the commit adding `executor/`. Nothing else imports it.
2. No schema migration, no data to unwind, no dependency to remove.
3. If Prime Agent was piloted: destroy the container and its worktree, revoke the
   scoped API key, delete the branch. Nothing was merged, by construction.

## Conditions required before production use

All must hold. Any one failing returns the decision to *defer*.

1. Container or VM isolation available and used — never `isolation: 'none'`.
2. A metered API credential (Anthropic API or Bedrock) scoped to the pilot.
   No personal subscription in any non-interactive path.
3. The nine missing governance hooks either implemented or formally retired, so
   `governance.yaml` describes reality.
4. Pilot exit criteria in the runbook met on a non-PHI repository.
5. A named human owns each merge. `merge_path: pr_ready` is a state, not an action.
6. PHI repositories remain excluded until a separate decision record says otherwise.
