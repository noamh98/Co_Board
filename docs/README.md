# Co_Board Documentation Index

## SaaS Transformation Engagement (2026-07)

This directory contains the complete technical due diligence, assessments, and implementation roadmap for Co_Board's path to become the leading AAC SaaS product in Israel.

### Core Documents

| Document | Stage | Scope (Charter Parts) | Summary | Findings |
|----------|-------|----------------------|---------|----------|
| [`../COBOARD_TASK.md`](../COBOARD_TASK.md) | Charter | 1–27 | Full engagement scope: discovery, audits (code/DB/scale/security/privacy/UX), roadmap, and 1–3 dev team strategy | N/A |
| [`00-discovery.md`](00-discovery.md) | A | 1, 2, 3 | Current-state architecture, 16K LOC inventory, stack verification (Firebase/React/Firestore/IndexedDB/Workbox), 244+ unit tests confirmed live, offline-first validated, security baseline snapshot | N/A (diagnostic stage) |
| [`01-audit.md`](01-audit.md) | B | 2–6, 10–16 | Production readiness per user tier (internal testing ✅ through 10,000 users ❌), code quality 74/100, DB schema verification, scalability modeling, reliability gaps, observability absence, backup strategy | **B-01 through B-24 (24 findings)** |
| [`02-ux-a11y-platforms.md`](02-ux-a11y-platforms.md) | C | 17–19 | UX heuristic audit (Nielsen 10, scored 3.4/5), WCAG 2.2 AA assessment (2 confirmed Fails + 1 regression), design-system gaps (two contradictory color palettes), cross-platform strategy (PWA→Expo→native phasing), iOS/Android-specific considerations | **C-01 through C-18 (18 findings)** |
| [`03-privacy-security-family.md`](03-privacy-security-family.md) | D | 7–9, 20 | Security posture (auth/authz/API/secrets/infra), privacy inventory of minors' data, encryption audit (E2EE media with multi-device key gap), consent flows, regulatory alignment (Israeli Privacy Law / תקנות אבטחת מידע, GDPR, COPPA posture), multi-tenant readiness | **D-01 through D-15 (15 findings)** |
| [`04-media-ai.md`](04-media-ai.md) | E | 14, 21 | AI pipelines (TTS hybrid, Gemini board-gen, Dicta nikud), voice cloning safeguards plan (Azure Neural + liveness), photo capture/upload (EXIF gap), voice-bank schema, symbol licensing (ARASAAC CC BY-NC-SA legal trap), failure scenarios | **E-01 through E-15 (15 findings)** |
| [`05-roadmap.md`](05-roadmap.md) | F | 24–27 | 7-phase implementation plan (Phases 0–6) gated by business milestones (Closed Beta → First Paying → 500 users → Clinic → HMO/MoE), 72 findings mapped to tasks, risk register (R-01 through R-22, 22 rows), phase-by-phase owner assignments (Architect/Analyst/Security/UX/Media/DevOps) | Phase 1–5 tasks, risk register 22 items |
| [`06-executive-summary.md`](06-executive-summary.md) | F | 28 | Two-language summary (Hebrew + English) for board/C-suite: bottom line (54/100 readiness), critical bugs (4 beta blockers), top 10 priorities, 30/60/90 day actions, go/no-go verdicts per milestone | N/A (summary) |

### Recommended Reading Path

- **For executives:** start with [`06-executive-summary.md`](06-executive-summary.md), then [`05-roadmap.md`](05-roadmap.md) Phase 1–2.
- **For engineers:** start with [`00-discovery.md`](00-discovery.md), then [`01-audit.md`](01-audit.md) findings, then [`05-roadmap.md`](05-roadmap.md) for your role's task list.
- **For product/design:** [`02-ux-a11y-platforms.md`](02-ux-a11y-platforms.md) for UX/a11y gaps, then [`05-roadmap.md`](05-roadmap.md) Phase 2–3.
- **For security/counsel:** [`03-privacy-security-family.md`](03-privacy-security-family.md) for regulatory § tables, then [`04-media-ai.md`](04-media-ai.md) §14.3 voice-cloning safeguards.

### Execution Status

See [`ROADMAP-STATUS.md`](ROADMAP-STATUS.md) for the live done/not-done tracking against `05-roadmap.md`, including what is blocked on console access, counsel, hardware, or product decisions. Update it in every PR that closes a roadmap task.

### Session Handoff

See [`SESSION_SUMMARY.md`](SESSION_SUMMARY.md) for engagement execution notes, key assumptions, open [TBD]s, gotchas, and next-stage guidance.

---

## Pre-Existing Project Docs

This repo also contains earlier milestone documents, Architecture Decision Records (ADRs), handoff notes, and changelog:

- **m0–m20 milestones** (in `docs/`): earlier project phases, some stale relative to current code (README/ARCHITECTURE contain claims contradicted by source; ADR-0003 says "Neural2" but only Wavenet is real; ADR-0005 licensing unresolved).
- **ADRs 0001–0005** (in `docs/adr-*.md`): architecture decisions on sync (ADR-0002, sync opt-in default), per-field merge (ADR-0004, deferred to Phase 5), TTS providers (ADR-0003, needs "Neural2"→"Wavenet" correction), Nakdan licensing (ADR-0005, open [TBD]).
- **HANDOFF.md, REFACTOR-PLAN.md, ULTRA-REVIEW** (in `docs/reviews/`): prior team's observations; used as baseline for this engagement's verification.
- **CHANGELOG.md, PLAN-features-2026.md** (in `docs/`): historical context.
- **firestore.rules** (currently in `docs/`, should move to `firebase/` per D-15): the deployed Firestore security rules file — critical, not documentation.

**Known stale items flagged for Phase 1 docs cleanup (task 1.13):**
- Root `README.md` / `ARCHITECTURE.md`: stale DB version, test counts, and repo-tree paths (Stage A §8).
- `docs/00-discovery.md` §2 and `docs/adr-0003-tts.md`: reference "Neural2" — only Wavenet exists for he-IL (E-09).
- `docs/adr-0005-nikud-licensing.md`: licensing unresolved (open [TBD] per roadmap task 1.12).
- `firestore.rules` location: lives in `docs/` rather than `firebase/` (D-15).

---

## Engagement Stats

**Delivery**: 7 engagement documents (Stages A–G), produced 2026-07-07 across two working sessions.

**Evidence base**: 72 verified findings (B-01…B-24 + C-01…C-18 + D-01…D-15 + E-01…E-15) + 22 risk-register rows + scorecard 54/100.

**Team assumption**: 1–3 devs + designer + QA; all roadmap duration estimates calibrated to this capacity.

**Phase 0 (discovery/audit) complete.** Phase 1 (MVP hardening → Closed Beta) entry gate: fix D-01, D-02, data-loss floor (B-10/B-11/E-03); estimated 6–8 weeks to Phase 1 exit.

---

*Document index generated Stage G (Docs Agent, Haiku). Version 2026-07-07.*
