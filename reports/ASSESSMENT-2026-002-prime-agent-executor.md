# ASSESSMENT-2026-002 — Prime Agent as an execution runtime beneath the Orryx control plane

**Date:** 2026-08-09
**Scope:** Portfolio-wide — Orryx platform, Pillarworks, Triora, Consulting, Care Companion
**Decision record:** `decisions/DR-2026-003-autonomous-executor-runtime.md`
**Method:** Repository inspection first, external primary sources second, judgement labelled as such.

Sections are labelled by evidence class: **[REPO]** repository evidence,
**[EXT]** external primary source with access date, **[JUDGEMENT]** architectural
opinion, **[UNRESOLVED]** open uncertainty.

---

## 1. Reality check — the brief's premise does not match the repository

**[REPO] `orryx-flow` is not a control plane.** `README.md` line 1: "Orryx Flow -
Clinical Workflow Operating System". FastAPI + PostgreSQL + React 19, "43 RESTful
endpoints", patient journeys, clinical task routing, fertility module, patient
safety systems. `ARCHITECTURE.md`'s "ORCHESTRATION LAYER" is *Task Engine,
Workflow State Machine, Routing* for clinic staff — not agent orchestration.

A repository-wide search for the governance vocabulary the brief assumes
(`work order`, `risk tier`, `cycle gate`, `executor`, `adjudicat*`) returns 22
matches across 7 files in `orryx-flow`, all incidental — an SMS service,
performance tests, a protocol template. There is no executor abstraction, no
agent lifecycle, no cycle gate, no watchdog and no work-order schema in that
repository.

**[REPO] `orryx-flow` is a PHI healthcare product.** `E:\Orryx\CLAUDE.md` §4:
"`orryx-flow` sits under the `orryx-*` prefix but is a **healthcare product**. It
carries Triora-grade constraints, not platform-grade ones." PHI region-locked to
`ap-southeast-2`, KMS at rest, TLS 1.3, 10-year audit retention, CDSS-only.
§5: PHI repos are "Claude + local only on code", and `Clinical_trials` commit
`b72f026` removed cross-vendor verification *as a security fix*.

**[JUDGEMENT]** Placing an experimental harness beneath `orryx-flow` would be the
single highest-risk placement available in the estate. The brief's own constraints
5 and 4 forbid it; the repository evidence explains why.

**[REPO] The control-plane role is real but distributed.**

| Function | Where it actually lives | State |
|---|---|---|
| Execution protocol, risk language, budgets | `orryx-standards/CLAUDE.base.md` (724 lines), `.claude/config/*.yaml` | Declarative |
| Deployment gates, compliance | `orryx-governance/policies/deployment-gates.yaml` | Declarative |
| Task packets, human-action queue | `orryx-control-plane/task-packets/`, `human-actions/queue.yaml` | YAML records |
| Gate observation, evidence surfacing | `orryx-delivery-dashboard/lib/` (45 modules, 13 test files, CI) | **Executable** |
| Agent execution attempt | `orryx-brain/orryx-orchestrator/` | Abandoned, see §3 |

**Working directory note:** the session opened at `D:\`, which is not a git
repository. The estate is at `E:\Orryx\repos\` (30 clones),
`E:\Triora\repos\` (3), `E:\Pillarworks\repos\` (6).

---

## 2. The finding that drives the recommendation

**[REPO] The governance that would constrain a harness is mostly unenforced.**

`orryx-standards/.claude/config/governance.yaml` declares six systems, four at
`enforcement_level: hard`, `can_override: false`. It wires thirteen hook scripts.
Nine do not exist:

| Hook referenced | Exists |
|---|---|
| `pre-planning-memory-retrieval.ts` | yes |
| `pre-edit-memory-retrieval.ts` | yes |
| `pre-debugging-memory-retrieval.ts` | yes |
| `post-story-memory-write.ts` | yes |
| `context-budget-check.ts` | **no** |
| `read-before-edit-gate.ts` | **no** |
| `dependency-check.ts` | **no** |
| `execution-budget-check.ts` | **no** |
| `session-metrics-log.ts` | **no** |
| `pre-commit-lint.ts` | **no** |
| `pre-commit-types.ts` | **no** |
| `pre-commit-tests.ts` | **no** |
| `pre-commit-security.ts` | **no** |

There is also no `settings.json` in `orryx-standards` registering any hook with
Claude Code. The four surviving hooks are memory-retrieval, all non-blocking.

Real enforcement today: GitHub Actions CI (`orryx-flow` has 4 workflows, 20KB
`ci-cd.yml`), `orryx-flow/.claude/hooks/pre-commit` (a genuine shell gate, with a
`SKIP_HOOK` escape hatch), and the operator reading the protocol.

**[JUDGEMENT]** This is the crux. `execution-budgets.yaml` specifies retry
budgets, cost ceilings, loop detection and confidence decay in careful detail —
and nothing reads it. An interactive human running Claude Code approximates these
rules by reading them. An autonomous harness would not, because there is nothing
to enforce them against. Delegating execution beneath this layer would produce
the appearance of governance without its substance.

---

## 3. Prior art: the harness that was already built and abandoned

**[REPO] `orryx-brain/orryx-orchestrator/`** — TypeScript, 10 source files:
`agent-executor.ts`, `state-monitor.ts`, `trigger-evaluator.ts`,
`mode-activator.ts`, `clients/claude.ts`, `clients/paperclip.ts`,
`rules/kill-protocol.ts`, `rules/never-idle.ts`, `rules/pressure-system.ts`.

`VALIDATION_REPORT.md` (2026-04-04): "**Status**: PARTIAL SUCCESS ⚠️ … **CRITICAL
GAP**: Agent execution loop not verified - task remains in 'planned' status".

Reading `agent-executor.ts`: the loop calls the Claude API for a decision, then
executes it by *writing task comments and creating tasks in Paperclip*. It never
edits a file, runs a test, or produces evidence. Roles are hardcoded
(`ceo`, `pm`, `cto`, `engineer`, `qa`) and run sequentially with a 1-second sleep.

**[REPO]** `CLAUDE_CODE_INTEGRATION.md` in the same directory proposes file-based
queueing precisely so that "**All agent execution uses Claude Code subscription** …
**No separate Anthropic API costs**". That is the architecture the brief's
constraint 2 rules out, already written down as a design goal.

**[JUDGEMENT]** Two lessons. First, the previous attempt failed at the point where
an agent must *do work and prove it*, not at orchestration — which is exactly
where Prime Agent is strong and where a home-built harness is weak. Second, the
subscription-as-infrastructure instinct is already present in the estate and will
recur unless the config layer refuses it. It now does.

---

## 4. Prime Agent — external findings

All accessed **2026-08-09**.

**[EXT] Identity and licence.** `github.com/PrimeIntellect-ai/prime-agent` — MIT,
TypeScript, default branch `main`, not archived. GitHub API: `created_at`
2026-05-08, `pushed_at` 2026-08-09, **9,352 stars, 907 forks, 404 open issues**.
Public release 2026-08-05.

**[EXT] Architecture.** Two abstractions: a Recursive Language Model (context as
variables, sub-agents as function calls inside a persistent IPython REPL) and a
Continual Harness formalised as `H = (ρ, G, K, M)` — prompt, sub-agents, skills,
memory — with CRUD over each. One persistent IPython kernel per agent. `rlm(...)`
spawns child agents non-blockingly. A background daemon manages sessions; workers
recover from JSONL snapshots after crashes. Agent messaging is deliberately
restricted to parent/sibling/child.

**[EXT] Self-improvement.** `/refine` reads the trajectory and applies minimal
edits to prompts, skills, memory or sub-agent specs. The base system prompt is
immutable; bad updates revert by ID.

**[EXT] Security posture — verbatim from the repository:** Prime Agent "executes
model-generated Python and project commands with your user permissions … they are
**not** a security sandbox. Review changes and use trusted repositories,
instructions, skills, and extensions only." Documentation recommends "disposable
clones or restricted environments", and acknowledges agents can circumvent safety
constraints when beneficial.

**[EXT] Interface.** JSON mode and RPC mode documented for "headless automation
and integrations". CLI has `attach`, `--resume`, `/heartbeat`, schedules, `/goal`.

**[EXT] Platform.** Installer is `curl … install.sh | sh`, macOS or Linux.

**[EXT] Providers.** Subscription logins (Claude, Codex, GitHub Copilot), API keys
(Anthropic, OpenAI, Google, Groq), self-hosted (vLLM, Ollama, LM Studio).

**[EXT] Benchmark.** ARC-AGI-3 95.5% RHAE Best@1 with Opus 5, against a stated
human expert baseline of 95.4%.

**[UNRESOLVED]** A near-identical repository `prime-RLM-agent/prime-agent`
("Download prime agent…") appears in search results. Not verified as malicious,
but any install must pin the `PrimeIntellect-ai` origin and verify the published
SHA-256. Treat search results as an untrusted install path.

### 4.1 Host environment — probed on `DESKTOP-3KRD96T`, 2026-08-09

**These results are machine-specific and do not transfer.** They were measured on
`DESKTOP-3KRD96T` (repos at `E:\Orryx\repos`). The estate spans at least two
machines — `orryx-state/align-machine.ps1` maps both `DESKTOP-3KRD96T` and
`DESKTOP-V0RDMNK` (repos at `D:\`). Re-probe before relying on any row below.

| Probe | Result on `DESKTOP-3KRD96T` |
|---|---|
| `wsl -l -v` | one distro: `docker-desktop`, **Stopped**. No general-purpose Linux. |
| `docker version` | daemon not running — `dockerDesktopLinuxEngine` pipe absent |
| `node --version` | v24.18.1 (Windows) |
| `python --version` | 3.14.6 (Windows) |
| `git --version` | 2.55.0.windows.3 |

**[JUDGEMENT]** Prime Agent cannot be installed as documented on *this* host today.
WSL2 is present but has no usable distro; Docker is installed but stopped. That is
a half-hour of setup, not a blocker — but it means "integrate Prime Agent" was
never a same-session possibility, and any claim to have done so would be false.

**[UNRESOLVED]** Whether `DESKTOP-V0RDMNK` has a usable Linux distro or a running
Docker daemon. If it does, pilot prerequisite P1 is already met there and the
pilot can start sooner. This single probe is the cheapest way to move the decision
forward — see §2 of the pilot runbook.

**[REPO] Migration direction, noted because it affects where this work should
live.** `orryx-state/audit-unpushed.ps1` (2026-08-05) documents itself as
"Written 2026-08-05 for the Desktop-v0rdmnk -> desktop-3krd96t migration. Run it
on the machine you are thinking of retiring." On that record `DESKTOP-V0RDMNK` is
the machine being retired. Anything produced there should be pushed to GitHub
rather than left on disk, and `audit-unpushed.ps1` exists precisely to find work
that was not.

---

## 5. Claude subscription vs commercial API

**[EXT]** Anthropic withdrew third-party subscription OAuth in **April 2026**
(OpenClaw and similar), then **reinstated it with conditions**. The current
support article states: "we're pausing the changes to Claude Agent SDK usage
described below. For now, nothing has changed: Claude Agent SDK, `claude -p`, and
third-party app usage still draw from your subscription's usage limits" — pause
dated **2026-06-15**. The paused proposal described credits as per-user, not
pooled, and sized for "individual experimentation".

**[EXT]** Agent SDK documentation: Anthropic "does not allow third party
developers to offer claude.ai login or rate limits for their products … unless
previously approved", and SDK use is governed by the Commercial Terms when
powering products or services.

**[JUDGEMENT] — answering brief questions 9 and 10:**

| Workload | Credential | Why |
|---|---|---|
| Local interactive Claude Code | Subscription | Its intended use |
| One operator, one machine, manual pilot runs on a non-PHI repo | Subscription, acceptable | "Individual experimentation" is the documented sizing |
| Any CI or scheduled run | **API / Bedrock** | Non-interactive, unattended, no per-user attribution |
| Anything a client depends on | **API / Bedrock** | Commercial Terms; a paused consumer policy is not a supply contract |
| Anything multi-user or pooled | **API / Bedrock** | Credits are documented as per-user, not pooled |
| PHI repositories | **Anthropic or local only**, whatever the tier | `E:\Orryx\CLAUDE.md` §5; `Clinical_trials` `b72f026` |

Encoded in `executor/src/config.js`: `credential_source: 'subscription'` fails
validation unless `local_experiment_ack: true` is set explicitly.

---

## 6. Gap analysis — what Prime Agent would actually solve

**[REPO]/[EXT]** Legend: ✅ already have · ⚠️ partial · ❌ absent · **PA** Prime Agent would address.

| Capability | Current state | PA? | Note |
|---|---|---|---|
| Long-running session continuity | ❌ Session-bounded | **yes** | Daemon survives terminal disconnect |
| Resumability after process death | ❌ | **yes** | JSONL snapshots, `--resume`, `attach` |
| Persistent worker state | ⚠️ `orryx-state/` files, hand-maintained | **yes** | |
| Multi-agent coordination | ⚠️ Subagents within one session | **yes** | `rlm()` child sessions |
| Agent-to-agent communication | ❌ | **yes** | Restricted to parent/sibling/child |
| Heartbeat / watchdog visibility | ⚠️ `orryx-state/fleet-dark-watchdog.ps1` watches routines, not workers | **yes** | `/heartbeat` |
| Worker starvation | ❌ | partial | `never-idle.ts` existed in the abandoned orchestrator |
| Bounded autonomous continuation | ⚠️ `loop-stop-conditions` specified in prose, unenforced | **no** | PA does not know Orryx's bounds — **this is ours to build**, and now is |
| Scheduled execution | ⚠️ `routine-schedule.json` + Windows tasks | partial | PA has schedules |
| Reusable skills | ✅ 57 SKILL.md in `orryx-standards/routines/`, 7 in `orryx-flow/.claude/skills/` | overlap | Duplicate capability |
| Context / handover management | ✅ `context-budget.yaml`, handover docs, Pinecone hooks | overlap | Duplicate capability |
| Evidence collection | ⚠️ CI produces it; nothing structures it per work order | **no** | **Ours** — landed in `executor/src/evidence.js` |
| Provider portability | ❌ Nothing abstracts the provider | **yes**, but | PA's portability is PA's, not ours; the boundary is ours |
| Cost / token governance | ⚠️ `execution-budgets.yaml` declared, unenforced; `finops-ledger.json` exists | **no** | **Ours** — landed in `executor/src/budget.js` |

**[JUDGEMENT]** The split is clean and it is the whole argument. Prime Agent is
strong on the *runtime* column — persistence, resumption, fan-out, liveness.
It is silent on the *governance* column — bounded continuation under our rules,
evidence structured for our gates, budgets enforced against our ceilings. Those
were never going to arrive from a harness, and they are the things whose absence
makes delegation unsafe. So they are what got built.

Two capabilities Prime Agent offers are **already implemented** in the estate —
skills and context management — and adopting its versions would fork them.

---

## 7. Decision matrix

Scored 1–5, higher is better. Weights reflect the brief's constraints: governance
compatibility and security isolation dominate because constraints 1–7 are
non-negotiable; maturity is weighted because a four-day-old dependency is a
different proposition from a settled one.

| Criterion | Weight | A: Claude Code as-is | B: Prime Agent now | C: Internal harness | D: Other OSS | **E: Boundary now** |
|---|---:|---:|---:|---:|---:|---:|
| Governance compatibility | 5 | 3 | 2 | 4 | 2 | **5** |
| Session persistence | 3 | 1 | 5 | 2 | 4 | 2 |
| Multi-agent support | 2 | 3 | 5 | 2 | 4 | 2 |
| Resumability | 3 | 1 | 5 | 2 | 4 | 3 |
| Observability | 4 | 2 | 4 | 3 | 3 | **5** |
| Security isolation | 5 | 3 | **1** | 3 | 2 | **4** |
| Provider portability | 4 | 2 | 4 | 4 | 3 | **5** |
| Windows / WSL compatibility | 3 | 5 | 2 | 4 | 2 | **5** |
| Implementation effort (inverse) | 3 | 5 | 3 | 1 | 2 | 4 |
| Maintenance burden (inverse) | 4 | 4 | 2 | 1 | 2 | 4 |
| Maturity | 4 | 5 | **1** | 2 | 3 | 4 |
| Cost control | 3 | 2 | 3 | 3 | 3 | **5** |
| Vendor / subscription risk (inverse) | 4 | 3 | 2 | 4 | 3 | **5** |
| **Weighted total** | **47** | **154** | **131** | **135** | **129** | **196** |

Option B's three lowest scores are the disqualifying ones and none is a matter of
taste: security isolation 1 is upstream's own statement, maturity 1 is the
release date, Windows compatibility 2 is the absent Linux host.

Option E does not compete with B on runtime capability — it scores 2 on session
persistence, honestly, because it has none. It wins because it is the only option
that raises governance, portability and cost control *without* taking on an
unproven dependency, and because it makes B cheap to test later.

**[JUDGEMENT] Question 13 — would another harness fit better?** Not on current
evidence. Every credible alternative (OpenHands, SWE-agent, Aider, OpenClaw)
carries the same isolation prerequisite, and none is a security sandbox either.
The boundary makes that question answerable by experiment rather than argument,
which is the point.

---

## 8. Answers to the brief's questions

1. **What would Prime Agent actually solve?** Resumability, long-running
   sessions, worker persistence, agent fan-out, heartbeat. **[REPO]** none of
   which exists today.
2. **Already implemented in Flow?** Skills (57 routines) and context management
   (`context-budget.yaml`, Pinecone hooks, handover docs). Adopting PA's versions
   would fork live assets.
3. **Gaps remaining?** §6.
4. **Technically compatible?** Not on this host today — no Linux distro, Docker
   stopped. Compatible in principle via WSL2 or a container.
5. **Best host?** **[JUDGEMENT]** Docker container on WSL2 for the pilot, sized to
   a disposable clone. A dedicated Linux VM if it graduates. Never Windows-native:
   the installer does not support it and the isolation story is worse.
6. **Stable programmatic interface?** **[EXT]** Yes — JSON mode and RPC mode are
   documented for headless integration. **[UNRESOLVED]** whether the event
   vocabulary is stable enough to map without version pinning; 404 open issues at
   four days old argues for pinning a release, not tracking `main`.
7. **Security assumptions?** **[EXT]** That you trust the repository, the
   instructions, the skills and the extensions, and that you review changes. It
   assumes a human in the loop and a disposable environment. It is explicitly not
   a sandbox.
8. **Subscription limitations?** §5.
9. **What may use a Max subscription?** Local, single-operator, interactive
   experimentation on non-PHI repositories.
10. **What must use commercial API?** CI, scheduled runs, anything client-facing,
    anything multi-user. PHI repos: Anthropic or local only, regardless.
11. **Does a provider-neutral abstraction already exist?** **[REPO]** No.
    `orryx-orchestrator/src/clients/claude.ts` is a direct Anthropic wrapper in an
    abandoned tree. One now exists at `orryx-control-plane/executor/`.
12. **Adopt / pilot / defer / reject?** **Defer the harness, adopt the boundary.**
13. **Better harness?** §7.

---

## 9. Portfolio applicability

**[REPO]** Data classes per `E:\Orryx\CLAUDE.md` §4–5, `E:\Triora\CLAUDE.md` §5,
`E:\Pillarworks\CLAUDE.md` §5, and
`orryx-delivery-dashboard/registry/ventures.json`. Encoded in
`executor/src/eligibility.js`.

| Venture | Repos | Data class | Delegable (experimental) | Providers |
|---|---|---|---|---|
| Triora | `Clinical_trials` | PHI | **No** | Anthropic, local |
| Care Companion | `companion`, `care-companion-venture`, `brisbane-gynae-fertility` | PHI | **No** | Anthropic, local |
| Platform (healthcare) | `orryx-flow` | PHI | **No** | Anthropic, local |
| Pillarworks | `pillarworks-build-mvp` | Regulated non-PHI | Yes, ≤ R1 | full fleet |
| Pillarworks | `Pillarworks-Enterprise-Website` | Marketing | Yes, ≤ R1 | full fleet |
| Consulting | `orryx-website` | Marketing | Yes, ≤ R1 | full fleet |
| Platform | `orryx-delivery-dashboard`, `orryx-standards`, `orryx-knowledge`, … | Platform | Yes, ≤ R1 | full fleet |
| *Anything unlisted* | — | Unknown | **No** | Anthropic, local |

**[JUDGEMENT]** Unclassified defaults to refused. In a portfolio containing a live
PHI platform on a personal GitHub account with no organisation, no audit log and
no SAML (`E:\Orryx\CLAUDE.md` §6), "we hadn't got round to classifying it" must
not read as "safe to delegate".

---

## 10. Risks and unresolved uncertainty

**Operational risks:** Prime Agent is four days public with 404 open issues; the
API will move. `/refine` self-modification is the correct feature with the wrong
default for a governed estate — it must never reach constitutional files. Prime
Agent's `rlm()` fan-out multiplies spend in a way per-session budgets do not see;
our ledger caps the run, not the fan-out inside it. No GitHub organisation means
no org-level audit trail for anything a harness pushes.

**[UNRESOLVED]:**
- Whether Prime Agent reports token and cost deltas in a form the ledger can
  consume. Declared `false` in the adapter until measured — a token budget is
  refused rather than silently unenforced.
- Whether its JSON/RPC event vocabulary maps cleanly onto the thirteen event types.
- Whether `prime-RLM-agent/prime-agent` is a benign mirror or a typosquat.
- Whether Anthropic's paused subscription change lands, and how.
- Whether the nine missing hooks were removed deliberately or lost. This changes
  whether §2 is a gap or a regression, and it needs a human who was there.

---

## 11. Recommendation

**Defer Prime Agent. Adopt the boundary. Pilot on `orryx-delivery-dashboard` or
`orryx-website` once a container exists.**

The estate's problem is not that it lacks a harness. It is that its governance is
written down but not enforced, and its previous harness attempt died at the point
where an agent must prove its work. A more capable runtime beneath an unenforced
control plane makes both problems worse at once.

The boundary landed with this assessment is the part that survives whichever
harness is eventually chosen, and it is the part that makes choosing safe.
