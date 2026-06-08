# Audit 2026-001 — Orryx Website Conversion Swarm

**Date:** 2026-06-08 · **Method:** 30-agent multi-lens audit + adversarial verification + strategy stress-test
**Scope:** `orryx-website` (post-repositioning) · **Findings:** 1 critical · 8 high · 19 medium · 10 low + 4 strategy lenses
**Source run:** wf_05571c05-369

---

## Executive summary (brutal)

The site **cannot make money in its current state**, and the gap is not subtle:

1. **The funnel terminates in a dead end.** `BookSession.tsx` `handleSubmit` captures nothing (no fetch/POST/CRM anywhere); the "calendar" is a permanent fake spinner that never resolves; the newsletter handler is a no-op. **Conversion is structurally zero.**
2. **Split-brain identity.** Home/Hero/Examples/Assessment hold the approved plain-English SMB line, but **About, Methodology, BookSession, SolutionGrid** still speak the old enterprise voice ("future-state operating model", "senior transformation architect", "1,000+ employees", "Mining"). The Hero promises "No jargon" one screen above the jargon-heavy AIInfrastructure diagram. Whiplash = reads as amateur or dishonest — fatal for an honesty-led firm.
3. **The offer evaporates at commitment.** Every CTA → `/book`, but `/book` never states the A$1,500 fee, the credit, the guarantee, or the 5 deliverables (those live only on `/assessment`). `/book` instead sells three generic "strategy session" tiers that anchor against and devalue the paid flagship.
4. **No acquisition motion (strategy).** A new domain with broken capture is a storefront on an empty street. First 3–5 clients come from founder-led outbound + warm/referral, not cold inbound. The free "AI Opportunity Snapshot" lead magnet doesn't exist.

Underneath: undefined/exploitable guarantee · data-residency (the #1 silent objection for AU lawyers/accountants) never addressed · HIPAA/GDPR cited instead of the **Privacy Act 1988 / APPs** · placeholder SEO ("Orryx Premium Website" title, no meta/OG/sitemap) · dead "visual only" mobile hamburger · 40 silent `tsc` errors · dead Marketplace/Log-In links from the removed product surface.

> **Bottleneck:** wire the funnel · unify the voice · carry the offer to the booking screen · then drive outbound.

---

## Founder decisions required (strategy forks — block the rebuild)

| # | Fork | Options | Panel lean |
|---|------|---------|-----------|
| **F1** | **Booking model** | (a) free discovery call that SELLS the A$1,500 assessment · (b) direct purchase | Decide, then make `/book` reflect ONE path with price/terms visible |
| **F2** | **Pricing** | A$1,500 sits in a "dead zone". Test (a) ~A$500–750 tripwire · (b) A$2,500–3,500 premium · (c) keep A$1,500 but anchor hard vs cost-of-inaction | Anchor vs cost of inaction; pick by what the ICP actually pays |
| **F3** | **Narrow the beachhead** | Four segments ≠ a beachhead. Commit publicly to ONE sub-vertical (accounting OR strata) for the first ~5–10 builds | Lead one vertical; others = "we also work with" |
| **F4** | **Guarantee definition** | Full money-back on a subjective deliverable is exploitable | Make objective: "if we don't surface ≥3 concrete, costed opportunities, full refund"; consider credit/rework vs cash |

Also needs founder-supplied facts: **ABN**, business email/phone, city (e.g. Sydney NSW), LinkedIn company page; and the true **data-handling commitments** (AU-based, APP-aligned, no training on your data, NDA on request, you own outputs).

---

## Top recommendations (ranked)

1. **[CRITICAL] Wire the funnel end-to-end** — real lead capture (POST → inbox + lightweight CRM: HubSpot-free/Airtable, or Formspree as floor) + a real scheduler (Cal.com/Calendly), killing the fake spinner. Until fixed, everything else converts to zero.
2. **[HIGH] Carry the A$1,500 offer + risk-reversal onto `/book`** and collapse to one coherent path (per F1).
3. **[HIGH] Unify voice to plain-English SMB** — rewrite About, Methodology, BookSession, SolutionGrid (+ AIInfrastructure already done).
4. **[HIGH] Build the free "AI Opportunity Snapshot"** lead magnet (founder-delivered; no automation needed) as the low-friction entry.
5. **[HIGH] Stand up the outbound motion** — 100–150 ICP target list; founder-led email/LinkedIn; warm/referral asks; the site is the credibility backstop, not the engine.

## Launch-readiness backlog (fork-independent — buildable now)

- Mobile menu (Navbar "visual only" hamburger has no onClick; nav + Book CTA hidden on mobile).
- Fix dead product links: Footer "Marketplace" → /assessment; remove NotFound "Log In"/"Explore Marketplace".
- Add Home → /examples and /assessment links (the intended funnel isn't reachable in the UI).
- HIPAA/GDPR → Privacy Act 1988 / APPs in `solutionData.ts`, `insightsData.ts`.
- Plain-English data-residency + "we don't train on your data" trust block (needs founder facts).
- Accountability strip: ABN, city, email/phone, Alex & Tyson as Solutions Leads, LinkedIn (needs founder facts).
- Base SEO: real `<title>`, meta description, canonical, OG/Twitter, `lang="en-AU"`; `robots.txt`; `sitemap.xml`; Organization/Service JSON-LD (no aggregateRating/reviews — guardrail).
- Per-route metadata (react-helmet-async) + static prerender for marketing/insights routes.
- Add `tsc --noEmit` to build + fix the ~40 strict errors; add CI typecheck gate.
- Single `<ScrollToTop>` in App.tsx; remove ~10 per-page scroll effects.
- Remove dead deps (recharts/@xyflow/react/@emotion/react) + orphaned `components/infrastructure/*`, `data/marketplaceData.ts`.
- `index.tsx` → React 18 `createRoot`.
- Honest booking fallback until live wiring: real mailto/Formspree + honest confirmation (no fake spinner).
- Define funnel/capacity model; instrument analytics + UTMs + pipeline tracker.

## Strategy stress-test — additional risks
- "Plain-English" is a tone, not a moat → make the **Assessment deliverable itself** the proof (publish a redacted sample Opportunity Map); differentiate on offer structure + "we build and run, not just advise".
- AU professional-services are AI-cautious/trust-gated → lead with guarantee + data commitments; earn 1–2 nameable founding-client references ASAP (one accounting reference unlocks the vertical).
- Channel-partner referrals (bookkeepers/MSPs serving the ICP) are likely the single highest-leverage motion to bypass the trust vacuum.
