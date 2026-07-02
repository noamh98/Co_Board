# פרומפט לסשן ההמשך — השלמת TO Phase 2 + Phase 3 ופריסה

> העתק את הבלוק שמתחת לקו לסשן חדש (Sonnet). הענף: `claude/hebrew-greeting-0nhort`.

---

## ROLE
אתה ממשיך עבודה מתועדת על ריפו `noamh98/Co_Board` (אפליקציית AAC עברית — React+TS+Vite ב-`app/`, Firebase Functions ב-`functions/`). סבב קודם ביצע סקירת עומק וכתב תוכנית מלאה. **קרא לפני כל שינוי קוד, לפי הסדר:**
1. `docs/reviews/HANDOFF.md` — מצב, החלטות, אינווריאנטים (סעיף 4 — קריטי!)
2. `docs/reviews/ROADMAP.md` — המשימות בסדר ביצוע
3. `docs/reviews/REFACTOR-PLAN.md` — תוכנית הפירוק המפורטת + כללי זהירות

## מצב נוכחי (commit `1d1d468`)
- ✅ Phase 1 (1.1–1.7) בוצע במלואו ונדחף: תיקוני rules+בדיקות, מפתח Gemini ל-header, ולידציית role, CI gates, dependabot, notifyError+toast.
- 🟡 Phase 2.1 **באמצע**: 10 מודולים חדשים קיימים תחת `app/src/presentation/app/` (useTtsSettings, useLockMode, useThemeClasses, useSyncEngine, useBoardNavigation, usePrediction, useSentence, useAppBootstrap, useCellDispatcher, AuthGate) — הם מקומפלים אך **עדיין לא מחוברים**; `App.tsx` (1,147 שורות) עדיין רץ על המימוש הפנימי המקורי שלו. חסרים: `AppModals.tsx` (עם `openPanel: PanelId | null` יחיד במקום 8 דגלי boolean) וחיווט App.tsx.

## המשימות שנותרו (בסדר הזה)
1. **השלמת 2.1**: כתוב `presentation/app/AppModals.tsx` (8 הפאנלים: settings/backup/analytics/wizard/phraseBank/wordFinder/admin/portal — כולל ה-lazy imports של UsageDashboard/AdminApprovalPanel/QuickStartWizard/ChildrenDashboard), ואז חווט את `App.tsx` לכל המודולים. שים לב: ה-hooks תוכננו עם `hydrate*`/`initNavStack` callbacks ו-ref-trampoline (bootstrap צריך `initNavStack` מ-useBoardNavigation שנקרא אחריו). שמור את כל ההערות המסומנות (D3/E1/F7/I2…). יעד: App.tsx < ~450 שורות. שער: `npm run typecheck && npm run lint && npm test` (421 בדיקות) — ואז commit.
2. **2.2**: פיצול `app/src/index.css` (2,153 שורות) לפי חלק ב' של REFACTOR-PLAN — הזזה בלבד, `@import` בסדר המקורי, אסור לשנות את סדר הייבוא ב-`main.tsx`. שער: build + בדיקה ויזואלית.
3. **2.3**: `ConfirmDialog` על בסיס `presentation/ui/Modal.tsx` + החלפת 3 מופעי `window.confirm` (App/BuilderView/UsageDashboard).
4. **3.5**: שני TODO — `assertValidBackup` לפני import ב-`backupRepo` (ראה `data/backupValidation.ts:40`), ועטיפת מיגרציית v8 לפי `data/migrationFlag.ts:31`.
5. **3.4**: איחוד regions — העבר `acceptInvite`/`approveUser` ל-`europe-west1` (הוצא את `FUNCTIONS_REGION` מ-ttsProxy למודול משותף), עדכן את אתרי הקריאה בלקוח (חפש `httpsCallable`/region בלקוח). הפונקציות הישנות ב-us-central1 נשארות עד מחיקה ידנית — תעד זאת.
6. **3.2**: בדיקות יחידה ל-functions: `repairTruncatedWordsJson` (יצוא מ-aiBoard), `enforceRateLimit` (על האמולטור, באותו `emulators:exec`).
7. **2.4**: שדרוג major — vite 7, vitest 3, vite-plugin-pwa עדכני, @vitejs/plugin-react תואם. שער: `npm audit` בלי high/critical + כל הבדיקות + build + בדיקת PWA.
8. **3.6+3.1**: coverage ב-CI (`@vitest/coverage-v8`, בלי סף שנכשל) + Playwright e2e (Chromium מותקן מראש ב-`/opt/pw-browsers`, אל תריץ `playwright install`) עם 3-5 smoke flows + axe scan, ו-job CI.
9. **סיום**: עדכן את טבלת הסטטוס ב-`docs/reviews/HANDOFF.md`, commit+push לענף `claude/hebrew-greeting-0nhort`, פתח PR ל-main, מזג — המיזוג מפעיל את `deploy.yml` שפורס ל-Firebase (hosting+rules+storage+functions). עקוב שה-deploy עבר.

## כללי עבודה מחייבים
- commit אחרי כל משימה שעוברת את השערים; הודעות באנגלית בסגנון הקיים.
- אפס שינוי התנהגות פרט למה שמאושר בתוכנית (openPanel יחיד, ConfirmDialog, הודעות שגיאה).
- אינווריאנטים מ-HANDOFF §4: offline-first; סדר CSS ב-main.tsx; בדיקות בלי מפתח Firebase; "הלחיצה הראשונה תמיד מדברת" (A3); RTL ועברית.
- אם משהו נכשל ולא ניתן לפתרון — עצור באותה משימה, תעד ב-HANDOFF, והמשך לבאה; אל תשאיר את הענף אדום.
