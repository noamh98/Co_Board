# 05 — Implementation Roadmap, Risk Register & Readiness Scorecard (Parts 24–27)

> Stage F output of the SaaS transformation plan (see `COBOARD_TASK.md`, Parts 24, 25, 26, 27).
> Date: 2026-07-07 · Author: **Architect** agent (top-tier model, per engagement rules).
> Synthesized from: [`00-discovery.md`](00-discovery.md) (Stage A) · [`01-audit.md`](01-audit.md) (Stage B, B-01…B-24) · [`02-ux-a11y-platforms.md`](02-ux-a11y-platforms.md) (Stage C, C-01…C-18) · [`03-privacy-security-family.md`](03-privacy-security-family.md) (Stage D, D-01…D-15) · [`04-media-ai.md`](04-media-ai.md) (Stage E, E-01…E-15).
> Team assumption per charter: **1–3 devs + designer + QA**. All duration estimates are `[Assumption]` calibrated to that team size; treat them as relative sizing, not commitments.

---

## 1. How to read this roadmap

- **62 findings** feed this plan. Every task cites the finding ID(s) it addresses — traceability is deliberate; nothing here is invented beyond the audited evidence.
- **Phases are gate-driven, not calendar-driven.** Each phase ends with explicit *exit criteria* that map to a business milestone (closed beta → first paying family → 500 users → institutional). Do not start a milestone's user-facing activity before its gate passes.
- **The engagement's single most important discovery** (Stage A, reconfirmed at every stage): the codebase is production-*quality* but not production-*ready as a business*. The work below is dominated by product/ops/compliance layers, plus a small number of real correctness bugs (D-01, D-02, C-04, E-02) that must be fixed first because the closed beta directly exercises them.

### Critical path (the one-paragraph version)

Fix the sharing + encryption-key-continuity defects (D-01, D-02) and the data-loss floor (B-10, B-11, E-03) → stand up staging + minimal observability (B-01, B-14) → publish the privacy/legal baseline (D-09, D-03, D-04, E-04, E-05) → **closed beta** → billing + family entity (B-02, Part 20) + WCAG AA fixes (C-02/03/04) → **first paying family** → conflict-safe sync (B-08) + self-serve onboarding (B-03) + App Check (B-23) → **500 users** → org tenancy + audit log + revocation (D-12, D-08, D-05) + compliance package → **clinic pilots → HMO/MoE tender**.

---

## 2. Phases 0–6 (charter Part 25)

### Phase 0 — Current-state snapshot ✅ COMPLETE

- **Goal:** establish a trusted, code-verified baseline.
- **Deliverables:** `docs/00`–`docs/04` (this engagement), 62 findings, doc↔code contradiction log.
- **Exit criteria:** met — this document's existence.
- **Residual actions carried forward:** fix stale README/ARCHITECTURE claims (Stage A §8), move `docs/firestore.rules` → `firebase/firestore.rules` (D-15), correct "Neural2"→"Wavenet" in ADR-0003 (E-09), correct `removeBackground` claim (E-08). All S-complexity, bundled into Phase 1's docs task.

### Phase 1 — MVP Hardening (gate: **Closed Beta** — 10 families + 3 SLPs)

**Duration `[Assumption]`: 6–8 weeks.**
**Goal:** a family or SLP in the pilot can use the product for months without hitting a data-loss event, a broken core flow, or an unanswerable privacy question. The beta cohort includes 3 SLPs — which means **the sharing feature (D-01) and cross-device decryption (D-02) are exercised on day one**; they are not deferrable.

| # | Task | Findings | Complexity | Owner |
|---|---|---|---|---|
| 1.1 | Fix child-sharing end-to-end: align `AcceptInviteScreen` UI with real 32-hex code format; extend Firestore rules + schema so `childAccess` members can read the shared child's `board`/`profile` docs (requires child-scoped board path or `childId` field); add positive-grant rules tests | **D-01 (Critical)** | L | Analyst + Architect |
| 1.2 | Multi-device key continuity for E2EE media: account-level key wrapping (passphrase- or recovery-code-wrapped CEK escrow, or device-linking QR flow); document chosen scheme in an ADR | **D-02 (Critical)** | L | Architect + Security Sentinel |
| 1.3 | Data-loss floor: call `navigator.storage.persist()` at onboarding; make cloud sync default-on (or hard-nag) with clear consent copy; add "last backed up N days ago" nudge | B-10, B-11 | S+M | Analyst + UX Auditor |
| 1.4 | Encrypt + sync voice recordings through the existing `mediaRepo`/`crypto.ts`/`mediaSync` pipeline (recordings are currently plaintext, local-only) | E-03 | M | Analyst-Media |
| 1.5 | Guarantee EXIF stripping on all upload paths (make canvas re-encode non-bypassable; regression test with GPS-tagged fixture) | E-02 | S | Analyst-Media |
| 1.6 | Password reset flow (`sendPasswordResetEmail` + UI link) | D-04 | S | Analyst |
| 1.7 | Access-grant revocation: `revokeChildAccess` CF + "who has access" list UI; add `expiresAt` support | D-05 | M | Analyst + Architect |
| 1.8 | Staging environment: second Firebase project `co-board-staging`, mirrored deploy workflow, PR preview channels; release tagging + rollback runbook | B-01, B-15, B-16, B-24 | M | DevOps |
| 1.9 | Minimal observability: Cloud Monitoring dashboards + error-rate/budget alerts (no privacy question); GlitchTip/Sentry-EU with PII-scrubbing `beforeSend`, replay disabled (resolves the deliberate Sentry block) | B-14, E-07 | M | Analyst + Security Sentinel |
| 1.10 | Backup/DR baseline: verify+enable Firestore PITR; scheduled cross-region Firestore exports; Storage bucket versioning; one scripted restore drill | B-12, B-13 | S+S+S | DevOps |
| 1.11 | Mobile touch-target regression fix (media query must scale from `cellMinPx`, not override to 44px) + brand-contrast fix (use `--cl-primary-dk` for text/icons) | **C-04 (High)**, C-02 | S+S | Analyst |
| 1.12 | Legal/privacy baseline: publish privacy policy + ToS; complete DPIA from §8.6 template; ARASAAC attribution line in UI; gate Nakdan endpoint behind env var (remove hardcoded academic default); start Dicta + ARASAAC/SymbolStix licensing conversations; TTS-text legal review (E-01) | B-04, D-09, E-01, E-04, E-05 | L (process) | Security Sentinel + counsel `[TBD]` |
| 1.13 | Docs hygiene from Phase 0 residuals + beta-support runbook ("family lost device — what now") | Stage A §8, D-15, E-08, E-09 | S | Docs Agent |
| 1.14 | `[Verify]` iOS device pass: TTS gesture-autoplay on cache-miss (C-08), Safari storage eviction behavior; fix with synchronous placeholder-`Audio.play()` if confirmed | C-08 | S–M | QA + Analyst |

- **Risks:** legal/licensing timelines are outside engineering control (start 1.12 in week 1, not week 6); D-02 key-continuity design has real cryptographic subtlety — do not improvise, write the ADR first.
- **Deliverables:** all tasks above merged; DPIA v1 signed; staging live; restore drill log.
- **Exit criteria (Go for Closed Beta):** D-01/D-02 verified fixed by rules tests + 2-device manual test; sync default-on shipped; PITR + exports enabled; error tracking live; privacy policy published; C-04 fixed; support runbook exists.

### Phase 2 — UX Overhaul + Design System + PWA polish + Billing (gate: **First Paying Family**)

**Duration `[Assumption]`: 8–10 weeks, overlappable with late Phase 1.**
**Goal:** the product looks/feels trustworthy, meets WCAG 2.2 AA honestly, and can take money.

| # | Task | Findings | Complexity | Owner |
|---|---|---|---|---|
| 2.1 | Consolidate design tokens to a single authority file; delete dead green palette; add CSS-var-drift lint/visual-regression check | C-01 | M | UX Auditor + Analyst |
| 2.2 | Grid ARIA restructure (`role="row"` wrappers in BoardView) → un-waive both axe rules; re-run full axe suite green | C-03, B-22 | M | Analyst |
| 2.3 | Design system v1: token architecture (color/spacing/radius/type/motion), Storybook with a11y annotations, themes incl. **sensory-calm**, dyslexia-friendly Hebrew font option, self-hosted fonts | C-06, C-18, D-11 | L | UX Auditor |
| 2.4 | Onboarding: persona branch (family/therapist/school) + skippable 3-screen tour of the locked/adult/builder model; caregiver-PIN change nudge | C-05, C-10 | M | UX Auditor + Analyst |
| 2.5 | Billing + minimal family entity: Stripe/Paddle checkout, `families/{familyId}` billing anchor compatible with Part 20 schema, free/paid plan gates; **paid tier must not ship ARASAAC-only** — symbol licensing decision from 1.12 lands here | **B-02 (Critical)**, E-04 | L–XL | Architect + Analyst |
| 2.6 | iOS PWA polish: `apple-touch-icon` + meta tags, install instructions screen, Guided Access how-to hint | C-07 | S | Analyst |
| 2.7 | Play-mode safety: confirm on sentence-bar clear; haptic feedback (feature-detected, settings-gated) | C-09, Nielsen #5 | S | Analyst |
| 2.8 | Share-flow UX: QR code for invite, access list in same panel (pairs with 1.7 revocation) | C-12 | S–M | Analyst |
| 2.9 | Switch-scanning debounce guard (chattery-switch protection) + Escape-close on CategoryMenu | C-15, C-16 | S | Analyst |
| 2.10 | Accessibility statement (הצהרת נגישות) v1 per תקן 5568 — published as "partially conformant" until 2.2 lands, then upgraded | C-17 | S | Docs Agent + UX Auditor |
| 2.11 | Low-end Android QA pass: Lighthouse throttled profile, bundle-size measurement + budget in CI | Stage C §18.3 | S–M | QA + Optimizer Watchdog |

- **Risks:** billing scope creep (keep v1 to one plan + one gate); symbol-licensing dependency from Phase 1 may lag — mitigation: paid tier can launch Israel-only with user-upload+photo tiles emphasized while SymbolStix contract closes `[TBD — counsel]`.
- **Exit criteria (Go for First Paying Family):** a real payment succeeds against staging+prod; WCAG AA claim honest (axe suite green, no waivers); accessibility statement published; onboarding funnel tested with ≥3 pilot families; symbol licensing position documented and counsel-approved.

### Phase 3 — Native apps (Expo) + full family accounts + media features (gate: **growth beyond early adopters**)

**Duration `[Assumption]`: 12–16 weeks.**
**Goal:** iOS/Android store presence with the domain layer reused verbatim; the Part 20 family model becomes real.

| # | Task | Findings | Complexity | Owner |
|---|---|---|---|---|
| 3.1 | Router migration first (react-router), deep-link invite links straight to accept screen — explicitly sequenced *before* Expo per Stage C §18.4 | B-07 | M | Analyst |
| 3.2 | Expo app: port `domain/*` verbatim; RN implementations of TTS/audio/symbol/data providers (IndexedDB→expo-sqlite/MMKV); presentation layer rewrite; store pipelines (TestFlight/Play tracks) | Stage C §18.1 | XL | Architect + Analyst |
| 3.3 | Family & multi-role model v1 (Part 20): `families` entity, member roles, permission matrix enforcement in rules, invite flows per role; migration path from uid-centric model | D-12 (family half), D-13 | XL | Architect |
| 3.4 | Audit log: `auditLog` collection written by every access-affecting CF; surfaced read-only to owners | D-08 | M | Architect + Security Sentinel |
| 3.5 | Media v2: in-app camera (getUserMedia + grid/face guide), real on-device background removal (MediaPipe), on-device NSFW check + consent-gated report path (per E-11 ADR) | E-08, E-11 | L | Analyst-Media |
| 3.6 | Voice bank: `VoiceClip` entity, waveform/trim/re-record UX, per-tile reusable named voices, adult-gated record button, duration/size caps; dedicated "add family member" wizard | E-13, C-11 | L | Analyst-Media + UX Auditor |
| 3.7 | MFA for clinician/staff/admin accounts | D-06 | M | Analyst |
| 3.8 | Backup export completeness: include media + voice in export (portability) | D-10 | M | Analyst |

- **Risks:** the Expo rewrite is the largest single line item in the whole roadmap — do not run 3.2 and 3.3 concurrently with fewer than 3 devs; iOS `MediaRecorder`/audio-format divergence (Stage E §21.2 `[Verify]`).
- **Exit criteria:** apps approved in both stores; a family account with 2 parents + 1 therapist works end-to-end on 3 devices incl. media decryption; audit log answers "who accessed this child's data."

### Phase 4 — Scale to 5,000 users, observability maturity, cost control (gate: **500 → 5,000 users**)

**Duration `[Assumption]`: ~8 weeks, partially parallel with Phase 3.**

| # | Task | Findings | Complexity | Owner |
|---|---|---|---|---|
| 4.1 | Per-field merge sync (ADR-0004) or visible conflict-resolution UI — mandatory before concurrent therapist+parent editing is common | **B-08 (High)** | L | Architect |
| 4.2 | Self-serve signup: replace manual admin approval with auto-approve + abuse monitoring (or approval dashboard as interim) | B-03 | M | Architect |
| 4.3 | App Check (reCAPTCHA Enterprise) on all callables | B-23 | M | Security Sentinel |
| 4.4 | Board revision history (saveVersion on every save) + 30-day trash UI | B-09, B-20 | M+S | Analyst |
| 4.5 | AAC SLO instrumentation: board-load, tap-to-speech RUM; sync-success telemetry; SLO dashboard + alerts | Stage B Part 12 | L | Analyst + Optimizer Watchdog |
| 4.6 | CSP nonce migration (drop `unsafe-inline`); Nakdan proxy CF with rate limit (post-licensing); rate-limit doc TTL cleanup | D-07, E-12, E-15 | M+M+S | Security Sentinel |
| 4.7 | AI content filter: server-side appropriateness wordlist on `aiBoard` output; topic-input sanitization | E-10, E-06 | S+S | Security Sentinel |
| 4.8 | Feature flags (Firestore `config/flags` doc) + gradual rollout convention | B-17 | S | DevOps |
| 4.9 | Cost guardrails: global Cloud Billing budget alerts, aggregate CF invocation alarms, TTS pre-generation for core-word sets | E-07, Stage B Part 16 | S–M | Optimizer Watchdog |

- **Exit criteria:** zero manual steps in signup; App Check enforced; conflict-safe sync verified by 2-writer soak test; SLO dashboard live with 30 days of data; infra cost per user tracked monthly against the Part 16 model.

### Phase 5 — Institutional readiness (HMO/MoE/EU) + voice cloning with safeguards (gate: **clinic pilots → tenders**)

**Duration `[Assumption]`: 12+ weeks; heavy non-engineering dependencies.**

| # | Task | Findings | Complexity | Owner |
|---|---|---|---|---|
| 5.1 | Organization tenancy: `organizations/{orgId}` (clinics/schools), member rosters, classroom scoping, principal-approval workflow, org-admin dashboard, collection-group "children shared with me" queries + composite indexes + rules tests | **D-12 (High)** | XL | Architect |
| 5.2 | Dual-custody consent mode: `pendingConsent` dual-approval for sensitive actions (deletion, new-adult invites, voice cloning) | D-13 | L | Architect + UX Auditor |
| 5.3 | Compliance package: completed DPIA vN, רישום מאגר מידע filed, security-officer designation, accessibility statement AA-conformant, EN 301 549 mapping, procurement-ready security whitepaper | D-09, B-04, C-17 | L (process) | Security Sentinel + counsel |
| 5.4 | Voice cloning (only if product decides to ship): Phase A consent infrastructure first (liveness, adults-only hard block, dual-consent), Azure Custom Neural Voice path, watermarking, revocation-with-verified-deletion — per Stage E §14.3; **minors-cloning prohibited at product level** | E-14 | XL | Architect + Security Sentinel + legal |
| 5.5 | Azure TTS evaluation (EU residency + DPA maturity) as institutional-grade alternative/supplement; Piper offline-voice spike for guaranteed-quality offline fallback | Stage E §14.2 | M | Analyst + Optimizer Watchdog |
| 5.6 | Account deletion self-service (cascading CF) if not already forced earlier by counsel in 1.12 | **D-03 (High)** — *scheduled here at the latest; counsel may pull it into Phase 1* | M | Analyst |

- **Exit criteria:** one clinic pilot running on org tenancy with audit log + revocation demonstrated; compliance package accepted by at least one institutional security review; voice cloning either not shipped or shipped with all Phase-A safeguards + counsel sign-off.

### Phase 6 — Regional expansion (Arabic, English)

**Duration: ongoing after Phase 5 starts.**

| # | Task | Findings | Complexity | Owner |
|---|---|---|---|---|
| 6.1 | i18n framework introduction (i18next/react-intl) + incremental string extraction — **prerequisite for everything else in this phase**; begin extraction during Phase 2 UI rework to avoid double-touching files | **B-06 (High)** | L | Architect + Analyst |
| 6.2 | Arabic: RTL already first-class (advantage); Arabic TTS voice selection + symbol-set cultural review + translated copy tone guide | Stage C §17.6 | L | UX Auditor + Analyst |
| 6.3 | English/LTR support + board translation feature (charter Part 14) with human review loop | — | L | Analyst |
| 6.4 | GDPR operationalization for EU users (DPA acceptance, EU-region verification, Art. 17/20 flows already built in 5.6/3.8) | Stage D §8.5 | M | Security Sentinel |

- **Exit criteria:** full product usable in Arabic end-to-end; one non-Hebrew pilot cohort.

---

## 3. Backlog by owning sub-agent (charter Part 24 grouping)

Priorities: **P0** = must have before Closed Beta · **P1** = before First Paying Family · **P2** = before 500 users · **P3** = before 5,000 users / institutional · **P4** = nice-to-have.

### Architect (deep-reasoning tier)
| Task | Priority | Complexity | Risk addressed | Depends on |
|---|---|---|---|---|
| D-02 key-continuity ADR + implementation | P0 | L | Cross-device decryption failure (R-02) | — |
| D-01 sharing schema/rules redesign | P0 | L | Beta SLPs blocked (R-01) | — |
| Billing + family billing entity (B-02) | P1 | L–XL | No revenue path | Part 20 schema |
| ADR-0004 per-field merge (B-08) | P2 | L | Silent edit loss (R-06) | — |
| Self-serve signup (B-03) | P2 | M | Growth cap (R-10) | Observability (1.9) |
| Family/multi-role model v1 (D-12 family half, D-13) | P2–P3 | XL | Family-model gap | Billing entity |
| Expo native port (§18.1) | P3 | XL | iOS reach | Router (B-07) |
| Org tenancy (D-12) | P3 | XL | Institutional sales blocked (R-12) | Family model, audit log |
| Voice cloning Phase A–C (E-14) | P3–P4 | XL | Deepfake/biometric misuse (R-15) | Counsel sign-off |
| i18n framework (B-06) | P3 | L | Expansion blocked | Start extraction in Phase 2 |

### Analyst (standard tier)
| Task | Priority | Complexity | Risk addressed | Depends on |
|---|---|---|---|---|
| `navigator.storage.persist()` (B-10) | P0 | S | Silent eviction (R-03) | — |
| Sync default-on + backup nudge (B-11) | P0 | M | Device loss = voice loss (R-03) | UX copy |
| Password reset (D-04) | P0 | S | Locked-out families | — |
| Revocation CF + access-list UI (D-05) | P0 | M | Therapist over-access (R-08) | — |
| C-04 touch-target fix + C-02 contrast | P0 | S | Motor-access regression (R-09) | — |
| Grid ARIA rows (C-03) | P1 | M | WCAG claim (R-11) | — |
| iOS meta tags (C-07), sentence-bar confirm, haptics (C-09) | P1 | S | iOS trust/UX | — |
| Router migration (B-07) | P2 | M | Deep links, Expo prereq | — |
| Revision history + trash UI (B-09, B-20) | P2 | M+S | Unrecoverable edits (R-07) | — |
| MFA for clinician/staff (D-06) | P3 | M | Account takeover blast radius | Family model roles |
| Export completeness (D-10) | P3 | M | Portability (GDPR Art. 20) | — |

### Analyst-Media
| Task | Priority | Complexity | Risk addressed | Depends on |
|---|---|---|---|---|
| EXIF guarantee (E-02) | P0 | S | GPS leak of a minor's location (R-05) | — |
| Voice recordings → encrypted sync (E-03) | P0 | M | Recorded-voice loss (R-04) | D-02 key continuity |
| On-device NSFW + report path (E-11) | P2 | M | Inappropriate content (R-14) | Product ADR |
| VoiceClip bank + trim UX (E-13) + family wizard (C-11) | P2–P3 | L | Core differentiator quality | E-03 |
| In-app camera + real bg-removal (E-08) | P3 | L | Capture UX | — |

### Security Sentinel (persistent)
| Task | Priority | Complexity | Risk addressed | Depends on |
|---|---|---|---|---|
| Privacy policy + DPIA + registration track (D-09/B-04) | P0 | L | Legal exposure (R-13) | Counsel |
| Nakdan env-gate (E-05) + ARASAAC attribution (E-04) | P0 | S | License violation (R-16/R-17) | — |
| TTS-text legal review closure (E-01) | P0–P1 | M | Minor's utterances to 3rd party (R-05) | Counsel |
| PII-scrubbed error tracking review (B-14) | P0 | S | Privacy-safe observability | — |
| App Check (B-23) | P2 | M | Cost abuse (R-18) | — |
| CSP nonce migration (D-07), Nakdan proxy (E-12) | P2 | M | XSS depth, ToS | Licensing |
| AI content filter + input sanitization (E-10/E-06) | P2 | S | Child-inappropriate AI output | — |
| Compliance package for institutions (5.3) | P3 | L | Tender blockers | DPIA, statement |

### UX Auditor
| Task | Priority | Complexity | Risk addressed | Depends on |
|---|---|---|---|---|
| Sync-consent + backup-nudge copy (with B-11) | P0 | S | Data-loss consent clarity | — |
| Token consolidation (C-01) | P1 | M | Brand/theming drift | — |
| Design system v1 + Storybook + themes + dyslexia font (C-06) | P1 | L | UX overhaul foundation | C-01 |
| Onboarding personas + tour (C-05) + PIN nudge (C-10) | P1 | M | First-run comprehension | — |
| Accessibility statement (C-17) | P1 | S | תקן 5568 (R-11) | C-02/03/04 |
| Family-capture wizard UX (C-11) | P2 | L | Emotional core flow | E-13 |
| Dual-custody consent UX (D-13) | P3 | L | Divorced-family safety | Family model |

### Optimizer Watchdog (persistent)
| Task | Priority | Complexity | Risk addressed | Depends on |
|---|---|---|---|---|
| Global budget alerts (E-07) | P0 | S | Runaway spend (R-18) | — |
| Bundle-size budget in CI (§18.3) | P1 | S | Low-end Android perf | — |
| Rate-limit doc TTL (E-15) | P2 | S | Storage cruft | — |
| TTS pre-generation for core words | P3 | M | TTS spend curve | — |
| Monthly cost-vs-model tracking (Part 16) | P2→ongoing | S | Cost drift | Dashboards |

### QA Agent
| Task | Priority | Complexity | Risk addressed | Depends on |
|---|---|---|---|---|
| iOS real-device pass: C-08 autoplay, Safari eviction, `MediaRecorder` formats | P0 | M | "First tap speaks" on iOS (R-09) | Device access |
| 2-device sharing/decryption test protocol (validates D-01/D-02 fixes) | P0 | M | Beta gate verification | 1.1/1.2 |
| Restore-drill script + log (B-12/13 validation) | P0 | S | Untested backups (R-03) | 1.10 |
| Lighthouse low-end profile in CI (§18.3) | P1 | S–M | Target-hardware perf | — |
| Axe suite un-waiver + a11y regression gate (B-22) | P1 | S | WCAG honesty | C-02/03 |
| 2-writer sync soak test (B-08 validation) | P2 | M | Conflict-safety proof | 4.1 |
| Assistive-tech matrix execution (§19.5) | P3 | L | Real-device a11y evidence | Devices/AT |

### DevOps
| Task | Priority | Complexity | Risk addressed | Depends on |
|---|---|---|---|---|
| Staging project + preview channels (B-01/B-15) | P0 | M | Prod blast radius (R-19) | — |
| PITR + exports + bucket versioning (B-12/B-13) | P0 | S×3 | Cloud data loss (R-03) | — |
| Release tagging + rollback runbook (B-16), align CI/CD test cmd (B-24) | P0 | S | Undefined RTO | — |
| Feature flags (B-17) | P2 | S | Risky rollouts | — |
| Store release pipelines (with 3.2) | P3 | M | Native delivery | Expo |

### Docs Agent
| Task | Priority | Complexity | Risk addressed | Depends on |
|---|---|---|---|---|
| Phase-0 residual corrections (README/ARCHITECTURE/ADR-0003, D-15 rules move, E-08/E-09) | P0 | S | Onboarding drift | — |
| Beta support runbook | P0 | S | Pilot support | — |
| Accessibility statement publication (with UX) | P1 | S | R-11 | C-17 |
| Handoff package refresh per charter Part 23 | P2 | M | Bus factor | — |

---

## 4. Risk Register (charter Part 26)

Severity/Likelihood: H/M/L. Status: **Open** unless noted. AAC-specific risks marked 🔴.

| ID | Risk | Severity | Likelihood | Impact | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-01 | 🔴 Beta SLPs cannot access shared children at all (sharing broken end-to-end: code-format mismatch, rules scope, key continuity) | H | **Certain** (verified bugs D-01) | Beta fails on day 1 for its clinical cohort | Phase 1 tasks 1.1+1.2 before any SLP onboarding | Architect | Open |
| R-02 | 🔴 Family's second device (or clinician) silently cannot decrypt synced photos — per-device non-extractable key, `decryptBlob` returns null | H | Certain for multi-device (D-02) | Perceived data loss, support storm, trust damage | Account-level key continuity ADR + implementation (1.2) | Architect + Security Sentinel | Open |
| R-03 | 🔴 Child permanently loses their voice: single-device family + browser storage eviction or device loss (sync opt-in, no `persist()`, backups manual/untested) | **H** | M–H on low-end Android | Irreplaceable years-of-work board destroyed; worst possible product failure | 1.3 (persist + default-on sync) + 1.10 (PITR/exports/restore drill) + backup nudges | Analyst + DevOps | Open |
| R-04 | 🔴 Recorded family voices (e.g., a late grandparent's voice) lost with device — plaintext, local-only, never synced | H | M | Emotionally irreplaceable loss; reputational | 1.4 route recordings through encrypted media sync | Analyst-Media | Open |
| R-05 | 🔴 Sensitive-data leak of a minor: EXIF/GPS on error-path uploads (E-02); full utterance text to Google TTS with no completed legal review (E-01) | H | M | Legal exposure + safety of a disabled child | 1.5 EXIF guarantee; 1.12 legal review; DPIA data-flow documentation | Security Sentinel | Open |
| R-06 | 🔴 Therapist+parent concurrent edits silently drop one side (entity-level LWW; ADR-0004 unimplemented) | M→H at scale | M (grows with users) | Lost clinical work, eroded trust | 4.1 per-field merge before 500 users; interim: conflict-visible UI | Architect | Open |
| R-07 | Therapist's solo edits unrecoverable (versions only capture conflict-losers; no trash UI) | M | M | Cannot revert a bad board edit | 4.4 revision history + trash | Analyst | Open |
| R-08 | 🔴 Therapist over-access: grants permanent, no revocation, no audit trail — access outlives the clinical relationship | H | H (structural) | Privacy violation of a minor; institutional disqualifier | 1.7 revocation now; 3.4 audit log; 5.1 org scoping | Analyst + Architect | Open |
| R-09 | 🔴 Motor/AT regressions on target hardware: 44px override of configured targets (C-04); iOS first-tap autoplay risk (C-08); chattery-switch double-fire (C-15) | H | C-04 certain; C-08 `[Verify]` | The exact users the product exists for are the ones hurt | 1.11 + 1.14 + 2.9 | Analyst + QA | Open |
| R-10 | Manual admin approval caps growth and is a labor cost that scales linearly with signups | M | Certain at scale | Self-serve funnel impossible | 4.2 auto-approve + monitoring | Architect | Open |
| R-11 | WCAG/תקן 5568 claim dishonest while axe waivers exist; no accessibility statement | M | Certain today | Institutional procurement disqualifier; regulatory duty | 2.2 + 2.10 + C-17 | UX Auditor + Docs | Open |
| R-12 | No org tenancy/audit/compliance package → HMO/MoE conversations cannot start | H | Certain today | Largest revenue channel blocked | Phase 5 (5.1–5.3) | Architect + Security Sentinel | Open |
| R-13 | Operating without privacy-law baseline (no DPIA, no registration decision, no policy) while holding minors' sensitive data | H | M (enforcement) / Certain (duty) | Fines, forced shutdown, trust collapse | 1.12 start week 1; counsel engagement | Security Sentinel + counsel | Open |
| R-14 | Inappropriate content reaches a child: no AI-output filter (E-10), no media moderation path (E-11) | M | L–M | Child-safety incident, press risk | 4.7 wordlist filter; 3.5 on-device NSFW + report path; E2EE-vs-moderation ADR | Security Sentinel + Product | Open |
| R-15 | 🔴 Voice cloning shipped without safeguards → deepfake/biometric misuse of family voices (or a minor's) | H | L (feature not built) | Severe, irreversible harm; existential reputational risk | E-14: consent infra first, adults-only hard block, watermarking, Azure attestation path; counsel gate | Architect + legal | Open (feature absent — keep it that way until gated) |
| R-16 | ARASAAC CC BY-NC-SA incompatible with paid tier; attribution currently missing entirely | H (legal/business) | Certain if paid tier ships as-is | Core content legally unusable in revenue product | Attribution now (S); SymbolStix/PCS license budget before paid tier (2.5) | Legal + Product | Open |
| R-17 | Nakdan academic endpoint used commercially without license; also an unproxied, unthrottled client-side call | M | Certain (usage exists) | ToS violation; vendor cutoff = nikud quality drop | 1.12 licensing contact; E-05 env gate; 4.6 proxy post-license | Security Sentinel | Open |
| R-18 | Cost abuse / runaway spend: no App Check, no global budget ceiling (per-uid limits only) | M | L–M | Surprise bills (~$66/day per abused token, Stage B §5) | 4.3 App Check by ~1K users; E-07 budget alerts in Phase 1 | Security Sentinel + Optimizer | Open |
| R-19 | Single Firebase project: every `main` push deploys straight to production; no rehearsal, undefined rollback RTO | H | M | Bad rules/schema change hits all live families at once | 1.8 staging + preview channels + rollback runbook | DevOps | Open |
| R-20 | Nakdan/ARASAAC vendor outage degrades nikud/symbols for new content (no fallback provider) | L–M | M | Quality degradation, silent to users | Accepted short-term (B-21); secondary symbol source Phase 5; surface degradation state to caregivers | Architect | Accepted (documented) |
| R-21 | Expo rewrite (Phase 3) under-resourced → stalls core roadmap for months | M | M | Opportunity cost; web product stagnates | Sequence router first (3.1); don't overlap 3.2+3.3 with <3 devs; keep PWA shipping in parallel | Architect | Open |
| R-22 | Key-continuity redesign (1.2) introduces a crypto flaw (e.g., weak passphrase wrapping) while fixing availability | M | L–M | Confidentiality regression of children's photos | ADR + external review of scheme before code; keep non-extractable device keys as default where possible | Security Sentinel | Open |

---

## 5. Production Readiness Scorecard (charter Part 27)

Scores are 0–100, evidence-cited, calibrated to "ready to operate as a commercial SaaS for this data class." **Overall: 54/100** (unweighted mean; the profile matters more than the number — engineering fundamentals score high, business/ops/compliance layers score low).

| Category | Score | Reasoning (evidence) |
|---|---|---|
| Architecture | **82** | Strict 4-layer unidirectional design, pure-TS domain layer (verified as deliberately framework-agnostic — Stage C §18.1), provider abstractions (Sync/TTS) exactly where portability needs them. Deductions: no tenant/org concept (D-12), custom nav stack (B-07), single-project coupling (B-01). |
| Scalability | **70** | Firestore/Functions cost model comfortable to 10K users (Stage B Part 5/16); per-uid rate-limit design verified contention-free. Deductions: admin-approval process bottleneck (B-03), no App Check (B-23), external SPOFs without fallback (B-21). |
| Reliability | **55** | Offline-first is real (3-tier TTS fallback, outbox, additive migrations with tested failure handling). Deductions are severe because AAC-specific: sync opt-in + no `persist()` + manual backups = plausible total board loss (B-10/B-11); LWW silent edit loss (B-08); versions store misses solo edits (B-09). |
| Security | **62** | Strong baseline: default-deny rules with tests and no cross-family IDOR found (Stage D §9.1), server-side keys, strict headers, E2EE media. Deductions: sharing feature broken (D-01) which is itself an access-control defect, no revocation (D-05), no MFA (D-06), `unsafe-inline` CSP (D-07), no App Check (B-23). |
| Privacy | **45** | E2EE media + data-minimal schema + EU-region functions are genuinely above-average. Deductions: no right-to-erasure path (D-03), open TTS-text legal question (E-01), voice recordings plaintext (E-03), EXIF error-path leak (E-02), Google Fonts pre-consent (D-11), zero compliance artifacts (D-09). |
| Accessibility | **68** | Working switch-scanning (1&2-switch, row-column), dwell, prediction, motor-planning invariant, per-user access settings — rare strengths at this stage. Deductions: three concrete WCAG fails incl. the C-04 touch-target override, no statement (C-17), no real-device/AT test evidence (§19.5). |
| UX | **55** | Coherent AAC core interaction model, Fitzgerald coding, RTL-native. Deductions: no onboarding/tutorial (Nielsen #10 = 2/5), dual token systems (C-01), missing emotional core flow (C-11), no sensory-calm/dyslexia options (C-06). |
| Cross-Platform Coverage | **40** | Solid installable PWA on Android/desktop. Deductions: iOS PWA gaps unaddressed (C-07/C-08, eviction), no native apps, no push path on iOS, deep links impossible without router (B-07). |
| DevOps | **50** | Real CI gate (typecheck→lint→coverage→build→rules tests), Dependabot, secrets correctly separated. Deductions: no staging (B-01), deploy-on-push to prod, no rollback runbook (B-16), no flags (B-17), CI/CD drift (B-24). |
| Monitoring/Observability | **15** | Deliberately deferred (privacy-blocked) — but the net position is: zero error tracking, zero dashboards, zero alerts, no SLO measurement (Stage B Part 12). Score reflects operational blindness regardless of the good reason. |
| Backup & DR | **30** | Local export/import validated; soft-delete everywhere; device-as-DR insight (Stage B Part 11). Deductions: PITR unverified (B-12), no bucket versioning (B-13), no restore drill, RPO=∞ for non-synced families (R-03). |
| Documentation | **75** | Unusual strength: PRD, 5 ADRs, per-milestone docs, HANDOFF culture, and now docs/00–06. Deductions: verified doc↔code drift (README/ARCHITECTURE/ADR-0003 — Stage A §8, E-09), rules file misfiled (D-15). |
| Maintainability | **74** | Matches Stage B Part 3's 74/100: strict TS zero-`any`, 244+ tests, clean layering vs. presentation-layer growth, oversized components (B-05), no i18n (B-06). |
| AI Readiness | **65** | All AI behind authenticated, rate-limited, key-server-side proxies with caching and a tested JSON-repair fallback — above-average discipline. Deductions: no global spend ceiling (E-07), no output content filter (E-10), unsanitized prompt interpolation (E-06), Nakdan path inconsistent with the proxy pattern (E-12). |
| Regulatory (IL) | **20** | Nothing filed, nothing published: no privacy policy/ToS, no DPIA, no מאגר מידע registration decision, no accessibility statement, two unresolved content licenses (ARASAAC NC, Nakdan). The 20 (not 0) reflects that the *technical* substrate for compliance (EU region, E2EE, minimization) is already better than most applicants'. |

**Reading the profile:** engineering quality (Architecture 82, Docs 75, Maintainability 74) is not the gap. The four lowest scores — Monitoring 15, Regulatory 20, Backup/DR 30, Cross-Platform 40 — are all *absence-of-layer* problems with known, bounded fixes, which is exactly what Phases 1–3 target. A re-score after Phase 1 should move Reliability, Privacy, Monitoring, Backup/DR, and Regulatory by +15–30 points each.

---

## 6. Milestone gates summary (charter Part 24 → Go/No-Go inputs)

| Milestone | Gate contents | Roadmap location |
|---|---|---|
| **Closed Beta** | D-01, D-02, B-10/B-11, E-02/E-03, D-04, D-05, B-01, B-12/13/14, C-04, privacy policy + DPIA v1, support runbook, iOS verify pass | Phase 1 (all) |
| **First Paying Family** | Billing (B-02) + family billing entity, symbol-license position (E-04), WCAG AA honest (C-02/03 + un-waiver), accessibility statement, onboarding | Phase 2 |
| **500 Users** | Per-field merge (B-08), self-serve signup (B-03), App Check (B-23), revision history/trash, SLO dashboards | Phase 4 (pulled earlier where possible) |
| **5,000 Users** | Native apps shipping, family model v1, cost guardrails proven, AT test matrix executed | Phases 3–4 |
| **Institutional (HMO/MoE)** | Org tenancy + audit log + revocation at org grain, compliance package, MFA, AA-conformant statement, EN 301 549 mapping | Phase 5 |

The explicit Go/No-Go verdicts with justifications live in [`06-executive-summary.md`](06-executive-summary.md).

---

*End of document — 05-roadmap.md.*
