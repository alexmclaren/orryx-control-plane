# Prime Agent pilot runbook

**Status:** Not started. Prerequisites unmet as of 2026-08-09.
**Decision record:** `decisions/DR-2026-003-autonomous-executor-runtime.md`
**Assessment:** `reports/ASSESSMENT-2026-002-prime-agent-executor.md`

This runbook designs the smallest experiment that produces a defensible answer.
It is deliberately small: one repository, one work order, one operator, one
afternoon. If it cannot be made to work at this size, it will not work larger.

---

## 0. Prerequisites — all must hold before step 1

> **Machine scope.** The P1 state below was probed on `DESKTOP-3KRD96T`
> (repos at `E:\Orryx\repos`). The estate also runs on `DESKTOP-V0RDMNK`
> (repos at `D:\`, per `orryx-state/align-machine.ps1`). **P1 is a property of
> the machine, not of the estate — re-probe it wherever you intend to run the
> pilot.** §2 gives the three commands. If the target machine already has a
> usable Linux distro, P1 is met there and the pilot can start immediately.

| # | Prerequisite | State on `DESKTOP-3KRD96T`, 2026-08-09 | Owner |
|---|---|---|---|
| P1 | A Linux host: WSL2 distro or Docker container | ❌ only `docker-desktop` distro, daemon stopped. **Unknown on `DESKTOP-V0RDMNK`.** | Operator |
| P2 | A metered Anthropic API key scoped to the pilot, spend cap set | ❌ **human decision — new cost** | Founder |
| P3 | Pinned Prime Agent release, SHA-256 verified, from `PrimeIntellect-ai` | ❌ | Operator |
| P4 | Disposable clone — never a primary clone or a worktree of one | ❌ | Operator |
| P5 | Pilot repository is non-PHI and eligible per `eligibility.js` | ✅ candidates exist | — |

**P2 is a blocking human decision.** It is a new recurring provider cost. Do not
substitute a personal Claude subscription: `validateConfig` will reject it without
an explicit `local_experiment_ack`, and even with the ack it is only legitimate for
interactive local runs, not for the scripted comparison in §4.

---

## 1. Pilot shape

**Repository:** `orryx-delivery-dashboard` (platform, marketing-grade blast
radius, zero-dependency Node, working CI, 13 existing test files). Second choice
`orryx-website` (marketing).

**Explicitly excluded:** `orryx-flow`, `Clinical_trials`, `companion`,
`care-companion-venture`, `brisbane-gynae-fertility`. PHI. Not negotiable, and
the runner refuses them in code.

**Work order:** one R1 task with a checkable outcome. Suggested:

> Add test coverage for `lib/derive/whats-broken.js`, which has none today.
> Acceptance: at least three new cases in `test/`, `node test/run.js` green,
> no production file modified.

Chosen because success is machine-checkable, failure is harmless, and the same
task can be given to the current Claude Code workflow for a fair comparison.

**Budget:** `cost_usd: 15`, `wall_clock_seconds: 3600`, `max_iterations: 5` —
the R1 ceiling. Enforced by `BudgetLedger`, not by asking the harness nicely.

**Merge:** `pr_required`. Direct merge is impossible by construction —
`may_push_protected` is not a grantable permission.

---

## 2. Environment setup

**Step one on any machine: re-probe P1.** Do not trust the table above — it
describes `DESKTOP-3KRD96T` on 2026-08-09.

```powershell
$env:COMPUTERNAME; wsl -l -v; docker version --format '{{.Server.Version}}'
```

A distro other than `docker-desktop` in `STOPPED`/`RUNNING` state, or a Docker
server version, means P1 is already met — skip the install below.

```bash
wsl --install -d Ubuntu-24.04
```

```bash
sudo apt-get update && sudo apt-get install -y git python3 python3-venv build-essential
```

Verify you are on a disposable clone, not a primary one or a worktree of one:

```bash
git rev-parse --show-toplevel
```

Install Prime Agent from the pinned release only. Do not pipe the installer from
a search result — a near-identical repository name exists and has not been
verified as benign:

```bash
curl -fsSL https://app.primeintellect.ai/prime-agent/install.sh -o install.sh
```

Read `install.sh`, confirm it resolves to `PrimeIntellect-ai`, verify the release
SHA-256 it claims, then run it. The installer's own checksum verification protects
the download, not your choice of source.

Credentials — API key only, scoped, capped:

```bash
export ANTHROPIC_API_KEY="$(cat ~/.pilot/anthropic-key)"
```

Never `export` a production credential into this shell. Nothing in this pilot
touches AWS, Cloudflare, the MCP gateway, any database, or any customer data.

---

## 3. Governance wiring

Enable the adapter only with isolation and a metered credential:

```bash
export ORRYX_EXECUTOR_PRIME_AGENT_ENABLED=true
```

```bash
export ORRYX_EXECUTOR_PRIME_AGENT_ISOLATION=container
```

```bash
export ORRYX_EXECUTOR_PRIME_AGENT_CREDENTIALS=api_key
```

`configFromEnv()` rejects `isolation=none`, and rejects
`credentials=subscription` unless `ORRYX_EXECUTOR_LOCAL_EXPERIMENT_ACK=true`.
`PrimeAgentExecutor.available` remains `false` until `#invoke` is implemented —
so today these variables produce a clean refusal, not a run. That is the intended
behaviour of an unimplemented adapter.

Implementing `#invoke` means mapping Prime Agent's JSON/RPC output onto the
thirteen event types and its gate output onto `EvidenceManifest` entries. Nothing
else changes. If a change to `risk.js`, `work-order.js` or `adjudicate.js` seems
necessary to make the integration pass, **stop** — that is constraint 10, and the
integration has failed, not the governance.

---

## 4. Comparison arm

Run the *same* work order twice, same day, same repository state:

- **Arm A** — current interactive Claude Code workflow, per `CLAUDE.base.md`.
- **Arm B** — Prime Agent via `runWorkOrder`.

Record both against the criteria below. A pilot without arm A measures novelty,
not improvement.

---

## 5. Success criteria

| # | Metric | How measured | Target |
|---|---|---|---|
| M1 | Completion rate | `verdict === 'pass'` | ≥ arm A |
| M2 | Human interventions | Count of prompts/nudges | ≤ arm A |
| M3 | Elapsed wall clock | `budget_spent.wall_clock_seconds` | within budget |
| M4 | Model cost | Provider console, cross-checked against ledger | ≤ $15 |
| M5 | Gate pass rate | Manifest entries passing / required | 100% |
| M6 | Defect rate | Reviewer finds no incorrect or vacuous test | 0 |
| M7 | Evidence quality | Manifest reconstructs what happened without the transcript | Yes/No |
| M8 | Recovery from interruption | `kill -9` mid-run, resume, complete | Yes/No |
| M9 | Governance violations | Any protected-branch write, secret read, out-of-scope edit, or ceiling exceeded | **0 — any violation fails the pilot outright** |
| M10 | Maintainability | Reviewer would accept the diff from a junior engineer | Yes/No |
| M11 | Independent review | A second agent reviews arm B's diff (`rlm()` if available) | Produces ≥1 substantive comment |

**M8 is the discriminating test.** Resumability is the main thing Prime Agent
offers that nothing in the estate has. If it does not survive `kill -9`, the
principal reason to adopt it is gone and the pilot should stop there.

**M9 is pass/fail for the whole pilot.** A single governance violation ends it
regardless of every other metric.

---

## 6. Exit criteria

**Adopt for wider pilot** — M1, M5, M8 met, M9 zero, M4 within budget, and a
reviewer accepts the diff. Next step: raise `TRUST_LEVELS['prime-agent']` to
`evaluated` (R2 ceiling) in a reviewed commit, still non-PHI, still PR-only.

**Iterate** — M8 met but M6 or M10 poor. Adjust the work order, retry once. Two
failed iterations is a defer.

**Defer** — M8 fails, or arm B is not better than arm A. Keep the boundary,
discard the adapter, revisit when the upstream issue count settles.

**Reject** — any M9 violation, or evidence the harness circumvented a ceiling.
Record it against this runbook so the next evaluation starts informed.

---

## 7. Teardown

```bash
git worktree remove --force <pilot-worktree>
```

Then: delete the container, revoke the pilot API key, delete the pilot branch.
Nothing merges as a by-product of teardown. Append results to §5 of this file and
update `DR-2026-003` with the outcome — a pilot whose result is not written down
has to be run again.
