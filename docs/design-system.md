# Co_Board — Design System v1

מסמך זה מתאר את ארכיטקטורת ה-tokens וערכות הנושא של Co_Board (Phase 2, task 2.3).
מטפל ב-findings: **C-06** (רגיעה חושית), **C-18** (גופן ידידותי-דיסלקציה),
**D-11** (self-host גופנים / ללא Google Fonts לפני הסכמה — פריט פרטיות).

## 1. מקור סמכות יחיד ל-tokens

`app/src/presentation/ui/tokens.css` הוא **קובץ הסמכות** לכל טוקני הצבע (`--cl-*`).
בדיקת drift (`app/scripts/check-token-drift.mjs`, מורצת ב-CI דרך `npm run lint:tokens`)
נכשלת אם `--cl-*` מוגדר מחוץ לקובץ זה. הפלטה הירוקה הישנה נמחקה ב-task 2.1 (C-01).

טוקני קטגוריות Fitzgerald (`--cat-*`) חיים ב-`app/src/styles/tokens.css` ואינם מטופלים כאן.

## 2. קטגוריות הטוקנים

| קטגוריה | דוגמאות | מיקום |
|----------|----------|--------|
| **צבע (color)** | `--cl-primary` (#E8694C קורל), `--cl-primary-dk`, `--cl-bg`, `--cl-surface`, `--cl-text` | tokens.css (:root) |
| **מרווח (spacing)** | `--sp-1`…`--sp-6` (סקאלת 4px) | tokens.css |
| **רדיוס (radius)** | `--r-sm`, `--r-md`, `--r-lg`, `--r-pill` | tokens.css |
| **טיפוגרפיה (type)** | `--font-sans`, `--font-reading`, סקאלת `--fs-*` | tokens.css |
| **תנועה (motion)** | `--ease-*`, `--dur-*` (מכבד `prefers-reduced-motion`) | tokens.css |

## 3. טיפוגרפיה ופרטיות (D-11)

- `--font-sans: 'Assistant', system-ui, 'Segoe UI', 'Arial Hebrew', Arial, sans-serif`
- `--font-reading: 'Atkinson Hyperlegible', 'Assistant', system-ui, …`

**החלטת פרטיות:** `app/index.html` **אינו** טוען Google Fonts (הוסרו `<link>`
ו-`preconnect` ל-`fonts.googleapis.com` / `fonts.gstatic.com`). האפליקציה נשענת על
מחסנית הגופנים של המערכת — אין בקשת רשת לצד-שלישי לפני הסכמת המשתמש. שמות משפחות
הגופנים נשמרים כדי ש-self-host עתידי (`@font-face` עם קבצים מקומיים) יעבוד ללא שינוי CSS.

> **[TBD — binary]** self-host אמיתי של OpenDyslexic/Atkinson Hyperlegible דורש הוספת
> קבצי גופן ל-repo (חסום בסביבת ה-API הנוכחית). עד אז, "גופן קריא" מספק אפקט אמיתי
> דרך מרווחי אותיות/מילים/שורות מוגדלים (`.reading-font`), לא רק החלפת שם משפחה.

## 4. ערכות נושא (Themes)

מוחלות כ-class על `document.documentElement` דרך `useThemeClasses.ts` (נקרא פעם אחת מ-`App.tsx`):

| Class | Finding | תיאור | הפעלה |
|-------|---------|--------|--------|
| `high-contrast` | F4 | שחור/לבן, גבולות חזקים; שומר קוד-צבע Fitzgerald | הגדרות → גישה מוטורית |
| `reading-font` | C-18 | `--font-reading` + מרווחי אות/מילה/שורה מוגדלים | הגדרות → תצוגה ושורת קריאה |
| `sensory-calm` | C-06 | פלטת chrome רכה/מונמכת (`--cl-primary:#3F6A5A`, לבן-על-primary ≈6.1:1 AA) | הגדרות → תצוגה ושורת קריאה |
| `dark-mode` | — | מצב לילה | הגדרות → תצוגה |

`sensory-calm` דורס `--cl-*` ולכן מוגדר בקובץ הסמכות (`tokens.css`) תחת
`.sensory-calm:not(.high-contrast)` — ניגודיות גבוהה מנצחת רגיעה חושית.

## 5. נגישות וניגודיות

- טקסט/אייקונים לבנים על `--cl-primary-dk` — יעד AA (~5.3:1).
- `color-contrast` על `--cl-primary` (הקורל) נותר waived ב-axe עד להחלטת מיתוג/עיצוב.
- כל טוגל = `role="switch"` עם label ותיאור (`Toggle.tsx`), תמיכת מקלדת מלאה.

## 6. נדחה ל-[TBD]

- **Storybook עם הערות a11y** — דורש devDependencies + regeneration של lockfile
  (שובר `npm ci` בסביבת ה-API). `[TBD — lockfile/human]`.
- **קבצי גופן self-hosted** — ראו §3. `[TBD — binary]`.
