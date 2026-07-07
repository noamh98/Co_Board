# Session Handoff Summary (Stage G)

> Engagement: Co_Board SaaS transformation (2026-07)
> Agent execution: Scout (A), Analyst (B), UX Auditor (C), Security Sentinel + Analyst (D), Analyst-Media (E), Architect (F), Docs Agent (G).
> Date: 2026-07-07 · Repository: `/home/user/Co_Board` · Status: **Phase 0 complete, ready for Phase 1.**

---

## Key Decisions Made This Engagement

1. **Model routing**: Sonnet for Stages B–E (analysis-heavy), top-tier model for Stage F (architecture/synthesis, per engagement rule "Opus-tier allowed here"), Haiku for Stage G (documentation indexing). Token budget optimized per task complexity.

2. **Stage C+D regeneration**: Previous session's uncommitted work (local files) was lost to token exhaustion in a fresh cloud container. Stages C and D were re-derived from the same source (code, not prior docs) — this is a feature: if the prior outputs were lost, the derived findings are still correct and verifiable.

3. **Key technical recommendations elevated to critical blockers for Phase 1**:
   - **D-01 & D-02 (sharing + key continuity)** are not Phase 2/3 niceties — the Closed Beta includes 3 SLPs who will immediately try to access a shared child's board, and both sharing AND multi-device decryption are broken. Must fix in Phase 1.
   - **R-03 (data-loss floor)**: making sync default-on + calling `navigator.storage.persist()` at onboarding directly prevents the single most severe reliability failure mode (child loses years-old communication board on device loss or storage eviction).
   - **E-03 (voice recordings not synced)**: a family member's voice recording is an emotional asset and single point of failure; must route through the same encrypted-sync pipeline as photos.

4. **E-14 voice-cloning posture**: stronger than the charter's dual-parent-consent option. Recommendation: **prohibit cloning of any person under 18 outright** (no amount of parental consent justifies a permanent biometric copy of a child's voice). For adults (grandparent use case): Azure Custom Neural Voice path with liveness + consent infrastructure.

5. **Symbol licensing decision**: ARASAAC is CC BY-NC-SA (NonCommercial). Charging money without a commercial symbol set (SymbolStix/PCS) is a legal red line, not an oversight. Must be resolved in Phase 1 (1.12) before Phase 2 billing ships. Interim: free tier keeps ARASAAC, paid tier holds pending counsel.

6. **Firestore key-continuity**: E2EE media is already implemented with a sophisticated per-device key architecture and backward-compat decryption. **The gap is not encryption, it is key *sharing***: no mechanism exists to re-wrap or escrow the CEK for a second authorized device or account. This is the second-highest-severity finding (D-02) and requires a thoughtful ADR before implementation, not an improvised fix.

---

## Assumptions ([Assumption] tags across all docs — key recurring ones)

**Scaling & traffic modeling** (all in Stage B §5):
- 40% of registered users are daily-active.
- 55% of users enable cloud sync (opt-in baseline).
- 8 boards/family in steady state.
- 50 Firestore reads + 15 writes per synced-active-user per day (debounced sync).
- ~300 Cloud TTS chars/day per active user (mostly cache hits).
- 2 `aiBoard` calls/day per active user.
- (All cost/scale projections downstream of these — no production data exists today.)

**Media & AI quality** (Stages C, E):
- Azure/ElevenLabs Hebrew TTS quality comparable to or better than Google Wavenet — **needs listening test** before institutional sales.
- iOS Safari autoplay window + ITP storage eviction behavior (§C-08, C-18) — needs real iPhone verification before shipping.
- Low-end Android (₪500–₪1,000 devices) performance under image decode load — no device lab data; Lighthouse throttled profile is a proxy.
- Piper offline Hebrew voice model availability — needs community survey.

**Infrastructure & third-party dependencies**:
- Google Cloud TTS does not log utterance text per API ToS — [TBD, verify before sending child utterances] (E-01).
- Gemini API does not retain topic prompts — [TBD, not independently verified from Google] (E-06).
- Firebase Auth password hashing (scrypt) is Google-managed, not tunable — accepted platform dependency (Stage D §7.1).

---

## Open [TBD]s (Blocking or high-impact)

**Legal/commercial**:
- Nakdan/Dicta licensing + commercial pricing — biggest unknown cost variable at scale (Stage E ADR-0005, blocking Phase 1.12).
- ARASAAC NC clause vs. paid tier — must be resolved by counsel (Phase 1.12, Stage E E-04).
- Israeli Privacy Law "high" security level applicability — determines registration/officer/DPIA formality (Stage D 8.5, counsel).
- TTS-text legal review (COPPA/GDPR/Israeli): is sending every utterance to Google Cloud TTS compliant? (Stage E E-01, Phase 1.12, counsel).
- Azure Custom Neural Voice deletion SLA — must verify "delete" is actually synchronous before committing to it (Stage E §14.3, E-14).

**Technical verification (marked [Verify] in docs)**:
- Firestore Point-In-Time Recovery (PITR) status — requires Firebase console access, which this session lacked. Confirm PITR is enabled before Phase 1 close (Stage B §10, Phase 1.10).
- iOS Safari `MediaRecorder` codec support (Opus/WebM vs. AAC/mp4) — feature-detect at record time (Stage E §21.2, Phase 3.6).
- iOS 16.4+ Web Push for PWA — push notifications may or may not be viable without native wrapping (Stage C §18.4).
- Google DPA acceptance — is the standard Firebase DPA signed and in force for this project? (Stage D 8.5, Phase 1.12).
- Bundle size measurement — Firebase SDK tree-shaking, actual `dist/` size, Lighthouse analysis on low-end device profile (Stage C §18.3, Phase 2.11).
- C-08: iOS autoplay on cache-miss TTS tap — real device test required; if confirmed, fix is a synchronous placeholder-audio play to "claim" the gesture.

**Product decisions (not technical)**:
- Sync default-on vs. aggressive onboarding nag (Phase 1.3 tradeoff).
- Paid-tier symbol-set choice (SymbolStix, PCS, other licensing deal) — Phase 1.12/Phase 2.5.
- On-device NSFW moderation threshold & override policy for edge cases (Stage E §21.1 moderation, Phase 3.5).
- Voice cloning shipped or not shipped — if shipped, must have Phase A safeguards + counsel sign-off (Stage E §14.3, Phase 5.4).

---

## Open Actions for Developers (Phase 1 critical path)

All tasks below are traced to findings. See [`05-roadmap.md`](05-roadmap.md) Phase 1 for the full task table; these are the four gate-blockers:

1. **D-01: Child sharing end-to-end fix** (Analyst + Architect, L complexity)
   - Align `AcceptInviteScreen` UI with real 32-hex code format.
   - Extend Firestore rules: `childAccess` members must be able to read shared child's `board`/`profile` docs (currently only grant metadata access).
   - Add rules tests verifying positive grants.

2. **D-02: Multi-device key continuity for E2EE media** (Architect + Security Sentinel, L complexity)
   - Design account-level CEK wrapping (recovery code, passphrase, device-pairing QR, or similar).
   - Write ADR.
   - Implement + test 2-device decryption round-trip.

3. **Data-loss floor (B-10/B-11/E-03)** (Analyst + Media, S+M+M)
   - `navigator.storage.persist()` at onboarding.
   - Make sync default-on (or hard-nag with consent copy).
   - Route voice recordings through `mediaRepo`/`crypto.ts`/`mediaSync` (currently plaintext local-only).
   - Add "last backed up N days ago" nudge in UI.

4. **Legal baseline (D-09/B-04/E-01/E-04/E-05)** (Security Sentinel + counsel, L process effort)
   - Publish privacy policy + ToS.
   - Complete DPIA from [`03-privacy-security-family.md`](03-privacy-security-family.md) §8.6 template (product + counsel input).
   - Add ARASAAC attribution line to UI.
   - Gate Nakdan endpoint behind env var (remove hardcoded academic default).
   - Open conversations with Dicta, ARASAAC/SymbolStix licensing, Nakdan counsel review.
   - Resolve E-01 (TTS-text COPPA/GDPR/Israeli compliance) with counsel.

All other Phase 1 tasks (1.6–1.14) have P0 priority but are not absolute blockers for entering Closed Beta if time-constrained; D-01/D-02/data-loss/legal are the true gates.

---

## Gotchas & Learned Along the Way

1. **The codebase is MORE mature than the charter's framing.** The task brief calls it an "experimental prototype," but Stage A found 16K LOC of tight, tested code in a strict 4-layer architecture with 244+ unit tests and genuine offline-first design. The maturity gap is not code quality; it is missing business/ops/compliance layers.

2. **The task brief was wrong twice (doc↔code contradictions, corrected by Stage A):**
   - Scanning/prediction/morphology were called "stubs" in the brief. Stage C found they're **fully implemented**, unit-tested, and wired. One of the most positive findings.
   - "Boards as blobs in child docs" 1MB risk was flagged as a worry. Stage B found boards are per-document (5–30KB each), not blobs. Not a risk.

3. **ARASAAC is CC BY-NC-SA.** Attribution is currently missing from the UI. The NonCommercial clause is a **real legal blocker** for a paid product — not an optional nicety to defer. Must be resolved in Phase 1, not Phase 2.

4. **Voice recording per tile is already implemented.** What's missing is the voice-bank schema, waveform trim UX, and (critically) encryption + sync. The codebase did half the work already.

5. **The deployed Firestore rules file lives in `docs/firestore.rules`, not `firebase/firestore.rules`.** Easy to miss. Stage D found this and recommends moving it as a Phase 0 cleanup (D-15).

6. **Firebase project is single** (`co-board`). Every `main` push deploys straight to production. No staging, no rollback runbook. This is a process gap that directly enables production incidents.

7. **Two design-token systems load simultaneously.** The green "Claude Design 2026" palette in `styles/tokens.css`/`styles/themes.css` is entirely dead code, overridden by the coral "Phase 2 F6" system in `presentation/ui/tokens.css` at cascade-time. This actively misleads the next engineer touching the theme file. Stage C flagged this as C-01.

8. **Previous session's uncommitted work is unrecoverable in a fresh cloud container.** The engagement began with a token exhaustion, losing local files. Stages C+D were re-derived from source code instead of relying on prior outputs — a feature, not a bug, but it's a reminder: **commit + push early and often**, even [WIP] PRs.

---

## Engagement Stats

**Documents delivered**: 7 (Stages A–F + this handoff).

**Findings**: 72 total (B-01…B-24 audit / C-01…C-18 UX / D-01…D-15 security / E-01…E-15 media).

**Risk register**: 22 rows (R-01 through R-22, with likelihoods, impacts, and mitigations in `05-roadmap.md`).

**Readiness scorecard**: 54/100 overall (code quality 74/100, but business/ops/compliance layers missing).

**Token efficiency**: Haiku for repo scanning (A) and handoff docs (G), Sonnet for analysis (B–E), top-tier model for synthesis (F) — routed per task complexity and budget constraints.

**Duration**: two working sessions on 2026-07-07 (the second regenerated Stages C+D after the first session's uncommitted work was lost to a container reset).

---

## For the Next Agent(s)

1. **Phase 1 is the critical path, not Phase 2.** The roadmap looks long (Phases 0–6), but Phase 1 (6–8 weeks) is where 90% of the "blocking this from Closed Beta" work lives. Phase 2 overlaps and extends it, but Phase 1 is the gate.

2. **D-01 and D-02 are intertwined but independent tasks.** Fix the sharing UI/rules first (D-01); then separately design and implement key continuity (D-02). Do not let D-02 block D-01.

3. **Counsel is on the critical path, not just engineering.** E-01 (TTS legal), E-04 (symbol licensing), D-09 (DPIA/registration) are the longest-lead items. Start these in week 1 of Phase 1, not week 5.

4. **The iOS [Verify] items (C-08, C-18) are not optional.** If autoplay is broken on cache-miss, it directly breaks "first tap always speaks" — the core AAC invariant. Get a real iPhone before shipping Phase 1.

5. **Voice cloning (E-14) is a Phase 5 item, not Phase 1.** Do not start this in parallel; it has substantial legal prerequisites (Phase A consent infrastructure, counsel sign-off). Once Phase 1–3 are live, then plan voice cloning.

6. **[Assumption] tags throughout the docs are assumptions, not facts.** Before shipping to production, verify the high-impact ones (TTS logging, Gemini retention, Azure voice-deletion SLA). A listening test for Azure/ElevenLabs is strongly recommended before institutional sales.

---

*Handoff complete. Phase 0 → Phase 1. All seven stage documents are ready for engineering/product intake.*
