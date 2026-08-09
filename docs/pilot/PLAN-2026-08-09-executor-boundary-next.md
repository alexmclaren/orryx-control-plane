# Plan — executor boundary, next steps

**Date:** 2026-08-09
**Machine:** `DESKTOP-V0RDMNK` (primary), repos flat under `D:\`
**Continues:** `docs/pilot/HANDOVER-2026-08-09-executor-boundary.md`, PR #11
**Status:** Planning only. Nothing enabled, nothing installed, no governance code touched.

Track A (hooks) is the larger finding and does not depend on the pilot.
Track B (pilot) is blocked on P1 and D1. Track C (rollout) is blocked on Track A.

---

## 0. Machine verification — results

Four checks were requested before planning. Two changed the plan.

### 0.1 P1 (a real Linux host) — **NOT MET**, and the runbook's test for it is wrong

```
$env:COMPUTERNAME   -> DESKTOP-V0RDMNK
wsl -l -v           -> Ubuntu (Stopped), docker-desktop (Stopped), Ubuntu-24.04 (Stopped)
docker version      -> daemon not running (dockerDesktopLinuxEngine pipe absent)
```

Read against runbook §2 — *"A distro other than `docker-desktop` in STOPPED/RUNNING
state … means P1 is already met — skip the install below"* — this machine passes.
**It does not have a working Linux host.** Both Ubuntu distros fail to start:

```
wsl -d Ubuntu-24.04 -- uname -a
Failed to attach disk 'C:\Users\alexa\AppData\Local\wsl\{edae51a8-…}\ext4.vhdx'
Error code: Wsl/Service/CreateInstance/MountDisk/HCS/ERROR_PATH_NOT_FOUND
```

Both are orphaned registrations — the `HKCU:\…\Lxss` entries survive but the backing
`ext4.vhdx` directories do not exist:

| Distro | BasePath | Backing store |
|---|---|---|
| `docker-desktop` | `\\?\D:\Docker\DockerDesktopWSL\main` | **present** |
| `Ubuntu` | `…\AppData\Local\wsl\{b28b1a31-…}` | **missing** |
| `Ubuntu-24.04` | `…\AppData\Local\wsl\{edae51a8-…}` | **missing** |

`wsl -l -v` reports an orphaned distro as `Stopped`, identical to a healthy one.
**Action: correct runbook §2.** The P1 test must execute in the distro, not list it:

```powershell
wsl -d <distro> -- uname -sr   # exit 0 = P1 met; anything else = not met
```

This is a machine-scoped correction of the kind §5 of the handover asked for. The
secondary reported "no Linux host" and was right; the primary reports "three distros"
and is also, in substance, no Linux host.

**Nearer than the secondary, though:** Docker Desktop is installed
(`C:\Program Files\Docker\Docker\Docker Desktop.exe`) and its WSL backing store is
intact. D: has 1,250 GB free. P1 is ~30 minutes of operator work, by either route —
see §2.1. It is not a rebuild.

### 0.2 `executor` test suite — **63/63 pass**

```
cd executor; node --test
# tests 63  # suites 14  # pass 63  # fail 0  # duration_ms 736
```

Node **v22.17.1** here vs v24.18.1 on the secondary. The suite is clean on both,
which is a useful zero-dependency signal — but the runtime floor is now only known
to be v22, not asserted. Worth an `engines` field if the package is kept.

### 0.3 `D:\` layout and `session-worktree.ps1 -Root 'D:\'` — **correct here**

Repos are flat under `D:\` (`D:\orryx-control-plane`, `D:\orryx-standards`, …), so the
helper's default is right on this machine and the `-Root E:\Orryx\repos` override the
secondary needs must not be made the default. The worktree for this session was taken
per CLAUDE.base.md §10.1.1:

```
D:\orryx-control-plane-wt-prime-plan   branch wt/prime-plan
base origin/wt/prime-agent-executor @ e3c61f3
```

### 0.4 `audit-unpushed.ps1` — **does not exist on this machine, and was never committed**

Not on disk anywhere under `D:\`. Not in `orryx-state` — `git log --all -- '*audit-unpushed*'`
returns nothing; the four tracked scripts are `daily-backup.ps1`, `fleet-dark-watchdog.ps1`,
`install-fleet-dark-watchdog.ps1`, `vault-memory-sync.ps1`.

The script written to find work that exists on one machine only exists on one machine
only. It is `DESKTOP-3KRD96T`-local and unpushed. **Push it before that machine changes
role in either direction.**

An inline sweep was run in its place. **Nothing in scope is at risk** — PR #11's branch
is fully pushed, `wt/prime-plan` matches `origin/wt/prime-agent-executor`, and
`orryx-control-plane`'s only local-only commit is `9a0548a` (consulting docs, unrelated,
on a branch whose upstream is `[gone]`).

The wider estate is a different matter and is **out of scope for this plan**, flagged
not chased: `Clinical.Trials` carries 316 local-only commits and 8 stashes,
`pillarworks-build-mvp` 276 and 23, `Pillarworks-Enterprise-Website` 148.
Those counts are dominated by stale branches whose ancestry has diverged from
`origin/main`, so they need `audit-unpushed.ps1`'s own classification (including its
`NARROW-FETCH` detection) to read correctly — which is the second reason to push it.

---

## A. The nine governance hooks

### A.1 D3 is answered — by git, not by recollection

The assessment listed D3 as `[UNRESOLVED]`, needing "a human who was there". It does not.

```
for each of the nine names:  git log --all --oneline -- '*<name>*'  ->  0 commits
```

Zero commits across all refs, for all nine, including `--diff-filter=A`. They were
**never written**. The history is unambiguous:

| Commit | Date | What |
|---|---|---|
| `5aaedcd` | — | Phase 2 — the **four** Pinecone memory hooks. These are the ones that exist. |
| `013a316` | 2026-05-18 | Phase 3 — `governance.yaml` + 6 sibling YAMLs + templates + seeding scripts, in one commit. Declares **thirteen** hooks. |

`governance.yaml` has been modified **zero** times since `013a316`. The four hooks it
describes as existing already existed; the nine it describes as existing never did.

**Disposition: gap, not regression.** Phase 3 wrote the target state as though it were
the current state, and Phase 4 never happened. Nothing was deleted, so nothing is
recoverable — there is nothing to recover. **D3 still needs ratifying, but as a
decision about intent, not a question of fact.** See §D.

### A.2 The finding is bigger than nine — it is thirteen

`git log --all -- '**/settings.json'` returns nothing. **No `settings.json` has ever
existed in `orryx-standards`.** Claude Code registers hooks through `settings.json` and
nothing else.

So the four surviving hooks do not run either. They are `.claude/hooks/*.ts` files with
a `package.json` and a `node_modules`, invoked by `npm run test:planning` and friends —
manual scripts, not hooks. **Nothing in `orryx-standards` has ever fired automatically.**

The correct statement of the finding is: *`governance.yaml` declares 13 hooks at
`enforcement_level: hard`; 9 do not exist, and all 13 are unregistered.*

`governance.yaml` also contains, at line 395, its own detector:

```yaml
    - name: "hook_scripts_exist"
      critical: true
      alert_on_failure: true
```

declared under `health_checks: {enabled: true, frequency: hourly}`. It would have caught
this on the first hour of the first day. It is as unimplemented as the hooks it checks.

### A.3 Seven of the nine cannot be built as declared — the schema is not Claude Code's

`governance.yaml` groups hooks under `pre_planning`, `pre_edit`, `pre_debugging`,
`post_story`, `pre_commit`. Claude Code's actual events — confirmed against the live
`~/.claude/settings.json`, which uses `PostToolUse`, `SessionStart`, `UserPromptSubmit`,
`Stop`, `PostToolUseFailure`, `Notification` — are tool- and session-scoped, not
phase-scoped. There is no "planning" event, no "debugging" event, no "story" event.

Three of the five declared phases have nothing to bind to. **This is the scoping answer:
"implement the nine" is not achievable at any effort level, because five of the
thirteen trigger points do not exist in the runtime.**

### A.4 Scope — disposition of each of the nine

| Hook | Phase | Blocking | Bindable to a real event | Disposition |
|---|---|---|---|---|
| `read-before-edit-gate` | `pre_edit` | yes | `PreToolUse` matcher `Edit\|Write` | **BUILD** — highest value, cleanest mapping, enforces a rule already in CLAUDE.base.md §11 |
| `pre-commit-lint` | `pre_commit` | yes | git hook / CI | **MOVE to CI** |
| `pre-commit-types` | `pre_commit` | yes | git hook / CI | **MOVE to CI** |
| `pre-commit-tests` | `pre_commit` | yes | git hook / CI | **MOVE to CI** |
| `pre-commit-security` | `pre_commit` | yes | git hook / CI | **MOVE to CI** |
| `execution-budget-check` | `pre_debugging` | yes | none | **RETIRE — superseded.** The capability shipped as `executor/src/budget.js`, enforced by the control plane's own clock. It moved; it is not missing. |
| `context-budget-check` | `pre_planning` | yes | none | **RETIRE** — no planning event. Nearest honest form is a `SessionStart`/`PreCompact` advisory, which is not `hard` and should not be labelled as such. |
| `session-metrics-log` | `post_story` | no | `Stop` / `SessionEnd` | **BUILD or RETIRE** — cheap, non-blocking, low value. Operator's call. |
| `dependency-check` | `pre_edit` | no | `PreToolUse` | **RETIRE** — non-blocking, duplicated by Dependabot and CI. |

On the four `pre_commit` hooks: `orryx-standards` **has no `.github/` directory at all**.
There is no CI in that repository to move them to — it has to be created. That is the
real work item hiding behind "four missing pre-commit hooks", and it is a bigger and
more useful piece of work than four `.ts` files would have been.

**Net: build 1 (+1 optional), move 4 into CI that must first exist, retire 3 as
unbuildable or superseded.** Not "nine missing scripts".

### A.5 What `hard` should mean

Today `enforcement_level: hard, can_override: false` is a string in a YAML file that
nothing reads. The proposal is a two-value vocabulary with a testable definition:

- **`hard`** — an executable exists, is registered in a `settings.json` or CI workflow,
  blocks on failure, **and has a test asserting that it blocks**. Nothing may be
  labelled `hard` without all four.
- **`documented`** — a rule in `CLAUDE.base.md` that a human or agent is expected to
  follow. Honest, useful, and not pretending to be a gate.

Everything currently at `hard` becomes `documented` on the day the vocabulary lands, and
earns `hard` back one hook at a time. `soft`/`warn` collapse into `documented` — the
distinction has never been observable.

**The enforcement of the vocabulary is `hook_scripts_exist`, already specified at line
395.** Implement it as the one script the config always said it needed: read
`governance.yaml`, assert every `script:` path exists on disk and is referenced by a
`settings.json` or workflow, exit non-zero otherwise. Run it in the CI that A.4 requires
anyway. It is roughly forty lines and it makes this class of drift impossible to
reintroduce — the config becomes self-policing rather than self-describing.

### A.6 Sequence

1. Ratify D3 (§D) — decides whether A.4's retirements are recorded as *retired* or as *never intended*.
2. Land the `hard`/`documented` vocabulary in `governance.yaml`; demote all six systems to `documented`.
3. Create `.github/workflows/` in `orryx-standards`. Implement `hook_scripts_exist` as its first gate.
4. Move the four `pre_commit` checks into that CI. They earn `hard` on landing.
5. Build `read-before-edit-gate` + the `settings.json` that registers it. It earns `hard` when its blocking test passes.
6. Decide `session-metrics-log`. Delete the three retired declarations from `governance.yaml`.

Steps 1–3 are the ones that gate Track C. Steps 4–6 are independent and can lag.

---

## B. The pilot

**Does not start.** P1 is not met (§0.1) and D1 is not decided. Either alone blocks it.
Do not start it on partial prerequisites — the pilot's value is entirely in M8 and M9,
and both are meaningless on a host that is not isolated.

### B.1 Getting to P1 — two routes, operator work, ~30 min

| Route | Steps | Gives | Note |
|---|---|---|---|
| **Docker** *(recommended)* | Start Docker Desktop; `docker version` returns a server version | Container isolation, which is what `configFromEnv()` wants (`ORRYX_EXECUTOR_PRIME_AGENT_ISOLATION=container`) | Backing store intact at `D:\Docker\DockerDesktopWSL\main`. Strictly better isolation than a bare distro. |
| **Fresh distro** | `wsl --unregister Ubuntu`; `wsl --unregister Ubuntu-24.04`; `wsl --install -d Ubuntu-24.04` | A general-purpose Linux host | The unregisters are safe — both are already orphaned, there is nothing on the disks to lose. Yields `isolation: wsl`, weaker than a container. |

Recommend Docker. It matches the runbook's own §3 default and the assessment's answer to
question 5, and it avoids leaving a second half-configured distro behind.

Do the unregisters regardless of route. Two dead registrations that report `Stopped` are
exactly what produced the false P1 reading in §0.1, and they will produce it again for
the next reader.

### B.2 Ordered gate

```
D1 decided ────┐
P1 met ────────┼──> P3 pin+SHA ──> P4 disposable clone ──> pilot §4 ──> M8 ──> M9 ──> exit criteria
D2 decided ────┘
```

M8 first: `kill -9` mid-run, resume, complete. If it fails, stop — the principal reason
to adopt Prime Agent is resumability and nothing else in the runbook compensates.
M9 is not a metric to weigh; one violation ends the pilot.

### B.3 Runbook edits needed before it is run

Three, all from §0:

1. §2 — replace the `wsl -l -v` P1 test with the executing form (§0.1). As written it
   returns a false pass on this machine.
2. §0 prerequisites table — P1 for `DESKTOP-V0RDMNK` is **❌ (orphaned distros, Docker
   installed but stopped)**, not `Unknown`.
3. §0 — add "Docker Desktop installed, backing store intact" so the next reader does not
   re-derive the two routes.

These are documentation corrections to a not-yet-run runbook, not implementation.
They can land with this plan.

---

## C. Rollout

Blocked on Track A steps 1–3. Rolling delegated execution across the portfolio while
`governance.yaml` describes hooks that do not run is the exact failure DR-2026-003 §
Rationale refuses.

`eligibility.js` was read and is sound as written. Two observations, neither a defect:

**C.1 PHI exclusion holds.** `DELEGATION_CEILING.phi` is `{experimental: null,
evaluated: null, trusted: 'R1'}` and `REPO_DATA_CLASS` classes all five named repos as
`phi`. `clinical_trials` is keyed lowercase and `dataClassFor` lowercases its input, so
the on-disk `Clinical_trials` resolves correctly. Needs ratification, not change — D4.

**C.2 Fourteen registry repos are unclassified and therefore refused.** Diffing
`orryx-delivery-dashboard/registry/repos.json` (36 repos) against `REPO_DATA_CLASS`
(24 keys):

```
Ledger-Homepage        claw-memory        japan-2027           orryx-risk-compliance
Shoreline-Build-Pack   desktop-tutorial   japan-2027-reports   orryx-security
property-maintenance-os game-sounds       ledger-au            orryx-vault
                                          orryx-memory         orryx-reports
```

They default to `unknown` → `delegation_allowed: false`. **This is the code working
correctly** — §9 of the assessment argues precisely that unclassified must read as
refused. But rollout will hit each as a silent refusal, so they need classifying first.
Several (`orryx-vault`, `orryx-security`, `orryx-risk-compliance`) should stay refused
on their merits; `japan-2027*` is personal and out of estate scope entirely.

Two classified keys have no registry entry: `pillarworks_brand_identity`,
`trialmatch-ai---website`. Harmless (dead keys refuse nothing), worth tidying.

**C.3 Order.** Track A 1–3 → ratify D4 → classify the fourteen → pilot exit criteria met
→ then `orryx-delivery-dashboard` / `orryx-website` at R1, one repo at a time, each with
a named human on the merge. Pillarworks and platform follow. PHI does not follow; it
requires its own decision record (DR-2026-003, *Conditions* 6).

---

## D. Open decisions — operator only

| # | Decision | Status after this session | Blocks |
|---|---|---|---|
| **D1** | Metered Anthropic API key, spend cap set. New recurring cost. Not substitutable with the Max subscription. | Unchanged — needs a call. | Track B entirely |
| **D2** | Container host. | **Recommendation now available**: Docker Desktop, already installed, backing store intact (§B.1). Still needs the call. | P1, Track B |
| **D3** | Were the nine hooks dropped deliberately or lost? | **Question of fact is closed — never written** (§A.1). What remains is intent: was Phase 3 aspirational scaffolding (retire the nine, adopt `documented`), or a Phase 4 that should still happen (build them)? §A.3 argues five cannot be built as declared regardless. | Track A scope |
| **D4** | Ratify the PHI exclusion. | Unchanged — `eligibility.js` encodes it correctly and awaits ratification. | Track C, `eligibility.js` |

**D3 is the cheapest to close and unblocks the most.** The recommendation is: treat
Phase 3 as aspirational, adopt `hard`/`documented`, build one hook properly rather than
nine badly.

---

## E. Constraints honoured

No delegated execution proposed in any PHI repository. No personal subscription in any
non-interactive or CI path — the CI proposed in A.4 runs lint/types/tests/security, not
a model. No direct write to a protected branch. **No edit proposed to `risk.js`,
`work-order.js` or `adjudicate.js`** — nothing in this plan requires one, and §B.3's
runbook edits are documentation. Nothing enabled, nothing installed, no `wsl --unregister`
run: §B.1 is a proposal for the operator, not an action taken.
