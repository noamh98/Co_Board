# M11 — Cell Image Rendering

תאריך: 2026-06-21

## מה השתנה

### CellButton.tsx
- הוסף `useState<boolean>` לשגיאת טעינה (`imgError`).
- אם `cell.imageUri` קיים ו-`imgError=false` → מרנדר `<img>` מעל ה-label.
- `loading="lazy"`, `aria-hidden="true"`, `alt=""` (תמונה דקורטיבית — label נושא את המשמעות).
- `onError` → `setImgError(true)` → img מוסר מה-DOM; label נשאר גלוי (AAC invariant).

### index.css
- `.cell` — נוסף `flex-direction: column` (היה `align-items: center; justify-content: center` בלבד).
- `.cell__image` — `width: 100%; max-height: 60%; object-fit: contain; border-radius: 4px`.
- `.cell__label` — `font-size: 0.85rem; text-align: center; width: 100%`.

### BuilderView.tsx
לא שונה — כבר כלל img rendering (שורות 379–385) לפני M11.

## טסטים חדשים

| קובץ | בדיקה |
|------|-------|
| `CellButton.test.tsx` | תא ללא imageUri → אין img DOM |
| `CellButton.test.tsx` | תא עם imageUri → img עם src נכון |
| `CellButton.test.tsx` | onError → img נסתר, label נשאר |
| `BuilderView.test.tsx` | builder: תא עם imageUri מציג img |

## Invariants
- **label תמיד גלוי** — AAC invariant; לא מוסתר גם אם יש תמונה.
- **onError graceful fallback** — img מוסר, label נשאר.
- **RTL** — img ממורכז (flex column + align-items:center); לא מוצג הפוך.
- **Offline** — img נטען עצלנית (`loading="lazy"`); fallback מונע שבירה.

## CI
lint: 0 errors, 1 warning (קיים מלפני). tests: 194 עוברים. build: ירוק.
