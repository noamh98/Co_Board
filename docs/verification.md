# סטטוס אימות (Verification)

## M0
- **בדיקה סטטית (רצה בסנדבוקס):** כל 18 קבצי המקור — ייבוא מקומי נפתר, איזון סוגריים תקין.
- **טסטים שנכתבו:**
  - `domain/layout.test.ts` — אינווריאנט Motor Planning (הזזה/הסרה/שינוי-גריד/אישור).
  - `services/nikud/nikudService.test.ts` — עדיפות מקורות + offline + override ידני + IndexedDB.
  - `services/tts/ttsService.test.ts` — בחירת קול מקומי, חביון, נפילה חיננית, שגיאות.
  - `App.test.tsx` — פרוסה אנכית: לחיצת תא → שורת משפט; מחיקה/נקה.

## למה `npm install/test/build` לא רץ בסנדבוקס
לסביבת ה-shell יש **תקרה קשיחה של 45 שניות לכל פקודה**, וכתיבות של פקודה
שחרגה מהזמן **מתגלגלות לאחור**. התקנת התלויות (vite + vitest + workbox + eslint)
לא מסתיימת בחלון הזה, ולכן לא ניתן להריץ את ה-toolchain כאן.

## איך זה כן מאומת
1. **CI (GitHub Actions, `.github/workflows/ci.yml`)** מריץ `npm ci → lint → test → build`
   על runner אמיתי בכל push/PR — זהו שער האימות החוסם בפועל.
2. **מקומית** אצל המפתח: `cd app && npm install && npm test && npm run build`.

> כשמריצים מקומית/ב-CI ייווצר `app/package-lock.json` (אם עוד לא קומיט) — יש לקמט אותו.
