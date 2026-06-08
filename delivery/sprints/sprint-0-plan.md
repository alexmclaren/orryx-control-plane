# Sprint 0 Plan — Foundation & Decommission

**Duration:** 1 week · **Epic:** A (Conversion Spine) · **Owner:** founder
**Plan:** [CONVERSION_DELIVERY_PLAN.md](../CONVERSION_DELIVERY_PLAN.md)

## Goals
1. **Clean ground truth** — one consolidated `orryx-website`; fabricated proof eliminated and
   blocked from returning.
2. **Provision the tooling spine** — n8n / Cal.com / SES, decoupled from the heavy platform.
3. **Seed the artifact set** so `orryx-compass` has live data on day one.

## Backlog
| # | Task | Stream | Size | Owner | Branch | Status |
|---|------|--------|------|-------|--------|--------|
| TP-2026-007 | Consolidate websites → `orryx-website`; scaffold Vite+React+TS + gates | Development | L | Hygiene+Engineer | feat/hygiene-s0-consolidate | queued |
| TP-2026-008 | No-fabricated-proof CI gate + strip all fake proof | Development | M | Engineer | feat/engineer-s0-proof-gate | queued |
| TP-2026-009 | Provision tooling spine (n8n self-host, Cal.com, SES) | Infrastructure | M | Engineer | feat/engineer-s0-tooling | blocked (HA-001) |
| TP-2026-010 | Seed delivery artifacts + orryx-compass DB-0 (schemas + parsers) | Development | M | Architect+Engineer | feat/architect-s0-delivery-plan | active |

## Research Queue (parallel, launched at sprint start)
| Topic | Priority | Agent | Output |
|-------|----------|-------|--------|
| R-01 CRM/booking stack for AU solo advisory | high | Researcher (Opus) | research/outputs/ |
| R-02 AU APP obligations for lead data | high | Researcher (Opus) | research/outputs/ |

## Parallel Agents
| Agent | Task | Branch |
|-------|------|--------|
| Hygiene | Archive Bold-Hero, Landing-Waitlist, hybrid; consolidate | feat/hygiene-s0-consolidate |
| Engineer | Scaffold + proof gate + tooling | feat/engineer-s0-* |
| Architect | Artifacts + compass schema | feat/architect-s0-delivery-plan |
| Researcher | R-01, R-02 | n/a (research) |

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Building the platform instead of selling | Sprint 0 touches ONLY conversion-critical infra; domain servers untouched |
| Self-hosting n8n blocked | HA-001 pending; hosted fallback (n8n-cloud/Make) ready |
| Fake proof re-enters later | CI gate makes it a build failure, permanently |
| Yet another website iteration | Consolidate + strip, do NOT greenfield |

## Definition of Done
- All React/TS quality gates pass (incl. no-fabricated-proof).
- `orryx-website` is the single source; others archived.
- Tooling spine reachable (or HA-001 fallback chosen).
- strategy/monetisation/human-action artifacts committed; compass DB-0 parses them.
- Human-gated items posted to human-actions/queue.yaml.
- Sprint 1 plan drafted (CPD mid-sprint planning).
