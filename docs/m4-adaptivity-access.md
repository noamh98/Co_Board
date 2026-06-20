# M4 — Adaptivity & Access (2026-06-20)

מימוש FR-014, FR-015, FR-019, FR-020 (PRD §4.7). התאמה הדרגתית של אוצר המילים,
גריד דינמי, מצב נעול מלא (Guided Access) והגדרות גישה מוטוריות — הכל offline-first.

## Domain
- **`domain/accessSettings.ts`** — טיפוסי `AccessSettings` (dwellTimeMs, activateOnRelease,
  doubleTapPrevention, dwellPreviewMs) + `DEFAULT_ACCESS_SETTINGS` (הכל כבוי כברירת מחדל).
- **`domain/adaptivity.ts`** (טהור, immutable):
  - `toggleCellVisibility(board, cellId)` — מחליף `hidden`. תא ליבה ניתן להסתרה (לא מחיקה).
  - `hiddenFilter(board)` — מסיר cells+placements של hidden בלבד (למצב ילד). `isCore` אינו משפיע.
  - `applyCellSize(board, newGrid)` — עוטף `resizeBoard`; `ViolationError` מתפשט אם ליבה נופלת מהגריד.
  - 8 בדיקות ב-`adaptivity.test.ts`.

## Data
- **`data/settingsRepo.ts`** — `getAccessSettings()`/`saveAccessSettings()`. נשמר כ-JSON תחת
  key `accessSettings` ב-store `settings` הקיים (ללא שינוי DB_VERSION — upgrade אדיטיבי).
  `get` ממזג עם ברירת מחדל → סובלני לשדות חדשים עתידיים. 3 בדיקות ב-`settingsRepo.test.ts`.

## Services
- **`services/access/dwellService.ts`** — 3 React hooks:
  - `useDwellActivation` — מפעיל אחרי `dwellTimeMs`; מבטל ב-leave; `=0` → handlers ריקים.
    מנקה timer ב-unmount (ללא memory leak).
  - `useActivateOnRelease` — `onPointerUp` אם פעיל, אחרת `onClick`.
  - `useDoubleTapPrevention` — מסנן לחיצה שנייה בתוך 800ms.
  - 7 בדיקות (vitest fake timers) ב-`dwellService.test.ts`.

## Presentation
- **`CellButton.tsx`** — מרכיב את 3 ה-hooks: double-tap עוטף את ההפעלה, activate-on-release קובע
  אם ב-click או pointerUp, dwell מוסיף ריחוף (גם הוא דרך guard המגע-הכפול). `settings` prop אופציונלי
  (ברירת מחדל = כבוי) — שומר תאימות לאחור.
- **`BoardView.tsx`** — מעביר `accessSettings` ל-CellButton; ממשיך לסנן `cell.hidden` (מצב ילד).
- **`presentation/builder/HiddenToggle.tsx`** — כפתור הסתרה/חשיפה בתוך CellEditor.
- **`presentation/builder/GridSizePicker.tsx`** — בורר 2–8 בכל ציר; מאמת מול `applyCellSize` ומציג
  אזהרה וחוסם "החל" אם ליבה תיפול מהגריד.
- **`BuilderView.tsx`** — `handleResize` (הגנה כפולה על ViolationError); תאים hidden מוצגים בעריכה
  עם `opacity 0.4`.
- **`presentation/settings/AccessSettingsPanel.tsx`** — slider Dwell (0–3000ms) + checkboxes; controlled,
  נשמר דרך App → `settingsRepo.saveAccessSettings`.
- **`AdultBar.tsx`** — כפתור "הגדרות" (onOpenSettings).
- **`App.tsx`** — טוען accessSettings באתחול; **Guided Access (FR-019)**: במצב `locked` חוסם
  ניווט-אחורה (popstate re-push) ו-beforeunload (מניעת יציאה בטעות). ב-PWA לא ניתן לנעול OS מלא.

## Definition of Done
- lint 0 errors, **99 tests** (+18), build ירוק.
- hidden toggle עובד בעריכה (opacity) ומוסתר במצב ילד.
- גריד דינמי עם אזהרת ViolationError אם ליבה נופלת.
- Dwell 0=כבוי, activate-on-release, double-tap prevention.
- הגדרות נשמרות offline (IndexedDB).
