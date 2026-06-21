# M10 — Phrase Bank (בנק משפטים)

## מטרה
קלינאי/הורה שומר משפטים שנבנו בשורת המשפט, רואה אותם ברשימה, וטוען בלחיצה אחת.
ילד אינו רואה את פיצ'ר זה (מצב נעול — onSave לא מועבר).

## קבצים חדשים
| קובץ | תיאור |
|------|--------|
| `domain/phraseBank.ts` | `PhraseEntry` + `createPhrase` |
| `domain/phraseBank.test.ts` | 2 בדיקות domain |
| `data/phraseRepo.ts` | `savePhrase`/`listPhrases`/`deletePhrase` (IndexedDB) |
| `data/phraseRepo.test.ts` | 3 בדיקות data |
| `presentation/phraseBank/PhraseBankPanel.tsx` | Panel modal RTL |
| `presentation/phraseBank/PhraseBankPanel.test.tsx` | 3 בדיקות UI |

## קבצים שונו
| קובץ | שינוי |
|------|-------|
| `data/db.ts` | DB_VERSION=7, store `phrases` (by-profile index) |
| `presentation/components/SentenceBar.tsx` | prop `onSave?`, כפתור "שמור" conditional |
| `presentation/components/AdultBar.tsx` | prop `onOpenPhraseBank?`, כפתור "ביטויים שמורים" |
| `App.tsx` | wiring מלא — state, handlers, modal, toast |

## זרימת שימוש (happy path)
1. מבוגר לוחץ תאים → שורת משפט מתמלאת.
2. לוחץ "שמור" → `createPhrase` + `savePhrase` + toast "נשמר!" 1.5s.
3. לוחץ "ביטויים שמורים" ב-AdultBar → `listPhrases(profileId)` → panel נפתח.
4. לוחץ "טען" ליד ביטוי → `setSentence(cells)` + panel נסגר.
5. לוחץ "×" ליד ביטוי → `deletePhrase(id)` + מסיר מה-state.

## אינווריאנטים
- DB_VERSION=7 אדיטיבי — נתוני v6 שורדים.
- `listPhrases` מסוננת לפי `profileId` — ביטויים פרופיל A לא גולשים ל-B.
- כפתור "שמור" נסתר כש-`sentence.length === 0` או מצב ילד.
- "טען" מחליף שורת המשפט (לא מוסיף).
- RTL מלא בכל הרכיב.

## CI
- lint: 0 errors
- tests: 190 passed (+8 חדשים)
- build: ירוק
