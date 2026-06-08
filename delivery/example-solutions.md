# Example Solutions — Proof Set

**Status:** Approved 2026-06-08 (HA-002) · **Owner:** founder
**Triple role:** Proof (capability demos) · Product seed (templatise → future marketplace) · Dogfood (Orryx runs them on itself)

> **Honesty rule (enforced by the no-fabricated-proof gate):** each is presented as
> "here is a working example of what we can build" — **never** as a client outcome
> ("a client achieved X"). Earned, named case studies come later via foundation clients.

**Buyer themes:** administrative overhead · disconnected systems (tools that don't talk).

## Launch proof set (build first, parallel from Sprint 1)

| # | Solution | Theme | Demo shows | Product-seed target |
|---|----------|-------|-----------|---------------------|
| 1 | **Client Onboarding Autopilot** *(hero)* | Disconnected systems | New-client form → CRM → drafts engagement letter → creates task checklist, automatically | `orryx-customer` |
| 2 | **Smart Inbox & Enquiry Triage** | Admin overhead | Emails auto-classified, draft replies prepared, routed — no enquiry missed | `orryx-customer` / `orryx-sales` |
| 3 | **Document Intake & Extraction** | Both | Drop a PDF/invoice/form → structured data lands in-system, no re-keying | `orryx-ai-automation` |

## Fast-follows (after launch set proves out)

| # | Solution | Theme |
|---|----------|-------|
| 4 | **Follow-Up / Chaser Agent** | Admin overhead (chase docs, signatures, payments) |
| 5 | **Weekly Practice Digest** | Disconnected systems (scattered tools → one plain-English digest) |

## Build notes
- Built on the n8n spine (DEC-01); each demo is a real, runnable workflow.
- Lead marketing with **#1 (Onboarding Autopilot)** — "disconnected systems" is the sharpest,
  most relatable pain and the clearest differentiator.
- Each demo, once proven, is templatised toward its target domain server **only when a paying
  client needs it** (demand-pull discipline, DR-2026-001).
