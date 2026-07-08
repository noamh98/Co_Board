# תקציב ביצועים — Co_Board (Stage C §18.3)

מסמך זה מגדיר את יעדי הביצועים לאפליקציה ואת אופן האכיפה שלהם. יעד המכשיר
המוביל הוא **אנדרואיד בכיר-נמוך על רשת מוגבלת (throttled)** — שם "הלחיצה הראשונה
שמדברת" חייבת להישאר מהירה גם offline.

## 1. תקציב bundle-size — אכיף ב-CI ✅

נאכף אוטומטית ב-job `build` של `.github/workflows/ci.yml` באמצעות
`npm run size` (הסקריפט `app/scripts/check-bundle-size.mjs`), הרץ מיד לאחר
`npm run build`. הסקריפט דוחס ב-gzip כל נכס `.js`/`.css` תחת `dist/`, מסכם לפי
סוג, ומפיל את ה-build אם חורגים מהתקציב.

| קטגוריה | תקציב (gzip) | משתנה סביבה לעקיפה |
| --- | --- | --- |
| סך JavaScript | 500 KB | `BUNDLE_JS_GZIP_KB` |
| סך CSS | 100 KB | `BUNDLE_CSS_GZIP_KB` |

- **התקציב הוא תקרה אמיתית, לא כיול-אוטומטי** — רגרסיית משקל אמיתית (למשל
  ייבוא כבד חדש) שוברת את ה-build. הכותרת רחבה מספיק כדי לא להכשיל כזב, אך
  צרה מספיק כדי לתפוס הכפלה של המטען.
- הסקריפט מדפיס דוח לכל קובץ ואזהרת ⚠ בחצייה של 80% מהתקציב, כדי שאפשר יהיה
  להדק את התקרה עם הזמן.
- כדי לרוץ מקומית: `cd app && npm run build && npm run size`.

## 2. פרופיל Lighthouse (low-end throttled) — [Verify — device]

הרצת Lighthouse חיה דורשת build מוגש + Chrome והיא נוטה ל-flake ב-CI, לכן היא
**אינה** job ב-CI אלא **שער ידני** מול המכשיר. התקציבים הניתנים-למכונה נמצאים
ב-`app/lighthouse-budget.json` ומיושמים דרך:

```bash
cd app
npm run build
npm run preview &            # מגיש את dist/ (ברירת מחדל: http://localhost:4173)
npx lighthouse http://localhost:4173 \
  --preset=perf \
  --budget-path=lighthouse-budget.json \
  --throttling-method=simulate \
  --form-factor=mobile \
  --output=html --output-path=./lighthouse-report.html
```

יעדי הפרופיל (throttled mobile, מותאם ל-low-end):

| מדד | תקציב |
| --- | --- |
| Time to Interactive (TTI) | ≤ 5000ms |
| First Contentful Paint (FCP) | ≤ 2500ms |
| Largest Contentful Paint (LCP) | ≤ 4000ms |
| Total Blocking Time (TBT) | ≤ 600ms |
| Cumulative Layout Shift (CLS) | ≤ 0.1 |
| סך משאבים | ≤ 1200 KB |

**סטטוס: [Verify — device].** יש להריץ את הפרופיל על מכשיר אנדרואיד בכיר-נמוך
פיזי (או פרופיל CPU/רשת מוגבל ב-DevTools) ולתעד את התוצאה לפני שחרור ל-First
Paying Family. אין לסמן כ-DONE ללא הרצה אמיתית.

## 3. הערות

- מדידה offline-first: הסמלים נטענים runtime-cached (לא precached), כך שהמטען
  ההתחלתי נשאר קטן — התקציב לעיל מכסה את מעטפת האפליקציה, לא את מאגר הסמלים.
- שינוי תקציב מכוון (למשל תלות חדשה מוצדקת) — עדכנו את הערך ב-CI/במסמך זה עם
  נימוק ב-PR, ולא רק את משתנה הסביבה בזמן ריצה.
