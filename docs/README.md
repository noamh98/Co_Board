# Co_Board Docs Index

**Co_Board** is an AAC (Augmentative & Alternative Communication) platform for children and adults with speech/language disabilities. This repo underwent a comprehensive SaaS-transformation audit (Stages A–F, producing documents 00–06) and maintains an ongoing engineering history (architecture decision records, milestone build docs, and handoff continuity files).

---

## Stage A–F: SaaS Audit Documents

| File | Stage | Coverage | Read This If… |
|------|-------|----------|-------------|
| **00-discovery.md** | A | Current-state architecture, tech stack, integrations, system overview | You're new and want an architecture overview |
| **01-audit.md** | B | Production readiness, code quality, database, scalability, reliability, backup/DR, observability, DevOps, data-loss, cost | You need to understand blocking issues before production |
| **02-ux-a11y-platforms.md** | C | UX/design-system redesign, WCAG 2.2 audit, cross-platform delivery strategy (PWA→React Native→native) | You're planning UX overhaul or platform strategy |
| **03-privacy-security-family.md** | D | Security assessment, privacy/compliance (IL law, GDPR), multi-tenant isolation, family/role model | You're hardening security, privacy, or role-based access |
| **04-media-ai.md** | E | TTS, symbol libraries, AI features, voice cloning, photo capture/moderation, media features spec | You're implementing voice, AI, or media capture flows |
| **05-roadmap.md** | F | MVP hardening plan, phased roadmap (Phase 0–6), risk register, implementation tasks | You're executing the roadmap or prioritizing work |
| **06-executive-summary.md** | F | Bilingual (Hebrew+English) executive summary, critical findings, go/no-go milestones, 30/60/90 day plan | You're a founder/investor/stakeholder reviewing status |

---

## Engineering History & Reference Docs

### Architecture Decision Records (ADRs)
| File | Decision | Status |
|------|----------|--------|
| **adr-0001-stack.md** | MVP stack: React 18 PWA + TypeScript + Vite, offline-first (Workbox); native apps in Phase 2+ | Approved (implemented) |
| **adr-0002-sync.md** | Sync & backup: Firebase backend-agnostic provider, Last-Write-Wins merge, offline-first IndexedDB | Approved (implemented) |
| **adr-0003-tts.md** | TTS: Google Cloud TTS + cache layer + browser fallback; Almagu as future target — ⚠️ ADR text says "Neural2" but code (`googleTtsProvider.ts`) only uses Wavenet voices for he-IL; see finding E-09 in `04-media-ai.md` | Approved (implemented, doc wording stale) |
| **adr-0004-conflict-per-field.md** | Per-field conflict resolution (vs. entity-level LWW); deferred to Phase 5 based on product need | Proposed (not yet implemented) |
| **adr-0005-nikud-licensing.md** | Dicta Nakdan licensing guard (env-gated in Phase 1; commercial license Phase 5) | Proposed (partially implemented — env guard in place) |

### Milestone Build History
**m0–m20:** Per-milestone engineering docs (one file per completed feature/phase). See individual files for details on each milestone (data profiles, symbols, auth, analytics, voice, etc.).

### Review & Continuity Docs (all under `reviews/`)
| File | Purpose |
|------|---------|
| **reviews/HANDOFF.md** | **Current system state snapshot** (commit 476cdc9). Phase status, open questions, execution status table. Read first when joining a new session. |
| **reviews/ULTRA-REVIEW.md** | Deep code/DB/architecture review (post-Phase 2 refactor). |
| **reviews/ROADMAP.md** | Task-level roadmap by phase; dependencies, complexity, owning agent. |
| **reviews/REFACTOR-PLAN.md** | Caution flags & patterns to preserve during refactor work. |
| **reviews/NEXT-SESSION-PROMPT.md** | Suggested prompt continuation for next agent session. |

### Supporting Reference
| File | Content |
|------|---------|
| **CHANGELOG.md** | Version history and release notes |
| **PLAN-features-2026.md** | Feature roadmap for 2026 |
| **verification.md** | Verification and testing procedures |
| **firestore.rules** | Firestore security rules and access patterns |

---

## Where Do I Start?

### I'm a new developer joining the team
1. Read **reviews/HANDOFF.md** (system state + open questions)
2. Read **00-discovery.md** (architecture overview)
3. Skim **reviews/ROADMAP.md** (tasks & priority)
4. Run the setup in HANDOFF.md §5 (npm ci, tests, e2e)
5. Pick a task from the **Status table (HANDOFF.md §7)** and read its phase doc

### I'm the founder / product owner
1. Read **06-executive-summary.md** first (bilingual, go/no-go decisions)
2. Skim **05-roadmap.md** (phases & priorities)
3. Review **01-audit.md** Part 2 (production readiness by milestone)

### I'm executing the roadmap / leading development
1. Start with **reviews/HANDOFF.md §7** (status table; see what's done, what's blocked)
2. Read the relevant phase section in **05-roadmap.md**
3. Review **reviews/REFACTOR-PLAN.md** (patterns & cautions)
4. For details on design/UX: **02-ux-a11y-platforms.md**
5. For security/privacy decisions: **03-privacy-security-family.md**
6. For feature specs: **04-media-ai.md**

---

**Last Updated:** 2026-07-14 (audit complete, docs/reviews/ continuity active)
