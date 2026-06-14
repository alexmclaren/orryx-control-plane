# HA-005 Go-Live Remediation Plan

**Date:** 2026-06-11 · **Owner:** founder (approves) / Claude (executes) · **Autonomy:** L1 (copy + go-live are human-gated)
**Purpose:** bring `orryx-website` origin/main (`d12f4d6`) to a launch standard so HA-005 (go-live) can be approved honestly.
**Method:** completes **TP-2026-011 Track A** to its stated acceptance criteria — a pre-launch build review (2026-06-11, isolated worktree `D:/_orryx-website-ha005-review`) proved several Track-A ACs did **not** actually land in PR #5. This plan closes that gap; it does **not** start Track B (the live funnel rebuild), which stays gated on F1–F4 + TP-2026-009 tooling.

---

## 1. The core scoping decision (founder must pick)

The review's #1 blocker — the dead booking form (collects data, posts nowhere, fakes a "Loading calendar…" spinner, shows "You're in, [name]" to no one) — is **not a bug, it's the entire conversion funnel (S2.4)**, which is blocked on the Cal.com/SES/n8n tooling spine (**TP-2026-009 → blocked on HA-001**). So we cannot ship the *real* funnel this week. Two honest paths:

- **Path A — Ship credibility now, funnel later (RECOMMENDED).** Replace the fake booking with the **honest fallback TP-2026-011 already prescribes**: a real mailto/Formspree capture + truthful confirmation, no fake spinner. The live site stops lying *today* (kills "50+ implementations"), Tyson can point relationships at a site that doesn't embarrass him, and the full quiz→Cal.com→CRM funnel lands in Sprint 2 once HA-001/TP-2026-009 unblock. This matches the packet's own Track A / Track B split.
- **Path B — Hold go-live until the funnel is real.** Keep the fabricated-claims site live for another 1–2+ weeks while we build S2.1–S2.8. Rejected unless the founder wants it: every day the current site runs is a credibility and (AU ACL misleading-conduct) liability, and it gates SEO indexing of the real site.

**This plan assumes Path A.** It is reversible and loses no Track-B work.

## 2. What's actually broken (verified, not theoretical)

| # | Issue | Severity | Evidence | Track-A AC it fails |
|---|-------|----------|----------|---------------------|
| B1 | Booking form posts nowhere; fake "Loading calendar…" spinner; false "You're in" confirmation | **BLOCKER** | BookSession.tsx:114–129, 805–814 | "Honest booking fallback (real mailto/Formspree…no fake spinner)" — NOT met |
| B2 | Unattributed aggregate metrics ("70% volume reduction", "40% higher CSAT" …) across capability cards | **BLOCKER** (claims policy / ACL) | solutionData.ts KPI arrays | (slips past grep gate; violates MESSAGING §5) |
| B3 | `tsc --noEmit` = 33 errors; not wired into build | **HIGH** (quality gate) | build review | "tsc added to build; strict errors fixed" — NOT met |
| B4 | 404 page links "Log In" → /book (no login exists) | HIGH | NotFound.tsx:86 | "NotFound Log In/Marketplace removed" — NOT met |
| B5 | Vague guarantee/credit terms | MEDIUM (conversion + ACL) | Assessment.tsx:32–36 | "F4 guarantee defined objectively" |
| B6 | Insights subscribe form is a no-op | MEDIUM | Insights.tsx:682–697 | honest-capture principle |
| B7 | Privacy Policy cites "create an account" + uninstalled vendors | MEDIUM (legal accuracy) | PrivacyPolicy.tsx:9,28 | Privacy-Act accuracy |
| B8 | Placeholder persona names read as real ("Sarah Mitchell") | LOW | BookSession.tsx:395,413 | polish |
| B9 | `.com.au` contact emails (privacy@/legal@); ACN 696 212 889; cookie 12-mo retention — all **founder facts to verify** | LOW–MED | legal pages | "founder facts" |
| B10 | "Core capabilities"/"transform" copy drifts marketplace-ward | LOW | CapabilitiesHub.tsx:102 | voice unification |

*Note:* per-page meta/JSON-LD/sitemap/robots (Track-A "Base SEO") — confirm whether PR #5 landed these; if not, they fold into B-list as B11 (HIGH for the SEO-first strategy, but not a go-live blocker).

## 3. Founder inputs needed before code starts (fast — most are facts)

| Ref | Decision/fact | Default if unanswered |
|-----|---------------|----------------------|
| F-a | **Booking fallback target:** Formspree endpoint, or a monitored email for mailto:, or "I'll provision Cal.com now" (unblocks the real embed instead of fallback) | mailto: to a single monitored address |
| F-b | **Contact email** site-wide (resolves B9 `.com.au` vs `.dev` mismatch) | one address, founder-supplied |
| F-c | **ACN** 696 212 889 — correct & registered? (B9) | hold launch on legal pages until confirmed |
| F-d | **Guarantee terms** objectively (B5): refund window + credit validity | "actionable plan within 30 days or full refund; credit valid 12 months" |
| F-e | **KPI metrics (B2):** delete entirely, or relabel "illustrative — varies by use case"? | **delete** (safest under claims policy; recommended) |

## 4. Execution (one PR, sequenced stories, all in the review worktree off `d12f4d6`)

Branch: `fix/ha005-launch-standard` (worktree `D:/_orryx-website-ha005-review`, already created & building green).

1. **S-fix.1 — Type-clean + gate (B3):** clear 33 `tsc` errors (all unused imports/vars), add `tsc --noEmit` to the `build` script and the proof-gate workflow. *Method: Ralph loop — mechanical, fully gated.*
2. **S-fix.2 — Claims compliance (B2, B10):** per F-e, remove/relabel all KPI metrics in solutionData.ts; soften "transform/core capabilities" to advisory framing. *Method: edit + re-run no-fabricated-proof gate + a fresh claims grep.*
3. **S-fix.3 — Honest booking (B1):** replace fake spinner + no-op submit with real capture (per F-a) and a truthful confirmation; remove the "You're in" copy until a real booking exists. *Method: plain build; manual + Playwright-style verify that submit actually delivers.*
4. **S-fix.4 — Dead-link & form honesty (B4, B6):** fix/remove 404 "Log In"; make the Insights subscribe form either real (per future email strategy — likely just remove for now) or removed. *Method: edit.*
5. **S-fix.5 — Legal/copy accuracy (B5, B7, B8, B9):** guarantee terms per F-d; strip account/uninstalled-vendor language from Privacy Policy; fictional placeholders; apply F-b email + F-c ACN. *Method: edit; founder copy gate.*
6. **S-fix.6 — Verify & package:** `npm run build` green · `tsc` 0 · eslint 0 · no-fabricated-proof + claims grep clean · live walk of every nav route & the booking submit (Claude Preview / Chrome) · Lighthouse spot-check. Open PR with before/after summary.

**Gates (all must pass):** tsc 0 · eslint 0 · proof-gate pass · claims grep clean · build success · every internal link resolves · booking submit actually delivers a lead.

## 5. Then: deploy (separate, explicitly founder-gated)

After PR review + merge: `/deploy-check` + `/security-audit` → build → S3 sync `s3://orryx.dev` → CloudFront (EKD31VXBOWBQ7) invalidation → smoke test (every route 200, booking submit delivers, no fabricated strings in shipped bundle — re-fingerprint the live JS as in the review). **Go-live = HA-005 approval; I will not deploy without an explicit "go."**

## 6. Out of scope (stays for Sprint 2 / Track B)

Quiz/Snapshot build, Cal.com routing, n8n→compass CRM, SES transactional sequence, GCLID capture, prerender/SSG migration, content pieces, ads. All gated on HA-001 (TP-2026-009) and the R1–R4 reconciliation; none block this remediation.

## 7. Acceptance criteria (this plan is done when)

1. No reachable page makes an unsubstantiated claim (grep + manual confirm).
2. No form lies — every submit either truly delivers or is removed; no fake spinner/confirmation.
3. tsc 0 / eslint 0 / proof-gate pass, with tsc enforced in CI.
4. Every internal link resolves; legal pages factually accurate (ACN/email/Privacy-Act).
5. PR merged with founder copy approval; deploy executed only on explicit HA-005 go.
