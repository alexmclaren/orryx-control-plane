# Operator Runbook — 2026-07-22

Everything left on the board needs founder hands (credentials, consoles, judgment).
Grouped into sittings. Each item: steps for Alex + the one-click reply that hands the rest to Claude.
Queue anchors in brackets. NEW-22 RDS rotation is NOT here — it is the resolved 2026-07-03 phantom; do not re-add.

---

## Sitting A — Pillarworks revenue path (~30 min of your time) [HA-026, HA-008, #317]

Operator sequence (DECISIONS 07-19): config pushed ✅ → clear 4 Stripe blockers → fix #317 → test charge w/ entitlement proof → launch.

**A1. Stripe business verification (you only, ~10 min).**
dashboard.stripe.com (acct_1SDkydCzVzICIvzK) → Settings → Business → Account status → complete the PAST-DUE verification (ABN + bank docs). Payouts are paused until this clears.

**A2. Pricing decision (2 min).** Confirm the live catalog: Pro **A$349/mo** standard, **A$249** founding (marketed), Project Pass A$199 — copy must state "1,200 AI pages/mo" (ratified limits). → Reply **"pricing confirmed"** and Claude: dedupes the two 07-14 price generations, creates the clean live prices, replaces the TEST-mode `STRIPE_PRICE_ID_PRO/_ENTERPRISE` + `pk_test` publishable key in prod secrets, restarts pods.

**A3. Live webhook endpoint (5 min, split).**
You: Dashboard → Developers → Webhooks → Add endpoint → `https://build.orryx.dev/webhooks/stripe` → all events (or checkout.* + invoice.* + customer.subscription.*) → reveal the `whsec_...` signing secret → paste it into the pillarworks secret store (AWS SM console — never into chat/repo). → Reply **"webhook created"** and Claude wires `STRIPE_WEBHOOK_SECRET` through to the pods and verifies delivery with a test event. Without this, a live Project Pass purchase takes A$199 and grants nothing.

**A4. #317 onboarding-upload persistence** — reply **"fix 317"**; funnel-blocking, Claude-executable, no hands needed.

**A5. Go-live proof (5 min).** Test cards are blocked in live mode. Once A1–A4 are green: buy a Project Pass with a real card → Claude verifies webhook received + credits granted + Sentry/logs clean → you click Refund in the dashboard → launched.

**A6. Sentry DSN + SES confirm [HA-008].** Grab the prod DSN from Sentry (Project → Settings → Client Keys) → into SM alongside A3's paste → reply **"dsn stored"**; Claude lands it in `pillarworks-secrets` and restarts. Claude then triggers one real email from `noreply@pillarworks.orryx.dev` to your inbox — you confirm receipt.

**Escape hatch:** can't do A1 soon? Reply **"disable purchase path"** — Claude hides the Project Pass buy button until the webhook + verification land (per the standing interim mitigation).

---

## Sitting B — Secret-rotation batch, one sitting clears the board (60–90 min) [SR-Q3 ⊃ HA-036/HA-045/HA-054 genuine legs]

Open **`D:\state\secret-rotation-operator-steps-2026-07-17.md`** and work top-to-bottom — it has exact clicks, commands, and ordering traps (golden rule: rotate → SM via `file://` JSON → redeploy → verify → revoke old).

Priority inside the pack if time-boxed:
1. **SR-03 step 3 — Google OAuth client secret** (HA-045): the leaked value is STILL LIVE and consumed, ~6.2 months unrotated. Google Cloud Console → Triora OAuth client → regenerate; SM `orryx/triora/prod/google-oauth-client-secret`; redeploy `clinical-trials-api-pilot`; verify login.
2. **SR-02 — AACT password** (NEW-23, ~30d over a 7-day SLA): runbook `D:\Clinical.Trials\docs\security\AACT_SECRET_ROTATION_RUNBOOK.md`.
3. **SR-03 steps 1–2** — delete OLD Pinecone + OpenAI keys (new ones already live).
4. **SR-04 n8n token** — also closes the NEW-12 residual (redaction already landed via #366).
5. Then Batch 2 (SR-05..SR-13) as the pack directs.

After each: tell Claude **"SR-NN rotated"** — only you close ledger entries.

---

## Sitting C — One-word approvals (Claude does all the work) 

| Reply | Item | What happens |
|---|---|---|
| **"sign off 142"** | CT PR #142 [HA-032/053] | site_id FK CASCADE→SET NULL — deleting a site stops cascading-deleting patient rows. It *prevents* PHI loss; held 12d only for your policy-required sign-off. Recommended ⭐ approve. Claude merges, watches CI, monitors the migration path. Review first: github.com/alexmclaren/Clinical_trials/pull/142 (+#147/#148 carry the same tag — same sitting). |
| **"approve HA-063"** | RLS non-owner role | Claude mints the role via SM random-password (value never displayed), grants privileges, switches staging DSN, re-runs the isolation proof (minutes — loop already built), reports. Unblocks #266 properly. |
| **"ratify scopes"** | MVP scope-of-record [HA-035] | Claude flips `Clinical.Trials` + `orryx-flow` `.proposed.json` → ratified, parks ct-mvp-open-004 to innovation backlog (MV-04), fixes the `design-complete` status value (MV-07). 15 days pending; CT is graded 20% vs ~60% reality until this lands. |

---

## Sitting D — Strategy decisions (options prepared on request)

**R1 — entry offer** [HA-017]: Assessment A$1,500 vs Roadmap A$490. You asked for a planning session, not a snap call — reply **"prep R1 brief"** and Claude synthesizes the in-hand research + repositioning plan §10 into a decision card (options ranked, revenue/funnel modelling) for a 45-min session.
**R4 — ICP incl. medical**: research is in hand — reply **"prep R4 card"** for a 1-page include-vs-defer decision.
**⚠️ Standing blocker either way:** orryx-website PR #22's copy claims "every example is a real system we built and can demonstrate live" — all 3 demos are planned-only. Reply **"fix PR22 claims"** to have the copy rewritten truthfully (reference-architecture framing) so R1/R4 shipping isn't gated on building demos.
**ESC-005 auth convergence / ESC-010 GH token scope**: detail in the queue is thin ("carried") — reply **"prep auth card"** / **"scope ESC-010"** and Claude investigates before asking you to decide anything.

---

## Housekeeping
- **Reboot when convenient** — clears the Docker broken-socket state for future gateway deploys (deploy itself already shipped; `*.stale*` dirs under `%LOCALAPPDATA%` can be deleted after).
- Delegable dev backlog (no hands needed, say the word): #317 (above), HA-060 type burn-down, HA-052 doc-integrity triage, HA-055 local D:\ housekeeping, HA-025 submodule hygiene, HA-044 gitlink re-bumps, ORC-08/ESC-001/ESC-003/ESC-013 dep work.
