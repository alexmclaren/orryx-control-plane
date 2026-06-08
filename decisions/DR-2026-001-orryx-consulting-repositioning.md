# DR-2026-001 — Orryx Consulting Strategic Repositioning

**Status:** Accepted
**Date:** 2026-06-08
**Owner:** founder
**Scope:** Orryx Consulting (orryx.dev advisory front) — not the venture studio or subsidiaries.

---

## Context

`Orryx-Premium-Website` presented three conflicting identities (venture studio + self-serve
marketplace at A$29/mo + bespoke consultancy) and shipped fabricated proof (placeholder
testimonials, "50+ implementations", unattributed metrics). The domain MCP servers
(`orryx-accounting`, `orryx-sales`, etc.) are empty scaffolding. The site is a Magic Patterns
prototype, so sunk cost is low.

A strategic review concluded the firm should reposition as a **high-touch advisory** for
Australian SMEs/professional-services, with productised/automated delivery as the lever that
makes it affordable and scalable with minimal headcount.

## Decisions

| Ref | Decision |
|-----|----------|
| **DEC-02** | `orryx.dev` = the advisory firm's commercial front. Subsidiaries (Triora, Pillarworks, orryx-flow, Fertility) kept fully separate and **never used as proof**. |
| **DEC-01** | Tooling: **n8n self-hosted** = orchestration spine; **Cal.com** = booking; **AWS SES** = email; **orryx-compass** artifact store doubles as lightweight CRM; **Temporal** reserved for the Sprint-4 Assessment pipeline. Principle: buy commodity, self-host the glue, build the differentiator later. *(Pending founder confirmation of self-hosting limits — HA-001.)* |
| **DEC-03** | Flagship = **AI Opportunity Assessment**, ~**A$1,500**, productised, fee **credited toward implementation**, **money-back guarantee**, ~1 week. Free **AI Opportunity Snapshot** = small-business on-ramp. Bespoke = custom quote. **Foundation-client play: yes, capped at 2-3** discounted/free engagements to build first references. |
| **DEC-04** | Trust via **example/conceptual solutions framed as capability demos** (never client outcomes) + generic method/governance + guarantee + earned case studies later. **No founder marketing face**; option (a) = a **named delivery lead** on discovery calls only. |
| **DEC-05** | Delivery/strategy/monetisation artifacts live in `orryx-control-plane`; strategic dashboard = new `orryx-compass`. |

## Positioning

> Boutique-quality AI guidance at accessible prices because we automate our own delivery —
> proven with working example solutions, not claims.

- **Market:** Australia.
- **Beachhead:** professional-services cluster (accounting, legal, advisory, agencies,
  bookkeeping); property/strata second. Focused *marketing*, flexible *delivery*.

## Consequences

- The conversion spine (Sprints 0-2) is the only path to first revenue; the platform
  (orryx-brain, MCP gateway, domain servers) is NOT on that critical path.
- Trust load shifts onto example solutions + the Assessment experience + risk reversal, since
  subsidiaries and a founder face are excluded — raising the importance of the foundation
  clients (SG-2).
- A **no-fabricated-proof CI gate** is mandatory and blocks any build that reintroduces fake
  proof (placeholder logos, unearned metrics, "client achieved X" on demo content).
- Domain-server products are demand-pulled: hardened only when a paying client needs one.

## Open inputs (tracked in human-actions/queue.yaml)

HA-001 tooling limits · HA-002 example-solution list · HA-003 positioning sign-off ·
HA-004 named delivery lead · HA-005 go-live approval.
