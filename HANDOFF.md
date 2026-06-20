# HANDOFF — אפליקציית AAC עברית ("לוח תקשורת")

> מקור-האמת היחיד לפרויקט. קרא אותי בתחילת כל סשן. אל תגזור את המערכת מחדש מהקוד אם מסמך זה מספיק.
> **שלב נוכחי:** M5 (Sync & Cloud) — בוצע. הבא בתור: M6 (Firebase Auth + Firestore Rules + Login UI).

## 1. Purpose
אפליקציית תקשורת תומכת וחליפית (AAC) עברית-ראשונה לילדים עם קשיי תקשורת (דגש אוטיזם), עבור קלינאי תקשורת והורים. המוצר הוא **מערכת לפיתוח שפה** (אוצר ליבה, עקביות מוטורית, מודלינג, הדרגתיות) ולא רק מחולל לוחות. מסחרי, אנדרואיד+Web תחילה ואז iPad.

## 2. Stack (הוכרע ב-M0)
- **Client:** **PWA — React 18 + TypeScript + Vite** (offline-first עם vite-plugin-pwa/Workbox). עטיפה ל-Android בהמשך (Capacitor/TWA); iOS בפאזה 2. (החלופה Flutter נדחתה ל-MVP כדי לקבל מוצר רץ ובדיק מיידית בדפדפן — ראה `docs/adr-0001-stack.md`.)
- **State/Logic:** שכבת domain מופרדת (TS טהור, ניתן-לבדיקה ללא UI).
- **Data:** Offline-first — IndexedDB (ספריית `idb`) כמקור אמת מקומי; Sync Engine לענן (M5).
- **TTS:** היברידי — Web Speech API (קולות he-IL של ה-OS, אופליין) כבסיס; קולות פרימיום מקוונים (Almagu) בהמשך.
- **Nikud:** Nakdan (Dicta) + cache ב-IndexedDB + override ידני. בסיס חינמי כעת; ספק/רישוי סופי — TODO.
- **Symbols:** ARASAAC (בסיס חינמי) → SymbolStix/PCS/Widgit (רישוי) — M3.
- **Test/CI:** Vitest + Testing Library; ESLint (flat); GitHub Actions (lint+test+build כשער חוסם).

## 3. Architecture (layers) — מיפוי לקוד (עודכן M3)
```
Presentation (UI, RTL-first)      → app/src/presentation/ + App.tsx + index.css
        │  React + TypeScript (PWA)   (BoardView · CellButton · SentenceBar · AdultBar · PinGate · NavBar)
        │                             builder/ (BuilderView · CellEditor) — M3
Domain / Logic                    → app/src/domain/   (models · fitzgerald · layout/Motor-Planning · access/RBAC
        │                                              navigationStack · boardLibrary · boardEditor/UndoStack
        │                                              adaptivity · accessSettings) — M4
Services (TTS · Nikud · ...)      → app/src/services/ (tts/ · nikud/ · image/ · access/dwellService) — M4
        │
Data (Offline-first local DB)     → app/src/data/  (db · boardRepo · profileRepo · settingsRepo · symbolRepo · bootstrap)
```
**שכבת Data (M1+M2+M3+M5):** `db.ts` — IndexedDB (idb), DB_VERSION=4, stores: nikud/boards/profiles/settings/symbols/outbox/versions.
`boardRepo`/`profileRepo` — load/save/list, **מחיקה=ארכוב**. `settingsRepo` — פרופיל פעיל + PIN.
`symbolRepo` (M3) — save/get/list/remove סמלים ותקליטות קוליות.
`bootstrap.ts` — `ensureSeeded` (seed ספריית לוחות M2 + פרופיל דמו), `createProfile` (קלון לוח עצמאי),
`loadActiveContext` (מחזיר גם `allBoards` מלא), `switchActiveProfile`. **ניווט:** `domain/navigationStack.ts` —
מחסנית TS טהורה (push/pop/home; מניעת לולאה; בית תמיד בתחתית). **ספריית לוחות M2:** `domain/boardLibrary.ts` —
HOME 4×4, FOOD 4×4, EMOTIONS 3×3, PLAY 4×4. **בקרת גישה:** `domain/access.ts`.
**Builder M3:** `domain/boardEditor.ts` — addCell/removeCell/moveCell/resizeBoard (immutable) + UndoStack<T> (max 50).
`services/image/imageService.ts` — cropImage/removeBackground(fallback)/compressToWebP (Canvas API, offline).
`presentation/builder/BuilderView.tsx` — עריכת גריד, drag-drop RTL, multi-select, undo/redo, preview.
`presentation/builder/CellEditor.tsx` — modal לעריכת תא (label/nikud/fitzgerald/action/image/voice + HiddenToggle M4).
**Adaptivity M4:** `domain/adaptivity.ts` — `toggleCellVisibility`/`hiddenFilter`/`applyCellSize`.
`domain/accessSettings.ts` — `AccessSettings` + `DEFAULT_ACCESS_SETTINGS`. `services/access/dwellService.ts` —
hooks `useDwellActivation`/`useActivateOnRelease`/`useDoubleTapPrevention`. `settingsRepo` —
`getAccessSettings`/`saveAccessSettings` (JSON ב-key `accessSettings`, ללא שינוי DB_VERSION).
`presentation/builder/GridSizePicker.tsx`+`HiddenToggle.tsx`, `presentation/settings/AccessSettingsPanel.tsx`.
זרימה: UI → Domain → Services → Data(local) → (sync) Cloud.

## 4. Non-obvious rules / invariants (עודכן M3)
| כלל | היכן בקוד |
|------|----------|
| מילות ליבה (`isCore`) **לא זזות** ממיקומן (Motor Planning); אזהרה+אישור לפני כל הזזה | `app/src/domain/layout.ts` (`detectPositionViolations`/`applyLayout`) + טסטים `layout.test.ts` |
| Offline-first: תקשורת/ניווט/TTS בסיסי/סמלים **חייבים** לעבוד ללא רשת | `vite.config.ts` (VitePWA) · `services/tts` (קול מקומי) · `services/nikud` (cache) · `data/db.ts` |
| ניקוד: עדיפות ידני>cache>רשת>גלם; ללא תלות ברשת בשימוש חוזר; ידני לעולם לא נדרס | `app/src/services/nikud/nikudService.ts` + `nikudService.test.ts` |
| TTS מעדיף קול מקומי (אופליין); נפילה חיננית אם אין קול עברי | `app/src/services/tts/ttsService.ts` (`pickVoice`/`speak`) |
| נתוני ילדים רגישים: מקומי/פרטי כברירת מחדל; אנליטיקה כבויה | פרופילים/לוחות ב-IndexedDB מקומי בלבד (`data/*Repo.ts`); ענן ב-M5 |
| מחיקת פרופיל/לוח = ארכוב (לא הסרה) — שחזור אפשרי | `data/boardRepo.ts`/`profileRepo.ts` (`archive` → `archived:true`) + `repos.test.ts` |
| מצב ילד נעול כברירת מחדל; מעבר לעריכה רק בקוד מטפל (PIN/RBAC) | `domain/access.ts` + `App.tsx` (mode=`locked`) + `presentation/PinGate.tsx` |
| Sync offline-first: syncEngine לא חוסם UI; offline = no-op שקט (לא alert) | `services/sync/syncEngine.ts` (`runSync` returns early, no throw) |
| ברירת מחדל סנכרון = כבוי; הורה מפעיל מ-PrivacyToggle | `App.tsx` (`syncEnabled=false`) · `presentation/settings/PrivacyToggle.tsx` |
| merge conflict שומר גרסה מפסידה ב-versions store (לא אובדן נתונים) | `services/sync/syncEngine.ts` (`backupRepo.saveVersion(loser)`) |
| FirebaseProvider מוגדר ב-.env.local (gitignored); לא מחוייב hardcoded | `app/.env.local` · `services/sync/firebaseProvider.ts` (`import.meta.env.VITE_*`) |
| Guided Access מלא (FR-019): במצב נעול חוסם ניווט-אחורה (popstate) + beforeunload (PWA לא נועל OS) | `App.tsx` (effect על `mode==='locked'`) |
| הסתרת תא (FR-014) = `hidden` flag, **לא מחיקה**; מוצג בעריכה (opacity 0.4), מסונן במצב ילד | `domain/adaptivity.ts` (`toggleCellVisibility`/`hiddenFilter`) · `BoardView.tsx` · `BuilderView.tsx` |
| גריד דינמי (FR-015) משתמש ב-`applyCellSize`→`resizeBoard`; ViolationError אם ליבה נופלת — UI חוסם | `domain/adaptivity.ts` · `presentation/builder/GridSizePicker.tsx` |
| הגדרות גישה (FR-020) נשמרות offline; dwell=0 ⇒ onClick רגיל עובד; ברירת מחדל = הכל כבוי | `domain/accessSettings.ts` · `services/access/dwellService.ts` · `data/settingsRepo.ts` |
| מיגרציית DB לא הורסת נתונים קיימים (upgrade אדיטיבי) | `data/db.ts` (`upgrade` עם guard) + `migration.test.ts` |
| הקראה כמעט-מיידית: משוב ויזואלי <100ms; תחילת TTS אופליין <300–500ms | `index.css` (`.cell` transition) · `ttsService` (`latencyMs`) |
| RTL מלא בכל מסך | `index.html` (`dir=rtl`) · `App` (`dir=rtl`) · `index.css` |
| שינוי AI/אוטומטי ללוח מכבד עקביות מיקום (אזהרה לפני הזזה) | אותו מנגנון `layout.ts` חל גם על שינוי אוטומטי |
| Builder: moveCell/removeCell זורקים ViolationError ללא allowCoreMove; BuilderView מציג window.confirm | `domain/boardEditor.ts` + `presentation/builder/BuilderView.tsx` |
| UndoStack מגביל ל-50 מצבים; push אחרי undo מוחק redo history | `domain/boardEditor.ts` (UndoStack class) |
| removeBackground — fallback אופליין: מחזיר blob מקורי ללא שגיאה | `services/image/imageService.ts` |
| symbolRepo.mimeType אודיו-recording מאוחסן כ-'image/webp' (TODO: לתקן ל-'audio/webm' ב-M4) | `data/symbolRepo.ts` |

## 5. Data flow (happy path — שימוש יומיומי)
1. פתיחה במצב נעול (Guided Access) → טעינת פרופיל ילד מה-DB המקומי.
2. רינדור לוח הבית (מילות ליבה במיקום קבוע) — `BoardView` לפי `placements`.
3. הילד לוחץ תא → הוספה לשורת המשפט + הקראת מילה (TTS אופליין).
4. ניווט לקטגוריה → בחירת מילה נוספת → עדכון המשפט.
5. לחיצה על "דבר" → הקראת המשפט המלא ברצף.
6. תיעוד שימוש נשמר מקומית (אם מופעל); סנכרון אסינכרוני לענן כשיש רשת.

## 6. If you touch X, be careful with Y
| נגעת ב | סיכון |
|---------|--------|
| `domain/layout.ts` / `placements` / גודל גריד | פגיעה בעקביות מיקום מילות ליבה (Motor Planning) — ודא שטסטים עוברים |
| `services/tts` | רגרסיה באופליין; חביון; בחירת קול לא-עברי |
| `services/nikud` | דריסת override ידני; תלות ברשת בשימוש חוזר |
| שכבת Sync (M5) | התנגשות רב-מכשירית; דריסת נתוני שימוש; אובדן גרסאות |
| הרשאות / מצב נעול | חשיפת עריכה לילד; דליפת פרטיות |
| ספריות סמלים | רישוי (SymbolStix/PCS/Widgit) — ודא זכאות בחבילה |

## 7. Docs
| קובץ | מתי לקרוא |
|------|-----------|
| `PRD/PRD-he.md` | מקור-האמת המלא למוצר (12 סעיפים) — קרא תחילה |
| `PRD/PRD-en.md` | גרסה אנגלית מקבילה |
| `EXECUTION-PROMPT.md` | פרומפט הבנייה (תהליך, תתי-סוכנים, בדיקות, תיעוד) |
| `app/README.md` | איך להריץ את ה-PWA (install/dev/test/build) + מבנה |
| `docs/adr-0001-stack.md` | החלטת ה-stack (PWA React/TS) — נימוק וחלופות |
| `docs/m0-tts-nikud-spike.md` | ספייק TTS+ניקוד: ארכיטקטורה, אופליין, סיכונים פתוחים |
| `docs/m1-data-profiles.md` | M1: שכבת Data, מאגרים, פרופילים, מיגרציה, מצב נעול/PIN |
| `docs/m4-adaptivity-access.md` | M4: הסתרה הדרגתית, גריד דינמי, Guided Access, הגדרות גישה מוטוריות |
| `docs/verification.md` | סטטוס אימות: למה לא ניתן להריץ npm בסנדבוקס; אימות דרך CI |
| `*.docx` (שורש) | 4 מסמכי המחקר המקוריים |

## 8. Changelog (עדכון M6 — 2026-06-20)
- **2026-06-20 (M6 — Firebase Auth + Firestore Rules + Login UI)** — **FR-022/Auth** (PRD §4.8).
  **Firestore Rules:** `docs/firestore.rules` — `users/{uid}/{document=**}` read/write רק לבעל uid; פריסה ידנית ב-Firebase Console.
  **SyncProvider interface:** נוסף `signUp(email, password): Promise<string>` + LocalStubProvider + FirebaseProvider (uses `createUserWithEmailAndPassword`).
  **Auth Service:** `services/sync/authService.ts` — signIn/signUp/signOut/getCurrentUser/onAuthChange (module-level state, _resetForTests). 6 בדיקות.
  **Login UI:** `presentation/auth/LoginPanel.tsx` — email+password, translateError→עברית, RTL, 5 בדיקות.
  **App.tsx:** `authUser: AuthUser | null` state; `syncEnabledRef` לסנכרון ref/state; useEffect על `[syncEnabled, authUser?.uid]` מחליף provider (FirebaseProvider רק כש-syncEnabled&&authUser, אחרת LocalStubProvider — Privacy invariant); AdultBar מקבל `onSignOut`; header badge uid.
  **Security invariants (נאמתו):** uid-check לפני כל Firestore call; FirebaseProvider לא נוצר כש-syncEnabled=false; translateError→עברית; offline→status='offline'; signOut→LocalStubProvider.
  **CI:** lint 0 errors, 140 tests (+11), build ירוק. `docs/m6-auth.md`.
  **תיקון baseline:** `syncQueue.ts` peek מיין לפי `updatedAt` (לא `enqueuedAt`) — הטסט היה צודק.
  **הבא (M7):** Analytics/Logging — **ממתין לאישור**.

## 8. Changelog (עדכון M5 — 2026-06-20)
- **2026-06-20 (M5 — Sync & Cloud)** — **FR-022, FR-023** (PRD §4.8).
  **Architecture:** `docs/adr-0002-sync.md` — `SyncProvider` interface backend-אגנוסטי; Firebase כספק ברירת מחדל; `LocalStubProvider` לבדיקות offline. `firebase` SDK הותקן.
  **Domain:** `domain/sync.ts` — `Versioned<T>`, `mergeLastWriteWins` (אחרון מנצח, tie-break דטרמיניסטי), `isRemoteNewer`, `toVersioned`, `bumpVersion`. 10 בדיקות.
  **Data:** `db.ts` DB_VERSION=4 — stores `outbox` + `versions` (אדיטיבי, לא שובר v3). `data/syncQueue.ts` — enqueue/peek/ack/ackAll/count/clear. `data/backupRepo.ts` — exportBackup/importBackup (JSON round-trip), saveVersion/listVersions/restoreVersion. 11 בדיקות.
  **Services:** `services/sync/syncProvider.ts` — `SyncProvider` interface + `LocalStubProvider` (in-memory). `services/sync/firebaseProvider.ts` — `FirebaseProvider` (Firestore push/pull, Auth). `services/sync/syncEngine.ts` — `createSyncEngine` (pull→merge→push, debounce 3s, offline=no-op שקט, status listener). `services/sync/crypto.ts` — `encryptData`/`decryptData` (AES-GCM, Web Crypto, fallback בטוח). 8 בדיקות.
  **Presentation:** `SyncStatus.tsx` — מחוון סטטוס (idle/syncing/error/offline/disabled). `BackupPanel.tsx` — ייצוא/ייבוא JSON + שחזור גרסה. `PrivacyToggle.tsx` — ברירת מחדל מקומי, הורה שולט. `AdultBar` — כפתור "גיבוי וסנכרון". `App.tsx` — syncEngine ברקע (לא חוסם), backupOpen state.
  **CI:** lint 0 errors, 129 tests (+30), build ירוק. `docs/adr-0002-sync.md` + `docs/m5-sync-cloud.md`.
  **הבא (M6):** Firebase Auth UI (login screen), Firestore Security Rules, החלפת LocalStubProvider ב-FirebaseProvider בייצור, FirebaseProvider.signIn → App.tsx.

## 8. Changelog (עדכון M4 — 2026-06-20)
- **2026-06-20 (M4 — Adaptivity & Access)** — **FR-014, FR-015, FR-019, FR-020** (PRD §4.7).
  **Domain:** `domain/adaptivity.ts` — `toggleCellVisibility`/`hiddenFilter`/`applyCellSize` (טהור, immutable;
  hidden=הסתרה לא מחיקה, ליבה ניתנת להסתרה; `applyCellSize` עוטף `resizeBoard` עם ViolationError). 8 בדיקות.
  `domain/accessSettings.ts` — טיפוסי `AccessSettings` + `DEFAULT_ACCESS_SETTINGS` (הכל כבוי).
  **Data:** `settingsRepo` — `getAccessSettings`/`saveAccessSettings` (JSON ב-key `accessSettings`,
  **ללא שינוי DB_VERSION** — upgrade אדיטיבי; merge עם ברירת מחדל). 3 בדיקות.
  **Services:** `services/access/dwellService.ts` — `useDwellActivation` (dwell, cleanup ב-unmount, 0=כבוי),
  `useActivateOnRelease`, `useDoubleTapPrevention` (חלון 800ms). 7 בדיקות (fake timers).
  **Presentation:** `GridSizePicker` (2–8, אזהרה+חסימה אם ליבה נופלת), `HiddenToggle` (ב-CellEditor),
  `AccessSettingsPanel` (slider+checkboxes, controlled), `CellButton` מרכיב 3 hooks (settings prop אופציונלי),
  `BoardView` מעביר accessSettings, `BuilderView` opacity 0.4 לתאים hidden + `handleResize`,
  `AdultBar` כפתור "הגדרות", `App.tsx` Guided Access (FR-019: חסימת popstate+beforeunload במצב נעול) +
  טעינה/שמירה של accessSettings. **CI:** lint 0 errors, 99 tests עוברות (+18), build ירוק.
  פרטים: `docs/m4-adaptivity-access.md`.

- **2026-06-20 (M3 — Builder & Symbols)** — **FR-003–007, FR-011, FR-017, FR-018**.
  **Domain:** `domain/boardEditor.ts` — `addCell`/`removeCell`/`moveCell`/`resizeBoard` (immutable, ViolationError על הזזת ליבה ללא allowCoreMove);
  `UndoStack<T>` (max 50, pointer-based, push-after-undo מוחק redo). 19 בדיקות ב-`boardEditor.test.ts`.
  **Data:** `db.ts` DB_VERSION=3 + store `symbols` (keyPath: id); `symbolRepo.ts` — save/get/list/remove;
  `migration.test.ts` — בדיקת v1→v2→v3 אדיטיבית (2 tests). **Services:** `services/image/imageService.ts` —
  `cropImage` (Canvas API, offline), `removeBackground` (fallback — מחזיר blob מקורי), `compressToWebP` (WebP quality 0.85, fallback לoriginal);
  9 בדיקות עם mock canvas. **Presentation:** `presentation/builder/CellEditor.tsx` — modal עריכת תא
  (label/ניקוד auto+override/fitzgerald/action/תמונה+camera/הקלטת קול MediaRecorder→symbolRepo);
  `presentation/builder/BuilderView.tsx` — גריד עריכה drag-drop RTL-aware, multi-select+bulk Fitzgerald/מחיקה,
  Undo/Redo (Ctrl+Z/Y), תצוגה מקדימה (preview mode). `AdultBar.tsx` — כפתור "ערוך לוח" (onEditBoard prop).
  `App.tsx` — `builderMode` state, BuilderView מחליף BoardView במצב עריכה.
  **CI:** lint 0 errors, 81 tests עוברות, build ירוק. פרטים: `docs/m3-builder-symbols.md`.

- **2026-06-19 (M2 — Communication Core)** — **ניווט בין לוחות** (FR-013): `domain/navigationStack.ts` —
  מחסנית TS טהורה (`createNavStack`/`navPush`/`navPop`/`navHome`/`navCurrent`/`navCanGoBack`); מניעת לולאה ישירה;
  בית תמיד בתחתית; 8 בדיקות יחידה. **ספריית לוחות מוכנים** (FR-002): `domain/boardLibrary.ts` — 4 לוחות עבריים
  (HOME 4×4, FOOD 4×4, EMOTIONS 3×3, PLAY 4×4), מילות ליבה במיקום קבוע, תאי ניווט (`navigate`) מלוח הבית לקטגוריות.
  **`data/bootstrap.ts`**: `ensureSeeded` זורע ספריית לוחות מלאה + idempotent upgrade למשתמשי M1; `loadActiveContext`
  מחזיר `allBoards` מלא; `createProfile` מקלון מלוח הבית הנוכחי. **`App.tsx`**: מחסנית ניווט כ-state, טיפול
  ב-`navigate`/`back`/`home`/`deleteWord`/`clear` ב-`onCell` (back לא מוסיף לשורת המשפט — מניעת באג TouchChat);
  NikudService מחובר לרקע (לא חוסם TTS); NavBar קבוע (בית+חזור, disabled בבית). **`NavBar.tsx`**: כפתורים קבועים
  במיקום גאומטרי קבוע (PRD §4.4). **בדיקות**: 8 בדיקות ניווט חדשות ב-App.test.tsx. lint/test/build ירוקים.
  פרטים: `docs/m2-communication-core.md` (TODO לאחר CI).
- **2026-06-19 (M1 — Data & Profiles)** — שכבת Data הורחבה: `DB_VERSION 2` עם stores
  `boards`/`profiles`/`settings` לצד `nikud`; **upgrade אדיטיבי** שאינו הורס נתוני v1 (נבדק
  `migration.test.ts`). מאגרים: `boardRepo`/`profileRepo`/`settingsRepo` (load/save/list);
  **מחיקה=ארכוב** (FR-022). ריבוי פרופילי ילד (FR-001): `bootstrap.ts` — `ensureSeeded` (seed מ-SAMPLE),
  `createProfile` (קלון לוח-בית עצמאי, עקביות מיקום נשמרת), `loadActiveContext`/`switchActiveProfile`.
  **מצב נעול/RBAC** (FR-019/FR-027): `domain/access.ts` (`verifyPin`/`canEdit`/`canManageProfiles`),
  `App.tsx` נטען מה-DB (לא מהקבוע), נעול כברירת מחדל, מעבר למצב מבוגר בקוד מטפל (PIN, MVP) דרך
  `PinGate`/`AdultBar`. baseline M0 תוקן לירוק (lint). בדיקות: 35 עוברות (unit מאגרים+מיגרציה+access,
  integration מעבר-פרופיל+נעילה עם fake-indexeddb). lint/test/build ירוקים. פרטים: `docs/m1-data-profiles.md`.
- **2026-06-19 (M0)** — הוכרע stack: **PWA React+TS+Vite** (במקום Flutter ל-MVP; ADR-0001). נבנה scaffold תחת `app/` במבנה 4-שכבתי. אינווריאנט **Motor Planning** מומש ונבדק (`domain/layout.ts`). ספייקים: **TTS עברי** (Web Speech API, העדפת קול מקומי/אופליין, חביון) ו**ניקוד** (Nakdan+cache IndexedDB+override ידני, נפילה אופליין) — שניהם עם טסטים. מעטפת RTL מלאה + פרוסה אנכית (לחיצת תא→שורת משפט→הקראה). CI (GitHub Actions: lint+test+build). **הערה:** אימות `npm install/test/build` לא רץ בסנדבוקס (תקרת 45ש' לפקודה) — מאומת ע"י CI בדחיפה. ראה `docs/verification.md`.
- **2026-06-19** — הקמת repo; איחוד 4 מסמכי מחקר ל-PRD דו-לשוני (`PRD-he.md` + `PRD-en.md`, 12 סעיפים). הכרעות: פלטפורמה Android/Web→iPad; חביון הופרד למשוב/הקראה; Modified Fitzgerald כברירת מחדל. נוצרו `HANDOFF.md`, `README.md`, `EXECUTION-PROMPT.md`.
