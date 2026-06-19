# HANDOFF — אפליקציית AAC עברית ("לוח תקשורת")

> מקור-האמת היחיד לפרויקט. קרא אותי בתחילת כל סשן. אל תגזור את המערכת מחדש מהקוד אם מסמך זה מספיק.
> **שלב נוכחי:** M2 (Communication Core) — בוצע. הבא בתור: M3 (Builder & Symbols).

## 1. Purpose
אפליקציית תקשורת תומכת וחליפית (AAC) עברית-ראשונה לילדים עם קשיי תקשורת (דגש אוטיזם), עבור קלינאי תקשורת והורים. המוצר הוא **מערכת לפיתוח שפה** (אוצר ליבה, עקביות מוטורית, מודלינג, הדרגתיות) ולא רק מחולל לוחות. מסחרי, אנדרואיד+Web תחילה ואז iPad.

## 2. Stack (הוכרע ב-M0)
- **Client:** **PWA — React 18 + TypeScript + Vite** (offline-first עם vite-plugin-pwa/Workbox). עטיפה ל-Android בהמשך (Capacitor/TWA); iOS בפאזה 2. (החלופה Flutter נדחתה ל-MVP כדי לקבל מוצר רץ ובדיק מיידית בדפדפן — ראה `docs/adr-0001-stack.md`.)
- **State/Logic:** שכבת domain מופרדת (TS טהור, ניתן-לבדיקה ללא UI).
- **Data:** Offline-first — IndexedDB (ספריית `idb`) כמקור אמת מקומי; Sync Engine לענן (M5).
- **TTS:** היברידי — Web Speech API (קולות he-IL של ה-OS, אופליין) כבסיס; קולות פרימיום מקוונים (Almagu) בהמשך.
- **Nikud:** Nakdan (Dicta) + cache ב-IndexedDB + override ידני. בסיס חינמי כעת; ספק/רישוי סופי — TODO.
- **Symbols:** ARASAAC (בסיס חינמי) → SymbolStix/PCS/Widgit (רישוי) — M3.
- **Test/CI:** Vitest + Testing Library; ESLint (flat); GitHub Actions (lint+test+build כשער חוסם).

## 3. Architecture (layers) — מיפוי לקוד (עודכן M2)
```
Presentation (UI, RTL-first)      → app/src/presentation/ + App.tsx + index.css
        │  React + TypeScript (PWA)   (BoardView · CellButton · SentenceBar · AdultBar · PinGate · NavBar)
Domain / Logic                    → app/src/domain/   (models · fitzgerald · layout/Motor-Planning · access/RBAC
        │                                              navigationStack · boardLibrary)
Services (TTS · Nikud · ...)      → app/src/services/ (tts/ · nikud/)
        │
Data (Offline-first local DB)     → app/src/data/  (db · boardRepo · profileRepo · settingsRepo · bootstrap)
```
**שכבת Data (M1+M2):** `db.ts` — IndexedDB (idb), DB_VERSION=2, stores: nikud/boards/profiles/settings.
`boardRepo`/`profileRepo` — load/save/list, **מחיקה=ארכוב**. `settingsRepo` — פרופיל פעיל + PIN.
`bootstrap.ts` — `ensureSeeded` (seed ספריית לוחות M2 + פרופיל דמו), `createProfile` (קלון לוח עצמאי),
`loadActiveContext` (מחזיר גם `allBoards` מלא), `switchActiveProfile`. **ניווט:** `domain/navigationStack.ts` —
מחסנית TS טהורה (push/pop/home; מניעת לולאה; בית תמיד בתחתית). **ספריית לוחות M2:** `domain/boardLibrary.ts` —
HOME 4×4, FOOD 4×4, EMOTIONS 3×3, PLAY 4×4. **בקרת גישה:** `domain/access.ts`.
זרימה: UI → Domain → Services → Data(local) → (sync) Cloud.

## 4. Non-obvious rules / invariants
| כלל | היכן בקוד |
|------|----------|
| מילות ליבה (`isCore`) **לא זזות** ממיקומן (Motor Planning); אזהרה+אישור לפני כל הזזה | `app/src/domain/layout.ts` (`detectPositionViolations`/`applyLayout`) + טסטים `layout.test.ts` |
| Offline-first: תקשורת/ניווט/TTS בסיסי/סמלים **חייבים** לעבוד ללא רשת | `vite.config.ts` (VitePWA) · `services/tts` (קול מקומי) · `services/nikud` (cache) · `data/db.ts` |
| ניקוד: עדיפות ידני>cache>רשת>גלם; ללא תלות ברשת בשימוש חוזר; ידני לעולם לא נדרס | `app/src/services/nikud/nikudService.ts` + `nikudService.test.ts` |
| TTS מעדיף קול מקומי (אופליין); נפילה חיננית אם אין קול עברי | `app/src/services/tts/ttsService.ts` (`pickVoice`/`speak`) |
| נתוני ילדים רגישים: מקומי/פרטי כברירת מחדל; אנליטיקה כבויה | פרופילים/לוחות ב-IndexedDB מקומי בלבד (`data/*Repo.ts`); ענן ב-M5 |
| מחיקת פרופיל/לוח = ארכוב (לא הסרה) — שחזור אפשרי | `data/boardRepo.ts`/`profileRepo.ts` (`archive` → `archived:true`) + `repos.test.ts` |
| מצב ילד נעול כברירת מחדל; מעבר לעריכה רק בקוד מטפל (PIN/RBAC) | `domain/access.ts` + `App.tsx` (mode=`locked`) + `presentation/PinGate.tsx` · הרחבת Guided-Access מלא ב-M4 |
| מיגרציית DB לא הורסת נתונים קיימים (upgrade אדיטיבי) | `data/db.ts` (`upgrade` עם guard) + `migration.test.ts` |
| הקראה כמעט-מיידית: משוב ויזואלי <100ms; תחילת TTS אופליין <300–500ms | `index.css` (`.cell` transition) · `ttsService` (`latencyMs`) |
| RTL מלא בכל מסך | `index.html` (`dir=rtl`) · `App` (`dir=rtl`) · `index.css` |
| שינוי AI/אוטומטי ללוח מכבד עקביות מיקום (אזהרה לפני הזזה) | אותו מנגנון `layout.ts` חל גם על שינוי אוטומטי |

## 5. Data flow (happy path — שימוש יומיומי)
1. פתיחה במצב נעול (Guided Access) → טעינת פרופיל ילד מה-DB המקומי.
2. רינדור לוח הבית (מילות ליבה במיקום קבוע) — `BoardView` לפי `placements`.
3. הילד לוחץ תא → הוספה לשורת המשפט + הקראת מילה (TTS אופליין).
4. ניווט לקטגוריה → בחירת מילה נוספת → עדכון המשפט.
5. לחיצה על "דבר" → הקראת המשפט המלא ברצף.
6. תיעוד שימוש נשמר מקומית (אם מופעל); סנכרון אסינכרוני לענן כשיש רשת.

## 6. If you touch X, be careful with Y
| נגעת ב | סיכון |
|---------|--------|
| `domain/layout.ts` / `placements` / גודל גריד | פגיעה בעקביות מיקום מילות ליבה (Motor Planning) — ודא שטסטים עוברים |
| `services/tts` | רגרסיה באופליין; חביון; בחירת קול לא-עברי |
| `services/nikud` | דריסת override ידני; תלות ברשת בשימוש חוזר |
| שכבת Sync (M5) | התנגשות רב-מכשירית; דריסת נתוני שימוש; אובדן גרסאות |
| הרשאות / מצב נעול | חשיפת עריכה לילד; דליפת פרטיות |
| ספריות סמלים | רישוי (SymbolStix/PCS/Widgit) — ודא זכאות בחבילה |

## 7. Docs
| קובץ | מתי לקרוא |
|------|-----------|
| `PRD/PRD-he.md` | מקור-האמת המלא למוצר (12 סעיפים) — קרא תחילה |
| `PRD/PRD-en.md` | גרסה אנגלית מקבילה |
| `EXECUTION-PROMPT.md` | פרומפט הבנייה (תהליך, תתי-סוכנים, בדיקות, תיעוד) |
| `app/README.md` | איך להריץ את ה-PWA (install/dev/test/build) + מבנה |
| `docs/adr-0001-stack.md` | החלטת ה-stack (PWA React/TS) — נימוק וחלופות |
| `docs/m0-tts-nikud-spike.md` | ספייק TTS+ניקוד: ארכיטקטורה, אופליין, סיכונים פתוחים |
| `docs/m1-data-profiles.md` | M1: שכבת Data, מאגרים, פרופילים, מיגרציה, מצב נעול/PIN |
| `docs/verification.md` | סטטוס אימות: למה לא ניתן להריץ npm בסנדבוקס; אימות דרך CI |
| `*.docx` (שורש) | 4 מסמכי המחקר המקוריים |

## 8. Changelog
- **2026-06-19 (M2 — Communication Core)** — **ניווט בין לוחות** (FR-013): `domain/navigationStack.ts` —
  מחסנית TS טהורה (`createNavStack`/`navPush`/`navPop`/`navHome`/`navCurrent`/`navCanGoBack`); מניעת לולאה ישירה;
  בית תמיד בתחתית; 8 בדיקות יחידה. **ספריית לוחות מוכנים** (FR-002): `domain/boardLibrary.ts` — 4 לוחות עבריים
  (HOME 4×4, FOOD 4×4, EMOTIONS 3×3, PLAY 4×4), מילות ליבה במיקום קבוע, תאי ניווט (`navigate`) מלוח הבית לקטגוריות.
  **`data/bootstrap.ts`**: `ensureSeeded` זורע ספריית לוחות מלאה + idempotent upgrade למשתמשי M1; `loadActiveContext`
  מחזיר `allBoards` מלא; `createProfile` מקלון מלוח הבית הנוכחי. **`App.tsx`**: מחסנית ניווט כ-state, טיפול
  ב-`navigate`/`back`/`home`/`deleteWord`/`clear` ב-`onCell` (back לא מוסיף לשורת המשפט — מניעת באג TouchChat);
  NikudService מחובר לרקע (לא חוסם TTS); NavBar קבוע (בית+חזור, disabled בבית). **`NavBar.tsx`**: כפתורים קבועים
  במיקום גאומטרי קבוע (PRD §4.4). **בדיקות**: 8 בדיקות ניווט חדשות ב-App.test.tsx. lint/test/build ירוקים.
  פרטים: `docs/m2-communication-core.md` (TODO לאחר CI).
- **2026-06-19 (M1 — Data & Profiles)** — שכבת Data הורחבה: `DB_VERSION 2` עם stores
  `boards`/`profiles`/`settings` לצד `nikud`; **upgrade אדיטיבי** שאינו הורס נתוני v1 (נבדק
  `migration.test.ts`). מאגרים: `boardRepo`/`profileRepo`/`settingsRepo` (load/save/list);
  **מחיקה=ארכוב** (FR-022). ריבוי פרופילי ילד (FR-001): `bootstrap.ts` — `ensureSeeded` (seed מ-SAMPLE),
  `createProfile` (קלון לוח-בית עצמאי, עקביות מיקום נשמרת), `loadActiveContext`/`switchActiveProfile`.
  **מצב נעול/RBAC** (FR-019/FR-027): `domain/access.ts` (`verifyPin`/`canEdit`/`canManageProfiles`),
  `App.tsx` נטען מה-DB (לא מהקבוע), נעול כברירת מחדל, מעבר למצב מבוגר בקוד מטפל (PIN, MVP) דרך
  `PinGate`/`AdultBar`. baseline M0 תוקן לירוק (lint). בדיקות: 35 עוברות (unit מאגרים+מיגרציה+access,
  integration מעבר-פרופיל+נעילה עם fake-indexeddb). lint/test/build ירוקים. פרטים: `docs/m1-data-profiles.md`.
- **2026-06-19 (M0)** — הוכרע stack: **PWA React+TS+Vite** (במקום Flutter ל-MVP; ADR-0001). נבנה scaffold תחת `app/` במבנה 4-שכבתי. אינווריאנט **Motor Planning** מומש ונבדק (`domain/layout.ts`). ספייקים: **TTS עברי** (Web Speech API, העדפת קול מקומי/אופליין, חביון) ו**ניקוד** (Nakdan+cache IndexedDB+override ידני, נפילה אופליין) — שניהם עם טסטים. מעטפת RTL מלאה + פרוסה אנכית (לחיצת תא→שורת משפט→הקראה). CI (GitHub Actions: lint+test+build). **הערה:** אימות `npm install/test/build` לא רץ בסנדבוקס (תקרת 45ש' לפקודה) — מאומת ע"י CI בדחיפה. ראה `docs/verification.md`.
- **2026-06-19** — הקמת repo; איחוד 4 מסמכי מחקר ל-PRD דו-לשוני (`PRD-he.md` + `PRD-en.md`, 12 סעיפים). הכרעות: פלטפורמה Android/Web→iPad; חביון הופרד למשוב/הקראה; Modified Fitzgerald כברירת מחדל. נוצרו `HANDOFF.md`, `README.md`, `EXECUTION-PROMPT.md`.
