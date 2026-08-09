# Handover — executor boundary, 2026-08-09

**Produced on:** `DESKTOP-3KRD96T` (secondary; repos at `E:\Orryx\repos`)
**Continues on:** `DESKTOP-V0RDMNK` (primary as of 2026-08-09; repos under `D:\`)
**On GitHub:** `alexmclaren/orryx-control-plane` PR #11, branch `wt/prime-agent-executor`

This work was produced on the secondary machine. It is pushed, so continuing on
the primary needs a `git fetch` and nothing else — no file copying, no path
translation. Read §5 before trusting any host-capability claim in the assessment
or runbook.

Everything below is pushed. Nothing is machine-local. `git fetch` is sufficient.

---

## 1. What exists now

A zero-dependency Node package at `executor/` that lets any agent harness be
evaluated as an execution runtime without surrendering governance. 63 tests
passing, 92.9% line / 82.3% branch coverage, zero runtime dependencies asserted
in CI.

| Path | What |
|---|---|
| `executor/src/` | 12 modules — risk tiers, eligibility, work orders, events, budgets, evidence, adjudication, redaction, logging, contract, config, runner |
| `executor/src/adapters/` | `fake-executor.js` (scripted reference), `prime-agent-executor.js` (stub, `available = false`) |
| `executor/test/` | 5 suites, 63 tests |
| `decisions/DR-2026-003-…md` | The ADR |
| `reports/ASSESSMENT-2026-002-…md` | Evidence-classed assessment, decision matrix, portfolio applicability |
| `docs/pilot/prime-agent-pilot-runbook.md` | Pilot design, M1–M11 criteria, exit criteria |
| `.github/workflows/executor-ci.yml` | Scoped CI |

**Nothing is enabled.** `PrimeAgentExecutor.available === false`. No credential,
no container, no harness installed anywhere.

## 2. The decision, in one line

**Defer Prime Agent; adopt the boundary.** Weighted matrix: boundary-now 196,
Claude Code as-is 154, internal harness 135, Prime Agent now 131, other OSS 129.

Prime Agent is capable — MIT, 9,352 stars, ARC-AGI-3 95.5% with Opus 5, resumable
daemon-backed sessions, `rlm()` sub-agents, JSON/RPC modes. Three things
disqualify it *now*: its own documentation states it is **"not a security
sandbox"**; it was four days public with **404 open issues** at time of review;
and `DESKTOP-3KRD96T` has no Linux host to run it on.

## 3. The two findings that drove it

1. **`orryx-flow` is not a control plane.** It is a Clinical Workflow Operating
   System — FastAPI, PostgreSQL, React, 43 REST endpoints, clinical task routing
   — and a **PHI product** under Triora-grade constraints. No executor
   abstraction, no work-order schema, no cycle gate, no watchdog.

2. **Nine of the thirteen hooks `governance.yaml` declares at
   `enforcement_level: hard` do not exist**, and no `settings.json` registers any
   hook with Claude Code. `execution-budgets.yaml` specifies retry budgets, cost
   ceilings, loop detection and confidence decay — and nothing reads it.

Finding 2 is why adoption is deferred rather than piloted immediately.

## 4. Open — needs a human

| # | Decision | Blocks |
|---|---|---|
| D1 | Metered Anthropic API key with a spend cap. **New recurring cost.** Not substitutable with a personal Max subscription. | The whole pilot |
| D2 | Container/VM host. Re-probe on the target machine — §5. | Pilot prerequisite P1 |
| D3 | Were the nine hooks removed deliberately, or lost? Decides gap vs regression. | Scoping the hook work |
| D4 | Confirm PHI exclusion: no delegated execution in `orryx-flow`, `Clinical_trials`, `companion`, `care-companion-venture`, `brisbane-gynae-fertility` below `trusted` trust. | Ratifying `eligibility.js` |

## 5. Machine caveats — read before trusting any host claim

Host-capability findings in the assessment and runbook were probed on
`DESKTOP-3KRD96T` and **do not transfer**:

- `wsl -l -v` → only `docker-desktop`, Stopped. No general-purpose Linux.
- `docker version` → daemon not running.
- Node v24.18.1, Python 3.14.6, git 2.55.0 (all Windows-native).

**Re-probe wherever the pilot will run:**

```powershell
$env:COMPUTERNAME; wsl -l -v; docker version --format '{{.Server.Version}}'
```

If the target machine already has a real Linux distro or a running Docker daemon,
**P1 is met there** and the pilot can start without the setup in runbook §2.

### Path layout differs by machine

`orryx-state/align-machine.ps1` maps two machines. On `DESKTOP-3KRD96T` the repos
are at `E:\Orryx\repos\<repo>`. On `DESKTOP-V0RDMNK` the stores sit under `D:\`,
and `orryx-standards/scripts/session-worktree.ps1` still defaults to
`-Root 'D:\'` with examples of the form `D:\<repo>-wt-<slug>` — so repos are
probably flat under `D:\` there. **Verify before running the helper**; on
`DESKTOP-3KRD96T` the default is wrong and `-Root E:\Orryx\repos` is required.

### Which machine is primary — the script and the operator disagree

`orryx-state/audit-unpushed.ps1` (2026-08-05) documents itself as *"Written
2026-08-05 for the Desktop-v0rdmnk -> desktop-3krd96t migration. Run it on the
machine you are thinking of retiring."* Read literally, that makes
`DESKTOP-V0RDMNK` the machine being retired.

**Operator correction, 2026-08-09: `DESKTOP-V0RDMNK` remains primary for now.**
The migration described in that header is planned or in progress, not complete.
Treat the script's framing as intent, not current state — and if the migration
does complete, update that header, because the next reader will believe it.

This matters beyond bookkeeping: `DESKTOP-3KRD96T` (where this work was produced)
is therefore the *secondary* machine, so **nothing here should be left on its disk
only**. That is why this branch was pushed rather than handed over as a path.

Regardless of direction, run `audit-unpushed.ps1` on any machine that has been
used for real work — it finds commits that exist on one machine only, and it
flags `NARROW-FETCH` single-branch clones that fake `UNPUSHED` for every branch
but the fetched one.

## 6. Constraints that carry forward

Non-negotiable, regardless of machine or harness:

1. No delegated execution in PHI repositories.
2. No personal Claude subscription in any non-interactive or CI path.
3. No direct write to protected branches — `may_push_protected` is not grantable.
4. No weakening of `risk.js`, `work-order.js` or `adjudicate.js` to make an
   integration pass. **If an integration seems to require that, the integration
   has failed, not the governance.**
5. Model-generated shell and Python are equivalent to local user access until
   independently sandboxed.
6. `enforce_repository_eligibility` cannot be disabled — it is a validation error.

## 7. Recommended next action

Not implementation. **Planning**, on whichever machine holds the fuller history:

1. `git fetch origin && git checkout wt/prime-agent-executor`
2. `cd executor && node --test` — confirm 63/63 on that host
3. Re-probe P1 (§5)
4. Decide D1–D4
5. Scope the nine missing hooks as separate work — that is the larger finding, and
   it gates more than this pilot does
