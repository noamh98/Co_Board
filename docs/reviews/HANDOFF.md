# HANDOFF — מסמך המשכיות לסבב הבא

> נכתב: 2026-07-01, אחרי סבב Ultra Review על commit `476cdc9`.
> קרא לפי הסדר: ULTRA-REVIEW → ROADMAP → REFACTOR-PLAN → מסמך זה.

## 1. מצב נוכחי — תמונת מערכת

- **מוצר:** אפליקציית AAC עברית (לוח תקשורת) — PWA offline-first, RTL.
- **סטאק (אומת):** React 18 + TS strict + Vite 5 ב-`app/`; Firebase Functions v2 (Node 20) ב-`functions/`; Firestore + Storage + Hosting; IndexedDB (idb) מקומי עם sync engine דו-כיווני; Vitest (68 קבצי בדיקה); ESLint flat config.
- **ארכיטקטורה:** 4 שכבות חד-כיווניות (`domain` טהור → `data`/`services` → `presentation`). אומת ב-grep שאין הפרות.
- **איכות בסיס:** אפס `any`, אפס `@ts-ignore`, CI מלא, CSP קשיח, מפתחות בצד שרת, rate-limit פר-uid. הפרויקט עבר סבבי ביקורת קודמים (code-labels: A3, B4, C1, D3, E1-E3, F3-F7, H1, I1-I13 — אלה מזהי-החלטות בהערות הקוד; אל תמחק אותם).
- **שני מונוליטים ידועים:** `app/src/App.tsx` (1,147 שורות) ו-`app/src/index.css` (2,153 שורות).

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
| מיצוב EU — האם לקבע את כל ה-Functions ל-europe-west1 גם במחיר cold-start migration? | 3.4 |

## 4. אינווריאנטים — אל תשבור

- **Offline-first:** ה-PWA חייב לעבוד ללא רשת (הערה ב-`vite.config.ts`). כל שינוי ב-workbox/precache — לבדוק offline ידנית.
- **סדר טעינת CSS:** `index.css` → `tokens.css` → `mvpUx.css` ב-`main.tsx` (F6). אסור לשנות סדר.
- **בדיקות רצות בלי Firebase:** `vitest.setup` + `env: { VITE_FIREBASE_API_KEY: '' }` ב-vite.config — auth gate כבוי בבדיקות. אל תדליף מפתח לסביבת test.
- **הלחיצה הראשונה תמיד מדברת** (A3): TTS מאותחל סינכרונית לפני ה-hybrid.
- **RTL + עברית** בכל UI חדש; הודעות שגיאה למשתמש — בעברית.

## 5. איך להמשיך

```bash
# סביבת עבודה
cd app && npm ci && npm run typecheck && npm test        # בדיקות אפליקציה
cd functions && npm ci && npm run build                  # קומפילציית functions
cd functions && npm run test:rules                       # דורש Java + אמולטור (מוריד jar בריצה ראשונה)
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
| 1.7 notifyError + error toast | ⬜ הבא בתור |
| Phase 2 (רפקטור) | ⬜ |
| Phase 3 (הקשחה) | ⬜ |
