# HANDOFF — אפליקציית AAC עברית ("לוח תקשורת")

> מקור-האמת היחיד לפרויקט. קרא אותי בתחילת כל סשן. אל תגזור את המערכת מחדש מהקוד אם מסמך זה מספיק.
> **שלב נוכחי:** תכנון/אפיון הושלם. הקוד **טרם נכתב** — הסשן הבא בונה את ה-MVP לפי ה-PRD.

## 1. Purpose
אפליקציית תקשורת תומכת וחליפית (AAC) עברית-ראשונה לילדים עם קשיי תקשורת (דגש אוטיזם), עבור קלינאי תקשורת והורים. המוצר הוא **מערכת לפיתוח שפה** (אוצר ליבה, עקביות מוטורית, מודלינג, הדרגתיות) ולא רק מחולל לוחות. מסחרי, אנדרואיד+Web תחילה ואז iPad.

## 2. Stack (מתוכנן — להכרעה סופית בסשן הבא)
- **Client:** מסגרת חוצת-פלטפורמות, קוד משותף Android + Web (PWA) → iOS. **מומלץ Flutter** (חלופה: React Native + PWA).
- **State/Logic:** שכבת domain מופרדת (לוחות, פרופילים, ניווט, הרשאות).
- **Data:** Offline-first — DB מקומי (SQLite / IndexedDB) כמקור אמת; Sync Engine אסינכרוני לענן.
- **TTS:** היברידי — מנוע אופליין מקומי + קולות פרימיום מקוונים (ספק מועדף: Almagu).
- **Nikud:** שירות נקדן (Nakdan API) + cache מקומי.
- **Media:** Camera API, הסרת רקע on-device (ML), כיווץ WebP.
- **Symbols:** ARASAAC (בסיס חינמי) → SymbolStix/PCS/Widgit (רישוי).
- **Cloud:** Auth/RBAC, Sync, Backup; פורטל עריכה מרחוק (פאזה 2).

## 3. Architecture (layers)
```
Presentation (UI, RTL-first, child mode / adult mode)
        │  קוד משותף (Flutter / RN+PWA)
Domain / Logic (boards · profiles · navigation · gradualness · permissions)
        │
Services (TTS offline↔online · Nikud+cache · Media · Symbols · Analytics-local)
        │
Data (Offline-first local DB → async two-way Sync → Cloud · encrypted backup · OBF)
```
זרימה: UI → Domain → Services → Data(local) → (sync) Cloud.

## 4. Non-obvious rules / invariants
| כלל | היכן (מתוכנן) |
|------|----------------|
| מילות ליבה **לא זזות** ממיקומן לאורך התפתחות הילד (Motor Planning) | Domain: board layout · כל שינוי גריד |
| Offline-first: תקשורת/ניווט/TTS בסיסי/סמלים **חייבים** לעבוד ללא רשת | Services + Data |
| ניקוד: לעולם לא להיתלות ברשת בשימוש חוזר — cache + תיקון ידני לכל מילה | Services/Nikud |
| נתוני ילדים רגישים: אנליטיקה כבויה כברירת מחדל / מקומית; הורה שולט בהעלאה | Services/Analytics + Privacy |
| מצב ילד נעול; מעבר לעריכה רק בקוד מטפל | UI/Modes + RBAC |
| הקראה כמעט-מיידית: משוב ויזואלי <100ms, תחילת TTS אופליין <300–500ms | Services/TTS + UI |
| RTL מלא בכל מסך; יישור לימין; כיוון ניווט תואם | UI |
| שינוי AI/אוטומטי ללוח חייב לכבד עקביות מיקום (אזהרה לפני הזזה) | Domain + AI services |

## 5. Data flow (happy path — שימוש יומיומי)
1. פתיחה במצב נעול (Guided Access) → טעינת פרופיל ילד מה-DB המקומי.
2. רינדור לוח הבית (מילות ליבה במיקום קבוע).
3. הילד לוחץ תא → הוספה לשורת המשפט + הקראת מילה (TTS אופליין).
4. ניווט לקטגוריה → בחירת מילה נוספת → עדכון המשפט.
5. לחיצה על שורת המשפט → הקראת המשפט המלא ברצף.
6. תיעוד שימוש נשמר מקומית (אם מופעל); סנכרון אסינכרוני לענן כשיש רשת.

## 6. If you touch X, be careful with Y
| נגעת ב | סיכון |
|---------|--------|
| גודל גריד / פריסת לוח | פגיעה בעקביות מיקום מילות ליבה (Motor Planning) |
| מנוע TTS / קולות | רגרסיה באופליין; חביון; דיוק ניקוד/מורפולוגיה עברית |
| שכבת Sync | התנגשות רב-מכשירית; דריסת נתוני שימוש; אובדן גרסאות |
| הרשאות / מצב נעול | חשיפת עריכה לילד; דליפת פרטיות |
| ספריות סמלים | רישוי (SymbolStix/PCS/Widgit) — ודא זכאות בחבילה |
| פיצ'רי AI | פלט לא מאומת מוצג לילד; פרטיות |

## 7. Docs
| קובץ | מתי לקרוא |
|------|-----------|
| `PRD/PRD-he.md` | מקור-האמת המלא למוצר (12 סעיפים) — קרא תחילה |
| `PRD/PRD-en.md` | גרסה אנגלית מקבילה (למשקיעים/מפתחים בינ"ל) |
| `EXECUTION-PROMPT.md` | פרומפט הבנייה לסשן חדש (תהליך, תתי-סוכנים, בדיקות, תיעוד) |
| `*.docx` (שורש) | 4 מסמכי המחקר המקוריים: GEMINI, chat gpt, אופוס, חוקר 1 |
| `README.md` | סקירת ה-repo והוראות |

## 8. Changelog
- **2026-06-19** — הקמת repo; איחוד 4 מסמכי מחקר ל-PRD דו-לשוני (`PRD-he.md` + `PRD-en.md`, 12 סעיפים). הכרעות: פלטפורמה Android/Web→iPad; חביון הופרד למשוב/הקראה; Modified Fitzgerald כברירת מחדל. נוצרו `HANDOFF.md`, `README.md`, `EXECUTION-PROMPT.md`. הקוד טרם נכתב.
