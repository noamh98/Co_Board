# M13 — Guided Modeling Mode

**תאריך:** 2026-06-21  
**CI:** lint 0 errors, 202 tests (+5), build ירוק

## מה נבנה

מצב מודלינג: מטפל לוחץ "מודלינג" ב-AdultBar → כל לחיצת תא מדגישה אותו ויזואלית בלבד (glow/outline סגול), ללא הוספה לשורת המשפט ולא הקראה. הילד במצב נעול ואינו מושפע.

## קבצים שנוצרו

| קובץ | תיאור |
|------|-------|
| `domain/modelingSession.ts` | Domain טהור: `ModelingSession`, `createModelingSession`, `toggleHighlight`, `clearHighlights` (immutable) |
| `domain/modelingSession.test.ts` | 4 בדיקות: יצירה, toggle (הוספה+הסרה), clearHighlights, immutability |
| `presentation/components/BoardView.test.tsx` | בדיקת class `cell--modeling-highlight` על תאים ב-set |

## קבצים שעודכנו

| קובץ | שינוי |
|------|-------|
| `presentation/components/BoardView.tsx` | prop `modelingHighlights?: Set<string>` — wrapper div מקבל class `cell--modeling-highlight` |
| `presentation/components/AdultBar.tsx` | props `modelingActive?`, `onToggleModeling?` — כפתור "מודלינג" עם `aria-pressed` |
| `App.tsx` | state `modelingActive` + `modelingSession`; handler `onToggleModeling`; `onCell` — יציאה מוקדמת במצב מודלינג (highlight בלבד) |
| `index.css` | `.adult-btn`, `.adult-btn--active` (סגול), `.cell--modeling-highlight` (outline+glow) |

## Invariants

- `modelingActive && mode === 'adult'` → לחיצת תא = highlight בלבד, ללא speak, ללא שורת משפט
- `mode === 'locked'` → onCell רגיל (ילד לא מושפע)
- סגירת מודלינג (`onToggleModeling → next=false`) → `modelingSession = null` → highlights נעלמים
- immutable: `toggleHighlight` לא משנה session מקורי
