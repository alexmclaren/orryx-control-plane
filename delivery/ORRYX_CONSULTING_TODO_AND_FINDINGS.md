# Orryx Consulting — Open To-Dos & Findings (session handoff 2026-06-12)

**Context:** repositioning orryx.dev for AU SMB AI/automation delivery. Plans are complete and ratified; this is the action/finding register for resuming work. Authoritative plans: `HA-005-REMEDIATION-PLAN.md`, `AUTOMATED_LEAD_ENGINE_PLAN.md`, `CONVERSION_DELIVERY_PLAN.md`, and `D:/orryx-brain/docs/strategy/ORRYX_DEV_*`.

---

## A. Founder decisions blocking progress (cheap, do first)

| Ref | Decision needed | Default if unanswered | Blocks |
|-----|-----------------|----------------------|--------|
| HA-005 | Approve go-live (after remediation PR merges) | — | the whole launch |
| F-a | Booking fallback: Formspree / monitored mailto / provision Cal.com now (HA-001 now resolved → Cal.com is unblocked) | mailto to one address | S-fix.3 |
| F-b | One contact email site-wide (resolve `@orryx.com.au` vs `orryx.dev`) | founder-supplied | S-fix.5 |
| F-c | Verify ACN 696 212 889 registered (ASIC) | hold legal pages | S-fix.5, go-live |
| F-d | Guarantee terms (refund window + credit validity) | "actionable plan in 30 days or refund; credit valid 12 mo" | S-fix.5 |
| F-e | KPI metrics: delete vs relabel "illustrative" | delete | S-fix.2 |
| R1–R4 | DR-2026-001 vs Phase-1 reconciliation (Assessment $1,500 vs Roadmap $490; published catalog pricing vs advisory-only; foundation cap 2–3 vs 5–8; ICP beachhead breadth) | see REPOSITIONING_PLAN §10 recommendations | Sprint 2 copy |

## B. 3-day backlog — delegable to lower models / Codex (no founder input)

Spec'd in HA-005-REMEDIATION-PLAN §4; execute in a fresh worktree off website origin/main `d12f4d6`, branch `fix/ha005-launch-standard`:
1. S-fix.1 — clear 33 `tsc` errors; add `tsc --noEmit` to build + proof-gate CI. (Haiku)
2. S-fix.2 — remove KPI metrics from `src/data/solutionData.ts`; soften marketplace-drift copy. Default = delete. (Sonnet)
3. S-fix.4 — fix 404 "Log In" dead link; remove no-op Insights subscribe form. (Haiku)
4. S-fix.5 (partial) — Privacy Policy: strip account/uninstalled-vendor language; fictional placeholder names. (Sonnet)
5. Run gate suite after each (tsc/eslint/proof-gate/claims-grep/build); log into PR draft. (Haiku)

Held for founder/full model: S-fix.3 honest booking (needs F-a), guarantee terms (F-d), email/ACN (F-b/F-c), the deploy (HA-005).

## C. Findings to investigate / resolve

| # | Finding | Severity | Source | Action |
|---|---------|----------|--------|--------|
| FND-1 | Live orryx.dev still serves the OLD April build with "50+ implementations" + marketplace (verified via live JS bundle fingerprint). Clean site merged but undeployed. | HIGH (credibility / AU ACL) | session review | Resolved only by HA-005 deploy |
| FND-2 | Booking funnel doesn't exist yet (fake spinner / no-op submit); = Sprint-2 S2.4, was blocked on TP-2026-009 tooling. **HA-001 now resolved → TP-2026-009 unblocked.** | HIGH | review + queue.yaml | Provision Cal.com/SES/n8n (TP-2026-009), then build S2.4 |
| FND-3 | Unattributed KPI metrics in solutionData.ts slipped past the no-fabricated-proof grep gate | MEDIUM | review | S-fix.2 + consider extending grep gate to catch bare "NN%" outcome claims |
| FND-4 | tsc not enforced in CI (33 errors present); proof-gate only runs grep | MEDIUM | build review | S-fix.1 adds tsc to CI |
| FND-5 | Website submodule: local `main` is 31 commits ahead of origin hardening a backend that origin DELETED; behind 7. Obsolete divergence. | MEDIUM | git review | Reset local main to origin/main when convenient (the 31 commits are dead-path; confirm nothing unique before discarding) |
| FND-6 | Secret rotations FINDING-06 (Resend/INTERNAL_API_KEY) + FINDING-03 (AWS AKIA…B6MD) still OPEN; any new email/intake infra must use FRESH keys | HIGH (security) | carried from orryx-brain audits | Confirm rotations before TP-2026-009 SES wiring |
| FND-7 | `.com.au` vs `.dev` brand/email mismatch on legal pages; ACN unverified; cookie 12-mo retention claim unverified | LOW-MED | review | F-b/F-c + verify cookie config |
| FND-8 | Strategy docs authored under orryx-brain but DR-2026-001 DEC-05 says delivery/strategy artifacts belong in orryx-control-plane | LOW | this session | Optionally relocate/reference the 4 ORRYX_DEV_*.md into control-plane |
| FND-9 | jargon-lint CI gate suggested by TP-2026-011 (ban "agentic/transformation/operational intelligence") never built | LOW | TP-2026-011 learnings | Build alongside S-fix.1 if cheap |

## D. Sprint 2+ (post-go-live, after HA-001 unblock — now possible)

Per AUTOMATED_LEAD_ENGINE_PLAN: S2.1 technical SEO (prerender/SSG the Vite SPA), S2.2 Snapshot quiz/Scorecard, S2.3 Assessment offer page (= ads lander), S2.4 Cal.com+booking+transactional email, S2.5 intake→compass CRM + GCLID, S2.6 alerts, S2.7 GBP+citations, S2.8 go-live. Then content (Sprint 3) and gated Google Ads (Sprint 4, month 3).

## E. Session git outcome (2026-06-12)

- 6 planning docs committed: 4 × `D:/orryx-brain/docs/strategy/ORRYX_DEV_*` + 2 × control-plane (`AUTOMATED_LEAD_ENGINE_PLAN`, `HA-005-REMEDIATION-PLAN`) + this file.
- Review worktree `D:/_orryx-website-ha005-review` (read-only review, no source changes) removed.
- No code was changed this session — all work was planning/review.
