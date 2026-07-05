# CLAUDE.md — לוח תקשורת (Co_Board)

אפליקציית AAC עברית-ראשונה (PWA offline-first, RTL) לילדים עם קשיי תקשורת.
**בתחילת כל סשן:** קרא את `docs/reviews/HANDOFF.md` (מצב עדכני, החלטות, danger zones). מסמך זה הוא תקציר — HANDOFF הוא מקור האמת.

## מבנה
- `app/` — הלקוח: React 18 + TypeScript strict + Vite 7, Vitest 3, Playwright e2e. ארכיטקטורת 4 שכבות חד-כיווניות: `presentation → domain → services → data` (פירוט: `ARCHITECTURE.md`). `domain/` הוא TS טהור — בלי React/DOM/IndexedDB.
- `functions/` — Firebase Functions v2 (Node 20): ttsProxy, aiBoard, acceptInvite, approveUser, rateLimit. נפרסות ל-europe-west1 + us-central1.
- `PRD/PRD-he.md` — אפיון מלא; `docs/` — ADRs, פירוט per-milestone, CHANGELOG.

## פקודות
```bash
# app/ (רוב העבודה כאן)
npm run typecheck && npm run lint && npm test   # שער לפני כל commit
npm run test:e2e                                # Playwright + axe (Chromium מותקן מראש ב-/opt/pw-browsers — אל תריץ playwright install)
npm run build                                   # tsc --noEmit + vite build

# functions/
npm run build                                   # קומפילציית TS
npm run test:rules                              # rules + unit — דורש Java + Firestore emulator
```
בסשן web/remote, hook ה-SessionStart (`.claude/hooks/session-start.sh`) כבר התקין את התלויות של שתי החבילות.

## אינווריאנטים — אסור להפר (המלא: HANDOFF §4)
1. **Motor Planning:** מילות ליבה לא זזות ממיקומן (`domain/layout.ts`). כל שינוי פריסה — אזהרה מפורשת.
2. **Offline-first:** תקשורת/ניווט/TTS בסיסי/סמלים עובדים ללא רשת. שינוי ב-workbox/precache → בדיקת offline ידנית.
3. **סדר טעינת CSS ב-`main.tsx`:** `index.css` → `tokens.css` → `mvpUx.css`; `src/index.css` הוא מניפסט `@import` בלבד — אסור לשנות את סדר הייבוא בו.
4. **"הלחיצה הראשונה תמיד מדברת" (A3):** TTS מאותחל סינכרונית לפני ה-hybrid.
5. **בדיקות רצות בלי Firebase:** אל תדליף מפתח לסביבת test (`VITE_FIREBASE_API_KEY: ''` ב-vite.config).
6. **פרטיות ילדים:** אנליטיקה opt-in; אין מפתחות צד-שלישי ב-bundle (הכול דרך functions); אין להוסיף טלמטריה חיצונית בלי החלטת מוצר (COPPA/GDPR).
7. **RTL + עברית** בכל UI חדש; הודעות שגיאה למשתמש — בעברית.
8. **מיגרציות IndexedDB** רק ב-`data/db.ts` `upgrade`, תמיד אדיטיביות; מחיקה = ארכוב.
9. **הערות code-label** (A3, B4, D3, F6, I2…) הן מזהי-החלטות — אל תמחק אותן.

## קונבנציות
- הודעות commit באנגלית, בסגנון conventional (`feat(ui): …`, `fix(data): …`); מסמכים ותוכן-משתמש בעברית.
- שינוי שמשנה התנהגות → עדכון `docs/reviews/HANDOFF.md` (סטטוס/אינווריאנטים) + `docs/CHANGELOG.md` **באותו commit**.
- אפס `any` / `@ts-ignore`; כל גישה ל-DB דרך `data/*Repo`; שכבה לא קוראת כלפי מעלה.
- `EXECUTION-PROMPT.md` ו-`docs/reviews/NEXT-SESSION-PROMPT.md` הם מסמכים היסטוריים — אל תבצע לפיהם.
