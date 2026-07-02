# ULTRA-REVIEW — סקירת עומק רב-תחומית (Co_Board)

> תאריך: 2026-07-01 · סוקר: Ultra Code Review (Claude Code)
> Commit נסקר: `476cdc9` · ענף: `claude/hebrew-greeting-0nhort`
> מסמכים נלווים: [ROADMAP.md](./ROADMAP.md) · [REFACTOR-PLAN.md](./REFACTOR-PLAN.md) · [HANDOFF.md](./HANDOFF.md)

## תקציר מנהלים

הפרויקט במצב **טוב משמעותית מהממוצע**: ארכיטקטורת 4 שכבות חד-כיוונית שנאכפת בפועל (אומת ב-grep — אפס הפרות תלות), TypeScript strict ללא אף `any` או `@ts-ignore` בקוד ייצור, 68 קבצי בדיקה מול 133 קבצי מקור, CI מלא (typecheck+lint+test+build+rules-tests), CSP קשיח, מפתחות צד-שלישי בצד שרת בלבד, ו-rate-limiting פר-uid. ניכר שהקוד עבר סבבי ביקורת קודמים (סימוני A3/B4/C1/D3/E1-E3/F3-F7/H1/I1-I13).

הבעיות שנותרו מתרכזות ב: (1) חוק Firestore שגוי לעדכון `users/{uid}`, (2) חוב-ריכוזיות ב-`App.tsx` (1,147 שורות, ‎40+ useState) וב-`index.css` (2,153 שורות), (3) בליעת שגיאות שקטה ללא פידבק למשתמש, (4) פערי CI (functions לא מקומפל ב-PR), (5) חולשות תלויות dev-chain.

**מקרא חומרה:** P0 קריטי · P1 גבוה · P2 בינוני · P3 נמוך. **Impact×Effort:** H/M/S (גבוה/בינוני/קטן). ⚡ = Quick Win.

---

## 1. Architecture & Design

מצב כללי: מצוין. שכבות `domain → data/services → presentation` נאכפות; `domain` טהור (אומת: אין imports ל-services/presentation/data); Cloud Functions דקות וממוקדות.

| # | ממצא | חומרה | ראיות | תיקון מומלץ |
|---|------|--------|--------|---------------|
| A-1 | `App.tsx` הוא God Component — composition root שמכיל גם bootstrap, גם auth-gate, גם sync wiring, גם sentence/prediction/scanning logic וגם 8 מודאלים | P2 · Impact H × Effort M | `app/src/App.tsx:133-1147` — 40+ useState, ‎15 useEffect | פירוק לפי [REFACTOR-PLAN.md](./REFACTOR-PLAN.md) — hooks ייעודיים + AppModals |
| A-2 | חוסר עקביות ב-region של Functions: `acceptInvite`/`approveUser` ב-`us-central1`, `ttsProxy`/`aiBoard` ב-`europe-west1` — סותר את מיצוב הפרטיות (EU) המוצהר בהערת ttsProxy | P2 · Impact M × Effort M | `functions/src/acceptInvite.ts:28`, `approveUser.ts:15` מול `ttsProxy.ts:17` | לאחד ל-`europe-west1`. ⚠️ שינוי region = פונקציה חדשה + עדכון לקוח מתואם — לתזמן כ-release, לא hotfix (Phase 3) |
| A-3 | כפילות מקור-אמת לרשימת קולות he-IL בין שרת ללקוח (מתועד כמכוון אך שביר) | P3 · Impact S × Effort S | `functions/src/ttsProxy.ts:22-28` מול `googleTtsProvider.GOOGLE_HE_VOICES` | בדיקת יחידה משותפת-חוזה, או קובץ JSON משותף |
| A-4 | קוד מת — כמעט ולא נמצא (נוקה בסבבי F6 קודמים) | N/A | הערות F6 ב-`index.css:247,253` | — |

## 2. Code Quality & Maintainability

| # | ממצא | חומרה | ראיות | תיקון מומלץ |
|---|------|--------|--------|---------------|
| Q-1 | `App.tsx` — ‎1,147 שורות; ריכוז אחריות מוגזם (ראה A-1) | P2 · H×M | `app/src/App.tsx` | REFACTOR-PLAN שלב 1-6 |
| Q-2 | קבצי presentation גדולים נוספים: `CellEditor.tsx` (688), `BuilderView.tsx` (600), `SceneEditor.tsx` (555), `AccessSettingsPanel.tsx` (484) | P3 · M×M | `wc -l` | לפרק רק אגב עבודה עתידית בקבצים אלה (לא כמשימה עצמאית) |
| Q-3 | שכפול אובייקט אפשרויות דיבור `{voiceURI, rate, pitch}` שלוש פעמים בתוך App | P3 · S×S ⚡ | `App.tsx:426-430, 462-466, 506-510` | להשתמש ב-`speakOpts()` הקיים (או ref יציב) בכל שלושת המקומות — ייפתר ממילא ב-`useTts` hook |
| Q-4 | 8 דגלי `useState<boolean>` נפרדים למודאלים — מאפשר תאורטית שני מודאלים פתוחים | P3 · S×S | `App.tsx:147-153,166-167` | `openPanel: PanelId \| null` יחיד (חלק מ-REFACTOR-PLAN שלב 5) |
| Q-5 | אפס `any`, אפס `@ts-ignore`, ESLint נקי | N/A (חיובי) | סריקת grep מלאה | — |

## 3. Refactoring & File Splitting

ראה [REFACTOR-PLAN.md](./REFACTOR-PLAN.md) — תוכנית מלאה ל-`App.tsx` (→ ‎~8 hooks + 2 קומפוננטות, יעד <300 שורות) ול-`index.css` (→ ‎12 קבצים לפי feature, שימור סדר cascade).

## 4. Testing

| # | ממצא | חומרה | ראיות | תיקון מומלץ |
|---|------|--------|--------|---------------|
| T-1 | אין בדיקות E2E כלל (אין Playwright/Cypress) — זרימות קריטיות (auth gate, נעילה/שחרור, builder→save→sync) מכוסות רק ברמת קומפוננטה | P2 · H×M | `app/package.json` — אין תלות e2e | Playwright + 4-5 smoke flows + axe scan (Phase 3) |
| T-2 | Cloud Functions ללא בדיקות יחידה ללוגיקה (rate-limit window, ולידציות ttsProxy/aiBoard, `repairTruncatedWordsJson`) — קיימות רק בדיקות rules | P2 · M×M | `functions/test/` מכיל רק `rules.test.ts` | vitest units עם emulator/מוקים ל-fetch |
| T-3 | בדיקות rules לא מכסות עדכון `users/{uid}` (הקשור לממצא S-1) | P1 · M×S ⚡ | `functions/test/rules.test.ts:95-128` | להוסיף 2 בדיקות: שינוי status עצמי נכשל; עדכון displayName מצליח |
| T-4 | אין דוח coverage ב-CI — לא ניתן לזהות נסיגות כיסוי | P3 · S×S ⚡ | `.github/workflows/ci.yml` | `vitest run --coverage` + סף מינימלי |
| T-5 | יחס בדיקות בריא: 68 קבצי test / 133 קבצי src; domain מכוסה כמעט 1:1 | N/A (חיובי) | ספירת find | — |

## 5. Security

מצב כללי: חזק (custom claims, CSP, secrets בשרת, rate-limit, storage rules עם ולידציית גודל/סוג). הממצאים הם חידודים.

| # | ממצא | חומרה | ראיות | תיקון מומלץ |
|---|------|--------|--------|---------------|
| S-1 | חוק עדכון `users/{uid}` שגוי: `allow update: if isOwnUid(uid) && request.resource.data.status == 'pending'` — (א) משתמש **מאושר** יכול להוריד את עצמו חזרה ל-`pending` (דריסת החלטת אדמין ב-Firestore; ה-claim לא נפגע אך נוצר drift), (ב) משתמש מאושר **לא יכול** לעדכן `displayName` בלי לשבור את הסטטוס — החוק לא משרת את הכוונה המתועדת בהערה | P1 · M×S ⚡ | `docs/firestore.rules:44-48` | `allow update: if isOwnUid(uid) && request.resource.data.status == resource.data.status` — סטטוס immutable מהלקוח, שאר השדות פתוחים; + בדיקות rules (T-3) |
| S-2 | `aiBoard` שולח את מפתח Gemini ב-query string (`?key=...`) — מפתחות ב-URL נוטים לדלוף ללוגים/פרוקסי | P1 · M×S ⚡ | `functions/src/aiBoard.ts:96` | header `x-goog-api-key` (כפי שכבר נעשה ב-`ttsProxy.ts:81`) |
| S-3 | אין Firebase App Check על ה-callables — bot עם חשבון מאושר גנוב מוגבל רק ע"י rate-limit | P2 · M×M | `functions/src/*.ts` — אין `enforceAppCheck` | App Check (reCAPTCHA Enterprise / Play Integrity) במצב monitor→enforce (Phase 3) |
| S-4 | `acceptInvite` מעתיק את `invite.role` כלשונו ל-`childAccess` בלי ולידציה מול enum; חוקי create של `shareInvites` לא מוודאים `role` חוקי או בעלות על `childId` (הבעלות ממותנת בפועל ע"י בדיקת `users/{ownerUid}/children/{childId}` בפונקציה) | P2 · S×S ⚡ | `functions/src/acceptInvite.ts:69-74`; `docs/firestore.rules:79-84` | ולידציית `role ∈ {parent, clinician, staff}` בפונקציה + חיזוק חוק create (defense-in-depth) |
| S-5 | `npm audit` (app): 6 חולשות (לפי npm: 1 critical, 1 high, 4 moderate) — כולן בשרשרת dev: esbuild ≤0.24.2 / vite ≤6.4.2 / vitest / vite-plugin-pwa. חשיפה בפועל: dev server בלבד (GHSA-67mh-4wv8-2f99), לא ה-bundle בייצור | P1 · M×M | `npm audit --package-lock-only` ב-`app/` | שדרוג major מתואם: vite 7 + vitest 3 + vite-plugin-pwa עדכני (Phase 2 — breaking, דורש ריצת רגרסיה מלאה); בינתיים dependabot |
| S-6 | CSP כולל `'unsafe-inline'` ב-script-src — מחליש את ההגנה מ-XSS (נדרש כנראה ל-Firebase snippets) | P3 · M×H | `firebase.json` headers | לבחון nonce/hash-based CSP; לא לגעת בלי בדיקת רגרסיה מלאה |
| S-7 | חיובי: אין סודות ב-repo; `VITE_FIREBASE_*` הם public identifiers מוגני-rules; storage rules סוגרות default-deny + מגבלת 10MB + octet-stream (מדיה מוצפנת) | N/A | `firebase/storage.rules`, `deploy.yml` | — |

## 6. Performance

| # | ממצא | חומרה | ראיות | תיקון מומלץ |
|---|------|--------|--------|---------------|
| P-1 | חיובי: 5 מסכים כבדים ב-`lazy()`; `onCell` יציב (useCallback) + BoardView memo; precache PWA מחריג סמלים (E3); ניבוי n-gram מקומי | N/A | `App.tsx:109-124,491` · `vite.config.ts` | — |
| P-2 | אין `build --report`/bundle-visualizer ב-CI — אין שומר-סף לגודל bundle | P3 · S×S ⚡ | `ci.yml` | `rollup-plugin-visualizer` + בדיקת סף ידנית ב-PR כבדים |
| P-3 | `onCell` תלוי ב-`ctx` וב-`currentBoard` — מתחלף בכל ניווט לוח ומרנדר את כל ה-BoardView; זניח בפועל (ניווט = החלפת לוח ממילא) | P3 · S×M | `App.tsx:571-581` | לא לגעת; לתעד. אם יידרש — refs לערכים הנצרכים באנליטיקס בלבד |
| P-4 | Cold starts: functions ללא `minInstances`; מקובל לעומס נוכחי (הקראה נופלת ל-fallback דפדפן) | P3 / N-A | `functions/src/*` | לשקול `minInstances:1` ל-ttsProxy רק אם יתקבלו תלונות latency |
| P-5 | יעילות שאילתות Firestore לא נבדקה לעומק בסבב זה (sync engine — קריאת delta לפי `syncMeta`) — **הנחה מוצהרת**, לא ממצא | הנחה | `app/src/services/sync/` | ביקורת ממוקדת בסבב עתידי אם יעלו עלויות reads |

## 7. UI/UX

| # | ממצא | חומרה | ראיות | תיקון מומלץ |
|---|------|--------|--------|---------------|
| U-1 | שגיאות נבלעות בשקט — 9 מופעי `.catch(() => {})` בקוד ייצור: כשל בארכוב לוח / שמירת ביטוי / sign-out לא מציג דבר למשתמש | P1 · H×M | `App.tsx:683,725,741` ועוד (grep מלא ב-HANDOFF) | util מרכזי `notifyError` + toast שגיאה נגיש (`role="alert"`); להשאיר בליעה מכוונת רק ל-prune/telemetry עם הערה |
| U-2 | `window.confirm` native ב-3 מקומות לצד קומפוננטת `Modal` מעוצבת קיימת — חוסר עקביות חזותי ו-RTL | P3 · S×S | `App.tsx:672`, `BuilderView.tsx:129`, `UsageDashboard.tsx:47` | `ConfirmDialog` על בסיס Modal הקיים |
| U-3 | חיובי: מצבי טעינה עם `role="status"` בכל הצמתים; toast "נשמר!" עם aria-live; מסכי pending/rejected ייעודיים | N/A | `App.tsx:811,882,908` | — |

## 8. Accessibility (a11y)

| # | ממצא | חומרה | ראיות | תיקון מומלץ |
|---|------|--------|--------|---------------|
| X-1 | חיובי ובולט: 56 קבצי presentation עם aria/role; focus-trap במודאלים; מצב ניגודיות-גבוהה + `forced-colors`; גודל תא מינימלי ≥44px (ברירת מחדל 92px); תמונות דקורטיביות `alt="" aria-hidden` | N/A | `useFocusTrap.ts` · `index.css:172-238` · `App.tsx:851` · `CellButton.tsx:89-92` | — |
| X-2 | אין אימות אוטומטי — יחסי ניגודיות (כולל גווני Fitzgerald על טקסט) וניווט מקלדת מלא לא מאומתים מכנית | P2 · M×M | אין axe ב-repo | axe-core ב-e2e (יחד עם T-1) + בדיקת ניגודיות ידנית לטוקני הצבע |
| X-3 | `window.confirm` נגיש נייטיבית אך לא RTL-מעוצב (חופף U-2) | P3 | — | נפתר עם ConfirmDialog |

## 9. Responsiveness

| # | ממצא | חומרה | ראיות | תיקון מומלץ |
|---|------|--------|--------|---------------|
| R-1 | חיובי: 23 media queries; דפוסי bottom-sheet לטלפון; הסתרת טקסט כפתורים בטלפון; grid מבוסס `--cell-min` | N/A | `index.css:574,679,923` | — |
| R-2 | אין מטריצת QA רספונסיבית מתועדת (טאבלט הוא מכשיר היעד המרכזי ב-AAC) — **לא אומת ויזואלית בסבב זה** | P3 · M×S | — | צ'קליסט ידני (iPad landscape/portrait, phone, desktop) כחלק מ-Phase 3 + צילומי e2e |

## 10. Error Handling & Resilience

| # | ממצא | חומרה | ראיות | תיקון מומלץ |
|---|------|--------|--------|---------------|
| E-1 | בליעת שגיאות שקטה (חופף U-1 — הממצא המרכזי בתחום) | P1 | ראה U-1 | ראה U-1 |
| E-2 | חיובי: ErrorBoundary ברמת root; timeouts+AbortController בכל קריאות רשת (functions 15s, `fetchWithTimeout` בלקוח); sync retry על `online` event; הודעות שגיאה בעברית מהפונקציות | N/A | `main.tsx:19` · `ttsProxy.ts:74-97` · `App.tsx:313-317` | — |
| E-3 | אין לוג שגיאות מרוכז בלקוח (console בלבד ב-ErrorBoundary) — תקלות אצל משתמשים אינן נצפות | P3 · M×M | `ErrorBoundary.tsx` | לשקול Sentry/GlitchTip בכפוף למדיניות פרטיות (COPPA) — החלטת מוצר |

## 11. Type Safety

| # | ממצא | חומרה | ראיות | תיקון מומלץ |
|---|------|--------|--------|---------------|
| Y-1 | חיובי: `strict: true`; אפס `any`/`@ts-ignore` בקוד ייצור (אומת בסריקה מלאה) | N/A | `app/tsconfig.json` | — |
| Y-2 | 2 מופעי `eslint-disable exhaustive-deps` — שניהם מנומקים בהערה צמודה | P3 · S×S | `App.tsx:329,345` | לשמר; לצמצם אגב הרפקטור (hooks ממוקדים מייתרים אותם) |
| Y-3 | cast-ים ל-`request.data as X` בפונקציות ואחריהם ולידציה ידנית — תקין אך שביר להתרחבות | P3 · S×M | `functions/src/*.ts` | zod/valibot לולידציית קלט אם ה-API יגדל (לא עכשיו) |

## 12. DevOps / CI-CD

| # | ממצא | חומרה | ראיות | תיקון מומלץ |
|---|------|--------|--------|---------------|
| D-1 | קוד `functions/src` לא מקומפל ב-CI של PR — שגיאת TS ב-functions מתגלה רק ב-deploy אחרי merge | P1 · M×S ⚡ | `.github/workflows/ci.yml` — job `rules-tests` מריץ רק `test:rules` | להוסיף `npm run build` ל-job |
| D-2 | `npm install` (לא `npm ci`) ב-job rules-tests — build לא דטרמיניסטי | P3 · S×S ⚡ | `ci.yml:41` | `npm ci` |
| D-3 | אין Dependabot/Renovate — חולשות תלויות (S-5) מצטברות ללא התראה | P2 · M×S ⚡ | אין `.github/dependabot.yml` | dependabot ל-app, functions, github-actions |
| D-4 | חיובי: deploy gated (lint+test+build), פורס גם rules+storage+functions (סוגר drift), secrets דרך GH Secrets + `functions:secrets:set` | N/A | `deploy.yml` | — |
| D-5 | deploy ישיר על push ל-main ללא GitHub environment protection | P3 · S×S | `deploy.yml` | environment `production` + required reviewers אם יצטרפו מפתחים |

## 13. Technical Debt

| # | ממצא | חומרה | ראיות | תיקון מומלץ |
|---|------|--------|--------|---------------|
| B-1 | 7 TODO בלבד, כולם מתויגי-phase ומנומקים. הבשלים ביותר: ולידציית ייבוא גיבוי לפני כתיבה (`backupValidation.ts:40`) ועטיפת מיגרציית v8 (`migrationFlag.ts:31`) | P2 · M×S | grep TODO | לממש את שני אלה ב-Phase 3 (הגנת שחיתות נתונים) |
| B-2 | שדרוגי major ממתינים: vite 5→7, vitest 2→3 (חופף S-5) | P2 | `app/package.json` | Phase 2 |

## 14. Documentation

| # | ממצא | חומרה | ראיות | תיקון מומלץ |
|---|------|--------|--------|---------------|
| C-1 | `ARCHITECTURE.md` מפנה ל-`HANDOFF.md` שהוסר מה-repo (commit `41f7939`) — קישור שבור לקורא חדש | P2 · S×S ⚡ | `ARCHITECTURE.md:3` | להפנות ל-`docs/reviews/HANDOFF.md` (נוצר בסבב זה) |
| C-2 | חיובי: ADRs (0001-0005), מסמכי milestones, PRD, הערות קוד עם code-labels עקביים | N/A | `docs/` | — |
| C-3 | אין CONTRIBUTING/onboarding יחיד — פרויקט יחיד-מפתח, מקובל | P3 | — | HANDOFF.md מכסה חלקית |

---

## "Do this first" — סדר ביצוע מיידי

1. **S-1 + T-3** — תיקון חוק עדכון `users/{uid}` + שתי בדיקות rules ⚡ (P1, אבטחה, שינוי שורה אחת)
2. **S-2** — מפתח Gemini ל-header ⚡ (P1, שורה אחת)
3. **D-1 + D-2** — קומפילציית functions ב-CI + `npm ci` ⚡ (P1, סוגר עיוורון CI)
4. **S-4** — ולידציית role ב-acceptInvite ⚡ (P2, הקשחה)
5. **D-3** — dependabot.yml ⚡ (P2)
6. **C-1** — תיקון קישור ARCHITECTURE.md ⚡ (P2)
7. **U-1/E-1** — `notifyError` מרכזי + toast שגיאה (P1, דורש החלטת UX קלה — Phase 1b)
8. **Q-1** — פירוק App.tsx לפי REFACTOR-PLAN (P2, Phase 2)
9. **S-5/B-2** — שדרוג vite/vitest (P1-P2, Phase 2)
10. **T-1 + X-2** — Playwright e2e + axe (P2, Phase 3)
