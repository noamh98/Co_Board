# 01 — Comprehensive Audit (Parts 2–6, 10–16)

> Stage B output · date 2026-07-07 · authored by **Analyst** agent (Sonnet), cross-checked against source.
> Baseline: `docs/00-discovery.md` (Stage A, trusted). Source of truth = code. Every claim below is either cited to a file path or explicitly tagged `[Assumption]` / `[TBD]`.

---

## Part 2 – Production Readiness Assessment

| Level | Status | Blocking issues | Required improvements |
|---|---|---|---|
| **Internal Testing** | ✅ Ready | None material. | — |
| **Closed Beta (10 families + 3 SLPs)** | 🟡 Almost | Manual admin approval (`functions/src/approveUser.ts`) doesn't scale past hand-holding ~10-15 accounts; no error visibility if something breaks for a family mid-pilot. | Add a lightweight approval dashboard or auto-approve+monitor; stand up minimal error tracking (Part 12) before real families use it unsupervised. |
| **First Paying Customer** | 🔴 Blocked | No billing/subscription code anywhere in repo (`grep -ri stripe\|billing\|subscription` → zero hits in `app/src`, `functions/src`); no ToS/privacy-policy artifacts under `docs/`; no DPIA. | Build minimal billing (Stripe/Paddle + family entity), publish privacy policy + ToS, run a DPIA (Part 8, referenced here as a hard gate). |
| **100 users** | 🔴 Blocked (same gates as above) | Single Firebase project, no staging (`.github/workflows/deploy.yml` deploys straight to `--project co-board` on every `main` push) — a bad rules/schema change hits 100 live families with no rehearsal. | Second Firebase project (`co-board-staging`), PR preview channels, minimal observability. |
| **500 users** | 🔴 Blocked | LWW sync data loss becomes statistically likely once therapist+parent concurrent edits are common (`app/src/services/sync/syncEngine.ts:92-119`, ADR-0004 unimplemented). Admin-approval bottleneck breaks UX at this volume. | Ship ADR-0004 per-field merge or at minimum a visible conflict-resolution UI; self-serve signup (remove/soften manual approval gate). |
| **1,000 users** | 🔴 Blocked | Cost model still cheap (Part 16) but Nakdan licensing (`docs/adr-0005-nikud-licensing.md`) is `[TBD]` — a vendor pricing surprise at this scale could be material; no backup/DR tested. | Resolve Nakdan license before this tier; implement Firestore export/PITR + storage backups (Part 10). |
| **10,000 users** | 🔴 Blocked | No App Check (cost-abuse risk on `ttsProxy`/`aiBoard` even with per-uid rate limits, since a leaked/replayed token still gets 120 TTS calls/min — see B-23); no dashboards/alerting to catch a runaway cost or outage; single-region Functions posture (europe-west1 + legacy us-central1, `functions/src/region.ts`) untested at load. | App Check, Cloud Monitoring dashboards + billing alerts, load-test the sync/TTS path. |
| **Institutional (school / HMO)** | 🔴 Blocked, furthest out | No multi-tenant model (Part 9 scope, referenced here) — only per-child `childAccess` sharing exists, not clinic/school-scoped tenancy; no compliance paperwork (רישום מאגר מידע, DPIA, accessibility statement per תקן 5568); two waived axe findings (contrast, grid ARIA — `docs/reviews/HANDOFF.md` §4) block a clean WCAG 2.2 AA claim procurement will ask for. | Full Part 9 tenant model, compliance package, accessibility remediation before any HMO/MoE conversation. |

**Bottom line:** the codebase is production-*quality* but not production-*ready* as a business — every blocker from "first paying customer" onward is a missing business/ops layer (billing, staging, compliance, observability), not a code-quality defect.

---

## Part 3 – Code Quality Assessment

### Score: **74/100**

**Reasoning:** strong architectural discipline and test hygiene pull the score well above a typical MVP; the ceiling is capped by real technical debt in the presentation layer, absence of i18n, and zero production observability — all of which are "book-keeping" debt rather than correctness risk.

**Strengths (verified):**
- Strict 4-layer unidirectional architecture (`presentation → domain → services → data`), verified by the team via grep for layering violations (per HANDOFF).
- TypeScript strict, **zero `any`**, zero `@ts-ignore` (confirmed pattern across sampled files).
- 244+ unit tests (72 files) + 6 Playwright e2e specs incl. axe scans + Firestore rules tests — measured: `app/src` currently totals **16,055 LOC** excl. tests.
- ESLint 9 flat config, Dependabot, CI gate (typecheck → lint → coverage → build → functions build → rules tests) in `.github/workflows/ci.yml`.
- Centralized `notifyError` pattern (`services/notify/notifyService.ts`) replacing silent UI-facing error swallowing (HANDOFF §7, task 1.7).
- Deliberate, documented "what we're NOT doing" discipline (no Sentry without a privacy decision, no zod, no premature CellEditor split — HANDOFF §2.5) — this is a *positive* signal of engineering maturity, not laziness.

**Debt:**
- **Presentation layer is now ~9.76K LOC** (`find app/src/presentation -name "*.ts*" | wc -l` → 9,762 lines), up from the 8.7K recorded in `docs/00-discovery.md` — growing faster than the rest of the codebase, and it's where the two largest files live.
- **No i18n framework** — every UI string is hardcoded Hebrew (verified: `firebase.json`/`package.json` show no i18next/react-intl dependency; `app/package.json` dependencies are only `firebase`, `idb`, `react`, `react-dom`). This directly blocks Part 18/26 Arabic+English expansion and even a therapist-facing English admin UI.
- **Custom navigation stack instead of a router** — no `react-router` in dependencies; adequate at current size per discovery, but `AppModals.tsx` (212 LOC, single `openPanel: PanelId | null`) is already a manual state machine that will need a real router before deep-linking/institutional multi-view flows (Part 18) are feasible.
- **Single Firebase project drives both dev and prod** — a code-quality-adjacent process gap: schema/rule changes are validated only by the emulator in CI, never rehearsed against a live-shaped staging project.

### Top 5 refactor targets (by file path)

| # | File | LOC | Why |
|---|---|---|---|
| 1 | `app/src/presentation/builder/CellEditor.tsx` | 688 | Largest file in the repo; HANDOFF explicitly deferred splitting it (§2.5) — debt is acknowledged, not hidden. |
| 2 | `app/src/App.tsx` | 647 | Already refactored once (1,170→626 in a prior round per HANDOFF §7); has crept back up — needs a size budget/lint rule, not another one-off split. |
| 3 | `app/src/presentation/builder/BuilderView.tsx` | 623 | Same class of debt as CellEditor; drag-drop/undo/multi-select logic concentrated in one component. |
| 4 | `app/src/presentation/builder/SceneEditor.tsx` | 555 | Scene/VSD editing (hotspot placement) — newer feature, already large; refactor before it grows further. |
| 5 | `app/src/presentation/settings/AccessSettingsPanel.tsx` | 484 | Role/permission UI — will only get more complex once Part 20 (family/multi-role model) lands; refactor *before* adding roles, not after. |

**Owner suggestion:** `deep-reasoning`-tier sub-agent for #1–#3 (stale-closure/race risk per HANDOFF precedent on App.tsx), standard-tier for #4–#5.

---

## Part 4 – Database Assessment

Two databases, as documented: **IndexedDB v12** (device, source of truth) and **Firestore** (cloud sync target).

### 4.1 IndexedDB (`app/src/data/db.ts`)
- Migrations are additive-only through v12 (14 object stores); v8 migration is explicitly wrapped in try/catch with `setMigrationFailed` + one-time toast (`app/src/data/db.ts`, `useAppBootstrap` per HANDOFF §7, task 3.5) — **this is a real, tested safety net**, not just a claim.
- `backupRepo.importBackup` (`app/src/data/backupRepo.ts:56-72`) validates the whole envelope (`assertValidBackup`) and filters individual corrupt records (`isValidBoardRecord`/`isValidProfileRecord`) rather than all-or-nothing — good defensive design against a malicious/corrupt import file.
- **Gap:** no call to `navigator.storage.persist()` anywhere in the codebase (`grep -rn "navigator.storage.persist" app/src` → zero matches). Under Chrome/Android storage pressure, IndexedDB for this origin is evictable by the browser with **no user-visible warning**, and since sync is opt-in (§Part 6), eviction can mean total loss of a non-verbal child's board. This is the single highest-leverage one-line-ish fix in the whole audit.

### 4.2 Firestore schema — corrects a discovery-stage assumption
The `docs/00-discovery.md` schema table and the task brief both flag "boards synced as blobs inside child docs" as a 1MB-document risk. **Verified false** by reading `app/src/services/sync/firebaseProvider.ts` and `app/src/data/childRepo.ts`:
- `users/{uid}/children/{childId}` holds only child *metadata* (`name`, `age`, `preferences`, `homeBoardId`, `archivedAt`) — a few hundred bytes.
- Boards sync as **individual documents**, one per board, at `users/{uid}/board/{boardId}` (`firebaseProvider.ts:59,78` — `entityTypes = ['board','profile','settings']`, `doc(db,'users',uid,r.entityType,r.entityId)`).
- Media (photos) never touches Firestore at all — it's encrypted client-side (AES-GCM) and uploaded to Cloud Storage at `profiles/{profileId}/media/{mediaId}` (`app/src/services/sync/mediaSync.ts`), capped at 10MB/file and validated server-side (`firebase/storage.rules:21-24`).

**Revised risk assessment:** at 200 boards × 50 tiles/board, each board document is realistically 5–30KB (label + nikud + action + symbolId + `imageUri` reference — no inline image bytes), i.e. **1–2 orders of magnitude below the 1MB Firestore document limit**. The 1,000-users-×-200-boards growth scenario in the task brief is **not a document-size risk** in this codebase's actual schema. It *is* a **read-volume** consideration (200 board docs = 200 reads on a naive "load everything" pull) — see Part 5 for the cost model.

### 4.3 Concurrency: LWW data-loss (real, confirmed)
`app/src/services/sync/syncEngine.ts:92-119` merges via `mergeLastWriteWins` (entity-level, on `updatedAt`); the losing version is archived to the `versions` IndexedDB store but **not merged**. ADR-0004 (`docs/adr-0004-conflict-per-field.md`) documents this exact scenario ("parent renames a label on device A while a clinician adds a tile on device B — one edit is lost, recoverable only by manually digging into `versions`") and proposes per-field timestamps as the fix, but status is **"Proposed (Phase 5), not implemented."** For an AAC product where a therapist and a parent routinely co-edit the same board, this is a **real, not theoretical**, data-loss vector.

### 4.4 Query patterns / indexes
- `firebaseProvider.pull()` runs 3 range queries (`where('updatedAt', '>', since)`) per sync — single-field range filters, no composite index needed.
- `childRepo.listChildren` queries `where('archivedAt', '==', null)` — single-field, fine.
- No evidence of missing composite indexes for current query patterns; this will need revisiting once Part 9 tenant-scoped queries (clinic dashboards spanning many children) are added.

### Recommendations
1. Adopt ADR-0004 (per-field merge) before Closed Beta if multi-device concurrent editing is expected in the pilot (10 families + 3 SLPs is exactly that scenario).
2. Add `navigator.storage.persist()` request on first successful login/onboarding (small, high-value fix).
3. When Part 9 tenant model lands, model clinic-dashboard query patterns explicitly and add composite indexes proactively (Firestore fails hard, not silently, on missing indexes — low risk but should be caught in staging, not prod).

---

## Part 5 – Scalability Assessment

**[Assumption] tags used throughout — no real production traffic data exists (`docs/00-discovery.md` §9: "[TBD] Actual Firestore usage — no console access").**

Modeling assumptions:
- `[Assumption]` 40% of registered users are daily-active.
- `[Assumption]` 55% of users enable cloud sync (opt-in, §Part 6).
- `[Assumption]` 8 boards/family in steady state (not the 200-board stress ceiling, which Part 4 showed is safe anyway).
- `[Assumption]` ~50 Firestore reads + 15 writes per synced-active-user/day (debounced sync, `scheduleSync` 3s delay in `syncEngine.ts:185-190`, plus periodic pulls).
- `[Assumption]` ~300 Cloud-TTS-billed characters/day per active user (most tile-taps hit `audioCache` locally or the browser `speechSynthesis` fallback; only cache-misses reach `ttsProxy`).
- `[Assumption]` 2 `aiBoard` calls/day per active user.

| Users | Synced-active users | Firestore reads/day | Firestore writes/day | Function invocations/day (tts+ai) | TTS chars billed/month | Storage (cumulative) |
|---|---|---|---|---|---|---|
| 10 | 2 | ~100 | ~30 | ~5 | ~18K | ~0.2 GB |
| 100 | 22 | ~1,100 | ~330 | ~50 | ~198K | ~2 GB |
| 500 | 110 | ~5,500 | ~1,650 | ~250 | ~990K | ~10 GB |
| 1,000 | 220 | ~11,000 | ~3,300 | ~500 | ~1.98M | ~20 GB |
| 10,000 | 2,200 | ~110,000 | ~33,000 | ~5,000 | ~19.8M | ~200 GB |

At all tiers except 10,000, daily reads/writes stay **inside Firestore's free daily quota** (50K reads/day, 20K writes/day) — see Part 16 for the resulting cost curve. The real scale bottleneck at this traffic level is not database throughput, it's **process bottlenecks**:

**Bottlenecks (verified, not hypothetical):**
1. **Admin manual approval** (`functions/src/approveUser.ts`) — every signup requires a human `admin:true` claim-holder to call this function. At 10,000 users this is operationally impossible without either automation or removing the gate; it's a business-process SPOF, not an infra one.
2. **ARASAAC dependency** — symbol search hits `EXT4` (ARASAAC API/CDN) live; offline cache is CacheFirst with a 3,000-entry/90-day TTL (per discovery §2) — fine for steady state, but a cold cache (new device, new family) during an ARASAAC outage degrades symbol availability with no fallback provider.
3. **Nakdan (nikud) external API** — no fallback beyond IndexedDB cache + manual override; licensing itself is unresolved (`docs/adr-0005-nikud-licensing.md`), so this is simultaneously a scale, cost, and legal risk.
4. **Rate-limit store** (`functions/src/rateLimit.ts`) — implemented as a Firestore transaction on `rateLimits/{uid}__{action}`, i.e. **per-user, not a shared hot document**. Correcting a discovery-stage worry: this does **not** contend at scale (10,000 concurrent users each touch their own doc). Verified low-risk.
5. **No App Check** — rate limiting bounds *cost per compromised token* but not *whether a token can be replayed programmatically*; without App Check, a leaked/scraped ID token can still legally call `ttsProxy` 120×/min (400 chars each = 48K chars/min = theoretical $0.046/min = **~$66/day per abused token**) until it expires. Low likelihood, non-trivial blast radius.

### Recommendations
- Edge/CDN caching for board/symbol reads is largely already handled (Workbox CacheFirst for ARASAAC; Firebase Hosting CDN for the app shell) — no action needed short-term.
- Signed URLs: not currently needed — media is already access-controlled via Storage rules + `childAccess`, and always encrypted client-side, so a leaked URL alone is not enough to read content. Low priority.
- Background TTS pre-generation for a family's "core word" set (instead of on-tap synthesis) would cut `ttsProxy` calls further — nice-to-have, not urgent given the cache-hit-dominant model above.
- Enable **App Check** before crossing ~1,000 users — this is the actual scale-relevant security/cost control, not sharding or read-replication.

---

## Part 6 – Reliability Assessment

**Offline-first is real, not marketing** — verified: IndexedDB is the local source of truth (`app/src/data/db.ts`), the service worker precaches the app shell (`vite-plugin-pwa`/Workbox), TTS has a 3-tier fallback (`audioCache → Google Cloud TTS → browser speechSynthesis`), and a `vite.config.ts` comment enforces "must work with no network" as a project invariant (per HANDOFF §4).

### SPOFs
| Component | SPOF? | Mitigation present |
|---|---|---|
| Firebase project `co-board` itself | Yes | None — single project, single region pair (europe-west1 + legacy us-central1). Firebase outage = no sync/TTS-proxy/AI, but **local app keeps working** (offline-first). |
| Google Cloud TTS | Partially | ✅ Has fallback: browser `speechSynthesis` when the network/proxy call fails. |
| ARASAAC CDN | Yes for *new* symbols | Cached (CacheFirst, 3K entries/90d) for previously-seen symbols only. |
| Dicta Nakdan API | Yes for nikud quality | Falls back to cached/manual nikud, but quality degrades; licensing itself unresolved. |

### Data-loss scenarios (AAC-specific — the child must never lose their voice)
1. **Sync is opt-in.** If a family never enables cloud sync, the *only* copy of the child's board lives on one device. Device loss/damage/factory-reset = **total, permanent loss** of a potentially years-in-the-making personalized communication board. This is the single most severe reliability finding in this audit, precisely because it's an AAC product.
2. **IndexedDB eviction under storage pressure.** No `navigator.storage.persist()` call anywhere in the codebase (confirmed by grep, §Part 4.1) — on a low-end Android device (explicitly called out as a target market in the task brief, "₪500–₪1,000 range"), the browser can silently evict this origin's storage without persistence granted, compounding risk #1.
3. **Backup export is manual** (`BackupPanel.tsx`, `backupRepo.exportBackup`) — a parent has to know the feature exists and remember to use it. No scheduled/automatic local backup.
4. **LWW sync overwrite** (Part 4.3) — even for *synced* families, a lost concurrent edit is a data-loss event, just a smaller one than device loss.

### Recommendations
1. **Make sync opt-out, not opt-in** (or at minimum, nag/onboard hard toward enabling it) — this is a product decision with an outsized reliability payoff given finding #1 above.
2. Call `navigator.storage.persist()` on first successful onboarding.
3. Add a "last backed up: N days ago" reminder in the UI, tied to `backupRepo`.
4. Treat ADR-0004 (per-field merge) as a reliability fix, not just a nice-to-have — reframe its priority accordingly for Closed Beta.

---

## Part 10 – Backup & Recovery

**Current state:**
- Local backup export/import exists and is validated (`app/src/data/backupRepo.ts`, `backupValidation.ts`) — JSON export of boards/profiles/settings, filtered on import for corrupt records.
- `versions` IndexedDB store (`STORE_VERSIONS`, `db.ts:28`) — **but this only captures the *losing* side of an LWW sync conflict** (`syncEngine.ts:101-108,142-149`), capped at `MAX_VERSIONS_PER_ENTITY = 20` (`backupRepo.ts`). It is **not** a general-purpose revision history — a solo user with no sync conflicts has zero version snapshots, even if they've edited a board 500 times.
- Cloud sync (Firestore + Storage) functions as an *implicit* backup — but only for the ~55% `[Assumption]` of users who opt in (§Part 6).

**Missing:**
- Firestore **Point-In-Time Recovery (PITR)**: `[TBD]` — cannot be verified from source; requires Firebase console access. `docs/00-discovery.md` already flags this as unverified. **Action: confirm PITR status in the GCP console before Closed Beta.**
- No Cloud Storage bucket versioning/backup policy (`firebase/storage.rules` defines access control only, no lifecycle/versioning config found in `firebase.json` or elsewhere in the repo).
- No restore runbook, no evidence of a tested recovery drill.

### Recommended plan
1. **Enable Firestore PITR** (7-day rolling, GCP-managed) — near-zero engineering cost, immediate RPO improvement for synced data.
2. **Scheduled Firestore exports to a cross-region GCS bucket** (daily, via Cloud Scheduler + `gcloud firestore export`) — protects against project-level incidents PITR doesn't cover (e.g., accidental project deletion).
3. **Enable Cloud Storage bucket versioning** + a lifecycle rule (e.g., keep noncurrent versions 30 days, then delete) on the media bucket.
4. **Monthly restore drill**: script a full restore into a scratch Firebase project and verify a board round-trips correctly — this closes the "we have backups but never tested restoring them" gap common to early-stage SaaS.

---

## Part 11 – Disaster Recovery

### RTO/RPO — target (per task) vs. current reality

| Data class | Target RPO (task brief) | Current reality |
|---|---|---|
| Boards & tiles | ≤ 5 min | **∞ if sync disabled** (device-only, §Part 6 finding #1). **≈ debounce window (3s) + sync-run latency if sync enabled and online** — realistically meets target *only* for synced, online users. |
| Media (photos/audio) | ≤ 1 hour | Uploaded opportunistically on sync (`mediaSync.ts`) when online; no forced-upload SLA. Roughly meets target for synced users; ∞ for non-synced. |
| Analytics | ≤ 24 h | Analytics is opt-in and local-first (per discovery §2); not cloud-backed at all today — N/A until analytics sync is built. |

**RTO** (time to restore *service*, as opposed to data): with no staging environment and no documented rollback procedure (Part 13), a bad `main` deploy has an **undefined, ad-hoc RTO** today — recovery means someone manually diagnosing and reverting via `git revert` + redeploy, with no rehearsed runbook.

### DR strategy recommendation
1. Multi-region GCS for Firestore exports and Storage bucket replication (Part 10 plan, cross-region as the DR layer).
2. Define and publish an explicit RTO for the Firebase-project-loss scenario (`[TBD]`, but a reasonable target given current tooling is **RTO ≤ 4 hours** for a full project rebuild from IaC + latest export — contingent on IaC actually existing, which it currently does not: Firebase config is deployed by CLI flags in `deploy.yml`, not Terraform/Pulumi).
3. **Adopt "the device itself is the ultimate DR for the child" as an explicit design principle**: because the local IndexedDB copy is always complete and functional offline, a *cloud* incident (Firestore/Storage/region outage) never actually stops a child from communicating — only from *syncing*. This is a genuine architectural strength worth stating explicitly in DR documentation: cloud DR protects against *device* loss, the device protects against *cloud* incidents. The gap (§Part 6, finding #1) is that this only holds when sync was enabled *before* the device was lost.

---

## Part 12 – Observability

**Current state: none in production**, and this is a **deliberate, documented** choice, not an oversight — `docs/reviews/ROADMAP.md` and `docs/reviews/HANDOFF.md` §2.5 explicitly block adding Sentry "without an explicit privacy/COPPA decision." No metrics, no dashboards, no alerting exist today (confirmed: `grep -rn Sentry app/src` → zero hits in source, only in review docs discussing the decision *not* to add it).

### Recommended privacy-compatible stack
| Layer | Recommendation | Why |
|---|---|---|
| Error tracking | **GlitchTip (self-hosted, EU)** or **Sentry EU region** with PII scrubbing (`beforeSend` stripping child names/labels) and **session replay disabled** | Resolves the blocking COPPA/privacy question by construction — data stays in-region, no replay of a child's board content. |
| Metrics/dashboards | Firebase/Cloud Monitoring dashboards on: Function error rate, Function p50/p95 latency, Firestore quota usage, daily active/synced users | Already-included with GCP, zero new vendor. |
| Alerting | Cloud Monitoring alert policies: Function error rate > threshold, budget alerts on TTS/Gemini spend (ties into Part 16 cost control) | Directly protects against the App-Check-adjacent cost-abuse risk (Part 5, finding #5). |
| Tracing | OpenTelemetry — **later** (Phase 4+), not urgent at current scale | Low ROI until multi-service latency debugging is a real pain point. |

### AAC-specific SLOs to define and monitor
- Board load < 1s on mid-range Android — **not currently measured**; needs RUM (e.g., `web-vitals` reported to Cloud Monitoring/Analytics) or synthetic checks.
- Tap → speech < 150ms (cached) / < 1.5s (network TTS) — **not currently measured**.
- Offline sync success ≥ 99.5% — `syncEngine.ts` already tracks a `SyncStatus` (`idle/syncing/error/offline/disabled`) client-side; needs aggregation (even simple opt-in telemetry ping) to become a measurable SLO.
- Crash-free sessions ≥ 99.8% — requires the error-tracking layer above to exist at all.

### Implementation roadmap
- **S (1–2 days):** Cloud Monitoring dashboards + budget/error-rate alerts (zero new vendor, no privacy question).
- **M (1 week):** Stand up GlitchTip (self-hosted) or Sentry EU with a PII-scrubbing `beforeSend`, wire into `ErrorBoundary.tsx` and `notifyError` service.
- **L (2–4 weeks):** RUM for the two AAC SLOs (board load, tap-to-speech), opt-in sync-success telemetry aggregation, first SLO dashboard.

---

## Part 13 – DevOps

**Current state:**
- CI (`ci.yml`): typecheck → lint → coverage → build (app) + functions build + Firestore rules tests under emulator, on every PR/push. Solid gate.
- CD (`deploy.yml`): on push to `main`, gate (lint + `npm test` — **note: not `test:coverage`, a minor inconsistency with CI**) then deploy hosting + firestore:rules + storage:rules + functions to the **single** `co-board` project.
- Dependabot enabled.
- Secrets: client Firebase config via GitHub Actions secrets → Vite env; `GOOGLE_TTS_API_KEY`/`GEMINI_API_KEY` in Firebase Secret Manager (not GitHub secrets) — correctly separated, documented inline in `deploy.yml`'s header comment.

**Gaps:**
- **No staging project** — every merge to `main` is a production deploy. Confirmed: `deploy.yml` has one job, one `--project co-board` target.
- **No preview channels** — Firebase Hosting supports PR preview channels natively; not configured.
- **No feature flags** — no LaunchDarkly/Unleash/remote-config mechanism found.
- **No rollback runbook** — recovery from a bad deploy is ad hoc (`git revert` + re-run CD, or manual `firebase hosting:rollback`, undocumented).
- **No mobile pipelines** — expected, since no native apps exist yet (Part 18 scope); flagged here only as a forward dependency.

### Recommendations
1. **Second Firebase project `co-board-staging`** with its own service account secret, mirroring `deploy.yml` as a separate workflow triggered on a `staging`/`release` branch.
2. **Firebase Hosting preview channels on PRs** (`firebase hosting:channel:deploy pr-$PR_NUMBER`) — cheap, catches UI regressions before merge.
3. **Environment-gated deploy job**: require an explicit approval step (GitHub Environments with required reviewers) before the production deploy job runs, once paying customers exist.
4. **Simple feature-flag mechanism**: a `config/flags` Firestore doc read at app boot (already have the Firestore plumbing) is enough at this scale — no need for a paid vendor yet. Must go through the same privacy review as any new Firestore read (no child-identifying data in flag payloads).
5. **Release tagging + rollback runbook**: tag every deploy commit (`git tag deploy-YYYY-MM-DD-<sha>`), document `firebase hosting:rollback` + functions redeploy-previous-version steps.

---

## Part 15 – Data Loss Assessment

**Current protections (verified, real):**
- Soft-delete via `archived`/`archivedAt` fields, never hard-delete, across boards (`domain/models.ts:113`) and children (`childRepo.ts:31,95`).
- `versions` store for LWW-conflict losers (§Part 10 — caveat: conflict-triggered only, capped at 20/entity).
- Backup export/import with envelope + per-record validation (`backupRepo.ts`, `backupValidation.ts`).
- Additive-only IndexedDB migrations with explicit failure handling (v8 migration, §Part 4.1).
- Outbox pattern for offline writes (`STORE_OUTBOX` in `db.ts`, `syncQueue` in `syncEngine.ts`) — writes made offline are queued and pushed on reconnect, not lost.

**Gaps:**
1. **No 30-day trash UI.** Archive exists as a data-model concept (`archived: boolean`), but there is no user-facing "trash" screen to browse and restore archived boards — the task brief's Part 15 requirement ("trash bin for 30 days") is only half-built: the *data* supports it, the *UI* doesn't exist.
2. **No general board revision history.** As established in Part 10, `versions` only fires on sync conflicts — a therapist who edits a board 10 times solo (no conflict, sync disabled or single-device) has **no way to revert to an earlier state**. This directly fails the task brief's explicit scenario: *"a therapist edits a child's board — must be able to revert."*
3. **No verified undelete-after-archive-purge policy** — nothing in the codebase prunes archived records today (no evidence of a scheduled purge job), so in practice nothing is currently unrecoverable via archive — but there's also no *documented* retention policy, which is itself a gap once one is eventually added.
4. **LWW overwrite** — already covered in Part 4/6, repeated here because it is, definitionally, a data-loss issue.

### Recommendations
1. **Trash bin UI**: surface `archived === true` records in a dedicated view with one-tap restore — this is mostly UI work on top of already-existing data plumbing (S–M complexity).
2. **Board revision history**: extend `saveVersion` to fire on *every* save, not just conflict losers, with the existing `MAX_VERSIONS_PER_ENTITY = 20` cap (or a time-based cap, e.g., last 20 *or* last 30 days) — gives therapists true revert capability. (M complexity — touches the hot save path, needs care per HANDOFF's "don't casually touch BuilderView/CellEditor" caution.)
3. **Cloud-side soft-delete retention**: mirror the archive flag server-side with a documented retention window (e.g., 30 days) before any future hard-delete/purge job is added.

---

## Part 16 – Cost Assessment 💰

**This section is the success criterion for the whole engagement — treated accordingly with explicit unit assumptions.**

### Unit-cost assumptions `[Assumption]` (verify against current GCP/Firebase price sheets before committing to a budget — prices drift)
- Firestore (Native, standard region): reads $0.06/100K, writes $0.18/100K, deletes $0.02/100K, storage $0.18/GiB-month, free daily quota 50K reads/20K writes/20K deletes.
- Cloud Storage: ~$0.02–0.026/GiB-month, egress ~$0.12/GiB.
- Cloud Functions v2: ~$0.40/million invocations + compute time (negligible at this call volume/duration).
- Google Cloud TTS (Neural2/Wavenet, matches task brief's own assumption): **$16/1M characters** `[Assumption, verify current pricing]`.
- Gemini 2.5 Flash: low-single-digit-dollars per million tokens `[Assumption/TBD — verify current pricing, changes frequently]`.
- Nakdan (Dicta) license: **`[TBD]` — no public pricing found; ADR-0005 explicitly marks licensing unresolved.** This is the single largest unknown in this cost model and should be resolved via direct vendor contact before scaling past Closed Beta.
- Error tracking: self-hosted GlitchTip small VM ≈ $10–20/month, or Sentry EU team plan ≈ $26+/month.
- Domain/misc: ≈ $15–20/month.
- Apple Developer: $99/year ≈ $8.25/month (once native ships, Part 18).
- Google Play: $25 one-time (negligible ongoing).
- Support tooling (helpdesk, once paying customers exist): `[Assumption]` ≈ $0–50/month at this scale (e.g., a free-tier helpdesk suffices until real support volume exists).

### Monthly cost model

| Item | 100 users | 500 users | 1,000 users | 10,000 users | Step-function? |
|---|---|---|---|---|---|
| Firebase Hosting/CDN | ~$0 (free tier) | ~$0 | ~$1 | ~$5 | No — scales smoothly, tiny. |
| Firestore (R/W/storage) | ~$0 (free tier) | ~$0 (free tier) | ~$0–1 | ~$2–7 | **Yes** — free tier absorbs everything up to ~1,000 users, then steps up. |
| Cloud Storage + egress | ~$0.3 | ~$1.5 | ~$3 | ~$30 | No — linear with media volume. |
| Cloud Functions | ~$0 | ~$0 | ~$0.2 | ~$2 | No — negligible at these volumes. |
| Google Cloud TTS | ~$3 | ~$16 | ~$32 | ~$317 | No — linear, but becomes the **dominant variable cost** by 1,000+ users. |
| Gemini Flash | <$1 | ~$2 | ~$4 | ~$40 | No — linear, secondary to TTS. |
| Nakdan license | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | **Possibly — could be a fixed enterprise fee (step-function) or unaffordable per-request pricing.** Resolve before Closed Beta. |
| Error tracking | ~$15 | ~$15–26 | ~$26 | ~$80 (scaled plan) | **Yes** — flat until a plan-tier boundary. |
| Backups (PITR + exports + bucket versioning) | ~$1 | ~$3 | ~$5 | ~$20 | No — linear with data volume, small. |
| Domain/misc | ~$15 | ~$15 | ~$15 | ~$15 | No — fixed. |
| App store fees (once native ships) | — | — | ~$8 (amortized) | ~$8 | Fixed, one-time-ish. |
| Support tooling | ~$0 | ~$10 | ~$20 | ~$50 | **Yes** — free tier → paid tier at a headcount/ticket-volume boundary. |
| **Total/month (excl. Nakdan)** | **~$34–40** | **~$63–75** | **~$114–130** | **~$570–620** | |
| **Per-user/month (excl. Nakdan)** | **~$0.35–0.40** | **~$0.13–0.15** | **~$0.11–0.13** | **~$0.06** | Cost per user **falls** with scale — fixed costs dominate small tiers. |

**Key finding:** infrastructure cost is **not** the constraint on scaling this product — even at 10,000 users, total cloud spend is under $650/month, and per-user cost *improves* with scale because fixed costs (error tracking, domain, support tooling baseline) dominate at low volume. **The real cost risk is Nakdan licensing** (fully unknown) and the **admin-approval bottleneck's labor cost** (a human reviewing signups doesn't show up in a cloud bill but is a real operating cost that scales with users, unlike everything else in this table).

### LTV / CAC sensitivity sketch `[Assumption]`
- Subscription price: ₪30–50/family/month `[Assumption]`.
- Freemium conversion: 3–8% `[Assumption]`.
- At 10,000 total (free+paid) users: 300–800 paying families → ₪9,000–₪40,000/month revenue (≈ $2,500–$11,000/month at ≈₪3.6/$1).
- Against ≈$570–620/month infra cost (excl. Nakdan) at that tier, **infra CAC ratio is comfortable** even at the low end of the conversion range — infra is not a viable objection to launching a paid tier. The actual CAC risk is acquisition channel cost (therapist/clinic referral, marketing) and the admin-approval bottleneck capping self-serve signup velocity, neither of which this cost model captures.

---

## Summary of Findings

| ID | Finding | Severity | Impact | Root cause | Recommended solution | Complexity | Owner sub-agent |
|---|---|---|---|---|---|---|---|
| B-01 | Single Firebase project, no staging | High | Bad schema/rules change hits production directly | `deploy.yml` targets one project | Second `co-board-staging` project + preview channels | M | DevOps/Architect |
| B-02 | No billing/subscription system | Critical | No path to first paying customer | Never built (pre-revenue prototype) | Minimal Stripe/Paddle integration + family billing entity (Part 20) | L | Architect + Analyst |
| B-03 | Manual admin approval bottleneck | High | Doesn't scale past ~10-15 accounts; blocks self-serve growth | `functions/src/approveUser.ts` requires human admin action per signup | Approval dashboard, or auto-approve + async fraud/abuse monitoring | M | Architect |
| B-04 | No DPIA / compliance docs | High | Blocks any institutional/HMO conversation; legal exposure re: minors' data | Compliance work never started | DPIA using Part 8 template, privacy policy, רישום מאגר מידע filing | L | Security Sentinel |
| B-05 | CellEditor.tsx (688) / BuilderView.tsx (623) size | Medium | Maintainability, onboarding friction, stale-closure risk | Deliberately deferred (HANDOFF §2.5) | Extract sub-components/hooks per HANDOFF precedent on App.tsx | M | deep-reasoning agent |
| B-06 | No i18n framework, hardcoded Hebrew | High | Blocks Arabic/English expansion (Part 26), no English admin/therapist UI | Never built | Introduce i18next/react-intl, extract strings incrementally | L | Architect + Analyst |
| B-07 | Custom navigation stack, no router | Low | Will need replacing before deep-linking/institutional multi-view flows | Adequate at current size, chosen deliberately | Migrate to a router when Part 18/20 flows demand deep links | M | Architect |
| B-08 | LWW sync data loss on concurrent edit | High | Therapist+parent concurrent edits silently drop one side's change | Entity-level LWW merge (`syncEngine.ts`), ADR-0004 unimplemented | Implement ADR-0004 per-field merge | L | Architect |
| B-09 | `versions` store only captures conflict-losers | Medium | No true revision history for solo/no-conflict editing | Designed for conflict recovery only, not general history | Fire `saveVersion` on every save, not just conflicts | M | Analyst |
| B-10 | No `navigator.storage.persist()` call | High | Low-end Android devices can silently evict IndexedDB → total board loss | Never requested | Call `navigator.storage.persist()` at onboarding | S | Analyst |
| B-11 | Sync is opt-in; device loss = total data loss | Critical | AAC-specific: child can permanently lose their voice | Product default, not a bug | Make sync default-on or hard-nag onboarding | M | Architect + UX Auditor |
| B-12 | Firestore PITR status unverified | High | Unknown recovery posture for cloud data | No console access from this audit | Verify + enable PITR in GCP console | S | DevOps |
| B-13 | No Storage bucket versioning/backup | Medium | Media loss on accidental delete/corruption | Never configured | Enable bucket versioning + lifecycle rule | S | DevOps |
| B-14 | No production observability | High | Blind to errors, latency, cost spikes in production | Deliberately deferred pending privacy decision | GlitchTip/Sentry-EU with PII scrubbing + Cloud Monitoring dashboards | M | Analyst + Security Sentinel |
| B-15 | No staging env / preview channels | High | (Same as B-01, DevOps-specific angle) | See B-01 | See B-01 | M | DevOps |
| B-16 | No rollback runbook / release tagging | Medium | Slow, ad-hoc recovery from bad deploy | Never documented | Tag releases, document `firebase hosting:rollback` steps | S | DevOps |
| B-17 | No feature-flag mechanism | Low | Can't gradually roll out risky changes | Never built | Firestore-doc-based flag config, read at boot | S | DevOps |
| B-18 | Nakdan licensing unresolved | High | Unknown cost + legal risk; nikud quality degrades without it | Vendor negotiation never completed (ADR-0005) | Contact Dicta, resolve license + pricing before Closed Beta scale-up | M | Architect (product-owner decision) |
| B-19 | E2E media encryption blocks server-side content moderation | Medium | Future NSFW/moderation filter (Part 21) cannot inspect encrypted blobs server-side | Encryption-by-design (privacy-positive) conflicts with future moderation need | Client-side pre-upload moderation pass, or moderate-then-encrypt pipeline | M | Architect (forward-looking, Part 21 scope) |
| B-20 | No trash/undelete UI | Medium | Archived data invisible/unrecoverable to end users despite existing in DB | Data model supports it, UI never built | Add trash view with restore action | S–M | Analyst |
| B-21 | ARASAAC/Nakdan external SPOFs (TTS has fallback, these don't) | Medium | Symbol/nikud quality degrades on provider outage for new content | Third-party dependency, no fallback provider | Document as accepted risk; consider a secondary symbol source for Phase 5+ | M | Architect |
| B-22 | Waived axe findings block WCAG 2.2 AA claim | Medium | Blocks institutional (HMO/MoE) procurement requiring accessibility compliance | `--cl-primary` contrast, `BoardView` grid ARIA — both explicitly waived in tests | Fix contrast token; restructure grid ARIA (`role="row"` wrapping) | M | UX Auditor |
| B-23 | No App Check on `ttsProxy`/`aiBoard` | Medium | Leaked/replayed token can still incur real TTS/Gemini cost within rate limits | reCAPTCHA Enterprise not enabled pending product-owner cost/UX decision | Enable App Check before crossing ~1,000 users | M | Security Sentinel |
| B-24 | `deploy.yml` gate uses `npm test`, not `npm run test:coverage` (CI uses coverage) | Low | Minor CI/CD inconsistency; not currently risky but a drift signal | Likely copy-paste divergence between workflows | Align both workflows on the same test command | S | DevOps |

---

*End of Stage B audit. Inputs for Stage C (UX/a11y/platforms) and Stage D (privacy/security/family model) are the same findings above, particularly B-04, B-11, B-18, B-19, B-22.*
