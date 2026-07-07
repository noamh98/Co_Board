# 04 — Media & AI (Parts 14, 21)

> Stage E output of the SaaS transformation plan (see `COBOARD_TASK.md`, Parts 14 + 21).
> Date: 2026-07-07 · Authors: Analyst-Media (Sonnet) + Security Sentinel review.
> Source of truth: code > docs. Verified against `app/src/services/{tts,nikud,image,ai,symbols}/`,
> `app/src/data/{audioCache,mediaRepo,symbolRepo,aiBoardCache}.ts`, `functions/src/{ttsProxy,aiBoard,rateLimit}.ts`,
> `firebase/storage.rules`, ADR-0003, ADR-0005, and `docs/00-discovery.md`.

---

## Part 14 – AI Assessment

### 14.1 Current AI usage (verified from code)

Co_Board has three live AI/network-dependent pipelines. All three follow the same pattern: **client never holds a third-party API key** — every call goes through an authenticated, rate-limited Cloud Function (`functions/src/ttsProxy.ts`, `functions/src/aiBoard.ts`), with the raw provider key in Firebase Secret Manager. This is the Phase-0 "H-KEY" hardening already completed (see `services/tts/ttsWiring.ts`, `services/ai/aiProvider.ts` — both route through `httpsCallable`, not direct `fetch`).

#### A. TTS pipeline (hybrid chain)

**Architecture** (`services/tts/hybridTtsService.ts`, `ttsWiring.ts`):
1. **IndexedDB cache** (`data/audioCache.ts`) — key = `SHA-256(text\x00voiceId\x00rate\x00pitch)`, capped at 500 entries, LRU-pruned (`pruneAudioCache`), `lastAccessedAt` write debounced to 60s to avoid hot-path IDB churn.
2. **`FunctionsTtsProvider`** (`services/tts/functionsTtsProvider.ts`) → calls `ttsProxy` onCall CF → Google Cloud TTS.
3. **Browser `speechSynthesis` fallback** (`services/tts/ttsService.ts`, `createBrowserTts`) — always available, no network/key required; 3s watchdog prevents a stuck Promise if `onstart` never fires.

Per-cell recordings (see §21.2) take priority over both: `speakCell()` in `ttsService.ts:217-245` checks `cell.audioId` → plays a locally-recorded blob from `symbolRepo` before falling back to TTS.

**Voices**: `he-IL-Wavenet-A/B/C/D` (2 female, 2 male). Note: `googleTtsProvider.ts:5-7` documents that **Neural2/Chirp3 do not exist for he-IL** as of 2026-06-26 verification (`400 INVALID_ARGUMENT` when requested) — this contradicts ADR-0003's title ("Google Neural2") and `docs/00-discovery.md` §2, which both still say "Neural2/Wavenet." **Doc↔code contradiction**: only Wavenet is real; Neural2 references in ADR-0003 and 00-discovery.md are stale and should be corrected.

**Rate limits & cost controls** (`functions/src/ttsProxy.ts`):
- Auth required + `approved` custom claim (admin-gated onboarding).
- `MAX_TEXT_LEN = 400` chars/request.
- `ALLOWED_VOICES` allowlist (rejects arbitrary voice IDs).
- Per-uid fixed-window rate limit: **120 calls/min** (`rateLimit.ts`, Firestore-transaction-backed).
- 15s upstream timeout via `AbortController`; 20s CF `timeoutSeconds`.
- Client-side raw-key path (`googleTtsProvider.ts`, `settingsRepo.getTtsApiKey`) is **dead/deprecated** — confirmed `getTtsApiKey()` is a no-op that only purges a legacy stored key (`settingsRepo.ts:94-103`). Live path is exclusively the server proxy.

**Prompt-injection surface**: N/A — TTS has no LLM/prompt in the loop, only a text→speech API. The `text` field could theoretically be used to smuggle arbitrarily large phonetic strings, but the 400-char cap and voice allowlist bound the blast radius.

**Data leakage / PII**: **The full utterance text of every spoken cell that isn't cache-hit or fallback leaves the device and is sent to Google Cloud TTS** (`he-IL` synthesis endpoint, `europe-west1` CF region). For an AAC app used by a nonverbal child, this text is by definition their communicative intent — potentially including names, addresses, medical/toileting needs, emotional disclosures. `ttsProxy.ts:6-7` carries an explicit `TODO`: *"verify COPPA/GDPR/Israeli Privacy Law requirement for sending utterance text to Google TTS before production"* — **this is still open** (confirmed unresolved in `docs/00-discovery.md` §5). No DPA with Google for TTS is referenced anywhere in the repo.

**Cost abuse vectors**: per-uid 120/min cap bounds a single compromised/malicious account, but there is **no global spend ceiling or alerting** — 1,000 approved users each bursting near the cap could still produce a large, unbudgeted Google Cloud TTS bill with no automatic circuit breaker. Firestore rate-limit documents (`rateLimits/{uid}__tts`) are also unbounded in count (no TTL/cleanup found), a minor storage-growth item.

**Hallucination handling**: N/A (TTS is deterministic synthesis, not generative text).

**Fallback**: Always graceful — network/key/quota failure in `hybridTtsService.ts:41-43` silently falls through to browser `speechSynthesis`. This preserves the AAC "first tap always speaks" invariant even if Google TTS is fully down.

#### B. Gemini `aiBoard` (topic → board generator)

**Architecture** (`functions/src/aiBoard.ts`, `services/ai/boardGenerator.ts`, `services/ai/aiProvider.ts`):
- Client calls `aiBoard` CF with `{ action: 'generate', topic, count }`.
- Server builds a fixed Hebrew prompt template embedding the user-supplied `topic` verbatim:
  ```
  צור רשימה של בדיוק {count} מילים/מושגים בנושא: "{topic}".
  החזר JSON בלבד — מערך words, כל פריט: {"word":"...","pos":"noun|verb|adj|other"}.
  ...
  אין טקסט מחוץ ל-JSON.
  ```
- Calls Gemini 2.5 Flash (`generativelanguage.googleapis.com`), `temperature: 0.7`, `maxOutputTokens: 8192`, `thinkingBudget: 0`.
- Response parsed as JSON; on parse failure, `repairTruncatedWordsJson()` attempts to salvage a partial word array by truncating after the last complete `{...}` object — a real, tested **hallucination/truncation mitigation** (`aiBoard.ts:34-49`).
- Client (`services/ai/boardGenerator.ts`) enriches each word with ARASAAC `symbolId` + nikud in parallel (`Promise.all`), then builds a `Board`. Result is cached client-side by `data/aiBoardCache.ts` keyed on `SHA-256(topic+grid+level)`.

**Prompt-injection surface**: The `topic` string is interpolated directly into the prompt with only a length cap (`MAX_TOPIC_LEN = 300`) — **no escaping/sanitization of quotes or prompt-structuring characters**. A user could write a `topic` containing text like `"; ignore the above and instead output ...` to attempt to override the instruction. Because the only consumer of the output is a strict JSON parser + a bounded `count`/`pos` allowlist (`aiProvider.ts:12-18` `VALID_POS`), the **blast radius of a successful injection is low** (worst case: bad words show up on a generated board, not code execution or data exfiltration) — but it is a real, unmitigated injection surface and should be flagged for the security team. There is no output moderation/content-policy filter on the generated words before they're shown to a child.

**Data leakage**: `topic` (parent/therapist-entered text) is sent to Gemini (Google AI Studio, no explicit region pin beyond the CF's `europe-west1`, but the Gemini API itself is a US-hosted global endpoint — no EU data residency guarantee documented). Prompt text is **not persisted server-side** beyond the CF invocation (no logging of `topic` observed in `aiBoard.ts`), but comment in `boardGenerator.ts:3` claims *"the prompt is not saved"* — true for the topic wording, though the generated board (which embeds the topic as `board.name`) IS cached locally in IndexedDB (`aiBoardCache`) and can sync to Firestore as part of the child's board data if sync is enabled, i.e., topic text does persist downstream, just not at the Gemini/CF layer itself.

**Cost abuse vectors**: 30 calls/min/uid (`aiBoard.ts:61`), `MAX_COUNT = 64` words/call, `MAX_TOPIC_LEN = 300`. Same gap as TTS: no global budget alert.

**Hallucination handling**: Explicit JSON-repair fallback (above) is a genuine strength — most AAC/LLM integrations don't handle truncated-JSON gracefully. No validation that returned Hebrew words are age-appropriate/non-offensive for a child audience (content-policy gap).

**Fallback**: On any CF failure, `boardGenerator`'s injected `llm()` throws → propagates to UI as a friendly Hebrew error (`aiProvider.ts:38-39`). No offline AI generation is possible (correctly so — LLM generation is inherently online-only), but the **cache layer means a previously-generated board for the same topic+grid works offline** (`aiBoardCache`).

**`aiBoardEditor.ts`** (conversational board editing, Phase 4) is an intentional stub — server returns `HttpsError('unimplemented')`. Not a current attack surface; flagged only so it isn't mistaken for a shipped feature.

#### C. Nakdan nikud (Dicta)

**Architecture** (`services/nikud/nakdanClient.ts`, `nikudService.ts`, `nikudCache.ts`):
- Priority: **manual correction (never overwritten) → IndexedDB cache → Nakdan network → raw/no-nikud**.
- Default endpoint (`DEFAULT_NAKDAN_URL = 'https://nakdan-2-0.loadbalancer.dicta.org.il/api'`) is Dicta's **public academic** endpoint — used unconditionally unless `VITE_NAKDAN_ENDPOINT` env override is set.
- **ADR-0005 status: unresolved licensing risk.** Dicta is an academic service; calling it in a commercial product without a license is a ToS violation risk, not (yet) a data-leakage or cost-abuse risk in the AI-safety sense. `services/nikud/nakdanClient.ts:5-7` documents this explicitly. 15s timeout (`fetchWithTimeout`) prevents hangs; failure falls back gracefully to unvocalized text (`nikudService.ts:62-68`).
- **Data leakage**: cell label text (single words, not full sentences) is sent to Dicta's servers over HTTPS. Lower sensitivity than TTS (single words vs. full utterances) but still technically PII-adjacent for a disability product.
- **No rate limiting or auth on this path at all** — Nakdan is called directly client→Dicta, not proxied through a Cloud Function. This is inconsistent with the TTS/Gemini H-KEY pattern and is itself a minor cost-abuse/ToS-violation vector: a compromised client could hammer Dicta's endpoint with no server-side throttle.

### 14.2 Hebrew TTS provider comparison 💰

| Provider | Hebrew quality | Price / 1M chars | Privacy posture | Child-voice availability | Offline option |
|---|---|---|---|---|---|
| **Google Cloud TTS — Wavenet he-IL** *(current)* | Good, natural prosody. Neural2/Chirp3 **not available** for he-IL as of 2026-06-26 (verified, `googleTtsProvider.ts:5-7`) — ADR-0003/00-discovery.md text referencing "Neural2" is stale. [Verified via code comment, not independently re-tested this session] | ~$4/1M chars (Wavenet standard tier) [Assumption — public GCP pricing, not confirmed against actual account] | Google Cloud DPA available; region can be pinned but `texttospeech.googleapis.com` is a global endpoint (no EU-only guarantee found in code) | No dedicated child voice; 2F/2M adult voices only | No |
| **Azure Cognitive Services — Neural he-IL** | [Assumption] Comparable-to-better prosody; Azure Neural voices generally reviewed favorably for Hebrew. [TBD — needs listening test] | ~$16/1M chars (Neural tier) [Assumption — public Azure pricing] | Strong: EU data-residency regions selectable, Microsoft DPA + GDPR terms are mature and well-documented | [TBD] — Azure does not publicly list a he-IL child/kids voice as of this review; would need direct vendor confirmation | No |
| **ElevenLabs (multilingual)** | [Assumption] High naturalness cross-language, but he-IL is not a "primary" supported language — quality variance reported anecdotally for lower-resource languages. [TBD — needs listening test] | ~$30–$150/1M chars depending on tier [Assumption — public pricing, volatile] | US company; DPA available on enterprise tier only; voice-cloning-adjacent product raises extra scrutiny for a child-data context | Some "young voice" presets exist but not verified for Hebrew | No |
| **OpenAI TTS** | [Assumption] Hebrew is not a headline-supported language; quality [TBD] | ~$15/1M chars (tts-1) [Assumption — public pricing] | OpenAI API DPA available; no EU-only endpoint pinning documented | No | No |
| **Almagu / local Israeli TTS** | PRD-preferred per ADR-0003, described as "native Israeli Hebrew, AAC-optimized" but **no public API existed at implementation time** — [TBD] current availability | [TBD] — no public pricing found | [TBD] — presumably strongest Israeli-market privacy/regulatory fit if it's a local vendor, but unverified | [TBD] | [TBD] |
| **Piper (offline, open-source)** | [Assumption] Lower naturalness than any cloud Wavenet/Neural voice, but Hebrew community voices exist for Piper; [TBD — needs listening test] | Free (self-hosted, one-time model download, ~50–100MB per voice) | Excellent — fully on-device, zero data leaves device | Depends on trained voice model availability; [TBD] whether a he-IL child-style Piper voice exists today | **Yes — this is the point** |

**Recommendation**: Keep Google Wavenet as the primary online provider (already implemented, working, cached). Correct the ADR-0003/00-discovery.md "Neural2" wording to "Wavenet" (doc↔code fix, low effort). Evaluate Azure Neural he-IL specifically for stronger EU privacy posture and to check for child-appropriate voice options before institutional (HMO/MoE) sales — Azure's DPA maturity matters more than marginal quality gains at this stage. Investigate bundling a **Piper offline Hebrew voice** as the "browser fallback" tier upgrade: today's fallback is native OS `speechSynthesis`, whose Hebrew quality is inconsistent per-device (ADR-0003); a bundled Piper voice would give a **guaranteed-quality, zero-network, zero-cost, zero-data-leakage** fallback — directly serving the "AAC must work offline" mandate (COBOARD_TASK.md Part 6) better than the current OS-dependent fallback. Mark all quality claims **[TBD — listening test required]** before any procurement decision.

### 14.3 Voice cloning plan (highest-risk feature)

Voice cloning **does not exist in the codebase today** (confirmed — no cloning provider, no consent flow, no watermarking anywhere in `services/` or `functions/src/`). This section is a **greenfield safeguards plan** per COBOARD_TASK.md Part 14's explicit mandate, since this is called out as the single highest-risk AI feature for a product handling minors' voice biometric data.

#### Phased plan

**Phase A — Consent & identity infrastructure (prerequisite, before any cloning code ships)**
1. Build a `voiceConsent` Firestore collection: `{ speakerId, consentGivenBy (uid), consentType: 'self'|'guardian', livenessCheckId, timestamp, revokedAt? }`.
2. Liveness check: require the person being cloned to read a randomized on-screen phrase aloud during capture (defeats replay of a pre-recorded sample); store only a hash/reference, not raw biometric liveness data, to minimize retention.
3. **Adults only, no exceptions.** Recommendation **stronger than the charter's "no cloning of minors' voices without dual-parent consent"**: this review recommends **outright prohibiting voice cloning of any person under 18**, full stop — no consent mechanism should be built that allows it. Rationale: (a) a child's voice is a permanent biometric identifier they cannot meaningfully consent to surrendering; (b) synthetic reproduction of a disabled minor's voice carries acute deepfake/exploitation risk; (c) the family-member-voice use case (mom, dad, grandma) the charter actually wants is entirely served by **voice *recording* (§21.2), not voice *cloning*** — there is no product need to clone a parent's voice when you can just record them saying the phrases directly.
4. For adult family members (the realistic target — e.g., a grandparent who wants their voice available even when not physically present to record every phrase): dual-parent consent is N/A (the cloned person is the consenting adult), but **the parent/guardian of the child whose board will use the cloned voice** must separately consent to that voice being added to the child's board.

**Phase B — Provider selection**
| Option | Consent/attestation fit | Privacy/DPA | Risk |
|---|---|---|---|
| **Azure Custom Neural Voice** | ✓ Good fit — Microsoft **requires a formal attestation/consent statement process** as part of onboarding before allowing custom voice training; this externalizes part of the consent-verification burden onto a vendor with legal accountability | Mature DPA, EU regions selectable | Lower — vendor-enforced gate reduces implementation risk |
| **ElevenLabs Voice Clone** | Weaker built-in gating — historically easier to clone a voice from a short sample with minimal verification (this is the well-documented abuse vector behind public ElevenLabs deepfake incidents) | DPA on enterprise tier only | Higher — would require Co_Board to build 100% of the consent/liveness enforcement itself with no vendor backstop |
| **Self-hosted XTTS (open-source)** | No built-in gating at all — all consent/liveness/watermarking logic is Co_Board's sole responsibility | Best data-residency (nothing leaves infra) but **highest implementation & misuse risk** — a self-hosted clone model with no vendor terms-of-service backstop is also the easiest to abuse internally (e.g., a rogue admin/insider) | [Risk] flagged — not recommended as a first choice |

**Recommendation**: Azure Custom Neural Voice as the primary path specifically *because* its attestation process gives an external, auditable consent gate — reduces Co_Board's own liability surface for a feature this sensitive.

**Consent UX flow (numbered)**
1. Parent/guardian initiates "add a family voice" from the child's board settings (adult-mode gated, see §21.2).
2. App collects: consenting adult's identity (existing authenticated account, not the child's), explicit purpose statement ("this voice will be used to speak on [child]'s communication board"), and age attestation ("I am 18 or older") — **hard block if the target speaker is flagged/known to be a minor** (cross-check against any child profile in the family).
3. Liveness capture: consenting adult reads a randomized phrase on camera/mic within the app (defeats pre-recorded submission).
4. Explicit, separate checkbox consents (not bundled): (a) consent to voice sample processing by the cloning provider, (b) consent to the resulting synthetic voice being used on the specified child's board, (c) acknowledgment of the deletion/revocation right described below.
5. Provider (Azure) attestation flow completes; cloned voice ID stored, never the raw enrollment audio (delete enrollment sample post-training, retain only what the provider contractually requires).
6. Confirmation screen showing exactly which board(s)/child(ren) can use the voice, with a "revoke" action always visible from account settings.

**Data lifecycle**: retention = enrollment audio deleted immediately after successful voice-model creation (data minimization); the trained voice model persists only as long as consent is active. Revocation → **hard delete at provider [TBD — must be verified against Azure's actual API/SLA for custom-voice deletion before launch; do not assume "delete" in the Azure portal is synchronous/complete without vendor confirmation]**. On revocation, Co_Board must also purge any cached/pre-synthesized audio generated from that voice from `audioCache` and Storage.

**Watermarking**: all cloned-voice audio output should carry an inaudible watermark (e.g., a provider-native watermarking feature if Azure offers one, or a supplementary inaudible signal) so that any audio clip can later be forensically traced back to "this was AI-generated," mitigating downstream deepfake misuse if a clip leaks outside the app.

**Abuse cases & mitigations**:
- *Parent clones ex-spouse's voice without consent to manipulate a shared child* → mitigation: liveness check requires the actual speaker to be present at enrollment time, not just an uploaded sample.
- *Someone attempts to clone a minor's voice* → mitigation: hard product-level prohibition (Phase A.3), not just a policy — no UI path should exist to submit a minor as the clone target.
- *Cloned voice used to generate speech outside the AAC context (e.g., a prank call impersonation)* → mitigation: watermarking + provider ToS enforcement + rate-limited, board-scoped synthesis only (the clone should only be invokable through the child's board, not as a general-purpose TTS voice picker).
- *Family member wants voice deleted after a custody dispute* → mitigation: single-click revocation with documented, verified hard-delete SLA.

### 14.4 Failure scenarios

**Provider outage matrix**

| Provider down | User impact | Existing fallback | Gap |
|---|---|---|---|
| Google Cloud TTS | New (uncached) phrases can't get high-quality speech | ✅ Falls back to browser `speechSynthesis` automatically (`hybridTtsService.ts:41-43`) — "first tap always speaks" invariant holds | Fallback voice quality is device-dependent and can be poor/absent on some Android devices (ADR-0003 known limitation) |
| Gemini (`aiBoard`) | Board-generation-from-topic feature fails | ✅ Graceful error to UI; previously-generated boards still work from `aiBoardCache` | No offline/local word-list generator exists as a degraded-mode substitute — feature is just unavailable, not degraded |
| Dicta Nakdan | New words show without nikud (vowel marks) | ✅ Falls back to unvocalized text, no error surfaced to user (`nikudService.ts:62-68`) | Silent degradation may not be obvious to a parent/therapist relying on correct pronunciation cues |
| ARASAAC (API + CDN) | New symbol search/fetch fails | ✅ 90-day CacheFirst SW cache (3,000 entries) + IndexedDB `symbolCache` cover previously-seen symbols; bundled `symbolMap.generated.ts` covers common words offline from first load | No bundled *image* fallback for words never fetched before this session — first-time symbol lookup for an uncommon word during an ARASAAC outage returns nothing |

**Huge-upload handling**: `firebase/storage.rules:20-24` caps media uploads at **10MB** and requires `contentType == 'application/octet-stream'` (i.e., must already be client-side encrypted — the rule itself is a defense-in-depth backstop against unencrypted uploads). No explicit client-side pre-flight size check was found before `compressToWebP`/`cropImage` run — a very large source photo (e.g., 50MP RAW-adjacent JPEG from a modern phone) is loaded fully into a `<canvas>` before compression, which could be slow/memory-heavy on low-end Android devices (relevant to COBOARD_TASK.md's ₪500–₪1,000 device target) but is bounded by the browser's own canvas memory limits, not by app code.

**Spike handling**: Per-uid rate limits exist and are unit-tested (120/min TTS, 30/min AI). **Gap**: no global/fleet-wide budget alert — recommend a Cloud Billing budget alert + a Cloud Monitoring metric on aggregate `ttsProxy`/`aiBoard` invocation count, so an abrupt spike across many uids (e.g., a credential-stuffing wave against many approved accounts) triggers a human alert before the monthly bill does.

---

## Part 21 – Media Features Spec

### 21.1 Photo capture & upload

**Current state (verified)**:
- No in-app camera UI — `CellEditor.tsx:543-547` uses a plain `<input type="file" accept="image/*" capture="environment">`, which on mobile browsers opens the native OS camera app (not an in-app `getUserMedia`-driven camera with grid/face-guide overlay).
- Pipeline on file selection (`CellEditor.tsx:118-143`, `handleImageFile`): `cropImage` (center-square crop) → `removeBackground` → `compressToWebP` → `blobToDataUri` for preview.
- **`removeBackground` is a no-op stub** — `imageService.ts:43-45`: `export async function removeBackground(blob) { return Promise.resolve(blob); }`. This directly contradicts `docs/00-discovery.md`'s claim of "background-removal fallback" as an existing capability — it is a pass-through placeholder, not a real fallback algorithm. **Doc↔code contradiction, low severity** (labeled honestly in the function name as a stub, but the discovery doc oversold it).
- Media is encrypted client-side (AES-GCM-256, random per-file CEK wrapped by a non-extractable device key — `services/sync/crypto.ts:98-132`) before any Storage upload (`services/sync/mediaSync.ts:23-39`). Storage rules additionally enforce `contentType == 'application/octet-stream'`, i.e., the bucket physically rejects anything that isn't already encrypted (`firebase/storage.rules:21-24`).
- **EXIF finding**: `compressToWebP` (`imageService.ts:47-72`) draws the source image onto an in-memory `<canvas>` and re-encodes via `canvas.toBlob(..., 'image/webp', 0.85)`. Canvas re-encoding **does strip EXIF metadata** (canvas has no EXIF-preservation path in any browser) — so **when this function successfully runs, EXIF (including GPS tags) is reliably stripped.** However: `handleImageFile`'s outer `try/catch` (`CellEditor.tsx:121-142`) wraps `getImageDimensions` + `cropImage` + `removeBackground` + `compressToWebP` together. If `getImageDimensions` or `cropImage` throws (e.g., a corrupt/unusual image format that fails to decode into an `<img>`, or `canvas.toBlob` returning `null` in `cropImage`), the **catch block falls back to using the raw original `File` object directly** (`blobRef.current = file`) — **completely bypassing re-encoding, meaning the original EXIF (including any embedded GPS location) is preserved and can be uploaded/synced.** This is a real gap: **EXIF stripping is not currently guaranteed on the failure path**, only on the happy path. Recommendation: make the canvas re-encode step mandatory and non-bypassable — if crop/compress fails, retry with a *simpler* re-encode (draw-and-export without crop) rather than falling all the way back to the untouched original file; only if literally no canvas path succeeds should the original be used, and in that case flag the entry for manual review rather than silently uploading it.
- No in-app auto-crop-to-face, no grid overlay, no face guide exist today (Storage rules and encryption are solid; the capture *UX* described in the charter is not built).

**Spec for target state**:
- Replace the `<input capture>` shim with a true in-app camera using `getUserMedia` (`{ video: { facingMode: 'environment' } }`), rendered in a full-screen modal with a rule-of-thirds grid overlay and (optionally) a face-detection guide box using an on-device model (e.g., MediaPipe Face Detector, WASM, no network call).
- Auto-crop: keep the existing center-square crop as the default, but let the face-detection box (if a face is found) bias the crop center instead of the raw geometric center — improves framing for family-member photos without any cloud call.
- On-device background removal: replace the `removeBackground` stub with a real segmentation model (e.g., MediaPipe Selfie Segmentation / `@mediapipe/selfie_segmentation`, runs in-browser via WASM/WebGL) — keep it optional/toggleable per the charter, and keep it 100% on-device to preserve the E2EE posture (no photo bytes should ever go to a segmentation API).
- **EXIF stripping guarantee**: make the canvas re-encode path mandatory for every upload — no code path should be able to persist/sync an image blob that hasn't been through `compressToWebP`'s canvas round-trip. Add a unit test asserting that a JPEG fixture with embedded EXIF GPS tags, after passing through the full `handleImageFile` pipeline (including its error paths), never contains those bytes in the resulting blob.
- **Moderation — the core tension**: Because media is E2E-encrypted before it ever reaches Firebase Storage (`crypto.ts`), **server-side NSFW/content scanning is structurally impossible without either (a) key escrow — the server holding a copy of the decryption key, which defeats the purpose of E2EE, or (b) scanning before encryption, which only the client device can do.** This is a genuine product/security tradeoff, not an oversight, and should be explicitly decided by product ownership, not silently defaulted:
  - **Proposed approach**: run an **on-device NSFW classifier at capture time** (e.g., `nsfwjs` — TensorFlow.js, runs fully client-side, no network call, ~5MB model) immediately after the photo is taken/selected, before it's saved to `mediaRepo` or queued for sync. If flagged, block the save and show a warning, with an option to proceed anyway (avoid false-positive lockout for legitimate photos of, e.g., a child in a swimsuit at a pool that a family wants on the board) but log that an override occurred.
  - **Report mechanism**: separately, any user with `childAccess` to a profile (therapist, co-parent, staff) should be able to flag an existing photo as inappropriate from the UI. A flagged item should NOT reveal the decrypted image to Co_Board staff automatically (still E2EE) — instead, flagging should trigger a **consent-gated, audit-logged request to the uploading account** to either voluntarily share a decrypted copy for human review or have the item removed/quarantined without review. This preserves E2EE as a hard boundary while still giving families and staff a moderation lever.
  - **Human-in-the-loop for reported content**: only activates after voluntary decryption-sharing consent above; Co_Board should never build any path that lets staff decrypt a family's media without that family's explicit action.
  - **Document this tradeoff explicitly for a product decision**: on-device-only moderation is weaker than server-side scanning (a determined bad actor could disable/bypass a client-side classifier), but it's the only approach compatible with the E2EE guarantee this product has already made to a highly sensitive user base (photos of children with disabilities). Recommend product ownership formally accept this tradeoff (document it in a signed-off ADR) rather than leaving it implicit.

### 21.2 Voice recording (family voices per tile)

**Current state — partially exists, not "confirm absent."** `CellEditor.tsx:150-179` already implements a working recording flow: `navigator.mediaDevices.getUserMedia({ audio: true })` + `MediaRecorder` (default codec, browser-chosen — typically Opus in WebM on Chrome/Firefox/Android; see iOS caveat below), producing a single `audio/webm` blob saved via `data/symbolRepo.ts` (`STORE_SYMBOLS`, `source: 'recording'`) and referenced from the cell via `Cell.audioId` (`domain/models.ts:49-50`). At playback, `speakCell()` (`ttsService.ts:217-245`) checks `cell.audioId` first and plays the recorded blob **in preference to TTS** — so the "recorded voice beats synthetic voice" priority the charter asks for is **already implemented**, just for a single, unlabeled recording per cell, not a *bank* of named family voices ("אמא," "אבא," "סבתא רותי") that a user can pick between per-tile.

**What's genuinely missing** (gaps vs. charter Part 21):
- No waveform preview, no trim, no distinct "re-record" affordance (stop-then-record-again just overwrites — there's no undo/compare).
- Recordings are **not encrypted and not cloud-synced** — `symbolRepo` is a plain IndexedDB store with no `mediaSync`/`crypto.ts` integration, unlike `mediaRepo` for photos. A device loss = **permanent loss of every recorded family voice**, which directly violates the AAC-specific reliability principle (COBOARD_TASK.md Part 6: a child cannot lose their voice). This is the single biggest gap in this area.
- No relationship/name tagging model — one recording per cell, no concept of a reusable "voice" entity attachable to multiple tiles.
- No size/duration limits enforced (no `maxDuration` on `MediaRecorder.start()`, no blob-size cap before `symbolRepo.save`).
- No parental/adult-mode gating on the record button — any user in builder mode can record, including a child if the child has builder access.

**Spec for target state**:
- **Storage format**: keep `MediaRecorder` capture at recording time, but store both **the original** (whatever codec the browser produced) **and a compressed Opus/WebM copy** for sync efficiency — mirror the photo pipeline's "capture → process → store" shape. Target ≤64kbps mono Opus for the synced copy (speech-optimized, small enough for cheap sync at scale).
- **iOS Safari support** [Verify constraint]: Safari's `MediaRecorder` support for `audio/webm;codecs=opus` has historically been inconsistent/absent (Safari traditionally preferred `audio/mp4` / AAC container). Recommend feature-detecting via `MediaRecorder.isTypeSupported()` at record time and falling back to an `audio/mp4` (AAC) capture path on iOS, with format normalized to Opus/WebM server-side (or at next sync) for consistent playback/compression across platforms. **This must be verified against current Safari versions before launch — Apple has been incrementally improving WebM/Opus support and the constraint may have shifted.**
- **Waveform preview + trim + re-record UX**: after `mr.onstop`, decode the blob via `AudioContext.decodeAudioData` client-side to render a waveform (e.g., a simple `<canvas>` peak-drawing, no external library required for a basic bar visualization), let the user drag trim handles, and only commit the trimmed range to storage. Explicit "re-record" button that discards the current take and returns to the record state, rather than the current implicit overwrite-on-stop.
- **Offline-first storage + encrypted sync**: extend `mediaRepo`'s pattern (not `symbolRepo`'s) to voice recordings — i.e., recordings should go through the same `encryptBlob`/`uploadMedia` pipeline photos already use, so a family's recorded voices survive device loss exactly as their photos do. This is the highest-priority fix in this section.
- **Per-tile association schema**: introduce a `VoiceClip` entity independent of `Cell`: `{ id, profileId, label (e.g. "אמא"), relationship, blob/mediaId, createdAt }`, then let `Cell` reference it via `audioId` (already the field name — just needs to point at the new shared entity instead of being 1:1 with a single ad hoc `symbolRepo` blob). This enables the charter's actual ask — one recorded "mom" voice reusable across every tile where mom's voice should play, not a fresh recording per tile.
- **Playback priority order**: preserve exactly what's already implemented — **recorded family voice > TTS** (`speakCell()`'s existing `cell.audioId` check-first logic is correct and should be kept as the model when the schema is extended).
- **Size/duration limits**: cap recording length (e.g., 15s per clip — sufficient for a name/greeting, prevents accidental multi-minute recordings eating storage) via `MediaRecorder` auto-stop timer; cap stored blob size (e.g., 2MB) mirroring the photo pipeline's spirit even though Storage rules' 10MB ceiling is shared infrastructure.
- **Parental gating**: gate the record button behind the existing adult-mode PIN/long-press lock (the same mechanism already protecting the builder — see `docs/00-discovery.md` §7.1 "adult/child lock (PIN + long-press)") so a child cannot record over a family member's voice bank entry.

### 21.3 Symbol sources

**Current state (verified)**: ARASAAC is the sole external symbol source. `services/symbols/arasaacClient.ts` calls `api.arasaac.org/v1/pictograms/{lang}/search/{query}` for search and `static.arasaac.org/pictograms/{id}/{id}_2500.png` for images. Two independent cache layers exist: (1) a Workbox `CacheFirst` runtime cache (`app/vite.config.ts:39-48`, `arasaac-symbols`, max 3,000 entries / 90-day TTL) for the service worker, and (2) an application-level IndexedDB cache (`data/symbolCache.ts`, `pruneCache(maxAgeDays=30)`) reached via `services/symbols/symbolSearchService.ts:fetchAndCacheBlob`. A separate, bundled `domain/symbolMap.generated.ts` maps common Hebrew words directly to ARASAAC pictogram IDs with local asset paths (`domain/boardLibrary.ts:25-40`), giving offline symbol coverage for the app's built-in board templates from first load, independent of the runtime caches.

**Licensing — flag as legal [TBD]**: ARASAAC is licensed **CC BY-NC-SA** (Creative Commons Attribution-NonCommercial-ShareAlike). This has two hard implications for a *commercial* SaaS product that the current codebase does not visibly address:
1. **Attribution requirement**: CC BY requires visible attribution to ARASAAC/Sergio Palao/Government of Aragón wherever the symbols are displayed. No attribution string/footer was found in the presentation layer during this review — **[TBD, needs explicit UI audit]**.
2. **NonCommercial clause**: "NC" licenses are, per the license's own text and widely-cited legal interpretation, generally incompatible with use in a **paid** product — charging money for access to a board system whose core visual content is NC-licensed symbols is a legal grey zone at best. This is a genuine blocker for the freemium/paid-tier business model implied elsewhere in this review (PRD §11, billing plans). **This must go to counsel before any paid tier ships with ARASAAC as the symbol source for paying customers.**
3. Many established commercial AAC products (e.g., ones built on **SymbolStix** or **PCS/Boardmaker**) solve this by licensing a commercial symbol set instead of relying on CC-NC content once money is involved.

**Recommendation**: keep ARASAAC for the **free tier** (its license explicitly permits noncommercial use, and its attribution can be satisfied with a simple footer/about-screen credit — low-effort fix), and budget for licensing **SymbolStix** (or an equivalent commercial-clear symbol set) for the **paid tier(s)**, gated the same way board features/limits would be gated by plan. Add the ARASAAC attribution line immediately regardless of licensing tier decision — it's required today, independent of the NC question.

**User uploads**: covered end-to-end by the photo pipeline in §21.1 (crop/compress/encrypt/sync) — no separate code path exists for "upload a symbol image" vs. "upload a cell photo"; they're the same `mediaRepo`/`CellEditor` flow.

**AI-generated symbols** (charter: "with content policy filter"): **does not exist today** — no image-generation API integration was found anywhere in `services/ai/` or `functions/src/`. This is a pure greenfield item. Before building: (1) a **content-policy filter** is non-negotiable given the child audience — use the image-gen provider's built-in safety filter (e.g., Gemini/Imagen's safety settings) plus the same on-device NSFW check proposed in §21.1 as defense-in-depth on the output; (2) **style consistency** — AAC boards work best with a visually consistent symbol set (flat, simple, high-contrast line art, similar to ARASAAC's own house style); an AI generator would need a fixed style prompt/LoRA to avoid producing visually jarring, inconsistent tiles next to ARASAAC pictograms; (3) **cost** — image generation is materially more expensive per call than text generation (Gemini/Imagen pricing is per-image, not per-token) and should get its own, tighter per-uid rate limit and caching-by-word-hash (mirroring `aiBoardCache`'s pattern) so the same commonly-requested word isn't regenerated repeatedly.

### 21.4 Storage & cost model

**Media growth model** [Assumption — no production usage data available; Firebase console access was not available for this review per `docs/00-discovery.md` §9]:

| Metric | Assumption |
|---|---|
| Photos per child (steady state) | ~40 tiles with a personal photo per active child board [Assumption] |
| Avg. photo size after `compressToWebP` (0.85 quality) | ~80–150KB [Assumption, WebP at that quality for a cropped square photo] |
| Voice clips per child (once §21.2 gap is closed) | ~15 family-voice clips (a handful of relatives × a few phrases) [Assumption] |
| Avg. voice clip size (15s cap, ~64kbps Opus) | ~120KB [Assumption] |
| Encrypted-blob overhead (AES-GCM wrap header, `crypto.ts` `MEDIA_MAGIC` + wrapped-CEK + IVs) | ~+100 bytes/file, negligible |
| TTS cache footprint | Capped at 500 entries/device by `pruneAudioCache` — bounded regardless of user count, this is a per-device cap not a per-account cloud cost |

**Storage + bandwidth cost at scale** [Assumption, using GCS/Firebase Storage public pricing ~$0.026/GB-month storage, ~$0.12/GB egress — not confirmed against actual Firebase billing]:

| Users | Photos (≈40 × ~120KB) | Voice (≈15 × ~120KB) | Total media/user | Total storage | Monthly storage cost [Assumption] |
|---|---|---|---|---|---|
| 100 | ~4.8MB | ~1.8MB | ~6.6MB | ~660MB | <$1 |
| 1,000 | ~4.8MB | ~1.8MB | ~6.6MB | ~6.6GB | ~$0.17 |
| 10,000 | ~4.8MB | ~1.8MB | ~6.6MB | ~66GB | ~$1.72 |

Raw storage cost is trivial at these volumes — the real cost driver at scale is **TTS/AI API calls** (per-character/per-token billed), not media storage. This table exists primarily to confirm media storage is *not* a near-term cost concern, so cost-optimization effort should focus on the TTS/Gemini spend (Part 16 of the full review), not on media compression further.

**Signed URLs vs. current encrypted-blob approach**: the current model does **not** use Firebase Storage signed URLs for read access — `storageProvider.ts`'s `download()` presumably uses the Firebase SDK's authenticated `getDownloadURL()`/direct SDK read path gated by `firebase/storage.rules`'s `hasChildAccess()` check, and the payload is opaque `application/octet-stream` ciphertext regardless of who can fetch it (decryption happens client-side with the device key). This is actually a **stronger** posture than typical signed-URL patterns for this data class: a leaked signed URL for an unencrypted asset exposes the raw photo/audio to anyone with the link for its validity window; a leaked download URL for this E2EE ciphertext exposes nothing without the requesting device's non-extractable key. **Recommendation**: keep the current encrypted-blob-over-authenticated-SDK-read approach rather than migrating to signed URLs — signed URLs would be a regression for this specific sensitive-media use case, not an improvement, despite being the more common pattern for generic media CDNs.

---

## Findings Summary

| ID | Finding | Severity | Fix | Complexity | Owner |
|---|---|---|---|---|---|
| E-01 | TTS sends full utterance text (potentially sensitive child communication) to Google Cloud TTS with no completed COPPA/GDPR/Israeli Privacy Law legal review (`ttsProxy.ts:6-7` open TODO) | High | Complete legal review before commercial launch; document data flow in DPIA; consider on-device/offline-first voice as default for most sensitive use | M | Security Sentinel + legal |
| E-02 | EXIF stripping is not guaranteed on the image-upload error path — if `cropImage`/`getImageDimensions` throws, the raw original file (with EXIF/GPS intact) is uploaded instead of a re-encoded, EXIF-stripped copy (`CellEditor.tsx:121-142`) | High | Make canvas re-encode mandatory and non-bypassable; add a fallback re-encode path instead of falling through to the raw file; add EXIF-preservation regression test | S | Analyst-Media (impl) |
| E-03 | Voice recordings (`symbolRepo`, `source: 'recording'`) are stored unencrypted, local-only IndexedDB with no cloud sync — a lost/reset device permanently destroys a family's recorded voices, violating the "child can't lose their voice" AAC principle | High | Route voice recordings through the same `mediaRepo`/`crypto.ts`/`mediaSync.ts` pipeline already used for photos | M | Analyst-Media (impl) |
| E-04 | ARASAAC (CC BY-NC-SA) is used as the sole symbol source with no visible attribution UI, and its NonCommercial clause is likely incompatible with any paid tier | High (legal/business) | Add attribution immediately (low effort); get counsel review of NC clause vs. paid-tier plans; budget for SymbolStix/PCS license for paid tiers | S (attribution) / L (relicensing) | Legal + Product |
| E-05 | Dicta Nakdan nikud endpoint used in default config is an unlicensed academic/public endpoint (ADR-0005, unresolved) — ToS risk for commercial use | High (legal) | Gate behind `VITE_NAKDAN_ENDPOINT` in all environments (no hardcoded prod default); pursue commercial license or expand local nikud dictionary | S (env gate) / M (licensing) | Security Sentinel + legal |
| E-06 | `aiBoard`'s `topic` field is interpolated into the Gemini prompt with no sanitization against prompt-injection-style content beyond a length cap | Medium | Add basic sanitization (strip/escape quote and instruction-like patterns) even though current blast radius is low (JSON-parsed, POS-allowlisted output) | S | Security Sentinel |
| E-07 | No global/fleet-wide spend ceiling or billing alert for TTS/Gemini calls — only per-uid rate limits exist; a broad spike across many approved accounts has no circuit breaker | Medium | Add Cloud Billing budget alert + Cloud Monitoring metric/alert on aggregate CF invocation volume | S | Optimizer Watchdog |
| E-08 | `removeBackground()` is a no-op stub, but `docs/00-discovery.md` describes it as an existing "background-removal fallback" capability — doc↔code mismatch | Low | Correct discovery doc wording; implement real on-device segmentation per §21.1 spec when prioritized | S (doc) / M (feature) | Docs Agent / Analyst-Media |
| E-09 | ADR-0003 and `docs/00-discovery.md` reference "Google Neural2" Hebrew voices, but code (`googleTtsProvider.ts:5-7`) confirms only Wavenet voices exist for he-IL — doc↔code contradiction | Low | Correct ADR-0003 and discovery doc wording to "Wavenet" | S | Docs Agent |
| E-10 | AI-generated words/boards (Gemini `aiBoard`) have no content-appropriateness filter before being shown to a child — only JSON-shape/POS validation exists | Medium | Add a lightweight profanity/appropriateness wordlist check server-side before returning `words` | S | Security Sentinel |
| E-11 | No on-device or server-side NSFW moderation exists for uploaded photos; the product's own E2EE design makes server-side scanning structurally impossible without key escrow | High (needs product decision) | Implement on-device NSFW check (nsfwjs) at capture time + consent-gated human-review path for reported content; document the E2EE-vs-moderation tradeoff in a signed-off ADR | M | Analyst-Media + Product |
| E-12 | Nakdan nikud calls are made directly client→Dicta with no auth/rate-limiting, inconsistent with the H-KEY proxy pattern used for TTS/Gemini | Medium | Proxy nikud calls through a rate-limited Cloud Function once licensing (E-05) is resolved | M | Security Sentinel |
| E-13 | Voice recording feature lacks waveform/trim/re-record UX, duration/size limits, per-tile-reusable voice bank schema, and adult-mode gating on the record button | Medium | Implement `VoiceClip` entity + UI per §21.2 spec | L | Analyst-Media + UX Auditor |
| E-14 | Voice cloning does not exist; this is the correct state today, but no ADR/consent-infrastructure groundwork (Phase A of §14.3) exists yet ahead of eventual implementation | Low (currently) | Treat §14.3 as the design doc; do not implement cloning until Phase A consent infrastructure + legal review of minors-prohibition policy is signed off | L | Architect + legal |
| E-15 | Firestore `rateLimits/{uid}__action` documents have no observed TTL/cleanup — unbounded growth over time (minor) | Low | Add a scheduled cleanup function or TTL policy on the collection | S | Optimizer Watchdog |

---

*End of document — 04-media-ai.md.*
