# 05 — Roadmap & Risk Register (Parts 24–28)

> Stage F output of the SaaS transformation plan (see `COBOARD_TASK.md`, Parts 24–28).
> Date: 2026-07-14 · Author: **Architect (Opus)**, synthesizing verified findings from `docs/00-discovery.md` … `docs/04-media-ai.md` and execution status from `docs/reviews/HANDOFF.md`.
> This document does **not** re-audit the code. It reconciles the five prior audits into one prioritized, executable plan. Every non-trivial task traces to a finding ID (`B-xx` audit / `C-xx` UX-a11y / `D-xx`,`S-x`,`P-x`,`T-x` privacy-security / `E-xx` media-AI). Where a source doc marked something `[Assumption]`/`[TBD]`, that marking is preserved.

**Reading note for the whole document.** The consistent verdict across all five audits is: *Co_Board is production-**quality** code but not production-**ready** as a business.* No actively-exploitable Critical security vulnerability was found (doc 03 verdict). The blockers from "first paying customer" onward are missing **business/ops/compliance layers** (billing, staging, erasure flow, tenant model, legal paperwork), not code defects — plus two genuine product-correctness gaps (D-02 media-key sharing, B-11 sync-is-opt-in data loss) and one legal-model gap that specifically bites the paid tier (E-04 ARASAAC NonCommercial license).

---

## Part 24 – MVP Readiness Plan

Six task groups, gated by the customer milestone that first *requires* each item. Complexity S/M/L/XL. "Owning sub-agent" uses the charter's roster (Architect/Analyst/UX Auditor/Security Sentinel/DevOps/QA/Docs). A task appears in the **earliest** group that needs it and is not repeated later.

### Group 1 — Must Have Before First Paying Family

The gate here is dual: (a) a lawful basis to charge for and process a minor-with-disability's data, and (b) the technical ability to take money. Every item below is a hard gate, not a nice-to-have.

| Task | Priority | Risk addressed | Complexity | Dependencies | Owner | Exit criteria |
|---|---|---|---|---|---|---|
| Build minimal billing (Stripe/Paddle) + `families/{familyId}` billing entity | P0 | B-02 | L | Family entity backfill (below) | Architect + Analyst | A family can subscribe, pay, and be marked paid; webhook updates entitlement; cancel path works |
| `families/{familyId}` entity + one-time backfill CF (uid → sole-parent family) | P0 | T-1 (foundation), P-4 (foundation) | M | — | Architect | Every approved user has a `familyId`; idempotent, additive, does not touch child data (doc 03 migration step 1) |
| `eraseAccount` Cloud Function (right to erasure: Firestore + Storage + Auth + tombstone) | P0 | P-1 (Critical/compliance) | M | Family entity | Analyst | Parent self-service deletes all `users/{uid}/**`, child media, Auth user; audit tombstone written; verified in staging |
| Legal review of TTS/nikud/Gemini third-party text flows (close in-code TODO `ttsProxy.ts:7`) | P0 | P-2 / E-01 | S (process) | — | Product owner + legal | Signed determination on lawful basis + DPA status for each provider; documented in DPIA |
| Resolve ARASAAC NonCommercial license for paid tier (attribution now; relicense/SymbolStix decision) | P0 | E-04 | S (attribution) / L (relicense) | — | Product owner + legal | Attribution line shipped; counsel sign-off that paid tier's symbol source is license-clear |
| Resolve Nakdan (Dicta) commercial licensing OR gate endpoint per-env with local-dictionary fallback | P0 | B-18 / P-3 / E-05 | S (env gate) / M (license) | — | Product owner + Architect | No hardcoded academic endpoint reachable in prod; license obtained or feature degraded to local dict |
| Publish privacy policy + ToS + accessibility statement (הצהרת נגישות, "partially conforms WCAG 2.2 AA") | P0 | B-04 / P-5 / C-01,C-02 | M (process) | Accessibility remediation started | Product owner + Legal + UX | Documents live and linked from signup/settings; accessibility statement names a רכז נגישות |
| DPIA sign-off (product owner + counsel) using doc 03 §8.6 template | P0 | B-04 / P-2 | S (process) | Erasure flow, legal reviews above | Product owner + Legal | DPIA §6 sign-off recorded before first real family |
| Make cloud sync default-on (or hard-nag onboarding) + `navigator.storage.persist()` at onboarding | P0 | B-11 (Critical) / B-10 | M + S | — | Architect + UX | New family's board survives a simulated device-loss/eviction test; persist granted |
| Fix media E2E key-sharing gap (envelope device key under family/child-scoped key via `acceptInvite`) | P0 | D-02 (High, product-breaking) | L | Family entity | Architect | Therapist on a 2nd device decrypts a shared photo; single parent's 2nd device works |
| Fix EXIF-strip bypass on image-upload error path + regression test | P1 | E-02 | S | — | Analyst | JPEG-with-GPS fixture never yields GPS bytes through any `handleImageFile` path |
| Route voice recordings through encrypted `mediaRepo`/`mediaSync` pipeline (not plain `symbolRepo`) | P1 | E-03 | M | Media key fix (D-02) | Analyst | A recorded family voice survives device reset for a synced family |
| Fix `--cl-primary` contrast (`#BA543D`, 4.75:1) + grid-ARIA row wrappers (`display:contents`) | P1 | C-01 / C-02 / B-22 | S + M | — | UX + Frontend | axe `color-contrast` + `aria-required-parent/children` pass; waivers removed from e2e specs |
| Stand up staging Firebase project (`co-board-staging`) + preview channels | P1 | B-01 / B-15 / S-10 | M | — | DevOps | Rules/schema changes rehearse in staging before prod; PR preview URLs live |
| Minimal privacy-compatible error tracking (GlitchTip self-host / Sentry-EU + PII scrubbing) | P1 | B-14 / E-3(HANDOFF open Q) | M | Privacy decision from P-2 review | Analyst + Security Sentinel | Errors visible in prod with child names/labels scrubbed; replay disabled |
| Enable Firestore PITR + Storage bucket versioning + scheduled export | P1 | B-12 / B-13 | S | — | DevOps | PITR confirmed on in GCP console; daily export to cross-region bucket; one restore drill passed |

### Group 2 — Must Have Before 100 Users

Gate: unsupervised families in the wild, first small paid cohort. Manual hand-holding still tolerable but visibility and self-serve onboarding become necessary.

| Task | Priority | Risk addressed | Complexity | Dependencies | Owner | Exit criteria |
|---|---|---|---|---|---|---|
| Tiered self-serve onboarding (family instant / therapist soft-verified / school invite-code) | P0 | B-03 / C-14 | L | Family entity, role model | Architect + Frontend | New family gets to first board <5 min with no human approval; admin bottleneck removed for family tier |
| App Check (reCAPTCHA Enterprise) on `ttsProxy`/`aiBoard`/`acceptInvite`/`approveUser` | P0 | B-23 / S-6 | S–M | Product-owner cost/UX decision (HANDOFF §3) | Security Sentinel | Functions reject non-attested callers; verified no legitimate-client breakage |
| Global spend circuit-breaker: Cloud Billing budget alert + aggregate CF-invocation alert | P0 | E-07 | S | Monitoring dashboards | DevOps + Optimizer | A cross-account TTS/Gemini spike pages a human before the monthly bill does |
| Cloud Monitoring dashboards (Function error rate, p50/p95, Firestore quota, DAU/synced) | P1 | B-14 | S | — | Analyst | Dashboards live; alert policies on error-rate + latency |
| `acceptInvite` rate limit (defense-in-depth cost-DoS) | P2 | S-8 | S | — | Analyst | `enforceRateLimit` applied; unit-tested |
| Rollback runbook + release tagging + align `deploy.yml` on `test:coverage` | P2 | B-16 / B-24 | S | Staging project | DevOps | Tagged deploys; documented `firebase hosting:rollback`; CI/CD test commands match |
| Trash/undelete UI over existing `archived` data | P2 | B-20 | S–M | — | Analyst + Frontend | Parent can browse and one-tap-restore an archived board |
| Content-appropriateness wordlist filter on `aiBoard` output; basic `topic` prompt-injection sanitization | P2 | E-10 / E-06 | S | — | Security Sentinel | Generated words pass a profanity/appropriateness check before reaching a child |

### Group 3 — Must Have Before 500 Users

Gate: concurrent multi-editor (therapist + parent) becomes statistically common; self-serve growth outpaces manual ops entirely.

| Task | Priority | Risk addressed | Complexity | Dependencies | Owner | Exit criteria |
|---|---|---|---|---|---|---|
| Per-field / three-way sync merge (ADR-0004) — layout field gets three-way, media/label most-recent-wins | P0 | B-08 / C-18 | L | — | Architect | Simulated concurrent therapist+parent edit loses no field; `board.placements` conflict keeps both, flags review |
| Role/scope-aware authorization (view vs. edit) in rules + CF-mediated writes | P0 | S-2 | M | Role model, family entity | Architect | A `view`-scope member cannot write; negative rules test passes |
| Time-bound `childAccess` grants (`expiresAt`) + `revokeAccess` CF + scheduled daily expiry | P0 | S-3 / C-16 | M | Role/scope model | Architect | Therapist grant auto-expires; owner can revoke; both write `auditLog` |
| `auditLog` collection written on grant/revoke/expire/erase/consent | P1 | S-4 | M | Family entity | Analyst | Parent can enumerate who has/had access to their child at any time |
| Board revision history: fire `saveVersion` on every save (not just conflict losers), capped | P1 | B-09 | M | Care around hot save path (HANDOFF caution) | Analyst | Therapist can revert a solo-edited board to an earlier state |
| MFA (TOTP) — enforce for `clinician`/`staff` roles, optional for parents | P1 | S-1 | M | Identity Platform upgrade `[TBD]` | Analyst | Clinician login requires TOTP; parent can opt in |
| Expanded cross-tenant negative rules test suite (10 tests, doc 03 Part 9) | P1 | T-2 | S–M | — | QA + Analyst | All 10 negative cases green under emulator |
| Full self-serve signup (remove/soften manual approval gate) with async abuse monitoring | P1 | B-03 | M | Onboarding tiers, App Check, monitoring | Architect | No human in the signup path for family tier at 500-user volume |

### Group 4 — Must Have Before 5,000 Users

Gate: scale hardening, cost control at volume, and the native-app decision point (Phase 3 per doc 02 §18.D).

| Task | Priority | Risk addressed | Complexity | Dependencies | Owner | Exit criteria |
|---|---|---|---|---|---|---|
| Expo (React Native) app for iOS + Android; extract `domain`+`services`+sync to shared package | P0 | doc02 §18.D / B-06(i18n prereq) / iOS PWA limits (18.A) | XL | Per-field merge **must** land first (C-18); RN low-end-Android grid spike passes | Architect + Frontend | 60fps board scroll + tap-to-speech <150ms on a ₪600-class device (Phase 3 go/no-go gate) |
| Native modules only: audio capture, iOS Guided Access detect / Android Screen Pinning, keep-awake/volume cap, FCM/APNs | P0 | doc02 §18.D / C-12 | L | Expo shell | Frontend | Lock-to-child works on iOS+Android; recorded-voice quality guaranteed |
| i18n framework (i18next/react-intl); extract hardcoded Hebrew strings incrementally | P1 | B-06 | L | — | Architect + Analyst | Strings externalized; English admin/therapist UI possible; Arabic/English unblocked |
| RUM for AAC SLOs (board load <1s, tap→speech <150ms cached) + offline-sync-success telemetry | P1 | B-14 (SLO layer) | L | Error tracking, monitoring | Analyst | Two AAC SLOs measured and dashboarded |
| Load-test sync/TTS path; validate single-region posture at load; plan `us-central1` removal | P1 | B-01(scale) / doc01 Part5 | M | Monitoring | DevOps | Load test green; `us-central1` traffic confirmed zero, then removed |
| CSP: eliminate `unsafe-inline` (hash-based or migrate inline styles to classes) | P2 | S-5 / B-? (HANDOFF 3.7) | M | — | Analyst | CSP has no `unsafe-inline`; app functions offline unchanged |
| Refactor CellEditor.tsx (688) / BuilderView.tsx (623) / App.tsx budget lint rule | P2 | B-05 | M | Before adding more role/consent UI to these files | deep-reasoning agent | Files under size budget; no behavior change (verified) |
| Delete legacy client-key TTS provider (`googleTtsProvider.ts`) or loud deprecation guard | P2 | S-9 | S | — | Analyst | Dead file removed / lint-guarded; no client bundle can leak the key |
| `rateLimits/{uid}__action` TTL/cleanup; bundled Piper offline Hebrew voice as fallback upgrade | P3 | E-15 / doc04 §14.2 | S / M | Listening test `[TBD]` | Optimizer / Analyst | Rate-limit docs bounded; offline fallback voice quality validated |

### Group 5 — Must Have Before Institutional Sales (HMO / MoE)

Gate: procurement-grade compliance, multi-tenant administration, full accessibility conformance, dual-custody handling. Furthest out (doc 01 Part 2).

| Task | Priority | Risk addressed | Complexity | Dependencies | Owner | Exit criteria |
|---|---|---|---|---|---|---|
| Multi-tenant entities: `clinics`/`schools`/`therapistLinks`/`schoolStaffLinks` + bulk-revoke by `grantedByOrg` | P0 | T-1 | L | Role/scope model, audit log | Architect | Clinic admin bulk-revokes a departed therapist across all families; collection-group index in place |
| Dual-parent / divorced-family consent model (`consents/{consentId}`, dynamic `requiredApprovers`) | P0 | P-4 / doc03 Part20 | L | Family entity, co-parent role | Architect + UX | Sensitive actions (erase, voice-clone) require all approvers; single-parent family not blocked |
| Israeli compliance paperwork: רישום מאגר מידע, ממונה אבטחה, נוהל אבטחה (likely רמת אבטחה גבוהה tier) | P0 | P-5 | M (process) | DPIA | Product owner + Legal | Database registered; security officer named; written security procedure filed |
| Amendment-13 DPO-threshold assessment | P0 | P-6 | S (process) | Legal engagement | Legal | Determination whether ממונה הגנת פרטיות is mandatory; appointed if so |
| Full WCAG 2.2 AA conformance sweep (close remaining C-03…C-13 items; real-device AT testing) | P0 | C-03..C-13 / B-22 / doc02 Part19 | L | Contrast + grid fixes (Group 1) | UX + QA | Clean AA claim; testing matrix (TalkBack/VoiceOver/Switch/NVDA) executed |
| Custody-dispute / legal-takedown support+legal runbook (ex-spouse access threat) | P1 | doc03 threat model / P-4 | S (process) | Consent model | Product owner + Legal | Documented process for a legal access-revocation request |
| On-device NSFW moderation (nsfwjs) at capture + consent-gated report-review path; sign-off ADR | P1 | E-11 / S-7 / B-19 | M–L | — | Analyst + Product | On-device check blocks/warns; reported-content path never auto-decrypts to staff; ADR signed |
| Proxy nikud through a rate-limited CF (H-KEY consistency) once licensing resolved | P1 | E-12 | M | Nakdan license (E-05) | Security Sentinel | No direct client→Dicta path; rate-limited like TTS/Gemini |
| Extend OBF export to include media/voice (full Art.20-equivalent portability) | P2 | doc03 §8.3 | M | Voice-clip schema | Analyst | Parent exports a complete, media-inclusive archive |
| Cross-region DR: multi-region GCS replication + published RTO (≤4h project rebuild) + IaC | P2 | doc01 Part11 | M | Exports, staging | DevOps | Documented, rehearsed DR; Firebase config in IaC (currently CLI-only) |

### Group 6 — Nice To Have

Genuine enhancements; none block a milestone. Several are extensions of already-mature subsystems (doc 02 stresses scanning/dwell are *mature*, not stubs — they need extension, not construction).

| Task | Priority | Risk/benefit addressed | Complexity | Dependencies | Owner | Exit criteria |
|---|---|---|---|---|---|---|
| Arrow-key roving-tabindex grid navigation | P2 | C-09 | M | Grid-ARIA fix | Frontend | Large board reachable without 64 Tab stops |
| Sensory-calm theme + per-hover-lift toggle | P2 | C-10 | M | Token consolidation (C-05) | UX + Frontend | 4th theme selectable; hover-lift independently disable-able |
| Dyslexia-friendly font (OpenDyslexic, opt-in, offline) | P3 | C-11 | S | — | Frontend | Toggle bundled; loads offline |
| 2-switch step-scan mode + dwell-progress radial indicator | P2 | C-19 / C-20 | M + S | Real-switch hardware test `[TBD]` | Frontend | Distinct 2-switch mapping; dwell feedback visible |
| In-app camera (getUserMedia) w/ grid + on-device face-crop + real background removal | P3 | E-08 / doc04 §21.1 | L | — | Frontend | Replaces `<input capture>` shim; segmentation on-device |
| Voice-clip bank UX: waveform/trim/re-record, `VoiceClip` entity, adult-mode gating | P2 | E-13 | L | E-03 encrypted-sync fix | Frontend + UX | Named reusable family voices per doc04 §21.2 |
| Feature-flag mechanism (Firestore-doc, read at boot) | P3 | B-17 | S | Privacy review of flag payloads | DevOps | Risky changes roll out gradually |
| First-run help overlay / tooltip layer (Nielsen #10 scored 2/5) | P3 | doc02 §17.1 | S | — | UX | Skip-able adult-facing tour |
| Secondary symbol source (fallback for ARASAAC outage) | P3 | B-21 | M | Symbol-license decision (E-04) | Architect | New-word symbol lookup survives an ARASAAC outage |
| Router migration (replace custom navigation stack) | P3 | B-07 | M | Before deep-linking/institutional multi-view | Architect | Deep links feasible |
| Voice cloning (adults-only, Azure Custom Neural Voice, consent+liveness+watermark) | P3 | E-14 / doc04 §14.3 | XL | Phase-A consent infra + legal sign-off; **hard-prohibit minors** | Architect + Legal | Ships only with full §14.3 safeguards; no UI path to clone a minor |

---

## Part 25 – Implementation Roadmap

Phases sequenced to respect the hard dependency chain the audits surfaced:

> **per-field merge (C-18) before the 2nd platform** (doc 02 §18.D) · **family/tenant model (T-1) before institutional sales** · **DPIA + erasure (P-1/P-2) before real paying families** · **role/scope model (S-2/S-3) before audit log and multi-tenant admin**.

### Phase 0 — Current State Snapshot (per HANDOFF.md)

- **Refactor (HANDOFF Phase 2) is fully done:** App.tsx 1,170→626, index.css split into 14 files (byte-identical build), ConfirmDialog replacing `window.confirm`, vite 5→7/vitest 2→3 upgrade with verified offline check. Hardening (Phase 3) is **partial**: done = 3.1 Playwright+axe (6 specs), 3.2 functions unit tests, 3.4 region dual-deploy, 3.5 backup validation + v8 migration safety net, 3.6 coverage in CI. **Not done = 3.3 App Check (awaiting product-owner cost/UX decision) and 3.7 CSP-without-`unsafe-inline`.**
- **Baseline is strong:** 244+ unit tests / 72 files, strict TS zero-`any`, strict CSP (minus `unsafe-inline`), server-held secrets, tested per-uid rate limits, tested Firestore rules, E2E media encryption, offline-first real. Code-quality score 74/100 (doc 01).
- **The gap to commercial SaaS is business/ops/compliance, not code:** no billing, no family/tenant model, no i18n, no dev/staging/prod split, no production observability, no backup/DR tested, no native mobile, zero compliance paperwork. Two open product-owner decisions (App Check cost/UX; Sentry-vs-privacy) gate several items below.

### Phase 1 — MVP Hardening + Lawful-to-Charge (→ First Paying Family)

**Goals.** Reach a state where a real family can pay and have their minor's disability data processed lawfully and durably. Close the "child loses their voice" reliability cliff. Finish the two deferred Phase-3 hardening items where they are cheap.

**Tasks (cross-ref Group 1, plus finish deferred Phase-3).** Billing + family entity + `eraseAccount` (B-02, T-1-foundation, P-1); legal reviews P-2/E-01, E-04 ARASAAC, E-05/P-3 Nakdan; DPIA + policy/ToS + accessibility statement (B-04, P-5); sync default-on + `storage.persist()` (B-11, B-10); media key-sharing fix (D-02); EXIF fix (E-02); voice-recording encrypted sync (E-03); contrast + grid-ARIA (C-01, C-02); staging project + error tracking + PITR/backups (B-01, B-14, B-12/B-13). **Finish deferred:** App Check (3.3/S-6/B-23) — move here since it's cheap and gates cost-abuse before any paid scale; CSP `unsafe-inline` removal (3.7/S-5) can slip to Phase 4 if time-boxed.

**Risks.** Legal reviews (P-2, E-04, E-05) are process-gated and can stall the whole phase — start them on day 1, in parallel with code. D-02 media-key redesign is subtle cryptography (L) — get it reviewed by Security Sentinel. Touching sync-default and the hot save path risks regressions; rely on the existing offline-check harness.

**Deliverables.** Working paid signup; erasure flow; signed DPIA; published legal/accessibility docs; staging pipeline; error visibility; durable-by-default storage.

**Exit criteria.** A pilot family can subscribe, use the app offline daily, lose-and-restore a device without losing the board, and request full erasure — and counsel has signed off that charging them is lawful and license-clear.

### Phase 2 — UX Overhaul, Onboarding & Observability (→ 100 Users)

**Goals.** Remove the manual-approval bottleneck; make the product self-serve for families; achieve production visibility and cost guardrails; ship the design-system foundation the UX overhaul needs.

**Tasks (cross-ref Group 2 + design-system items).** Tiered self-serve onboarding (B-03, C-14); App Check if not already in Phase 1 (S-6); global spend circuit-breaker (E-07); monitoring dashboards (B-14); token consolidation / kill dead green palette (C-05, C-06); `acceptInvite` rate limit (S-8); rollback runbook + CI/CD alignment (B-16, B-24); trash UI (B-20); AI output filter + prompt sanitization (E-10, E-06); Storybook + `@storybook/addon-a11y` scoped to `presentation/ui`.

**Risks.** Softening the approval gate raises abuse exposure — App Check + async monitoring must land alongside, not after. Self-serve therapist tier needs a soft-verify design that doesn't over-trust an unverified license number.

**Deliverables.** <5-min family onboarding; observability + budget alerts; design tokens unified; component library seeded.

**Exit criteria.** A new family self-onboards to first board in <5 min with no human in the loop; a cost/error spike pages a human automatically; the two waived axe findings are gone.

### Phase 3 — Concurrent-Edit Safety, Authorization Model & Data-Loss Guarantees (→ 500 Users)

**Goals.** Make multi-editor (therapist + parent) safe; give the access model real teeth (view/edit scope, expiry, revoke, audit); give therapists true revert.

**Tasks (cross-ref Group 3).** Per-field/three-way merge (B-08, C-18) — **this is the hard prerequisite for Phase 4's native app**; role/scope-aware authz (S-2); time-bound grants + `revokeAccess` + scheduled expiry (S-3, C-16); `auditLog` (S-4); board revision history (B-09); MFA for clinicians (S-1); 10 negative rules tests (T-2); full self-serve signup (B-03 completion).

**Risks.** The scope rule change (view-only members lose write) is the *one breaking rules change* (doc 03 migration step 3) — ship behind an emulator regression pass with positive+negative tests. Per-field merge touches the sync core; treat as a reliability fix, not a feature, and land it before any second platform.

**Deliverables.** Conflict-safe sync; differentiated permissions; auditable access; revertible boards; MFA for professionals.

**Exit criteria.** Simulated concurrent therapist+parent edit loses no field; a `view` member cannot edit; a revoked/expired therapist loses access and it's logged; a therapist reverts a solo-edited board.

### Phase 4 — Native Apps, i18n & Scale Hardening (→ 5,000 Users)

**Goals.** Ship iOS + Android via Expo, reusing the pure `domain`/`services` layers; unblock language expansion; validate performance and cost at volume.

**Tasks (cross-ref Group 4).** Expo app + shared package extraction (doc 02 §18.D) — gated by the low-end-Android grid spike (60fps + <150ms) and by per-field merge already shipped in Phase 3; the four native modules; i18n framework (B-06); AAC-SLO RUM (B-14); load test + `us-central1` removal; CSP `unsafe-inline` removal if deferred (S-5); size-budget refactors (B-05); delete legacy TTS provider (S-9); rate-limit TTL + Piper offline voice (E-15, doc04 §14.2).

**Risks.** RN board-grid performance on ₪500–1,000 Android is the explicit go/no-go gate (doc 02 §18.D) — do the spike *before* committing the full port. Two platforms per family doubles concurrent-edit exposure, which is exactly why C-18 must precede this phase. Do **not** big-bang web onto react-native-web; keep shipping web from the existing React codebase until parity is proven.

**Deliverables.** Store-shipped iOS/Android apps; lock-to-child mode; measured SLOs; validated scale + cost.

**Exit criteria.** Spike passes on a ₪600 device; native apps in TestFlight/Play Internal; two AAC SLOs dashboarded; load test green.

### Phase 5 — Institutional Readiness (→ Clinic Pilots → HMO/MoE Tender)

**Goals.** Multi-tenant administration, dual-custody consent, full accessibility conformance, and complete Israeli regulatory paperwork — the procurement checklist.

**Tasks (cross-ref Group 5).** `clinics`/`schools`/`therapistLinks`/`schoolStaffLinks` + bulk-revoke (T-1); dual-parent/divorced-family consent (P-4); רישום מאגר + ממונה אבטחה + נוהל אבטחה (P-5); Amendment-13 DPO assessment (P-6); full WCAG 2.2 AA sweep + real-device AT matrix (C-03…C-13, doc02 Part19); custody/takedown runbook; on-device NSFW moderation + reported-content path + signed ADR (E-11, S-7); nikud CF proxy (E-12); media-inclusive OBF export; cross-region DR + IaC.

**Risks.** Compliance paperwork is legal-lead-time-bound — begin during Phase 4. The clinic tenant model must not grant clinic admins content read access (separation of "administer the grant" from "read the content", doc 03 Part 9).

**Deliverables.** Clinic/school admin console; dual-consent flows; full AA conformance; registered database + named officers; procurement-ready compliance pack.

**Exit criteria.** A clinic admin manages therapist access across families; a divorced-family sensitive action requires dual consent; clean WCAG 2.2 AA claim; all Israeli paperwork filed.

### Phase 6 — Regional & Feature Expansion

**Goals.** Arabic + English localization; optional voice cloning under full safeguards; commercial symbol set for paid tiers.

**Tasks.** Complete i18n string extraction → Arabic + English (B-06); SymbolStix/PCS licensing for paid tiers (E-04); voice cloning adults-only via Azure Custom Neural Voice with consent+liveness+watermark and hard minor-prohibition (E-14, doc04 §14.3); secondary symbol source (B-21); router migration for deep links (B-07); EU-posture completion (GDPR erasure/portability already built, add SCC/DPA formalization) if EU expansion pursued.

**Risks.** Voice cloning is the single highest-risk feature — Phase-A consent infrastructure and legal sign-off must precede any cloning code; never a fast-follow. Arabic adds RTL-within-RTL and script-shaping edge cases beyond Hebrew.

**Deliverables.** Multilingual product; license-clear paid symbol set; safeguarded voice cloning (if pursued).

**Exit criteria.** Arabic/English UI shipped; paid tier uses license-clear symbols; any cloning feature passes the full §14.3 safeguard checklist.

---

## Part 26 – Risk Register

Risks (not findings) — multiple findings roll up into one risk. Severity = worst-case harm; Likelihood = today's probability absent mitigation; Impact spans technical/privacy/legal/business/product. Status reflects current code + this roadmap.

| ID | Risk | Severity | Likelihood | Impact | Mitigation (finding IDs) | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-01 | **Child locked out of voice** — device loss/eviction destroys the only copy of a years-in-the-making board (sync opt-in; no `storage.persist()`) | Critical | High | Product/ethical: a non-verbal child permanently loses their means to communicate | Sync default-on + hard-nag; `navigator.storage.persist()`; durable backup reminder (B-11, B-10, doc01 Part6) | Architect | Open — Phase 1 P0 |
| R-02 | **Recorded family voices lost on device reset** — stored unencrypted, local-only, no cloud sync | High | High | Product: family's recorded "אמא/אבא" voices gone; violates AAC "can't lose your voice" | Route voice through encrypted `mediaRepo`/`mediaSync` (E-03) | Analyst | Open — Phase 1 P1 |
| R-03 | **Wrong voice attributed to a family member** / cloned-voice misuse if cloning ships unsafely | Critical | Low (feature not built) | Legal/ethical: deepfake of a disabled minor or non-consenting adult | Adults-only hard prohibition for minors; consent + liveness + watermark; board-scoped synthesis (E-14, doc04 §14.3) | Architect + Legal | Not built — safeguard-gate before any build |
| R-04 | **Sensitive child photo leak** (visible disability) via device theft or misconfig | High | Low–Med | Privacy: special-category data of a minor exposed | E2E media encryption (in place); device PIN; fix key-sharing so sharing works without weakening E2E (D-02); on-device NSFW (E-11) | Architect | Partially mitigated (cloud side) — Phase 1/5 |
| R-05 | **Therapist over-access after engagement ends** — grants are permanent, no expiry, no revoke UI, no audit | High | Medium | Privacy/legal: ex-therapist retains full read/write to a child's board | `expiresAt` + `revokeAccess` CF + scheduled expiry + audit log (S-3, S-4, C-16) | Architect | Open — Phase 3 P0 |
| R-06 | **Therapist has more power than intended** — role stored but unused; any member has full read/write incl. delete-child | High | Medium | Privacy: `staff`/`clinician` can edit/delete as if they were the parent | Role/scope-aware authz; CF-mediated writes (S-2) | Architect | Open — Phase 3 P0 |
| R-07 | **Silent concurrent-edit data loss** — entity-level LWW drops one side when therapist + parent co-edit | High | Med→High at scale | Product: a parent's or therapist's edit silently disappears | Per-field/three-way merge, ADR-0004 (B-08, C-18) | Architect | Open — Phase 3 P0; blocks Phase 4 |
| R-08 | **Cannot honor a deletion request** — archive ≠ erasure; no cloud delete path | Critical (compliance) | High | Legal: unlawful to launch under Israeli Privacy Law / GDPR without erasure | `eraseAccount` CF (P-1) | Analyst | Open — Phase 1 P0 |
| R-09 | **Sensitive text sent to third-party AI/TTS without legal basis/DPA** — utterance/nikud/topic text leaves device | High (compliance) | High (flows are live) | Privacy/legal: nonverbal child's private communication to Google/Dicta; in-code TODO unresolved | Legal review + DPA confirmation; prominent offline-TTS opt-out (P-2, E-01, E-12) | Product owner + Legal | Open — Phase 1 P0 |
| R-10 | **Paid tier violates ARASAAC NonCommercial license** — charging money for NC-licensed symbols | High (legal/business) | High (once paid) | Legal/business: license violation is triggered by the act of charging | Attribution now; counsel review; SymbolStix/PCS for paid tier (E-04) | Product owner + Legal | Open — Phase 1 P0 |
| R-11 | **Nakdan (Dicta) unlicensed academic endpoint in production** | High (legal) | High | Legal: ToS violation; unknown cost exposure | Resolve license or per-env gate + local dictionary fallback (P-3, E-05, B-18) | Product owner | Open — Phase 1 P0 |
| R-12 | **No revenue path** — no billing code anywhere | Critical (business) | Certain | Business: cannot take a paying customer at all | Minimal Stripe/Paddle + family billing entity (B-02) | Architect | Open — Phase 1 P0 |
| R-13 | **Bad deploy hits all live families** — single Firebase project, no staging, no rollback runbook | High | Medium | Technical/reputational: a rules/schema error breaks production with no rehearsal | Staging project + preview channels + rollback runbook (B-01, B-15, S-10, B-16) | DevOps | Open — Phase 1 P1 |
| R-14 | **Blind in production** — no error tracking, metrics, or alerting | High | High | Technical: a family's breakage is invisible until they churn | Privacy-compatible error tracking + Cloud Monitoring dashboards (B-14) | Analyst + Security | Open — Phase 1/2 |
| R-15 | **TTS/Gemini cost-abuse** — leaked/replayed token calls billed endpoints; no App Check; no global ceiling | Medium | Low–Med | Business: unbudgeted cloud bill from a compromised account or spike | App Check + per-uid limits (in place) + global budget/invocation alert (S-6, B-23, E-07) | Security + DevOps | Partially mitigated (rate limits) — Phase 1/2 |
| R-16 | **Cloud data loss / no DR** — no verified PITR, no storage versioning, no tested restore, no IaC | High | Low | Technical: a project-level incident is unrecoverable | PITR + storage versioning + scheduled export + restore drill + IaC (B-12, B-13, doc01 Part10/11) | DevOps | Open — Phase 1 P1 / Phase 5 |
| R-17 | **Cross-tenant data leak** — one family reads another's child data | Critical (if it occurred) | Very Low (rules reviewed, no path found) | Privacy: catastrophic breach of a minor's data | Rules verified (doc03 Part9); add 10 negative tests to prevent regression (T-2) | QA + Analyst | Controlled — regression tests Phase 3 |
| R-18 | **Manual-approval bottleneck caps growth** — every signup needs a human admin | High (business) | High | Business: self-serve growth impossible past ~10–15 accounts | Tiered self-serve onboarding + async abuse monitoring (B-03, C-14) | Architect | Open — Phase 2 P0 |
| R-19 | **No dual-custody / divorced-family model** — one owning uid; ex-spouse either locked out or (future) over-retained | High | Medium | Legal: custody disputes, non-consensual access | Co-parent role + dual-consent + custody/takedown runbook (P-4) | Architect + Legal | Open — Phase 5 |
| R-20 | **Cannot sell to institutions** — no clinic/school tenant model, no bulk admin | High (business) | Certain (for that segment) | Business: HMO/MoE tender impossible | `clinics`/`schools`/`*Links` + bulk-revoke (T-1) | Architect | Open — Phase 5 |
| R-21 | **Not compliant for procurement** — no רישום מאגר, ממונה אבטחה, נוהל אבטחה; Amendment-13 DPO unassessed | High (regulatory) | High (for institutional) | Legal: fails procurement due diligence | Israeli compliance pack + DPO assessment (P-5, P-6) | Product owner + Legal | Open — Phase 5 |
| R-22 | **Cannot claim WCAG 2.2 AA** — two waived axe findings + sub-target touch sizes block a clean claim | Medium | High (for the claim) | Legal/business: accessibility non-conformance for a disability product is acute reputational + procurement risk | Contrast + grid fix (Group 1) then full AA sweep (C-01…C-13, B-22) | UX | Open — Phase 1 (2 items) / Phase 5 (full) |
| R-23 | **No content moderation for child-facing media/AI output** — E2EE blocks server scanning; AI words unfiltered | Medium | Medium | Product/safety: inappropriate image or AI word reaches a child | On-device NSFW at capture + report path (E-11); AI output wordlist filter (E-10) | Analyst + Product | Open — Phase 2 (AI) / Phase 5 (media) |
| R-24 | **EXIF/GPS leak on image-upload error path** — raw original file uploaded when re-encode throws | Medium | Low–Med | Privacy: a child's home location embedded in an uploaded photo | Mandatory canvas re-encode + fallback + regression test (E-02) | Analyst | Open — Phase 1 P1 |
| R-25 | **iOS PWA structural limits** — no Guided Access, storage eviction, install friction | Medium | Medium | Product: iOS families hit lock-to-child and storage-loss gaps | PWA hardening now (install banner, apple meta, persist); Expo native modules later (C-07, doc02 §18.A/D) | Architect + Frontend | Partially planned — Phase 1/4 |
| R-26 | **External-provider SPOF for new content** — ARASAAC/Nakdan have no fallback provider (TTS does) | Medium | Low–Med | Product: new-word symbols/nikud degrade during an outage | Accept + document; Piper offline voice; secondary symbol source later (B-21, E-15) | Architect | Accepted short-term — Phase 4/6 |
| R-27 | **Presentation-layer tech debt** — CellEditor/BuilderView large; no i18n; custom nav | Medium | Medium | Technical: onboarding friction, stale-closure risk, blocks localization/deep-linking | Size-budget refactor; i18n; router when needed (B-05, B-06, B-07) | deep-reasoning agent | Managed debt — Phase 4/6 |
| R-28 | **Unresolved product-owner decisions stall hardening** — App Check cost/UX; Sentry-vs-privacy | Medium | Medium | Business/technical: App Check (S-6) and error tracking (B-14) both blocked on a decision | Force the two decisions in Phase 1 planning (HANDOFF §3) | Product owner | Open — decide in Phase 1 |
| R-29 | **CSP `unsafe-inline` weakens XSS defense-in-depth** | Low–Med | Low | Technical: injected inline script/style would execute | Hash-based CSP or migrate inline styles (S-5) | Analyst | Open — Phase 4 |
| R-30 | **Legacy client-key TTS provider re-activatable** — dead code could leak Google key if re-wired | Low | Low | Security: key leak into client bundle if a future dev re-wires it | Delete or lint-guard (S-9) | Analyst | Open — Phase 4 |

---

## Part 27 – Production Readiness Scorecard (0–100)

Each dimension scored with reasoning citing findings. Scores reflect the **current** state (Phase 0), not the post-roadmap target.

| Dimension | Score | Reasoning |
|---|---|---|
| **Architecture** | 82 | Strict 4-layer unidirectional design (pure `domain`/`services`, isolated `data`); zero `any`; this layering is the single biggest asset — it makes the Expo port tractable (doc02 §18.D) and is *why* Flutter is rejected. Deductions: no i18n framework (B-06), custom nav vs. router (B-07), growing presentation debt (B-05). |
| **Scalability** | 74 | Cost model shows infra is *not* the constraint even at 10,000 users (<$650/mo, doc01 Part16); Firestore free tier absorbs load to ~1,000 users; rate-limit store correctly per-user (not a hot doc). Real bottlenecks are process (manual approval B-03) and no App Check (B-23). Per-field merge (C-18) needed before multi-platform load. |
| **Reliability** | 68 | Offline-first is genuine (IndexedDB source of truth, 3-tier TTS fallback, outbox). But R-01 (sync opt-in + no `storage.persist()` = child can lose their voice, B-11/B-10) and R-07 (LWW concurrent-edit loss, B-08) are real data-loss vectors. Docked heavily because these are AAC-existential, not cosmetic. |
| **Security** | 76 | No actively-exploitable Critical found (doc03 verdict): server-held secrets, tested rate limits, tested default-deny rules, E2E media encryption, `onCall` CSRF-immune. Gaps are authorization-model, not exploit: no MFA (S-1), role undifferentiated (S-2), no expiry (S-3), no App Check (S-6), `unsafe-inline` CSP (S-5). |
| **Privacy** | 58 | Strong technical posture (region-pinned, data-minimized, E2E media, opt-in local analytics) but the *paperwork/process* layer is near-zero: no erasure flow (P-1, Critical), unresolved third-party-text legal review (P-2, live TODO), plaintext board/profile in Firestore that marketing must not overclaim (D-01), media-key sharing gap (D-02). Technical controls are ahead of compliance. |
| **Accessibility** | 70 | Genuinely strong bones: exemplary `prefers-reduced-motion` kill-switch, mature dwell + scanning engines (mischaracterized as "stubs" — they are tested and wired, doc02 Part19), rich AccessSettings, focus-trap primitive. But two waived axe findings block a clean AA claim (C-01 contrast, C-02 grid ARIA), and mobile touch targets miss the product's own 60px AAC floor (C-03, C-04). Weighted heavily per charter. |
| **UX** | 66 | Fitzgerald color-coding, undo/redo, ConfirmDialog, live sentence bar — solid AAC fundamentals. But onboarding is 100% manual-gated (C-14), no help layer (Nielsen #10 = 2/5), dual conflicting token files (C-05), no family-voice-bank or in-app camera UX (E-13, doc04 §21.1), no revoke/active-grants UI (C-16). "Design not satisfactory" per charter — needs the Phase 2 overhaul. |
| **Cross-Platform Coverage** | 48 | PWA is real and installable (offline, maskable icons). But iOS has structural gaps (no Guided Access, storage eviction, install friction, missing apple-touch meta C-07), and there is no native iOS/Android app at all. Decision is made and correct (PWA→Expo, doc02 §18.D) but unexecuted; low-end-Android grid perf is an unvalidated risk. |
| **DevOps** | 55 | Solid CI gate (typecheck→lint→coverage→build→rules tests), Dependabot, correctly-separated secrets. But single Firebase project = every merge is a prod deploy (B-01/B-15/S-10), no preview channels, no rollback runbook (B-16), no feature flags (B-17), CI/CD test-command drift (B-24), no IaC (config is CLI flags). |
| **Monitoring** | 22 | Effectively zero production observability — deliberate, documented, blocked on the Sentry-vs-privacy decision (B-14, R-28). No error tracking, no dashboards, no alerting, no AAC-SLO measurement (board-load/tap-to-speech unmeasured). No global spend circuit-breaker (E-07). This is the lowest score and an early-phase priority. |
| **DR** | 30 | Local backup export/import is validated; the device itself is genuine DR against cloud incidents (a strength worth stating). But PITR unverified (B-12), no storage versioning (B-13), no tested restore drill, no IaC, undefined RTO for project-loss (doc01 Part11). Cloud-side DR for device-loss is the missing half. |
| **Documentation** | 72 | Strong docs culture (PRD he+en, 5 ADRs, per-milestone docs, this 6-doc audit series, thorough HANDOFF). Deductions: doc↔code drift (README says DB v9/244 tests/M22 vs. actual v12; ADR-0003 "Neural2" stale per E-09; discovery oversold `removeBackground` per E-08). No operations runbook / incident-response doc yet. |
| **Maintainability** | 75 | Zero-`any`, tested, linted, layered, deliberate "what we're NOT doing" discipline (a maturity signal). Capped by presentation-layer size debt (B-05: CellEditor 688, BuilderView 623) and lack of a size-budget lint rule (App.tsx crept back up). |
| **AI Readiness** | 64 | Three live pipelines with genuine engineering care: hybrid TTS with graceful fallback, tested JSON-repair for truncated Gemini output, per-uid rate limits, server-held keys. Gaps: no output content filter for a child audience (E-10), unsanitized prompt interpolation (E-06), no global spend ceiling (E-07), voice-clone safeguards greenfield (E-14), Nakdan unproxied/unlicensed (E-05/E-12). |
| **Regulatory (IL)** | 35 | This is a paperwork gap, not a technical one, and it is the gate to institutional sales. Nothing filed: no רישום מאגר מידע, no ממונה אבטחה, no נוהל אבטחה (likely רמת אבטחה גבוהה tier, P-5), Amendment-13 DPO unassessed (P-6), accessibility statement not published, ARASAAC NC + Nakdan licensing unresolved (E-04, E-05). Technical controls partially satisfy the *substance*; the *documentation* is absent. |

### Overall weighted score

Weighting rationale: the charter is explicit that **privacy and accessibility are tier-1, not bonus** ("treat privacy as tier-1"; three "NEW – critical" accessibility/UX/platform parts). Reliability is weighted up because for an AAC product, data loss = a child losing their voice (an existential, not cosmetic, failure). Regulatory is weighted meaningfully because it gates the stated end-goal (HMO/MoE). Weights:

| Dimension | Weight | Score | Contribution |
|---|---|---|---|
| Privacy | 12% | 58 | 6.96 |
| Accessibility | 11% | 70 | 7.70 |
| Reliability | 10% | 68 | 6.80 |
| Security | 10% | 76 | 7.60 |
| Regulatory (IL) | 9% | 35 | 3.15 |
| UX | 8% | 66 | 5.28 |
| Architecture | 7% | 82 | 5.74 |
| Cross-Platform | 6% | 48 | 2.88 |
| Scalability | 6% | 74 | 4.44 |
| DevOps | 5% | 55 | 2.75 |
| Monitoring | 5% | 22 | 1.10 |
| DR | 4% | 30 | 1.20 |
| Maintainability | 3% | 75 | 2.25 |
| AI Readiness | 2% | 64 | 1.28 |
| Documentation | 2% | 72 | 1.44 |
| **Weighted total** | **100%** | | **≈ 60.3 / 100** |

**Overall: 60/100.** Reading: a genuinely well-built engineering artifact (the code dimensions score 74–82) dragged down to "not launch-ready as a business" by the operational, compliance, and observability dimensions (22–35) that a commercial product handling minors' disability data must have. The score is deliberately *not* higher despite the strong code, because the low-scoring dimensions are the ones that, unaddressed, either make a launch unlawful (Regulatory, Privacy erasure) or let a child lose their voice (Reliability). Phase 1 alone should move this to ~72; the full roadmap targets ~88.

---

## Part 28 – Final Executive Summary

### Critical Findings (top 8)

1. **No revenue path at all** — no billing/subscription code anywhere (B-02). Blocks the very first paying customer.
2. **No right-to-erasure** — archive ≠ delete; no cloud deletion function (P-1). Makes a lawful launch handling minors' data impossible.
3. **Child can lose their voice** — sync is opt-in and there is no `storage.persist()`; device loss/eviction = permanent loss of the board (B-11, B-10). AAC-existential.
4. **Media E2E key-sharing gap** — device-bound key with no exchange means "share with therapist" and multi-device silently fail to decrypt photos (D-02). Product-breaking (fails safe, not leaky).
5. **Third-party text flows lack legal sign-off** — utterance/nikud/topic text goes to Google/Dicta/Gemini with the in-code COPPA/GDPR/Privacy-Law TODO still open (P-2, E-01). Pre-production legal gate.
6. **ARASAAC NonCommercial license vs. paid tier** — charging money is itself the license trigger; no attribution shipped (E-04). Blocks the paid business model specifically.
7. **Silent concurrent-edit data loss** — entity-level LWW drops a field when therapist + parent co-edit (B-08, C-18). Must be fixed before the 2nd platform.
8. **Authorization model has no teeth** — `childAccess` role is stored but unused; any member has full read/write incl. delete-child; no expiry, no revoke UI, no audit (S-2, S-3, S-4). Blocks institutional trust.

### High / Medium Risks (top 10)

1. Therapist over-access after engagement ends — no expiry/revoke/audit (R-05 / S-3, S-4, C-16). **High.**
2. Manual-approval bottleneck caps growth past ~15 accounts (R-18 / B-03, C-14). **High/business.**
3. Blind in production — no error tracking/metrics/alerting (R-14 / B-14). **High.**
4. Bad deploy hits all live families — no staging/rollback (R-13 / B-01, S-10, B-16). **High.**
5. Nakdan unlicensed academic endpoint in production (R-11 / E-05, P-3, B-18). **High/legal.**
6. Cannot sell to institutions — no clinic/school tenant model (R-20 / T-1). **High/business.**
7. Not compliant for procurement — no Israeli paperwork, DPO unassessed (R-21 / P-5, P-6). **High/regulatory.**
8. Recorded family voices lost on device reset — unencrypted, unsynced (R-02 / E-03). **High.**
9. Cannot claim WCAG 2.2 AA — two waived axe findings + sub-target touch sizes (R-22 / C-01, C-02, C-03, C-04, B-22). **Medium/High.**
10. TTS/Gemini cost-abuse — no App Check, no global ceiling (R-15 / S-6, B-23, E-07). **Medium.**

### Top 10 Priorities (ranked)

1. **Billing + `families` entity + `eraseAccount`** (B-02, T-1-foundation, P-1) — nothing paid is lawful or possible without this trio.
2. **Legal reviews: third-party text, ARASAAC NC, Nakdan** (P-2/E-01, E-04, E-05/P-3) — process-gated, start day 1, block launch.
3. **Sync default-on + `storage.persist()`** (B-11, B-10) — stop children losing their voice; highest reliability-per-effort.
4. **Media key-sharing fix** (D-02) — makes the flagship "share with therapist" feature actually work.
5. **DPIA + privacy policy + ToS + accessibility statement** (B-04, P-5) — the compliance floor for real families.
6. **Staging project + error tracking + PITR/backups** (B-01, B-14, B-12/B-13) — stop flying blind and rehearse changes.
7. **Contrast + grid-ARIA fixes** (C-01, C-02) — remove the two AA blockers; cheap, high-symbolic-value for a disability product.
8. **Tiered self-serve onboarding + App Check** (B-03, C-14, S-6) — unblock growth without opening abuse.
9. **Per-field merge + role/scope/expiry/audit** (B-08/C-18, S-2, S-3, S-4) — concurrent-edit safety and real access control; gates native + institutional.
10. **Multi-tenant model + dual-consent + Israeli compliance pack** (T-1, P-4, P-5, P-6) — the institutional-sales unlock.

### Recommended Next Actions

**Next 30 days.** Kick off all legal/process items in parallel with code (they have the longest lead time): third-party-text legal review (P-2), ARASAAC counsel review + ship attribution today (E-04), Nakdan license contact (E-05). Force the two open product-owner decisions: App Check cost/UX and Sentry-vs-privacy (R-28). Ship the cheap high-value fixes: `storage.persist()` (B-10), EXIF fix (E-02), contrast token (C-01), theme-color/apple-meta (C-06/C-07). Start billing + `families` entity + `eraseAccount` (B-02, T-1, P-1). Stand up staging project (B-01).

**Next 60 days.** Land the D-02 media-key redesign and voice-encrypted-sync (E-03). Sync default-on (B-11). Grid-ARIA fix (C-02). Error tracking + Cloud Monitoring dashboards + budget alerts (B-14, E-07). PITR + storage versioning + first restore drill (B-12, B-13). Draft + sign DPIA and publish privacy policy/ToS/accessibility statement (B-04, P-5). Begin tiered onboarding design (C-14).

**Next 90 days.** Complete tiered self-serve onboarding + App Check (B-03, S-6). Trash UI (B-20), AI output filter + prompt sanitization (E-10, E-06). Begin per-field merge (B-08/C-18) and role/scope/expiry/audit (S-2, S-3, S-4). Storybook + a11y addon. Rollback runbook + CI/CD alignment (B-16, B-24). Target: closed beta running, first paying family onboarded, path to 100 users clear.

### Go / No-Go per milestone

**Ready for closed beta (10 families + 3 SLPs)? — CONDITIONAL GO.** The code is beta-quality and offline-first is real, but do not run it *unsupervised* until minimal error tracking exists (B-14) and — because 10 families + 3 SLPs is exactly the concurrent-editor scenario — either per-field merge (B-08/C-18) or at minimum a visible conflict-resolution UI is in place. Also enable `storage.persist()` (B-10) and confirm PITR (B-12) first so a beta family can't silently lose a board. With those four, GO.

**Ready for first paying family? — NO-GO today.** Three hard gates are open: no billing exists (B-02), no erasure flow (P-1), and the third-party-text + ARASAAC-NC + Nakdan legal questions are unresolved (P-2, E-04, E-05) — charging money is unlawful and, for ARASAAC, the charging itself is the license violation. Add DPIA + published policies (B-04). This is the entire Phase 1 gate.

**Ready for 500 users? — NO-GO today.** Beyond the paying-family gates, concurrent-edit data loss becomes statistically likely (B-08/C-18), the manual-approval bottleneck breaks (B-03), and the access model must gain scope/expiry/revoke/audit (S-2, S-3, S-4) before hundreds of therapist grants accumulate. This is the Phase 3 gate.

**Ready for clinic pilots? — NO-GO today.** A clinic needs bulk therapist administration and revoke-on-departure, which requires the `clinics`/`therapistLinks` tenant entities that don't exist (T-1), plus MFA for professionals (S-1) and the audit log (S-4). Per-field merge (C-18) is also a prerequisite because a clinic multiplies concurrent editors. Phase 5 gate.

**Ready for MoE/HMO tender? — NO-GO, furthest out.** Requires everything above plus the full Israeli compliance pack (רישום מאגר, ממונה אבטחה, נוהל אבטחה — likely רמת אבטחה גבוהה, P-5), Amendment-13 DPO assessment (P-6), a clean WCAG 2.2 AA conformance claim (C-01…C-13, B-22), dual-custody consent (P-4), and the school tenant model (T-1). This is the full Phase 5 deliverable and the terminal milestone of the roadmap.

---

*End of Stage F. Every roadmap and risk item above cites its source finding ID(s) in docs 01–04; trace back there for impact/root-cause/complexity detail. Items marked `[Assumption]`/`[TBD]` in the source docs remain unresolved and are propagated as such.*
