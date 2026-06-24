# CHANGELOG — היסטוריית מיילסטונים

> ההיסטוריה המלאה הוצאה מ-`HANDOFF.md` (פרוטוקול handoff: שומרים את HANDOFF רזה,
> פירוט עמוק כאן). 3–5 השינויים האחרונים נשארים ב-`HANDOFF.md §Session changelog`.
> לכל מיילסטון יש גם מסמך פירוט ב-`docs/m*.md`.

## חלק 1 — גדלי לוח + צבעי Fitzgerald — 2026-06-24

### 1A — גדלי לוח (FR-015)
- **`domain/adaptivity.ts`** — קבועי `GRID_MIN=2`/`GRID_MAX=12`; `estimateCellPx(rows,cols,vpW,vpH)` + `cellSizeStatus(…)→'ok'|'warn'|'block'` (CELL_WARN_PX=57/CELL_BLOCK_PX=44).
- **`GridSizePicker.tsx`** — פריסטים (chips) 2×2/3×3/4×4/5×3/5×5/6×6/6×8/8×8 עם `aria-pressed`; טווח חופשי 2–12; אזהרה/חסימה לגודל-מטרה מינ'.
- **`QuickStartWizard.tsx`** — שלב 2 כולל בחירת גודל גריד (פריסטים + selectors), מועברת ל-`createProfileFromTemplate`.
- **`data/bootstrap.ts`** — `createProfileFromTemplate` מקבל `gridOverride?: GridSize`; fallback חיננית ל-ViolationError.
- **טסטים:** `adaptivity.test.ts` +8 tests (estimateCellPx, cellSizeStatus, קבועים). **291 tests סה"כ.**

### 1B — צבעי Fitzgerald קבועים עם חוקיות (PRD §6.3)
- **`domain/models.ts`** — `Fitzgerald` type ← 3 קטגוריות חדשות: `conjunction` (מילות קישור), `adverb` (תארי פועל), `determiner` (מיידעים/כמתים).
- **`domain/fitzgerald.ts`** — `FITZGERALD` map ← 3 ערכים חדשים (צבעים רכים, WCAG AA); הפך ל-`Readonly<Record<…>>`; `categoryForLabel(label)→Fitzgerald|undefined` — מילון 100+ מילים עבריות.
- **`services/obf/obfService.ts`** — `FITZGERALD_COLORS` ← 3 צבעים חדשים (TypeScript אכיפה).
- **`presentation/builder/CellEditor.tsx`** — `categoryForLabel` מוצע אוטומטית לפי label; override ידני נשמר; `aria-pressed` לכפתורי קטגוריה.
- **`presentation/settings/AccessSettingsPanel.tsx`** — legend מקרא צבעי Fitzgerald (מצב מבוגר).
- **`domain/fitzgerald.test.ts`** (חדש) — 40 tests: קיום 11 קטגוריות, WCAG AA ≥ 4.5:1 לכל זוג bg/text, רוויות < 70%, `fitzgeraldStyle`, `categoryForLabel` (32 מילים). **291 tests סה"כ.**

## M22 — TTS היברידי (ADR-0003) — 2026-06-21
Google Cloud TTS Neural2 he-IL + cache IndexedDB.
- **DB:** `db.ts` DB_VERSION 8→9 — store `audioCache` (keyPath: 'cacheKey') אדיטיבי. `data/audioCache.ts` — `buildCacheKey(text,voiceId,rate,pitch)→SHA-256`, `getAudioFromCache/saveAudioToCache/pruneAudioCache(maxEntries=500)`.
- **Provider interface:** `services/tts/ttsProvider.ts` — `TTSProvider` interface + `NullTTSProvider` stub.
- **Google provider:** `services/tts/googleTtsProvider.ts` — `GoogleTtsProvider(apiKey)`, 4 קולות he-IL (Neural2-A/C + Wavenet-A/B); API key ב-header `x-goog-api-key` (לא URL — מניעת חשיפה ב-DevTools).
- **HybridTtsService:** `services/tts/hybridTtsService.ts` — זרימה: 1)cache hit→playBlob 2)online+provider→synthesize+cache+playBlob 3)fallback→HebrewTts.speak(); triple try-catch מבטיח offline fallback תמיד; cancel() מנקה currentAudio + currentObjectUrl + קורא fallback.cancel().
- **TtsLike interface:** `services/tts/ttsService.ts` — נוסף `TtsLike {speak, cancel}`; `speakCell` מקבל `TtsLike | null`; `createHybridTts()` factory.
- **settingsRepo:** `getTtsApiKey/setTtsApiKey/getTtsProvider/setTtsProvider` (ללא DB_VERSION bump).
- **App.tsx:** `ttsRef: useRef<TtsLike | null>`; init effect טוען apiKey ויוצר HybridTtsService (lazy).
- **בדיקות:** `hybridTtsService.test.ts` — 8 tests. **244 tests סה"כ.** precache 163.

## M20.5 — סמלי ניווט (FR-002) — 2026-06-21
תאי ניווט (HOME→FOOD/EMOTIONS/PLAY) מקבלים סמל ARASAAC. `navCell()` ב-`boardLibrary.ts` מצרף `symbolId:'arasaac:{id}'` + `imageUri` דרך `symbolIdFor()`. `SYMBOL_OVERRIDES` ב-`symbolMap.ts`: `'אוכל'→4610`, `'רגשות'→12359`, `'משחק'→9813`.

## M20 — סמל לכל מילה (FR-002/§4.2) — 2026-06-21
כל ~136 המילים הייחודיות קיבלו פיקטוגרמת ARASAAC מקומית.
- **Build script:** `app/scripts/build-symbol-map.mjs` — מפענח `boardLibrary.ts`, שולף id מ-ARASAAC, מוריד `{id}_500.png` ל-`public/symbols/`, מחולל `domain/symbolMap.generated.ts`. idempotent.
- **Map:** `domain/symbolMap.ts` — `GENERATED_SYMBOL_MAP` + `SYMBOL_OVERRIDES`. `symbolIdFor(label)` + `localSymbolPath(id)`.
- **חיבור:** `boardLibrary.word()` מצרף `symbolId`+`imageUri` אוטומטית. iPad = החריג היחיד ללא סמל.
- **Offline-first:** 141 PNG ב-`public/symbols/`; Workbox precache — 148 entries (3.6MB). ללא DB bump.

## M21 — ניקוד מאומת (FR-009/§4.3) — 2026-06-21
אימות שיטתי לניקוד הקיים. ספוט-צ'ק נספח C: הומוגרף `סֵפֶר` תקין. **CI:** 236 tests, precache 148. `docs/m20-symbols-nikud.md`.

## Phase 2 — M16–M19 — 2026-06-21
- **P1 — CI/CD:** `.github/workflows/deploy.yml`: push→main מריץ npm ci + lint + test + build + `firebase deploy --only hosting`. Secrets: `FIREBASE_SERVICE_ACCOUNT` + 6 × `VITE_FIREBASE_*`.
- **M16 — TTS Rate & Pitch (FR-010):** `settingsRepo` — `getTtsRate/setTtsRate/getTtsPitch/setTtsPitch` (ברירת מחדל 1.0). `AccessSettingsPanel`: שני sliders (0.5–2.0). `App.tsx`: `speakOpts()` מחיל rate+pitch+voiceURI. +6 בדיקות (220).
- **M17 — mimeType fix:** `SymbolEntry.mimeType` הורחב; `DB_VERSION` 7→8 — upgrade מתקן recordings ל-`audio/webm`. +2 בדיקות (222).
- **M18 — OBF Import/Export (FR-035):** `services/obf/obfService.ts` — `exportToOBF`/`importFromOBF`. שדות Co_Board ב-`ext_co_board` לround-trip. +6 בדיקות (228).
- **M19 — Word Finder (FR-029):** `services/wordFinder/wordFinderService.ts` — `findPath` (BFS). `WordFinderPanel.tsx`. +4 בדיקות (232).
- **סיכום Phase 2:** 232 tests, DB_VERSION=8.

## M13 — Guided Modeling Mode — 2026-06-21
מצב הדגמה שקט למטפלים. `domain/modelingSession.ts` — `createModelingSession`/`toggleHighlight`/`clearHighlights` (immutable). `BoardView`/`AdultBar` — highlight + כפתור מודלינג. `App.tsx` — `onCell` יוצא מוקדם כש-`modelingActive && mode==='adult'`. **CI:** 202 tests. `docs/m13-modeling.md`.

> הערה: M14–M15 לא תועדו בנפרד (ראה Open questions ב-HANDOFF).

## M12 — Voice Recording Playback — 2026-06-21
`ttsService.speakCell(cell, symbolRepo, tts)` — recording→`Audio.play()`, אחרת→`tts.speak()`. fallback ל-speak ללא קריסה. **CI:** 197 tests. `docs/m12-voice-playback.md`.

## M11 — Cell Image Rendering — 2026-06-21
`CellButton` מרנדר `<img>` אם `cell.imageUri` קיים; `onError`→img נסתר, label נשאר. label תמיד גלוי (AAC invariant). **CI:** 194 tests. `docs/m11-cell-images.md`.

## M10 — Phrase Bank — 2026-06-21
`domain/phraseBank.ts` + `data/phraseRepo.ts` + `PhraseBankPanel.tsx`. DB_VERSION=7 store `phrases`. SentenceBar כפתור "שמור", AdultBar "ביטויים שמורים". **CI:** 190 tests. `docs/m10-phrase-bank.md`.

## M9 — Board Templates & Quick-Start Wizard — 2026-06-21
`domain/boardTemplates.ts` — 4 תבניות (core4x4/pecs6x3/feelings3x3/blank4x4). `bootstrap.createProfileFromTemplate`. `QuickStartWizard.tsx` (3 שלבים). **CI:** 182 tests. `docs/m9-templates.md`.

## M8 — ARASAAC Symbol Search & Offline Cache — 2026-06-21
`services/symbols/arasaacClient.ts` (ללא API key) + `data/symbolCache.ts` + `symbolSearchService.ts` (cache-first). DB_VERSION=6 store `symbolCache`. `SymbolPicker.tsx` (חיפוש עברי debounce). **CI:** 171 tests. `docs/m8-symbols.md`.

## M7 — Usage Analytics & Logging — 2026-06-20
`domain/usageEvent.ts` (ללא PII) + `data/usageRepo.ts` + `analyticsService.ts` (no-op כש-disabled) + `UsageDashboard.tsx`. DB_VERSION=5 store `usage`. opt-in, GDPR clearAllData, auto-cleanup 90 יום. **CI:** 156 tests. `docs/m7-analytics.md`.

## M6 — Firebase Auth + Firestore Rules + Login UI (FR-022) — 2026-06-20
`docs/firestore.rules` (uid-only). `authService.ts` — signIn/signUp/signOut/getCurrentUser/onAuthChange. `LoginPanel.tsx` (שגיאות בעברית). `App.tsx` — `authUser` state; FirebaseProvider רק כש-syncEnabled&&authUser. **CI:** 140 tests. `docs/m6-auth.md`.

## M5 — Sync & Cloud (FR-022, FR-023) — 2026-06-20
`docs/adr-0002-sync.md` — `SyncProvider` אגנוסטי + `LocalStubProvider`. `domain/sync.ts` — `mergeLastWriteWins`. DB_VERSION=4 stores `outbox`+`versions`. `syncQueue`/`backupRepo`/`syncEngine` (debounce 3s, offline=no-op) + `crypto.ts` (AES-GCM). `SyncStatus`/`BackupPanel`/`PrivacyToggle`. **CI:** 129 tests. `docs/m5-sync-cloud.md`.

## M4 — Adaptivity & Access (FR-014/015/019/020) — 2026-06-20
`domain/adaptivity.ts` (toggleCellVisibility/hiddenFilter/applyCellSize) + `accessSettings.ts`. `settingsRepo` accessSettings (ללא DB bump). `dwellService.ts` (3 hooks). `GridSizePicker`/`HiddenToggle`/`AccessSettingsPanel`. Guided Access (חסימת popstate+beforeunload). **CI:** 99 tests. `docs/m4-adaptivity-access.md`.

## M3 — Builder & Symbols (FR-003–007/011/017/018) — 2026-06-20
`domain/boardEditor.ts` — addCell/removeCell/moveCell/resizeBoard (immutable) + `UndoStack<T>` (max 50). DB_VERSION=3 store `symbols` + `symbolRepo.ts`. `services/image/imageService.ts` — crop/removeBackground(fallback)/compressToWebP. `CellEditor.tsx` + `BuilderView.tsx` (drag-drop RTL, multi-select, undo/redo, preview). **CI:** 81 tests. `docs/m3-builder-symbols.md`.

## M2 — Communication Core (FR-013/002) — 2026-06-19
`domain/navigationStack.ts` (מחסנית טהורה, מניעת לולאה, בית בתחתית). `domain/boardLibrary.ts` — 4 לוחות (HOME 4×4, FOOD 4×4, EMOTIONS 3×3, PLAY 4×4). `bootstrap` — ensureSeeded + loadActiveContext + createProfile. `App.tsx` — מחסנית ניווט, NavBar קבוע. 8 בדיקות ניווט.

> הערה: `docs/m2-communication-core.md` סומן TODO ולא נוצר (ראה Open questions ב-HANDOFF).

## M1 — Data & Profiles — 2026-06-19
DB_VERSION 2 — stores `boards`/`profiles`/`settings` (upgrade אדיטיבי). `boardRepo`/`profileRepo`/`settingsRepo`. מחיקה=ארכוב (FR-022). ריבוי פרופילים (FR-001). מצב נעול/RBAC (`domain/access.ts`). 35 בדיקות. `docs/m1-data-profiles.md`.

## M0 — Scaffold & Foundations — 2026-06-19
הוכרע stack: PWA React+TS+Vite (ADR-0001). scaffold 4-שכבתי תחת `app/`. אינווריאנט Motor Planning (`domain/layout.ts`). ספייקים TTS עברי + ניקוד (Nakdan+cache+override). מעטפת RTL מלאה + CI (lint+test+build). הערה: npm לא רץ בסנדבוקס — מאומת ע"י CI. `docs/verification.md`.

## 2026-06-19 — הקמת repo
איחוד 4 מסמכי מחקר ל-PRD דו-לשוני (`PRD-he.md` + `PRD-en.md`, 12 סעיפים). הכרעות: פלטפורמה Android/Web→iPad; Modified Fitzgerald כברירת מחדל. נוצרו `HANDOFF.md`, `README.md`, `EXECUTION-PROMPT.md`.
