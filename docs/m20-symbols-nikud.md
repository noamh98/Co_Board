# M20–M21 — סמלים לכל מילה + ניקוד (תוכנית ביצוע)

> מטרה: לכל תא בספריית הלוחות יהיה **סמל ויזואלי** (PRD §4.2, FR-002) ו**ניקוד מאומת** (PRD §4.3, FR-009).
> אינווריאנט-על: **offline-first** — סמלים חייבים לעבוד ללא רשת (HANDOFF §4). לכן סמלים נארזים מקומית, לא נטענים מ-URL בזמן ריצה.

---

## 0. מצב נוכחי (baseline)

| נושא | מצב | פער |
|------|-----|-----|
| `Cell.symbolId` + `Cell.imageUri` | קיימים במודל (`domain/models.ts`) | — |
| `CellButton` רינדור תמונה | מרנדר `imageUri` + `onError`→fallback ל-label (`CellButton.tsx`) | — |
| ניקוד בספרייה | קיים ידני בכל ~155 תאים (`boardLibrary.ts`) | לא עבר QA שיטתי |
| **סמלים בספרייה** | **0 תאים — כולם טקסט בלבד** | **כל המילים** |
| ARASAAC client | `searchSymbols`/`getImageUrl` (`arasaacClient.ts`) | URL מרוחק בלבד, לא offline |
| SymbolPicker בבילדר | קיים (M8) לתאים מותאמים | — |

11 לוחות בספרייה, **~155 תאי-מילה** (פרט תאי ניווט). ~**110 מילים ייחודיות** (חזרות: רוצה/עוד/לא/לאכול…).

---

## M20 — סמלים לכל מילה

### החלטה ארכיטקטונית (Decisions Log)

**מקור סמלים:** ARASAAC (חינמי, CC, פתוח — תואם PRD §4.2 "בסיס חינמי").
**שיטת אספקה:** **מפת ID ידנית + אריזה מקומית** (bundled offline), לא fetch בזמן ריצה.

נימוק — נשקלו 3 חלופות:
| חלופה | offline | דיוק | עלות |
|-------|---------|------|------|
| A. fetch לפי label בזמן ריצה | ❌ שובר אינווריאנט | בינוני (מילה עברית→חיפוש לא דטרמיניסטי) | נמוך |
| B. מפת `word→arasaacId` + URL מרוחק | ❌ load ראשון דורש רשת | גבוה (ID נבחר ידנית) | בינוני |
| **C. מפת ID + הורדה ל-`public/symbols/` בבילד** ✅ | ✅ נארז ב-PWA precache | גבוה | בינוני |

**נבחר C.** סמל לכל מילה נבדק ידנית פעם אחת, נארז כקובץ מקומי, עובד אופליין מלא.

### שלבים

**שלב 20.1 — מפת מילה→סמל**
קובץ חדש `app/src/domain/symbolMap.ts`:
```ts
// מילה עברית (label, ללא ניקוד) → ARASAAC pictogram id
export const SYMBOL_MAP: Record<string, number> = {
  'אני': 6632,
  'רוצה': 11947,
  'עוד': 38489,
  // ... כל ~110 המילים הייחודיות
};
export function symbolIdFor(label: string): number | undefined {
  return SYMBOL_MAP[label.trim()];
}
export function localSymbolPath(id: number): string {
  return `/symbols/${id}.png`; // נארז ב-public, precache ע"י Workbox
}
```
מקור ה-IDs: חיפוש ב-`api.arasaac.org` לכל מילה, בחירת הפיקטוגרמה המתאימה ביותר ידנית (מבוגר מאמת — PRD §4.2 "אימות אנושי").
תאי משפט/צירוף ("לא רוצה", "כואב לי", "ארוחת בוקר") → מיפוי למילת-הליבה או סמל ייעודי אם קיים.

**שלב 20.2 — סקריפט הורדה (build-time)**
`app/scripts/fetch-symbols.mjs`:
- קורא `SYMBOL_MAP`, מוריד לכל id את `static.arasaac.org/pictograms/{id}/{id}_500.png`.
- שומר ב-`app/public/symbols/{id}.png` (גודל 500 מספיק לתא; חוסך משקל).
- מדלג על קבצים קיימים (idempotent). רץ ידנית: `node scripts/fetch-symbols.mjs`.
- הקבצים מתווספים ל-git (נארזים ב-build, לא תלויים ברשת אצל המשתמש).

**שלב 20.3 — חיבור לספרייה**
עדכון `word()` ב-`boardLibrary.ts` לצרף סמל אוטומטית לפי label:
```ts
function word(cellId, label, nikud, fitz, isCore = false): Cell {
  const sid = symbolIdFor(label);
  return {
    id: cellId, label, nikud, vocalization: nikud,
    fitzgerald: fitz, isCore, action: { type: 'speak' },
    ...(sid ? { symbolId: `arasaac:${sid}`, imageUri: localSymbolPath(sid) } : {}),
  };
}
```
מילה ללא מיפוי → ללא סמל, label בלבד (fallback קיים, לא קורס).
שדרוג DB: סמלי-ספרייה נארזים בקוד, **לא** דורש DB_VERSION bump (הם חלק מ-seed הלוחות; `bootstrap.ensureSeeded` יזריע מחדש לוחות-ליבה).

**שלב 20.4 — Workbox precache**
ב-`vite.config.ts` (VitePWA) לוודא `public/symbols/**` נכלל ב-`globPatterns` של precache → אופליין מלא.

**שלב 20.5 — תאי ניווט**
`navCell` מקבל גם סמל קטגוריה (אוכל/רגשות/משחק/בריאות/משפחה/בי"ס) — אופציונלי, משפר זיהוי.

### בדיקות M20
- `symbolMap.test.ts` — כל מילה ייחודית בספרייה קיימת ב-`SYMBOL_MAP` (חוסם פערים).
- `boardLibrary.test.ts` (הרחבה) — כל תא-מילה שאינו ניווט מקבל `imageUri`.
- בדיקת קיום קבצים: `public/symbols/{id}.png` קיים לכל id במפה.
- `CellButton.test.tsx` קיים — מאמת רינדור + fallback.

### סיכוני M20
| סיכון | מיטיגציה |
|-------|----------|
| ARASAAC חסר פיקטוגרמה למילה עברית-תרבותית (במבה/ביסלי/שבת) | fallback ל-label; דגל למילים אלו → צילום אישי/AI בפאזה 2 |
| משקל repo (~110 PNG × ~10KB ≈ 1–2MB) | גודל 500px + אופציה ל-webp; מקובל ל-PWA |
| בחירת ID שגוי (סמל לא תואם) | אימות אנושי ידני בשלב 20.1; review |

---

## M21 — ניקוד מאומת לכל מילה

### מצב
ניקוד ידני כבר קיים בכל תאי הספרייה. המשימה: **אימות שיטתי + תיקון**, לא הוספה מאפס.

### שלבים
**שלב 21.1 — QA ניקוד ספרייה**
מעבר על כל ~155 התאים מול נספח C ב-PRD (טבלת בדיקות TTS עברי):
- הומוגרפים: `סֵפֶר` (book) vs `סָפַר` — לוודא הנכון בהקשר.
- זכר/נקבה: `רוֹצֶה`/`רוֹצָה`.
- שמות תרבותיים: במבה/ביסלי.
- תיקון שגיאות שיימצאו ישירות ב-`boardLibrary.ts`.

**שלב 21.2 — auto-nikud לתאים מותאמים**
לוודא ש-`CellEditor` (בילדר) מפעיל `nikudService` כשהמבוגר מקליד מילה חדשה, עם override ידני נשמר (כבר קיים — אימות בלבד).

**שלב 21.3 — בדיקת הקראה בפועל**
הרצת TTS על משפטי נספח C ("אני רוצה לשחק", "כואב לי בבטן") ואימות שמיעתי — מתועד כ-checklist ידני ב-`docs/verification.md` (אין אוטומציה ל-TTS שמיעתי).

### בדיקות M21
- `boardLibrary.test.ts` — כל תא-מילה (לא ניווט) בעל `nikud` לא-ריק.
- regex sanity: `nikud` מכיל לפחות סימן ניקוד אחד (U+05B0–U+05C7) לכל מילה לא-לועזית.

---

## רצף ביצוע מומלץ
1. **M20.1** מפת `SYMBOL_MAP` (הליבה — דורש עבודת אימוּת ידנית, הכי ארוך).
2. **M20.2** סקריפט הורדה → `public/symbols/`.
3. **M20.3–20.4** חיבור ל-`boardLibrary` + precache.
4. **M20.5** סמלי ניווט.
5. **M21.1** QA ניקוד.
6. **M21.2–21.3** אימות auto-nikud + הקראה.
7. בדיקות + lint + build → CI ירוק → deploy.

## הגדרת "בוצע" (DoD)
- [x] כל מילה ייחודית בספרייה ↔ סמל ARASAAC מקומי (iPad=חריג מתועד). 136 מיפויים.
- [x] סמלים עובדים אופליין (precache 148 entries / 3.6MB מאומת ב-build).
- [x] כל תא-מילה בעל ניקוד עם guard אוטומטי; הומוגרף סֵפֶר מאומת.
- [x] בדיקות חדשות ירוקות (236 tests, +4); lint 0; build ירוק.
- [x] `HANDOFF.md` changelog + doc זה עודכנו.

## נותר (לסשן הבא)
- אימות ויזואלי אנושי של 136 הסמלים (האוטומט בחר ראשון — חלק עלולים להיות לא-אופטימליים). תיקון → `SYMBOL_OVERRIDES` ב-`symbolMap.ts`.
- M20.5 — סמלי קטגוריה לתאי ניווט (`navCell`).
- במבה/ביסלי כרגע סמל חטיף גנרי — שדרוג לצילום אישי/סמל-AI ייעודי (פאזה 2).
