# HANDOFF — מסמך המשכיות לסבב הבא

> נכתב: 2026-07-01, אחרי סבב Ultra Review על commit `476cdc9`.
> עודכן: 2026-07-02, אחרי סיום Phase 2 (רפקטור) ורוב Phase 3 (הקשחה) — ראה טבלת סטטוס בסעיף 7.
> קרא לפי הסדר: ULTRA-REVIEW → ROADMAP → REFACTOR-PLAN → מסמך זה.

## 1. מצב נוכחי — תמונת מערכת

- **מוצר:** אפליקציית AAC עברית (לוח תקשורת) — PWA offline-first, RTL.
- **סטאק (אומת):** React 18 + TS strict + Vite 7 (עודכן מ-5 ב-2.4) ב-`app/`; Firebase Functions v2 (Node 20) ב-`functions/`, פרוסות ל-europe-west1+us-central1 בו-זמנית (3.4); Firestore + Storage + Hosting; IndexedDB (idb) מקומי עם sync engine דו-כיווני; Vitest 3 (71+ קבצי בדיקה, כולל coverage-v8) + Playwright e2e/axe (3.1); ESLint flat config.
- **ארכיטקטורה:** 4 שכבות חד-כיווניות (`domain` טהור → `data`/`services` → `presentation`). אומת ב-grep שאין הפרות.
- **איכות בסיס:** אפס `any`, אפס `@ts-ignore`, CI מלא (build+e2e+rules-tests), CSP קשיח, מפתחות בצד שרת, rate-limit פר-uid (נבדק ביחידה, 3.2). הפרויקט עבר סבבי ביקורת קודמים (code-labels: A3, B4, C1, D3, E1-E3, F3-F7, H1, I1-I13 — אלה מזהי-החלטות בהערות הקוד; אל תמחק אותם).
- **שני המונוליטים שתועדו כאן פורקו (Phase 2):** `app/src/App.tsx` 1,147→626 שורות (hooks תחת `presentation/app/` + `AppModals.tsx`); `app/src/index.css` 2,153 שורות → 14 קבצים תחת `app/src/styles/` (index.css נשאר import-only entry point).

## 2. החלטות שהתקבלו בסבב זה (והרציונל)

1. **חוק עדכון `users/{uid}` מוחלף** ל-status-immutable (`request.resource.data.status == resource.data.status`) — החוק הקודם גם אפשר self-downgrade ל-pending וגם חסם עדכון displayName למשתמש מאושר. הכוונה המקורית (status נכתב רק ע"י CF) נשמרת.
2. **מפתח Gemini עובר ל-header** — יישור עם הדפוס הקיים ב-ttsProxy.
3. **ולידציית role ב-acceptInvite** — defense-in-depth; role לא משמש כיום ל-authz אבל נכתב ל-childAccess ועלול לשמש בעתיד.
4. **בליעות שגיאה שקטות:** יטופלו ב-`notifyError` מרכזי (Phase 1.7). ההבחנה: בליעה בפעולות-משתמש (archive, save-phrase) = באג UX; בליעה ב-prune/telemetry = מכוונת ונשארת עם הערה.
5. **לא מפרקים** את CellEditor/BuilderView כמשימה עצמאית; **לא מוסיפים** zod; **לא מכניסים** Sentry בלי החלטת פרטיות (COPPA) — ראה "מה לא לעשות" ב-ROADMAP.
6. **איחוד region נדחה ל-Phase 3** — שינוי region ב-Functions הוא breaking (כתובת חדשה) ודורש release מתואם לקוח+שרת.
7. **שדרוג vite 7/vitest 3 נדחה ל-Phase 2.4** — breaking change; עדיף אחרי שהרפקטור מייצב רתמת בדיקות.

## 3. שאלות פתוחות (דורשות בעל-מוצר)

| שאלה | חוסם את |
|-------|----------|
| מדיניות פרטיות/COPPA — מותר לוג שגיאות חיצוני (Sentry)? | E-3 |
| App Check — יש נכונות להפעיל reCAPTCHA Enterprise (עלות/UX)? | 3.3 |
| האם `users/{uid}` אמור לאפשר למשתמש לעדכן שדות נוספים מלבד displayName? (החוק החדש מתיר כל שדה פרט ל-status) | חידוד עתידי של S-1 |
| מיתוג: `--cl-primary` (כתום-קורל, `presentation/ui/tokens.css`) לא עומד ב-4.5:1 מול טקסט לבן (WCAG AA) — נדרשת החלטת עיצוב/מוצר על גוון חלופי או שינוי טקסט ל-`--cl-primary-dk`. תועד ע"י axe scan חדש ב-3.1 (מנוטרל שם כ-known-issue). | X-4 (חדש) |
| ✅ **נפתר בסבב זה (3.4):** מיצוב EU לא דרש עוד בחירה בין "לקבוע הכול ל-europe-west1" לבין "השאיר us-central1" — acceptInvite/approveUser נפרסות עכשיו לשני האזורים בו-זמנית (onCall תומך ב-region כמערך), כך שאין עוד חלון-שבירה/פריסה-מתואמת. השאלה שנותרה בפועל: מתי לבטח להסיר את us-central1 מהמערך (דורש מעקב Cloud Monitoring — לא חוסם קוד). |

## 4. אינווריאנטים — אל תשבור

- **Offline-first:** ה-PWA חייב לעבוד ללא רשת (הערה ב-`vite.config.ts`). כל שינוי ב-workbox/precache — לבדוק offline ידנית.
- **סדר טעינת CSS:** `index.css` → `presentation/ui/tokens.css` → `presentation/ui/mvpUx.css` ב-`main.tsx` (F6). אסור לשנות סדר. מאז 2.2: `src/index.css` עצמו הוא אך ורק מניפסט `@import` ל-14 הקבצים תחת `src/styles/` — **הוא עדיין** ה-import הראשון ב-main.tsx (הנתיב לא זז), רק התוכן הפנימי פוצל. סדר ה-`@import`-ים בתוך `styles/index.css` תואם בדיוק לסדר ה-sections המקורי — אסור לשנות גם אותו.
- **ARIA ידוע-וקיים ב-`BoardView.tsx`:** `.cell` נושא `role="gridcell"` בלי `role="row"` עוטף (axe: `aria-required-parent`/`aria-required-children`, 3.1). לא תוקן — כל תא ממוקם ב-CSS Grid לפי `grid-area` ישירות על הלוח, לא לפי סדר-DOM בשורות; עטיפת `row` תדרוש שינוי מבני. אם תיגעו ב-BoardView — זה המקום לתקן, לא ליפול עליו בהפתעה.
- **בדיקות רצות בלי Firebase:** `vitest.setup` + `env: { VITE_FIREBASE_API_KEY: '' }` ב-vite.config — auth gate כבוי בבדיקות. אל תדליף מפתח לסביבת test.
- **הלחיצה הראשונה תמיד מדברת** (A3): TTS מאותחל סינכרונית לפני ה-hybrid.
- **RTL + עברית** בכל UI חדש; הודעות שגיאה למשתמש — בעברית.

## 5. איך להמשיך

```bash
# סביבת עבודה
cd app && npm ci && npm run typecheck && npm test         # בדיקות אפליקציה
cd app && npm run test:coverage                           # אותה סוויטה + דוח כיסוי (3.6, בלי סף)
cd app && npx playwright install --with-deps chromium && npm run test:e2e   # e2e+axe (3.1)
cd functions && npm ci && npm run build                   # קומפילציית functions
cd functions && npm run test:rules                        # rules + repairTruncatedWordsJson + enforceRateLimit (דורש Java+אמולטור)
```

- העבודה מתועדת ב-ROADMAP לפי שלבים; כל משימה עצמאית ל-PR משלה.
- לפני כל PR רפקטור: לקרוא את "כללי הזהירות" ב-REFACTOR-PLAN.
- מצב ביצוע נוכחי: ראה טבלה בסעיף 7.

## 6. הקצאת subagents מומלצת (לסבבים הבאים)

| משימה | Tier מומלץ | נימוק |
|--------|-------------|--------|
| 1.5 dependabot, 1.6 docs-link, D-2 npm ci | fast/lightweight | מכני, אפס סיכון |
| 2.2 פיצול index.css | fast + אימות build | הזזה מכנית עם שער בנייה |
| 1.7 notifyError, 2.3 ConfirmDialog | deep (סטנדרטי) | נגיעה ב-UX + נגישות |
| 2.1 פירוק App.tsx (R4-R5) | deep-reasoning | stale-closure traps, race מתועד |
| 2.4 שדרוג vite/vitest | deep + רגרסיה מלאה | breaking, PWA plugin |
| 3.1 Playwright+axe | deep להקמה, fast להרחבת flows | תשתית חדשה |
| 3.3 App Check, 3.4 regions | deep + אישור בעל-מוצר | production-impacting |

## 7. סטטוס ביצוע (מתעדכן)

| משימה | סטטוס |
|--------|--------|
| כתיבת 4 מסמכי הסקירה | ✅ בוצע (סבב זה) |
| 1.1 חוק users + בדיקות rules | ✅ בוצע (סבב זה) |
| 1.2 Gemini key → header | ✅ בוצע (סבב זה) |
| 1.3 ולידציית role | ✅ בוצע (סבב זה) |
| 1.4 functions build ב-CI + npm ci | ✅ בוצע (סבב זה) |
| 1.5 dependabot | ✅ בוצע (סבב זה) |
| 1.6 תיקון קישור ARCHITECTURE | ✅ בוצע (סבב זה) |
| 1.7 notifyError + error toast | ✅ בוצע (סבב זה) — `services/notify/notifyService.ts`; הוחלפו 3 הבליעות פונות-המשתמש (archive/save-phrase/sign-out); בליעות prune/telemetry נשארו מכוונות |
| 2.1 פירוק App.tsx (R1→R6) | ✅ בוצע — App.tsx 1,170→626 שורות (מעל יעד ~450, אך REFACTOR-PLAN לא הגדיר פירוק נוסף מעבר ל-AppModals). כל 10 ה-hooks תחת `presentation/app/` מחווטים; `AppModals.tsx` + `openPanel: PanelId \| null` יחיד (השינוי ההתנהגותי המורשה). ref-trampoline פתר תלות מעגלית bootstrap↔boardNav (ראה הערה ב-App.tsx). פינה חריגה אחת: ה-wizard חוזר ל-`openPanel('settings')` בסגירה/השלמה (לא `null`) — לשמר את ההתנהגות המקורית שבה settingsOpen לא נסגר כשה-wizard פתוח מעליו. אומת ידנית (headless browser) שכל 8 הפאנלים נפתחים/נסגרים. |
| 2.2 פיצול index.css | ✅ בוצע — 14 קבצים תחת `app/src/styles/`; `index.css` נשאר נקודת-הכניסה (import-only), main.tsx לא נגע. אומת byte-identical: concat של 14 הקבצים == index.css המקורי, ו-build לפני/אחרי מפיק את אותו hash לקובץ ה-CSS. |
| 2.3 ConfirmDialog | ✅ בוצע — `presentation/ui/ConfirmDialog.tsx` על בסיס Modal (D1: focus trap+Escape); כל 3 מופעי `window.confirm` הוחלפו (App ארכוב-לוח, UsageDashboard ניקוי-נתונים, BuilderView אישור-הזזת-תא-ליבה). |
| 2.4 שדרוג vite/vitest/pwa-plugin | ✅ בוצע — vite 5→7.3.6, vitest 2→3.2.6, vite-plugin-pwa 0.20→1.3.0, @vitejs/plugin-react 4→5.2.0 (יעד היה vite 7/vitest 3 מה-ROADMAP, לא הגרסאות העדכניות ביותר שכבר יצאו — vite 8/vitest 4). `npm audit`: 0 (היה 6). אומת offline-check מלא (headless browser: build→preview→SW active→offline→reload→הלוח נטען מה-cache). |
| Phase 2 (רפקטור) | ✅ בוצע במלואו |
| 3.1 Playwright e2e + axe | ✅ בוצע — 6 specs (`app/e2e/`): לחיצת-תא, נעילה/שחרור, ספרייה→ניווט, builder פתיחה/יציאה, 2 סריקות axe (הגדרות+לוח ילד). axe חשף 2 ממצאים קיימים-מראש שמנוטרלים במפורש בקוד עם הסבר (color-contrast של `--cl-primary`; `aria-required-parent/children` בלוח) — לא תוקנו (מחוץ להיקף, ראה סעיף 3/4); ממצא שלישי (aria-label על div חסר role ב-BoardToolbar) תוקן ישירות (role="group"). CI job חדש `e2e` (playwright install + test:e2e). |
| 3.2 בדיקות יחידה functions | ✅ בוצע — `repairTruncatedWordsJson` יוצא ונבדק (7 מקרים, ללא אמולטור); `enforceRateLimit` נבדק מול Firestore emulator דרך Admin SDK (5 מקרים: מכסה/חסימה/reset-חלון/בידוד per-uid/per-action) — שניהם רצים תחת אותו `npm run test:rules`. |
| 3.4 איחוד regions | ✅ בוצע — acceptInvite/approveUser נפרסות כעת גם ל-europe-west1 וגם ל-us-central1 בו-זמנית (`onCall({ region: [...] })`, `functions/src/region.ts`) — בלי חלון-שבירה/פריסה-מתואמת. לקוח (`services/functionsRegion.ts`) קורא ל-europe-west1. us-central1 יוסר מהמערך (ויידרש deploy נוסף) רק אחרי אימות בניטור שאין יותר תעבורה שם — זו ה"מחיקה הידנית". |
| 3.5 assertValidBackup + מיגרציית v8 | ✅ בוצע — `backupRepo.importBackup` קורא `assertValidBackup` ומסנן רשומות boards/profiles פגומות (`isValid*Record`) במקום לכתוב/לזרוק-הכול. מיגרציית v8 ב-`db.ts` עטופה ב-try/catch + `setMigrationFailed`; `useAppBootstrap` בודק ומציג פעם-אחת דרך ה-toast הקיים. |
| 3.6 Coverage ב-CI | ✅ בוצע — `@vitest/coverage-v8`, `npm run test:coverage` מחליף `npm test` ב-CI (`text-summary`+`lcov`, בלי סף שנכשל). Bundle visualizer (P-2) **לא** בוצע — לא היה בהיקף המפורש של הסבב הזה. |
| Phase 3 (הקשחה) | חלקי — בוצעו 3.1/3.2/3.4/3.5/3.6. **לא בוצעו:** 3.3 (App Check — דורש אישור בעל-מוצר, ראה סעיף 3), 3.7 (CSP ללא unsafe-inline — spike, לא התבקש בסבב זה). |
