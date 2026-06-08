# Orryx Consulting — Conversion Delivery Plan

**Status:** Active · **Created:** 2026-06-08 · **Owner:** founder
**Decision record:** [DR-2026-001](../decisions/DR-2026-001-orryx-consulting-repositioning.md)
**Goal:** Stand up a working lead-capture → conversion engine for a high-touch advisory firm,
then productise delivery so it scales with minimal headcount.

> **Prime directive:** the conversion spine (Sprint 0-2) is the *only* path to first revenue.
> The platform (orryx-brain, MCP gateway, domain servers) is background. Don't build the
> factory instead of selling.

---

## 1. Operating model

**Repos in play**
- `orryx-website` — consolidated advisory site (from `Orryx-Premium-Website`, stripped of product).
- `orryx-control-plane` — delivery / strategy / monetisation artifacts (this repo).
- `orryx-knowledge` — professional-services delivery track (Wave C).
- `orryx-compass` — new local strategic + monetisation dashboard.

**Branch / work-tree model** (honours the enforced branch-isolation rule)
- `main` protected; no direct commits.
- One git **worktree per active stream**: `../orryx-wt/<branch>`.
- Branch naming: `feat/<agent>-s<N>-<slug>`.
- Merge: feature branch → PR → cross-model verification (Claude implements → GPT-4 reviews)
  → `/merge-review` → squash-merge → tag `mvp-s<N>`. **Merges are human-gated.**

**Ralph quality gates — React/TS variant** (replaces ruff/mypy/pytest/bandit)

| Gate | Command | Pass |
|------|---------|------|
| Lint | `eslint .` | 0 errors |
| Format | `prettier --check` | clean |
| Types | `tsc --noEmit` | 0 errors |
| Unit | `vitest run` | all pass |
| E2E (conversion path) | `playwright test` | lead-form → CRM → confirmation passes |
| Perf/SEO/a11y | `lhci` | >=90 perf, >=95 SEO/a11y |
| Security | `npm audit --audit-level=high` | no high/critical |
| **No-fabricated-proof** | grep guard (placehold.co, "50+ implementations", "40+ hours", fake names, "client achieved") | **0 matches — fails build** |

**Swarm roster:** Architect (Opus), Engineer (Claude), Designer (Claude), Researcher (Opus),
Tester (Claude), Reviewer/QA (GPT-4), Hygiene (Claude), Trust Steward (human + Claude).

**CPD streams each sprint:** Development · Research (N+1) · Discovery · Review · Planning.

**Human gates (founder-only, auto-posted to human-actions/queue.yaml):** positioning sign-off ·
which proof is *true* · pricing · brand architecture · go-live · public copy · named delivery lead.

---

## 2. Epics → Sprints

### Epic A — Conversion Spine (the only path to first revenue)

#### Sprint 0 — Foundation & Decommission (1 wk)
Goal: clean ground truth, tooling provisioned, fabricated proof eliminated, artifacts seeded.
ACs: orryx-website consolidated (others archived) · no-fabricated-proof gate live & passing ·
tooling spine provisioned (n8n/Cal.com/SES) · strategy/monetisation/human-action artifacts seeded ·
analytics event schema defined.
Ralph: `Stand up orryx-website skeleton (Vite+React+TS + design system), wire gates incl.
no-fabricated-proof, all green on empty shell`.
Branches: `feat/engineer-s0-foundation`, `feat/hygiene-s0-consolidate`, `feat/architect-s0-delivery-plan`.
Research: R-01 CRM/booking tool selection (AU); R-02 AU APP obligations for lead data.
Human gates: HA-001 tooling limits.

#### Sprint 1 — Positioning & Proof (1-2 wk)
Goal: the credibility half — Home (positioning), How We Work (real 5-step method),
Proof (example solutions as capability demos; NO founder, NO subsidiaries).
ACs: Home reflects agreed positioning · method renders real Discover→Optimise · proof page uses
only verified capability demos (Trust Steward sign-off logged) · Lighthouse >=90/95/95.
Ralph loops: L1a Home+positioning · L1b How-We-Work · L1c Proof/example-solutions.
Swarm: Refinement on Home; **Verification (human Trust Steward) mandatory on Proof**.
Research: R-03 AU professional-services AI buying triggers/objections; R-04 advisory teardowns.
Human gates: HA-002 example solutions, HA-003 positioning sign-off.

#### Sprint 2 — Conversion Path **(LEAD CAPTURE GOES LIVE)** (1-2 wk)
Goal: Assessment offer page, Book/Contact, lead form → CRM → automated follow-up (dogfood #1),
funnel instrumented.
ACs: Assessment page (A$1,500, credited, money-back) · booking works E2E · lead form persists to
CRM (playwright proves it) · follow-up sequence fires · funnel events update monetisation.yaml ·
a stranger reaches a booked call unaided (QA acceptance).
Ralph loops: L2a Assessment page · L2b booking+contact · L2c lead-form↔CRM↔follow-up
(gate must include the E2E conversion test).
Branches: `feat/engineer-s2-assessment`, `-s2-lead-form`, `-s2-followup` (3 worktrees, sequential merge).
Research: R-05 advisory funnel benchmarks; R-06 high-converting Assessment structures.
Human gates: HA-004 named delivery lead, HA-005 GO-LIVE.
**Exit = first revenue path operational.**

### Epic B — Qualify & Nurture

#### Sprint 3 — (1-2 wk)
Goal: raise lead quality, warm without manual founder effort.
ACs: short AI Opportunity Snapshot lead magnet (4-6 Qs, email-gated — NOT the heavy 6-step intake) ·
returns tailored teaser + books call · nurture sequence live · founder content cadence tooling.
Reuse: shorten archived `consulting-intake` (Hygiene salvage).
Research: R-07 lead-magnet formats; R-08 AU PS channels (CA ANZ, CPA, law societies, strata).

### Epic C — Productise Delivery (margin + accessibility + product seed)

#### Sprint 4 — (ongoing, demand-pulled)
Goal: automate the Assessment so one person delivers many; each engagement deposits reusable assets.
ACs: Assessment pipeline (intake → opportunity map → ROI scoring → draft report, semi-automated;
**Temporal** here) · each engagement writes patterns to `orryx-knowledge` (PS track) ·
first real domain server hardened ONLY when a paying client needs it (`orryx-accounting` first candidate).
Discipline gate: no domain-server build without a signed client.

### Parallel — Example Solutions stream (proof + product seed + dogfood)
Build the 3-5 example solutions (HA-002) as working capability demos. Starts Sprint 1, runs parallel.

---

## 3. orryx-compass — Strategic & Monetisation Dashboard

Local-first; reads the on-disk artifacts this plan emits (mission-control philosophy).
Architecture: artifacts → Node watcher/parser → JSON API → React (Vite). No DB (files are the DB).

| Panel | Source | Shows |
|-------|--------|-------|
| North-Star ribbon | strategy/north-star.yaml | Goals, % to target, focus |
| Monetisation | strategy/monetisation.yaml | Funnel, pipeline value, MRR vs target, time-to-first-revenue |
| Delivery status | delivery/sprints/*, reports/ralph-index.json | Sprint burn, ralph health, active branches |
| Human-Action Queue | human-actions/queue.yaml | DO NOW / DECIDE TODAY / NEEDS JUDGEMENT, unblocks-N, STUCK |
| Issues & Blockers | issues/blockers.yaml | Days-open, STUCK auto-flag |
| Freshness | file mtimes | FRESH / STALE / DISABLED (honest gaps) |

**Human-action surfacing loop:** any Ralph `[REQUIRES HUMAN REVIEW]`, swarm decision, or sprint
human-gate → agent writes an item to human-actions/queue.yaml → compass surfaces it → founder
resolves → dependent task unblocks.

**Dashboard build (parallel to Epic A):**
DB-0 schemas + parsers · DB-1 north-star + monetisation + delivery panels · DB-2 human-action
queue + blockers · DB-3 live feed (n8n syncs analytics + CRM → monetisation.yaml).

---

## 4. Sequencing

```
S0 Foundation → S1 Positioning&Proof → S2 Conversion LIVE → S3 Qualify → S4 Productise
   │                                       ▲
   └ DB-0 → DB-1 → DB-2 → DB-3 (compass reads the artifacts the sprints emit)
   Research R-01..R-08 parallel (CPD mandatory agents each sprint start)
   Example-solutions stream parallel from S1
```
Critical path to first revenue: **S0 → S1 → S2.** Dashboard + research never block the spine.

## 5. Success metrics
Engine validated at 2-4 booked discovery calls/month → 1-2 paid Assessments. North-star
A$10k MRR from retainers. Ralph loops converge <=5 iters. 0 fabricated-proof violations (enforced).

## 6. Deep-research queue
R-01 CRM/booking (S0) · R-02 AU APP lead data (S0) · R-03 AU PS buying triggers (S1) ·
R-04 advisory teardowns (S1) · R-05 funnel benchmarks (S2) · R-06 Assessment structures (S2) ·
R-07 lead-magnet formats (S3) · R-08 AU PS channels (S3). Outputs → research/outputs/.
