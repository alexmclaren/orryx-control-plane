# Automated Lead Engine — Comprehensive Build & GTM Plan

**Status:** PROPOSED — extends [CONVERSION_DELIVERY_PLAN.md](CONVERSION_DELIVERY_PLAN.md) (Sprint 2–3 detail) under DR-2026-001
**Amendment 2026-06-11 (founder direction):** traffic acquisition = **SEO + Google Ads**, not automated email outreach. Marketing-email nurture sequences are **PARKED** pending a separate strategy; only transactional email remains in scope (scorecard delivery, booking confirmation/reminder — emails the lead explicitly requested).
**Date:** 2026-06-11 · **Owner:** founder · **Authored:** Claude (research-backed; sources cited inline)
**Companion artifacts:** `D:/orryx-brain/docs/strategy/ORRYX_DEV_SMB_REPOSITIONING_PLAN.md` (§10 reconciliation R1–R4, §11 GTM refocus), `ORRYX_DEV_MESSAGING.md` (claims policy), `ORRYX_DEV_OFFER_PACKAGING.md` (Epic C pricing spec)

**Team reality this plan is built for:** 2 people — Alex (dev) + Tyson (sales/relationships). Everything before a discovery call is automated; humans appear only at the call, the assessment debrief, the proposal, and any thread where a lead has replied.

---

## 1. The funnel (architecture, benchmark-backed)

```
Traffic (SEO + Google Ads [mo 3+] + referral / Tyson relationships)
  → AI Opportunity Snapshot quiz  (5 Q, scored, email gate before full scorecard)
      → instant scorecard PDF delivery (transactional, automated)
      → instant booking link on result page (Cal.com w/ qualification routing)
      → founder lead alert <5 min (Slack/SMS)
  → discovery call (HUMAN: Tyson/Alex; auto-confirmation + 24h reminder + pre-call form)
  → AI Opportunity Assessment  A$1,500, credited, money-back (productised, ~1 wk)
  → implementation engagement (foundation pricing → list pricing)
  → care plan (recurring)

[PARKED pending separate strategy: marketing-email nurture sequences, AI-drafted outbound]
```

**Why this shape (benchmarks):** quizzes convert visitors to leads at ~5.2% vs <0.9% for gated ebooks (HubSpot 2024); quiz start→lead runs ~40–42% for service providers (Interact, 80M-lead dataset); 5–7 questions is the completion sweet spot (65–85%, Outgrow); instant booking on the result page lifts form→meeting from ~30% to ~67% (Chili Piper 2025); behaviour-triggered email opens at 42% vs 15–27% broadcast (Belkins 2025); sequences cap at 5 touches before unsubscribe risk triples; responding <5 min converts 21% vs 2.3% at 24h+ (ArtemisGTM 2026) while the B2B average response is **47 hours** — our automation wins on speed alone.

**Funnel math (warm-biased, realistic):** 500 visitors/mo → 25–50 quiz starts → 10–20 leads → 3–6 calls → 1–3 paid Assessments → 1–2 implementations ≈ **A$10–40k/mo** steady state at ratified pricing.

### Components in build-priority order
1. **Snapshot quiz** — 5 scored questions (process volume, current tools, one named pain, openness, firm size); 3 bands; partial result free, full scorecard email-gated. **Custom build** (we're a dev shop; it's also dogfood demo #1, avoids per-lead SaaS fees, and doubles as an SEO link magnet — the strongest AU competitor analogue is Aivy's free readiness calculator).
2. **Instant booking** on result page + every CTA (Cal.com routing w/ qualification fields). Lifts form→meeting ~30%→67%.
3. **Scorecard PDF delivery on submit** (transactional email — the lead requested it).
4. **Assessment offer page** (7-element structure: outcome headline, itemised deliverables, who-it's-for/not-for, price + credit terms, capability-demo proof, risk reversal, single booking CTA). Doubles as the future Google Ads landing page — message-matched, single CTA, no nav.
5. **Lead alerts** — Slack/SMS to both founders on every quiz completion and booking (<5-min awareness; market average response is 47 h — speed is the structural edge).
6. **Call confirmation + 24h reminder w/ 3-question pre-call form** (transactional; no-show baseline 25–40%).
7. **Conversion instrumentation from day one** — analytics events on every funnel stage **plus GCLID capture stored in CRM at form submit** (prerequisite for Google Ads offline-conversion optimisation later; cheap now, painful to retrofit).

*(Parked: marketing nurture sequences, AI-drafted outbound replies — revisit under the future email strategy.)*

### CRM + data
orryx-compass = lightweight CRM (per DEC-01). Every funnel event (quiz start/complete, band, email opens, booking, call outcome) lands in `monetisation.yaml`/compass via n8n. Lead data handling per APP obligations — privacy note on the quiz, AU-resident storage, no lead data into model training.

---

## 2. Traffic engine — SEO-first, Ads at month 3 (research-backed)

**Honest framing:** a new domain sits in the sandbox ~3 months; first organic leads land month 4–6; "this is working" checkpoint is month 7–9 (0–3 organic leads/mo through month 6; 3–10/mo by month 12 at 2 pieces/mo + technical SEO done). Google Ads at our price point is a **scaling channel, not a launch channel** — modeled cost per A$1,500 Assessment is ~A$3,750 (loss) on an unproven funnel vs ~A$1,176 (3.0× LTV ROAS) once the lander converts ≥4%. So: SEO compounds from day one, ads switch on at month 3 after funnel proof, and **first customers in months 1–3 still come from Tyson's relationships/referrals** (which also satisfies the ads go/no-go gate of 3–5 Assessments sold before spend).

### 2.1 Technical SEO (week 1–2, blocking — the site is a client-rendered Vite SPA)
1. **Prerender or SSG the marketing pages** — Astro migration preferred (React islands keep existing components) or Vike/vite-ssg route prerendering. Never rely on Googlebot JS rendering for a site with zero authority.
2. Per-page `<title>`/meta/canonical (react-helmet-async if staying Vite).
3. JSON-LD: `Organization` (home), `ProfessionalService` w/ AU serviceArea (service pages), `FAQPage` (FAQ content) — schema is a prerequisite for AI Overview citations.
4. XML sitemap + Search Console + `hreflang="en-AU"` (compensates for .dev not being .com.au; no TLD penalty otherwise).
5. Core Web Vitals: LCP <2.5s, CLS <0.1, INP <200ms (Lighthouse ≥90 gate already exists).
6. Google Business Profile (service-area business, "Business Management Consultant" category) + 15–20 NAP-consistent AU citations (Hotfrog, StartLocal, True Local, AussieWeb — skip Yellow Pages, now paid).

### 2.2 Content plan (2 substantive pieces/month — quality over volume)
**Context that shapes everything:** 39% of AU searches now trigger AI Overviews (highest globally); informational posts are zero-click. Winners are **BOFU, AIO-resistant pages**: cost/pricing, comparisons, city pages, tools. First seven pieces, in order:
1. "How much does AI consulting cost in Australia? (2026 guide)" — cost pages are AIO-resistant and we already publish pricing (D2).
2. "Automate bookkeeping reconciliation: a guide for Australian accounting firms" (Xero-specific, ATO context).
3. "APES 320 and AI: what accounting firms must document" — **near-zero competition; uncontested compliance moat**; pitch to Accountants Daily as digital PR.
4. "Zapier vs Make for accounting firms (2026)" — comparison BOFU.
5. **Free AI Readiness Scorecard page** (= the Snapshot quiz, public, AU-benchmark-data-backed) — link magnet + lead capture in one.
6. City pages: AI consulting Sydney / Melbourne (genuinely differentiated, not doorway).
7. "AI for bookkeepers Australia" — earliest-adopter audience, low difficulty.
Keyword tiers and the full 15-target table are in the research digest; volumes must be verified in Keyword Planner (AU geo) before committing.

### 2.3 Google Ads (month 3, gated)
**Go/no-go gates before the first dollar:** lander CVR ≥3% proven on 200–300 organic/referral sessions · 3–5 Assessments already sold via relationships · GCLID capture + booking conversion tracking live · <2h follow-up capacity.
**Starter structure (A$1,500/mo):** 65% exact-match high-intent search ([AI consultant Australia], [business automation consultant], [automate accounting processes], geo-variants) · 10% brand protection · 25% remarketing. Manual CPC — **no Smart Bidding below ~30 conv/mo, no Performance Max** (documented ~73% B2B budget waste at small budgets, hides search terms, cannibalises brand). 100+ negative keywords pre-launch (jobs, free, courses, DIY, enterprise). Sydney/Melbourne metros, Tue–Thu 9–12 bid-up, weekends −50%. Microsoft Ads import at A$200/mo from month 4 (30–70% cheaper CPCs, LinkedIn-profile targeting, thin AU volume but cheap signal).
**Scale gate (month 5):** CPL <A$250 and ≥2 Assessments/mo from ads → raise to A$2,500–3,000 + offline-conversion upload ("qualified lead" as the bid signal, never raw form fills). LinkedIn Ads deferred until total budget ≥A$5k/mo (CPL 2–3× Google; better ICP targeting, needs bigger test budget).

### 2.4 Relationship track (months 1–3, parallel — feeds the ads gate)
Tyson: LinkedIn-first outreach (outside Spam Act; ACMA's Jul-2024 guidance makes scraped-list cold email non-compliant — fines to A$2.1M) using the APES 320 compliance hook to accounting-practice principals; bookkeeper referral channel via free Xero partner programme; CPD-session submission to CPA Tax Forum / ALPMA Summit 2026.

### 2.5 Objection pre-handling on-site (top 5, researched)
Privacy/APPs (55% cite it) · professional liability ("if AI is wrong, I own it") · billable-hour cannibalisation · ROI opacity · regulatory uncertainty — each gets an explicit answer on the Assessment page/FAQ (FAQPage schema).

---

## 3. Orchestration playbook — how we build (tools, swarms, Ralph, merges)

### 3.1 Method selection (when to use what)

| Work type | Method | Tooling |
|-----------|--------|---------|
| Market/channel/pricing research | **Swarmed deep research** — 2+ parallel research agents on distinct angles, claims cross-checked before use | `deep-research` skill or parallel `ce-web-researcher` agents |
| Feature build with clear ACs (quiz, nurture wiring, offer page) | **Ralph loop** in an isolated worktree: implement → run all gates → fix → repeat until green (min 2–3 iterations) | `ralph-wiggum:ralph-loop`, `ce-work` |
| Pre-merge review | **Swarm review** — parallel personas (correctness, security, frontend-races, project-standards) + adversarial verification of findings | `/code-review` (ce-code-review tiered personas) |
| Architecture/plan decisions | Plan-first session; founder ratifies; record as DR/TP in control-plane | `ce-plan`, `EnterPlanMode` |
| Public copy | Single-session draft → **founder review (non-negotiable gate)** → no-fabricated-proof CI must pass | claims policy (MESSAGING §5) |
| n8n workflow build/ops | Direct via n8n MCP (search/get/execute workflows) + versioned JSON exports in repo | n8n MCP server |
| E2E conversion verification | Playwright in CI **plus** live browser walk-through before go-live | `playwright`, Claude Preview / Claude-in-Chrome, `verify` skill |
| Deploy | Checklist-gated, founder-approved | `/deploy-check`, `/security-audit`, AWS MCP |
| Small fixes/config | Plain session, single conventional commit | — |

**Ralph loop rule of thumb:** use it whenever a story has (a) written acceptance criteria and (b) machine-checkable gates. Don't Ralph copywriting, strategy, or anything whose "done" needs human judgement — those get drafted once and gated by the founder.

**Swarm rule of thumb:** swarm when coverage matters more than depth-per-thread (research angles, review dimensions, multi-file migrations); single-thread when the work is one coherent design. Verify every load-bearing agent claim against ground truth before integrating (standing discipline — this programme has caught 7+ confident-but-wrong agent claims).

### 3.2 Branch / commit / merge protocol (inherits CONVERSION_DELIVERY_PLAN §1)

- `main` protected; **one worktree per active stream**: `../orryx-wt/<branch>`; never build in another session's checkout (orryx-brain/website are multi-session).
- Branch naming `feat/<agent>-s<N>-<slug>`; conventional commits; commit per story (≤400 LOC), push at story end.
- PR per stream → cross-model review (Claude implements → second model reviews via `codex:rescue` or GPT reviewer) → `/code-review` → **founder-gated squash-merge** → tag `mvp-s<N>`.
- **Quality gates (all must pass; non-bypassable):** eslint 0 · prettier clean · tsc 0 · vitest pass · **Playwright E2E: quiz → CRM → email → booking** · Lighthouse ≥90/95/95 · `npm audit` no high/critical · **no-fabricated-proof grep gate (build-failing)**.
- Never `--no-verify`; secrets only via Secrets Manager; new email/API keys minted fresh (the leaked Resend/INTERNAL_API_KEY rotations from FINDING-06 stay tracked separately — nothing from that stack is reused).

### 3.3 Sprint mapping (extends Sprint 2–3 of the conversion plan)

**Sprint 2 — conversion path live (1–2 wk).** Base: `Orryx-Premium-Website` origin/main `d12f4d6`.
| Story | Method | Gate |
|-------|--------|------|
| S2.1 Technical SEO foundation (prerender/SSG, per-page meta, JSON-LD, sitemap, hreflang, CWV) | Ralph loop (`feat/engineer-s2-seo-foundation`) | Lighthouse SEO ≥95; rendered HTML verified curl-only |
| S2.2 Snapshot quiz / AI Readiness Scorecard (scored, custom, public tool page) | Ralph loop (`feat/engineer-s2-snapshot`) | quiz E2E + copy review |
| S2.3 Assessment offer page (7-element; doubles as future ads lander) | Ralph loop + founder copy gate | no-fabricated-proof |
| S2.4 Cal.com routing + result-page booking + transactional emails (scorecard, confirm, 24h reminder) | plain session | booking E2E; emails fire in test |
| S2.5 Lead intake → compass CRM via n8n + **GCLID capture** + analytics events | Ralph loop + n8n MCP | persistence + GCLID proven by Playwright |
| S2.6 Lead alerts (Slack/SMS both founders) | plain session | <5-min alert proven |
| S2.7 GBP + AU citations (manual checklist) | human + plain session | 15–20 NAP-consistent listings |
| S2.8 GO-LIVE | `/deploy-check` + `/security-audit` + founder HA-005' | stranger books a call unaided |

**Sprint 3 — content + channel (1–2 wk):** first 4 content pieces published (cost guide, bookkeeping-automation guide, APES 320 explainer, Zapier-vs-Make) — Claude-drafted, founder-gated, claims policy enforced; APES 320 checklist lead magnet + landing; Accountants Daily pitch; bookkeeper-partner one-pager; funnel dashboards in compass.

**Sprint 4 (month 3) — ads launch, gated:** go/no-go review against §2.3 gates → exact-match Search campaigns + negatives list + remarketing; weekly search-term audits for first 4 weeks.

**Continuous:** every internal automation (nurture, onboarding, reporting) is exported as a template → example solution → sellable package (dogfood rule; feeds Epic C and the product-factory templates).

---

## 4. Human gates (the only places a founder is required)

1. **HA-005 — go-live of the clean advisory site (already merged, undeployed; live site still serves fabricated claims).** Highest-leverage single approval available.
2. R1–R4 reconciliation confirmations (recorded in REPOSITIONING_PLAN §10; recommendations assume DR-2026-001 wins on Assessment price/foundation cap/beachhead, today's ratifications win on published Epic-C pricing).
3. All public copy (claims policy) and the nurture email texts.
4. Sprint-2 go-live (HA-005-equivalent for the conversion path).
5. Discovery calls, assessment debriefs, proposals, and any replied-to thread.
6. Merges (squash-merge approval per protocol).

## 5. Weekly scoreboard (benchmarks → targets)

| Metric | Target (mo 1–3) | Benchmark source |
|--------|------------------|------------------|
| Tyson outreach conversations | 10+/wk | — |
| Content published / indexed pages | 2/mo; all indexed in GSC | Campfire Labs: original-research sites +20.9% ranking keywords |
| Organic sessions | 0–30/mo (mo 1–3) → 50–200 (mo 4–6) — expect the sandbox | new-domain timelines (WolfPack/ContractRank) |
| Quiz starts / completions | 25+ / ≥60% | Outgrow 65–85% @5–7Q |
| Quiz start → lead | ≥35% | Interact 40–42% (service providers) |
| Lander CVR (ads gate) | ≥3% before any ad spend | WordStream Business Services 5.14% |
| Lead → booked call | ≥20% | Chili Piper 30→67% w/ instant booking |
| Call → paid Assessment | ≥35% | practitioner 35–50% |
| Assessment → implementation | ≥60% | Consulting Success 60–75% (directional) |
| Lead response time | <5 min automated alert / <2 h human | ArtemisGTM; market avg 47 h |
| Ads (mo 3+): CPL / cost per Assessment | <A$250 / <A$1,500 | modeled mid-scenario A$182 / A$1,176 |
| Delivery hours per system | falling each delivery | dogfood rule |
