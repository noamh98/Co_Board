# M1 — Data & Profiles

> מסמך פירוט ל-HANDOFF §3/§4. נכתב 2026-06-19. מקור-אמת למוצר: `PRD/PRD-he.md` (§4.5, §7, §8.4, §9.1).
> דרישות מכוסות: FR-001 (פרופילים), FR-019 (מצב נעול+ילד/מבוגר), FR-021 (אופליין), FR-022 (גיבוי/שחזור),
> FR-027 (הרשאות). מחוץ ל-M1: סנכרון ענן (M5), Guided-Access מלא + Onboarding (M4), Builder (M3).

## 1. שכבת Data (IndexedDB)

`app/src/data/db.ts` — מקור-אמת מקומי יחיד (offline-first, אינווריאנט HANDOFF §4).

- `DB_NAME='luach-aac'`, `DB_VERSION=2`.
- Stores (כולם keyPath מפורש):
  | store | keyPath | תוכן |
  |-------|---------|------|
  | `nikud` | `text` | cache ניקוד + override ידני (M0) |
  | `boards` | `id` | לוחות (`Board`) |
  | `profiles` | `id` | פרופילי ילד (`Profile`) |
  | `settings` | `key` | key/value: `activeProfileId`, `caregiverPin` |
- **מיגרציה (אינווריאנט: לא הורסת נתונים):** `upgrade` יוצר כל store עם guard `if (!contains)`,
  כך ששדרוג v1→v2 רק *מוסיף* stores ושומר את נתוני ה-`nikud` הקיימים. נבדק ב-`migration.test.ts`
  (פותח v1 ידנית, כותב רשומה, משדרג ל-v2, מוודא שהרשומה שרדה + ה-stores החדשים קיימים).
- `resetDbForTests()` — מאפס את ה-singleton; לבדיקות בלבד (פתיחה מחדש מול `IDBFactory` נקי).

## 2. מאגרים (Repositories)

`boardRepo.ts` · `profileRepo.ts` — אותה חתימה:
- `get(id)` · `list({ includeArchived? })` · `save(entity)` · `archive(id)`.
- **מחיקה = ארכוב (מחיקה רכה):** `archive` קובע `archived:true` ושומר את הרשומה. `list()` מסנן
  מאורכבים כברירת מחדל; `list({ includeArchived:true })` מחזיר הכול (לשחזור — PRD §4.5/§4.8, FR-022).

`settingsRepo.ts` — `getActiveProfileId`/`setActiveProfileId`, `getCaregiverPin`/`setCaregiverPin`.

## 3. פרופילים ו-bootstrap

`bootstrap.ts` — תזמור שכבת ה-Data לצריכת ה-UI:
- `ensureSeeded()` — **חד-פעמי, idempotent.** בהתקנה נקייה בלבד (אין פרופילים כלל) זורע את
  `SAMPLE_PROFILE` + `SAMPLE_CORE_BOARD` ומגדיר פרופיל פעיל. תמיד מוודא קיום קוד מטפל (`DEFAULT_PIN`).
- `cloneBoard(source, name)` — קלון עמוק (`structuredClone`) עם מזהה חדש; **לא דורס את המקור**
  (PRD §4.1 edge case). ה-`placements` נשמרים → **עקביות מוטורית נשמרת בקלון** (Motor Planning).
- `createProfile(name)` — פרופיל ילד חדש עם לוח-בית עצמאי (קלון של לוח הליבה), נעול כברירת מחדל.
- `loadActiveContext()` — מחזיר `{ profiles, activeProfile, board }`; טוען את לוח הבית **מה-DB** (לא מהקבוע).
- `switchActiveProfile(id)` — מעדכן פרופיל פעיל ומחזיר הקשר מעודכן.

> הערה: פרופיל הדמו (`SAMPLE_PROFILE`) משתמש ישירות בלוח הליבה `home-core-9`; פרופילים שנוצרים
> בהמשך מקבלים קלון עצמאי. עריכת לוחות תיכנס ב-M3 (Builder) — אז יישמר גם הלוח המקורי כגיבוי נקי.

## 4. בקרת גישה (RBAC) ומצב נעול

`domain/access.ts` — לוגיקה טהורה (ללא I/O), נגזרת מ-`ROLE_CAN_EDIT` שב-`models.ts`:
- `canEdit(role)` — האם תפקיד רשאי לערוך (child/staff=false, parent/clinician=true).
- `canManageProfiles(mode)` — ניהול פרופילים זמין רק במצב `adult`.
- `verifyPin(input, stored)` — השוואה עם trim; קלט/קוד ריקים נדחים תמיד.
- `DEFAULT_PIN='1234'`, `ADULT_ROLE='parent'`.

**אכיפת UI (`App.tsx`):** `mode` מתחיל `locked` (אינווריאנט). מעבר ל-`adult` רק דרך `PinGate`
מול `caregiverPin` שב-settings. במצב מבוגר `AdultBar` חושף בורר פרופיל + יצירה + נעילה.

> **PIN = שער MVP מקומי בלבד, לא אבטחה קריפטוגרפית.** הקשחה (hash, ניסיונות, Guided-Access ברמת OS)
> ב-M4/M6. הצפנה-במנוחה (PRD §8.3) — M5.

## 5. בדיקות (35 עוברות)

| קובץ | כיסוי |
|------|--------|
| `data/migration.test.ts` | שדרוג v1→v2 לא הורס נתוני ניקוד; stores חדשים נוצרים |
| `data/repos.test.ts` | save/get/list, ארכוב=מחיקה רכה, seed idempotent, createProfile (קלון עצמאי), switch |
| `domain/access.test.ts` | RBAC (`canEdit`), `canManageProfiles`, `verifyPin` (כולל דחיית ריקים) |
| `App.test.tsx` | טעינה אסינכרונית מה-DB; נעול כברירת מחדל; PIN שגוי/נכון; יצירת פרופיל מחליפה פעיל |

איפוס fake-indexeddb בין בדיקות: `new IDBFactory()` + `resetDbForTests()` ב-`beforeEach`.

## 6. אינווריאנטים שנשמרו

offline-first (הכול מקומי) · נתוני ילד מקומיים/פרטיים · מצב נעול דיפולט · RTL מלא · מילות ליבה לא זזות
(`layout.ts` ללא שינוי; קלון שומר `placements`) · מיגרציה לא-הרסנית.

## 7. פתוח ל-M2+

- M2: רינדור לוח מלא (גדלי גריד דינמיים, ניווט בין לוחות, קישור תא), TTS+ניקוד חיים בלחיצה.
- M4: Guided-Access ברמת OS, שינוי PIN ב-UI, Onboarding הורה, הסתרה/חשיפה הדרגתית.
- M5: סנכרון ענן דו-כיווני, הצפנה-במנוחה, גיבוי/שחזור גרסאות מלא.
