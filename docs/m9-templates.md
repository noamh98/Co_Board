# M9 — Board Templates & Quick-Start Wizard

## סיכום
קלינאי יכול ליצור פרופיל חדש ולבחור תבנית לוח ראשונית ממוכנת דרך Wizard קצר.

## קבצים חדשים

| קובץ | תפקיד |
|------|--------|
| `domain/boardTemplates.ts` | 4 תבניות + `listTemplates` / `getTemplate` |
| `domain/boardTemplates.test.ts` | 3 בדיקות |
| `presentation/wizard/QuickStartWizard.tsx` | Wizard 3 שלבים, RTL |
| `presentation/wizard/QuickStartWizard.test.tsx` | 4 בדיקות |
| `data/bootstrap.test.ts` | 4 בדיקות `createProfileFromTemplate` |

## קבצים שונו

| קובץ | שינוי |
|------|-------|
| `data/bootstrap.ts` | נוסף `createProfileFromTemplate(name, templateId): Promise<string>` |
| `presentation/components/AdultBar.tsx` | נוסף `onOpenWizard?: () => void`; כשקיים — כפתור "פרופיל חדש" פותח wizard |
| `App.tsx` | `wizardOpen` state, import QuickStartWizard, `onWizardComplete` handler |
| `src/index.css` | CSS ל-`.wizard*` |

## 4 תבניות

| id | שם | גריד | הערה |
|----|----|------|------|
| `core4x4` | מילות ליבה (4×4) | 4×4 | משתמש ב-HOME_BOARD הקיים (Fitzgerald מלא) |
| `pecs6x3` | PECS בסיסי (6×3) | 3×6 | 18 תאים; ליבה מסומן isCore |
| `feelings3x3` | רגשות (3×3) | 3×3 | מקביל ל-EMOTIONS_BOARD |
| `blank4x4` | לוח ריק (4×4) | 4×4 | 0 תאים, 0 placements |

## אינווריאנטים

- `createProfileFromTemplate` — תבנית לא ידועה נופלת ל-`blank4x4` (לא קורסת).
- הלוח שנוצר הוא **קלון** (id חדש) — לא נוגע בתבנית המקורית.
- פרופיל חדש: `locked: true` (ברירת מחדל בטוחה).
- RTL: `dir="rtl"` על overlay + כל טקסטים עבריים.

## זרימת Wizard

```
[שלב 1] שם פרופיל (validation: שדה לא ריק)
    ↓ הבא
[שלב 2] בחירת תבנית — 4 כרטיסיות (aria-pressed)
    ↓ הבא
[שלב 3] אישור — שם + תבנית נבחרת
    ↓ "צור פרופיל"
createProfileFromTemplate(name, templateId)
    → switchActiveProfile(profileId)
    → סגירת wizard
```
