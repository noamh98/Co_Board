# CHANGELOG — היסטוריית מיילסטונים

## חלק 5 — שדרוג UI/UX + רספונסיביות מלאה — 2026-06-24

### 5A — App-wide Responsiveness
- **`app/src/index.css`** — שכתוב מלא: design tokens (צבעים/ריווח/טיפוגרפיה/רדיוס/צל) כ-CSS custom properties; dark mode אוטומטי (`prefers-color-scheme`) + ידני (`.dark-mode` על `<html>`); `100dvh` (לא `100vh`); `env(safe-area-inset-*)` לכל הכיוונים; fluid typography עם `clamp()`; breakpoints phone<600/tablet 600–1024/desktop>1024; AdultBar גלילה אופקית + icon-only בטלפון; SentenceBar wrap בצר; modal bottom-sheet עם `safe-area-inset-bottom` בטלפון; WCAG 2.1 AA (focus-visible, min-height 44–48px, `prefers-reduced-motion`).
- **`app/index.html`** — כבר היה עם `viewport-fit=cover` ✓ (לא שונה).

### 5B — Settings Panel Redesign + Dark Mode
- **`presentation/ui/Toggle.tsx`** (חדש) — מתג iOS-style: role="switch", aria-checked, visually-hidden input, CSS track+thumb עם transition. RTL: physical `left` property.
- **`presentation/ui/Slider.tsx`** (חדש) — slider עם תצוגת ערך; aria-valuemin/max/now/text; format prop.
- **`presentation/ui/Button.tsx`** (חדש) — כפתור עם variants (primary/secondary/ghost/danger) + sizes (sm/md/lg) + icon slot. WCAG 2.1 AA.
- **`presentation/ui/Modal.tsx`** (חדש) — מודאל רספונסיבי: desktop=מרכז, phone=bottom-sheet. role="dialog", aria-modal, overlay click close. RTL.
- **`presentation/settings/AccessSettingsPanel.tsx`** — שכתוב מלא: משתמש ב-Modal/Toggle/Slider; סקשנים עם אייקונים (⚡ גישה מוטורית / 🔊 קול ודיבור / 🌙 תצוגה / 🔒 פרטיות / 🎨 פיצ'רלד); PrivacyToggle + MediaPrivacyPanel + LoginPanel ממוזגים לסקשן פרטיות (props אופציונליים); `settings-section__header/body` CSS classes.
- **`data/settingsRepo.ts`** — הוספו standalone exports: `getDarkMode(): Promise<boolean>`, `setDarkMode(enabled): Promise<void>` (KEY_DARK_MODE, ברירת מחדל false — מקומי ללא DB_VERSION bump).
- **`App.tsx`** — `darkMode` state + `useEffect` (מחיל/מסיר `.dark-mode` על `document.documentElement`) + `onDarkModeChange` handler + props חדשים ל-AccessSettingsPanel; הסרת render נפרד של PrivacyToggle/MediaPrivacyPanel/LoginPanel מ-settingsOpen block.
- **`presentation/components/AdultBar.tsx`** — כפתורים עם `adultbar__btn-icon` (aria-hidden) + `adultbar__btn-text`; הגדרות עם class `adultbar__btn--settings` + אייקון ⚙; ממשק `Btn` פנימי לשימוש חוזר. CSS מסתיר text בטלפון, DOM נשאר — בדיקות לא מושפעות.
- **`presentation/components/NavBar.tsx`** — icon spans (navbar__btn-icon/text) + aria-label נשמר.

### בדיקות (חלק 5)
- 9 בדיקות שנכשלו קיימות (blob.text JSDOM, pre-existing) — לא נגרמו ע"י שינויים אלה.
- 311 בדיקות עוברות — אפס נסיגה.

## חלק 3 — תמונות אישיות + פרטיות (FR-005/006) — 2026-06-24

### 3A — תשתית אחסון מדיה
- **`data/db.ts`** — DB_VERSION 9→10; store `media` (keyPath: 'id', index by-profile). מיגרציה אדיטיבית.
- **`data/mediaRepo.ts`** (חדש) — `MediaEntry` (id/cellId/profileId/mimeType/blob/encrypted/source/createdAt/syncedAt/downloadUrl/archived); CRUD: saveMedia/getMedia/listByProfile/deleteMedia (=archived flag, לא הסרה — אינווריאנט).

### 3B — הצפנה client-side
- **`services/sync/crypto.ts`** — נוספו: `deriveMediaKey(uid,salt)` PBKDF2 100k iterations; `encryptBlob(blob,uid)→Blob` פורמט [salt(16)+iv(12)+ciphertext]; `decryptBlob(encrypted,uid,mimeType)→Blob|null`. מפתח לא עולה לענן לעולם.

### 3C — Storage provider
- **`services/sync/storageProvider.ts`** (חדש) — `StorageProvider` interface (upload/download/delete/isAvailable); `LocalStubStorageProvider` לבדיקות (Map בזיכרון); `FirebaseStorageProvider` (firebase/storage SDK; path: `profiles/{profileId}/media/{mediaId}`).
- **`services/sync/mediaSync.ts`** (חדש) — `uploadMedia(uid,entry,storageProvider,repo)`: encrypt→upload→עדכון syncedAt+downloadUrl; `downloadMedia(uid,profileId,mediaId,mimeType,…)`: download→decrypt→שמירה מקומית; `deleteMediaFromStorage`: מוחק מ-Storage בלבד.

### 3D — Firebase Storage rules
- **`firebase/storage.rules`** (חדש) — read/write ל-`profiles/{profileId}/media/{mediaId}` רק ל-uids עם גישה לפרופיל; גודל ≤ 10MB; contentType='application/octet-stream' בלבד. תמיכה עתידית ב-`children/{childId}` (childAccess check).

### 3E — UI פרטיות
- **`presentation/settings/MediaPrivacyPanel.tsx`** (חדש) — Toggle "סנכרן תמונות לענן" (syncPhotos); הסבר הצפנה; כפתור "מחק תמונות מהענן". RTL מלא, WCAG 2.1 AA. מוצג בהגדרות כש-settingsOpen.
- **`data/settingsRepo.ts`** — `getSyncPhotos()/setSyncPhotos()` (ברירת מחדל: false).

### 3F — חיבור CellEditor + App.tsx
- **`presentation/builder/CellEditor.tsx`** — `MediaSyncConfig` interface + prop; blobRef שומר blob מעובד; `handleImageFile` מעביר source (camera/gallery); handleSave → שמירה ב-mediaRepo + uploadMedia ברקע אם syncPhotos && authUserId.
- **`presentation/builder/BuilderView.tsx`** — עובר mediaSyncConfig ל-CellEditor.
- **`App.tsx`** — syncPhotos state (נטען מ-settingsRepo); mediaSyncConfig מועבר ל-BuilderView; MediaPrivacyPanel בהגדרות; onDeletePhotosFromCloud.

### בדיקות (חלק 3)
- **`data/mediaRepo.test.ts`** — 14 בדיקות: CRUD, listByProfile (סינון/הפרדה), deleteMedia (archived flag), source types.
- **`services/sync/storageProvider.test.ts`** — 7 בדיקות: LocalStubStorageProvider (upload/download/delete/error cases).
- **`services/sync/mediaSync.test.ts`** — 7 בדיקות: uploadMedia (URL, syncedAt, הצפנה), downloadMedia (decrypt, null on fail), deleteMediaFromStorage, אינווריאנט offline-first.
- **`data/migration.test.ts`** — +2 בדיקות: מיגרציה v9→v10 (store media, אינדקס by-profile, נתונים קיימים שורדים).
- **סה"כ:** ≥308 tests.

> ההיסטוריה המלאה הוצאה מ-`HANDOFF.md` (פרוטוקול handoff: שומרים את HANDOFF רזה,
> פירוט עמוק כאן). 3–5 השינויים האחרונים נשארים ב-`HANDOFF.md §Session changelog`.
> לכל מיילסטון יש גם מסמך פירוט ב-`docs/m*.md`.

## חלק 2 — תשתית חשבונות + פורטל מבוגר↔ילד — 2026-06-24

### 2A — התחברות + הרשמה + אישור אדמין (FR-022/Auth)
- **`services/sync/authService.ts`** — `AuthUser` ← שדות חדשים: `emailVerified`, `displayName`, `status`, `claims`; `setAuthUser(user)` + `mergeAuthFields(fields)` — מאפשרים עדכון Auth state ממקורות חיצוניים (Firebase listener).
- **`services/sync/firebaseAuth.ts`** (חדש) — מודול Firebase-specific: `signInWithGoogle` (popup+redirect fallback) · `sendVerificationEmail` · `isEmailVerified` · `getUserStatus` · `createUserRecord` · `getPendingUsers` · `setUserStatusViaFunction` (קריאה ל-Cloud Function) · `getAdminClaim` · `onFirebaseAuthChange` · `signOutFirebase`.
- **`services/sync/firebaseProvider.ts`** — `signInWithGoogle()` wrapper נוחות.
- **`presentation/auth/LoginPanel.tsx`** — עדכון API: `onGoToRegister` במקום `onSignUp`; כפתורי Google + הרשמה.
- **`presentation/auth/RegisterPanel.tsx`** (חדש) — שם + אימייל + סיסמה + אימות סיסמה; כפתור Google; HTML validation.
- **`presentation/auth/PendingApprovalScreen.tsx`** (חדש) — מסך "ממתין לאישור"; כפתור שליחת מייל אימות מחדש.
- **`presentation/auth/RejectedScreen.tsx`** (חדש) — מסך "בקשה נדחתה" עם קישור לתמיכה.
- **`presentation/auth/AdminApprovalPanel.tsx`** (חדש) — רשימת pending users; אישור/דחייה ע"י Cloud Function; מוגן בclaims.admin.
- **`presentation/components/AdultBar.tsx`** — `onOpenPortal` + `onOpenAdmin` props; כפתורי "ילדים" + "אדמין".
- **`App.tsx`** — Firebase auth listener (`onFirebaseAuthChange`); handlers: `onGoogleSignIn`, `onRegister`; screens: `PendingApprovalScreen`, `RejectedScreen`, `AdminApprovalPanel`, `ChildrenDashboard`; state: `showRegister`, `adminPanelOpen`, `portalOpen`.
- **`docs/firestore.rules`** — שכבות: `isApproved()` (emailVerified + approved claim) שומר על תוכן; users/{uid} — create=pending בלבד; children/{childId}; childAccess; shareInvites; admin list.
- **`functions/src/approveUser.ts`** (חדש) — Cloud Function `onCall`: בודק admin claim → `setCustomUserClaims({approved})` + עדכון Firestore status.
- **בדיקות:** `auth2.test.ts` +7 tests; `LoginPanel.test.tsx` עדכון. **308 tests סה"כ.**

### 2B — פורטל משתמשים + קשר מבוגר↔ילד (FR-001/027/031)
- **`domain/models.ts`** — `ProfilePreferences` interface חדש (`preferredGridSize`, `defaultVoice`, `visualLoadLevel`, `activeWordIds`); `Profile` ← `preferences?: ProfilePreferences` + `childId?: string`.
- **`data/childRepo.ts`** (חדש) — Firestore CRUD: `ChildRecord` (users/{uid}/children/{childId}) · `ChildAccessEntry` (childAccess/{childId}/members/{uid}) · `ShareInvite` (shareInvites/{code}); פונקציות: `createChild`, `getChild`, `saveChild`, `listChildren`, `archiveChild`, `grantChildAccess`, `createShareInvite`, `acceptShareInvite` (TTL 48h).
- **`services/sync/profileSync.ts`** (חדש) — `pushProfile(uid, profile)` → Firestore children/{childId}; `pullProfile(uid, profile)` → מיזוג (local wins); גרציה אופליין.
- **`presentation/portal/ChildrenDashboard.tsx`** (חדש) — רשימת ילדים, הוספת ילד, קבלת גישה.
- **`presentation/portal/ChildCard.tsx`** (חדש) — כרטיסית ילד עם כפתורי הגדרות + שיתוף גישה.
- **`presentation/portal/ChildPreferencesPanel.tsx`** (חדש) — עריכת preferences: גריד + קול + עומס ויזואלי.
- **`presentation/portal/ShareInvitePanel.tsx`** (חדש) — יצירת קוד שיתוף 6 ספרות + העתקה.
- **`presentation/portal/AcceptInviteScreen.tsx`** (חדש) — הזנת קוד שיתוף + אימות + הצטרפות.
- **בדיקות:** `portal.test.ts` +12 tests (models, profileSync, childRepo types). **308 tests סה"כ.**

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

> הערה: M14–M15 דולגו במכוון — Phase 2 עלה ישירות מ-M13→M16 (CI/CD + TTS enhancements). אין תוכן חסר.

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
