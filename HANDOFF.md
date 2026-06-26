# HANDOFF — אפליקציית AAC עברית ("לוח תקשורת")

> מקור-האמת הראשון לכל סשן. קרא אותי תחילה; אל תגזור את המערכת מחדש מהקוד אם המסמך מספיק.
> **שלב נוכחי:** חלקים 1–5 הושלמו ומוזגו ל-main. DB_VERSION=10. design tokens + Dark Mode + auth portal + media sync.
> **הבא בתור:** Firebase deploy (functions + storage.rules + firestore.rules) · הגדרת admin ראשוני · חלק D (תעדוף). היסטוריה מלאה: `docs/CHANGELOG.md`.

## Purpose
אפליקציית תקשורת תומכת וחליפית (AAC) עברית-ראשונה לילדים עם קשיי תקשורת (דגש אוטיזם), לקלינאי תקשורת והורים.
המוצר הוא **מערכת לפיתוח שפה** (אוצר ליבה, עקביות מוטורית, מודלינג, הדרגתיות) — לא רק מחולל לוחות. מסחרי; Android+Web תחילה, iPad בהמשך.

## Architecture overview
PWA — React 18 + TypeScript + Vite, offline-first (vite-plugin-pwa/Workbox), RTL מלא. 4 שכבות (פירוט: `ARCHITECTURE.md`):
- **Presentation** `app/src/presentation/` + `App.tsx` — UI, מצבי ילד/מבוגר, builder.
- **Domain** `app/src/domain/` — models · fitzgerald · layout (Motor Planning) · access (RBAC) · navigationStack · boardLibrary · boardEditor · adaptivity · sync.
- **Services** `app/src/services/` — tts/ (היברידי) · nikud/ (Nakdan+cache) · image/ · symbols/ · sync/ (crypto+storageProvider+mediaSync) · analytics/ · obf/ · wordFinder/.
- **Data** `app/src/data/` — db (IndexedDB, idb, DB_VERSION=10) · *Repo (כולל mediaRepo) · bootstrap (seed/פרופילים).

זרימה: UI → Domain → Services → Data(local) → (sync) Cloud.

## Invariants (אסור להפר — אכיפה בטסטים)
| כלל | היכן |
|------|------|
| מילות ליבה (`isCore`) **לא זזות** (Motor Planning); אזהרה+אישור לפני כל הזזה | `domain/layout.ts` · `domain/boardEditor.ts` · `layout.test.ts` |
| Offline-first: תקשורת/ניווט/TTS בסיסי/סמלים **חייבים** לעבוד ללא רשת | `vite.config.ts` (VitePWA) · `services/tts` · `services/nikud` · `data/db.ts` |
| ניקוד: עדיפות ידני>cache>רשת>גלם; ידני לעולם לא נדרס; ללא תלות ברשת בשימוש חוזר | `services/nikud/nikudService.ts` |
| TTS: cache→online provider→fallback אופליין; תמיד נופל חיננית לקול מקומי | `services/tts/hybridTtsService.ts` · `ttsService.ts` (`speakCell`) |
| נתוני ילדים רגישים: מקומי/פרטי כברירת מחדל; אנליטיקה כבויה; סנכרון כבוי | `data/*Repo.ts` · `App.tsx` (`syncEnabled=false`) · `analyticsService.ts` |
| מחיקת פרופיל/לוח = **ארכוב** (לא הסרה); שחזור אפשרי | `data/boardRepo.ts`/`profileRepo.ts` (`archived:true`) |
| מצב ילד נעול כברירת מחדל; מעבר לעריכה רק בקוד מטפל (PIN/RBAC) | `domain/access.ts` · `App.tsx` · `PinGate.tsx` |
| Guided Access (FR-019): מצב נעול חוסם popstate + beforeunload | `App.tsx` (effect על `mode==='locked'`) |
| הסתרת תא (FR-014) = `hidden` flag, לא מחיקה; מוצג בעריכה, מסונן במצב ילד | `domain/adaptivity.ts` · `BoardView.tsx` |
| label תמיד גלוי (AAC invariant) גם עם תמונה; `onError`→img נסתר, label נשאר | `presentation/components/CellButton.tsx` |
| מיגרציית DB תמיד אדיטיבית — לא הורסת נתונים קיימים | `data/db.ts` (`upgrade` עם guard) · `migration.test.ts` |
| merge conflict שומר גרסה מפסידה ב-`versions` store (לא אובדן נתונים) | `services/sync/syncEngine.ts` |
| RTL + responsive בכל מסך/מכשיר | `index.html` · `App` (`dir=rtl`) · `index.css` (design tokens + breakpoints + 100dvh + safe-area) |
| ביצועים: משוב ויזואלי <100ms; תחילת TTS אופליין <300–500ms | `index.css` · `ttsService` (`latencyMs`) |

## Data flow (happy path — שימוש יומיומי)
1. פתיחה במצב נעול (Guided Access) → טעינת פרופיל ילד מה-DB המקומי.
2. רינדור לוח הבית (מילות ליבה במיקום קבוע) לפי `placements`.
3. הילד לוחץ תא → הוספה לשורת המשפט + הקראת מילה (TTS, cache/אופליין תחילה).
4. ניווט לקטגוריה → בחירת מילה → עדכון המשפט.
5. לחיצה על "דבר" → הקראת המשפט המלא ברצף.
6. תיעוד שימוש נשמר מקומית (אם מופעל); סנכרון אסינכרוני לענן כשיש רשת (אם מופעל).

## Invariants 2A/2B (נוספו)
| כלל | היכן |
|------|------|
| status='approved'/'rejected' — נכתב **רק** ע"י Cloud Function (Admin SDK), לא ע"י client | `functions/src/approveUser.ts` · `docs/firestore.rules` |
| Auth לא כופה sync — syncEnabled=false נשאר ברירת מחדל | `App.tsx` |
| PendingApprovalScreen חוסם תוכן רק כשstatus='pending' AND authUser קיים (לא-מחובר → אפליקציה מקומית רגילה) | `App.tsx` |
| מחיקת ילד = archivedAt (לא הסרה); שחזור אפשרי | `data/childRepo.ts` |
| Profile.preferences/childId — שדות optional; נתוני ילד מקומיים ממשיכים ללא רשת | `domain/models.ts` · `data/profileRepo.ts` |
| Cloud Function approveUser — מצריך הפעלה ידנית של Firebase Admin ראשון | `functions/src/approveUser.ts` + docs |

## Danger zones — אם נגעת ב-X, בדוק Y
| נגעת ב | סיכון / בדוק |
|---------|-------------|
| `domain/layout.ts` · `placements` · גודל גריד | פגיעה בעקביות מיקום ליבה (Motor Planning) — ודא טסטים עוברים |
| `domain/models.ts` (`Fitzgerald` type) | כל מפה `Record<Fitzgerald, …>` חייבת להתעדכן (obfService, FITZGERALD, CATEGORY_MAP) — TypeScript יתפוס |
| `domain/fitzgerald.ts` (`FITZGERALD` map) | הצבעים נעולים-כברירת-מחדל; בדוק ניגודיות WCAG ב-`fitzgerald.test.ts`; אל תוסיף עריכה ידנית ע"י משתמש |
| `domain/adaptivity.ts` (`GRID_MIN`/`GRID_MAX`) | `GridSizePicker` + `QuickStartWizard` תלויים בקבועים אלה |
| `data/bootstrap.ts` (`createProfileFromTemplate`) | gridOverride עם ViolationError — חוזר לגריד ברירת-מחדל (silent); תקשר בUI אם צריך |
| `services/tts` | רגרסיה באופליין; חביון; בחירת קול לא-עברי; חשיפת API key |
| `services/nikud` | דריסת override ידני; תלות ברשת בשימוש חוזר |
| `data/db.ts` (DB_VERSION) | מיגרציה הורסת — חייב upgrade אדיטיבי + `migration.test.ts` |
| שכבת sync | התנגשות רב-מכשירית; דריסת נתוני שימוש; אובדן גרסאות |
| הרשאות / מצב נעול | חשיפת עריכה לילד; דליפת פרטיות |
| ספריות סמלים | רישוי (SymbolStix/PCS/Widgit) — ודא זכאות בחבילה |

## Doc index
| קובץ | מתי לקרוא |
|------|-----------|
| `PRD/PRD-he.md` | מקור-האמת המלא למוצר (12 סעיפים) — קרא תחילה |
| `PRD/PRD-en.md` | גרסה אנגלית מקבילה |
| `ARCHITECTURE.md` | דיאגרמת מודולים, טבלת אחריות, גבולות תקשורת |
| `EXECUTION-PROMPT.md` | פרומפט הבנייה (תהליך, תתי-סוכנים, בדיקות) |
| `app/README.md` | איך להריץ את ה-PWA (install/dev/test/build) |
| `docs/CHANGELOG.md` | היסטוריית כל המיילסטונים (M0–M22) |
| `docs/adr-0001-stack.md` · `adr-0002-sync.md` · `adr-0003-tts.md` | החלטות ארכיטקטורה |
| `docs/m*.md` | פירוט per-milestone (M0–M13, M20) |
| `docs/verification.md` | למה npm לא רץ בסנדבוקס; אימות דרך CI |
| `*.docx` (שורש) | 4 מסמכי המחקר המקוריים |

## Session changelog (אחרונים — מלא ב-`docs/CHANGELOG.md`)
- **2026-06-24 (חלק 5 — UI/UX Responsive Upgrade)** — 5A: `index.css` שוכתב כולו (design tokens CSS vars, dark mode auto+manual .dark-mode, 100dvh, env(safe-area-inset-*), fluid clamp() typography, breakpoints phone<600/tablet 600–1024/desktop>1024, AdultBar scrollable+icon-only-phone, SentenceBar responsive, Modal bottom-sheet on phone, Settings sections). 5B: `presentation/ui/Toggle.tsx` + `Slider.tsx` + `Button.tsx` + `Modal.tsx` (רכיבי UI חדשים, WCAG 2.1 AA); `AccessSettingsPanel.tsx` שוכתב לסקשנים (גישה מוטורית / קול ודיבור / תצוגה / פרטיות / פיצ'רלד); `settingsRepo.ts` (getDarkMode/setDarkMode); `App.tsx` (dark mode state + useEffect על documentElement.classList + onDarkModeChange + PrivacyToggle/MediaPrivacyPanel ממוזגים ל-AccessSettingsPanel); `AdultBar.tsx` + `NavBar.tsx` (icon spans + adultbar__btn--settings).
- **2026-06-24 (חלק 3 — תמונות אישיות + פרטיות)** — `data/mediaRepo.ts` (IndexedDB store 'media', DB_VERSION 9→10); `services/sync/storageProvider.ts` (StorageProvider interface + LocalStub + Firebase); `services/sync/mediaSync.ts` (uploadMedia/downloadMedia/deleteMediaFromStorage); `services/sync/crypto.ts` (deriveMediaKey/encryptBlob/decryptBlob PBKDF2+AES-GCM); `firebase/storage.rules`; `MediaPrivacyPanel.tsx`; `settingsRepo.ts` (syncPhotos); `CellEditor.tsx` + `BuilderView.tsx` (mediaSyncConfig). 308+ tests.
- **2026-06-24 (חלק 2 — חשבונות + פורטל)** — 2A: `authService` (setAuthUser/mergeAuthFields); `firebaseAuth.ts` (Google OAuth, email verification, user status, admin claim, Cloud Function call); `RegisterPanel.tsx` + `PendingApprovalScreen.tsx` + `RejectedScreen.tsx` + `AdminApprovalPanel.tsx`; `firestore.rules` (status/approved gate); `functions/src/approveUser.ts`. 2B: `domain/models.ts` (ProfilePreferences + Profile.preferences/childId); `data/childRepo.ts` (Firestore children/{childId} + childAccess + shareInvites); `services/sync/profileSync.ts` (pushProfile/pullProfile); `presentation/portal/` (ChildrenDashboard, ChildCard, ChildPreferencesPanel, ShareInvitePanel, AcceptInviteScreen). 308 tests.
- **2026-06-24 (חלק 1 — גדלים + Fitzgerald)** — 1A: GridSizePicker (פריסטים 2×2–8×8, טווח 2–12, guard מטרה מינ' 44/57px); `QuickStartWizard` עם בחירת גודל גריד; `adaptivity.ts` (GRID_MIN/MAX, estimateCellPx, cellSizeStatus). 1B: Fitzgerald type ← 3 קטגוריות חדשות (conjunction/adverb/determiner); `FITZGERALD` map + `categoryForLabel`; legend ב-AccessSettingsPanel; הצעה אוטומטית ב-CellEditor. 291 tests.
- **2026-06-21 (M22)** — TTS היברידי (ADR-0003): Google Neural2 he-IL + cache IndexedDB (DB_VERSION 9, store `audioCache`); `hybridTtsService` עם fallback אופליין תמידי. 244 tests.
- **2026-06-21 (M20–M21)** — סמל ARASAAC לכל מילה (~136, מקומי/offline) + סמלי ניווט; ניקוד מאומת. precache 148→163.
- **2026-06-21 (M16–M19)** — TTS rate/pitch · mimeType fix (DB v8) · OBF import/export · Word Finder. CI/CD ל-Firebase Hosting.
- **2026-06-21 (M9–M13)** — Quick-Start Wizard · Phrase Bank · cell images · voice playback · Modeling mode.
- **2026-06-20 (M4–M8)** — Adaptivity/Access · Sync & Cloud · Firebase Auth · Analytics · ARASAAC search.

## תיקוני באג — 2026-06-26 (QA פאזה I)

### באג 1 — חיזוי מילים (Word Prediction) לא הוצג
- **שורש**: `predictNext` על מודל ריק (משתמש חדש ללא היסטוריה) מחזיר `[]`. `PredictionBar` מחזיר null כשאין הצעות. → המשתמש רואה תמיד רצועה ריקה.
- **תיקון**: `App.tsx` lines 581–592 — כשהמודל ריק ומחזיר `[]`, נפילה ל-`candidates.slice(0, 5)` (התאים הגלויים בלוח הנוכחי). כך משתמש חדש רואה הצעות מיד.
- **קבצים**: `app/src/App.tsx` (prediction useEffect)

### באג 2 — סריקת שורות-עמודות: אין בקרת UI ולא הועבר ל-hook
- **שורש**: `useScanning.ts` hardcode `mode: 'linear'` תמיד. `accessSettings.scanMode` קיים בסכמה אבל לא הועבר. `AccessSettingsPanel` לא הציג כלל בחירת מצב סריקה.
- **תיקון** (3 קבצים):
  1. `useScanning.ts` — הוספת `mode?: ScanMode` + `gridCols?: number` ל-`UseScanningOpts`; שינוי config לפי mode; שינוי return ל-`highlightedIndices: number[]` (תומך הדגשת שורה שלמה ב-row-column).
  2. `App.tsx` — העברת `mode: accessSettings.scanMode`, `gridCols: currentBoard?.grid?.cols ?? 1`; שימוש ב-`scanIndices` במקום `scanIndex`.
  3. `BoardView.tsx` — `scanIndex?: number | null` → `scanIndices?: number[]`; highlight check: `scanIndices?.includes(i)`.
  4. `AccessSettingsPanel.tsx` — `<select>` לבחירת מצב סריקה (לינארי / שורות-עמודות), מוצג כשסריקה פעילה.
- **קבצים**: `app/src/services/access/useScanning.ts`, `app/src/App.tsx`, `app/src/presentation/components/BoardView.tsx`, `app/src/presentation/settings/AccessSettingsPanel.tsx`

### באג 3 — ~19,000 קריאות ל-speechSynthesis.speak()
- **שורש**: `HebrewTts.speak()` לא קרא `this.synth.cancel()` לפני queuing utterance חדש. אם ה-Web Speech queue כבר היה מלא (למשל מקריאות מהירות בסריקה שמיעתית), utterances נערמו. `HybridTtsService.speak()` קרא `this.cancel()` אבל `HebrewTts.speak()` כשנקרא ישירות (early-init, fallback) — לא.
- **תיקון**: `HebrewTts.speak()` — `this.synth.cancel()` לפני `this.synth.speak(u)` (אחרי בדיקת empty text). מונע queue buildup בכל תרחיש.
- **קבצים**: `app/src/services/tts/ttsService.ts`

## Open questions
- `[TODO: Clarify]` ספק/רישוי ניקוד סופי (Nakdan/Dicta — בסיס חינמי כעת). ראה `docs/adr-0001` / PRD נספח D.
- `[RESOLVED]` ספק TTS פרימיום — `docs/adr-0003-tts.md` נכתב. Google Neural2 כעת; Almagu כיעד עתידי (interface מוכן להחלפה).
- `[RESOLVED]` `docs/m2-communication-core.md` — ההפניה הוסרה; M2 מתועד ב-CHANGELOG תחת M4–M8 (sync + auth).
- `[RESOLVED]` M14–M15 — דולגו במכוון; Phase 2 עלה ישירות M13→M16 (CI/CD + TTS rate/pitch). מתועד ב-CHANGELOG.
- `[RESOLVED]` README ↔ HANDOFF conflict — נפתר, README עודכן.
