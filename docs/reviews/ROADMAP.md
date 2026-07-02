# ROADMAP — תוכנית ביצוע מדורגת

> נגזר מ-[ULTRA-REVIEW.md](./ULTRA-REVIEW.md). כל שלב = סדרת PRs קטנים וניתנים-לסקירה.
> אומדני מאמץ: S ≤ שעתיים · M = חצי יום–יום · L = מספר ימים.

## Phase 1 — Quick Wins (אבטחה + CI, ללא שינוי התנהגות מוצר)

יעד: לסגור את כל ממצאי ה-P1 הזולים ולחזק את רשת הביטחון לפני הרפקטור.

| # | משימה | ממצא | מאמץ | תלות |
|---|-------|-------|------|------|
| 1.1 | תיקון חוק עדכון `users/{uid}` — status immutable מהלקוח (`request.resource.data.status == resource.data.status`) + 2 בדיקות rules חדשות | S-1, T-3 | S | — |
| 1.2 | `aiBoard.ts`: מפתח Gemini מ-query string ל-header `x-goog-api-key` | S-2 | S | — |
| 1.3 | `acceptInvite.ts`: ולידציית `role ∈ {parent, clinician, staff}` לפני כתיבה ל-childAccess | S-4 | S | — |
| 1.4 | CI: הוספת `npm run build` (tsc) של functions ל-job rules-tests + מעבר ל-`npm ci` | D-1, D-2 | S | — |
| 1.5 | הוספת `.github/dependabot.yml` (app + functions + actions) | D-3 | S | — |
| 1.6 | תיקון הפניית `HANDOFF.md` ב-ARCHITECTURE.md | C-1 | S | — |
| 1.7 | `notifyError` מרכזי + toast שגיאה נגיש; החלפת הבליעות השקטות שפוגעות במשתמש (archive/save-phrase/sign-out); השארת בליעה מכוונת + הערה ב-prune/telemetry | U-1, E-1 | M | — |

**אבן דרך:** CI ירוק כולל בדיקות rules החדשות; אפס שינוי התנהגות מלבד הודעות שגיאה חדשות.

## Phase 2 — Core Refactor (מבנה, ללא שינוי פונקציונלי)

יעד: לפרק את שני המונוליטים ולשדרג תשתית בנייה. פירוט מלא ב-[REFACTOR-PLAN.md](./REFACTOR-PLAN.md).

| # | משימה | ממצא | מאמץ | תלות |
|---|-------|-------|------|------|
| 2.1 | פירוק `App.tsx` — שלבים R1→R6 (hooks: tts → lock → prediction → sentence → sync/bootstrap → AppModals + `openPanel` יחיד) | Q-1, A-1, Q-3, Q-4 | L (6 PRs קטנים) | 1.7 (toast מוכן) |
| 2.2 | פירוק `index.css` ל-12 קבצי feature בשימור סדר cascade | Q-1 (CSS) | M | — |
| 2.3 | `ConfirmDialog` על בסיס Modal + החלפת 3 מופעי `window.confirm` | U-2, X-3 | S | 2.1 חלקי (לא חוסם) |
| 2.4 | שדרוג major: vite 7 + vitest 3 + vite-plugin-pwa עדכני; ריצת רגרסיה מלאה (build+test+PWA offline check) | S-5, B-2 | M | רצוי אחרי 2.1-2.2 (פחות קונפליקטים) |

**אבן דרך:** `App.tsx` < 300 שורות; `index.css` מפוצל; `npm audit` נקי מ-high/critical; כל הבדיקות עוברות ללא שינוי snapshot התנהגותי.

## Phase 3 — Hardening (עמידות, כיסוי, תאימות)

| # | משימה | ממצא | מאמץ | תלות |
|---|-------|-------|------|------|
| 3.1 | Playwright e2e: 5 smoke flows (auth gate, נעילה/שחרור, לחיצת תא→הקראה, builder→save, ספרייה→ניווט) + axe scan + מטריצת viewports | T-1, X-2, R-2 | L | 2.4 (תשתית עדכנית) |
| 3.2 | בדיקות יחידה ל-functions: rateLimit window, ולידציות ttsProxy/aiBoard, repairTruncatedWordsJson, acceptInvite (עם emulator) | T-2 | M | — |
| 3.3 | Firebase App Check — מצב monitor ואז enforce על ה-callables | S-3 | M | דורש קונסולה/מוצר |
| 3.4 | איחוד regions ל-`europe-west1` (acceptInvite/approveUser) — release מתואם לקוח+שרת | A-2 | M | חלון release |
| 3.5 | מימוש שני ה-TODO הבשלים: `assertValidBackup` לפני import; עטיפת מיגרציית v8 ב-try/catch | B-1 | M | — |
| 3.6 | Coverage ב-CI + סף; bundle visualizer | T-4, P-2 | S | — |
| 3.7 | הערכת CSP ללא `unsafe-inline` (nonce) — spike בלבד, החלטה לפי ממצאים | S-6 | M | — |

**אבן דרך:** e2e ירוק ב-CI; App Check enforced; אזור אחיד.

## מה הוחלט במפורש לא לעשות

- לא לפרק את CellEditor/BuilderView/SceneEditor כמשימה עצמאית (Q-2) — רק אגב עבודה עתידית בקבצים.
- לא לגעת ב-`onCell` deps (P-3) — עלות רינדור זניחה.
- לא להוסיף zod לפונקציות (Y-3) — הולידציה הידנית מספיקה בהיקף הנוכחי.
- לא להכניס Sentry (E-3) בלי החלטת פרטיות/מוצר מפורשת (COPPA).
