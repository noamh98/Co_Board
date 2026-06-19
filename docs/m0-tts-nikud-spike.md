# M0 — ספייק TTS + ניקוד (הסיכון הטכני המרכזי)

מקור: PRD §4.3, §9.3, §9.6. מטרת הספייק: להוכיח ארכיטקטורה ל-TTS עברי אופליין
ולניקוד אוטומטי, ולבודד את הסיכון מוקדם.

## TTS (`app/src/services/tts/ttsService.ts`)
- עוטף **Web Speech API** (`speechSynthesis`). תלויות מוזרקות (synth + יצירת utterance)
  → ניתן לבדיקה ללא דפדפן (ראה `ttsService.test.ts`).
- **אופליין-first:** `pickVoice` מעדיף קול he-IL עם `localService=true` (עובד ללא רשת),
  ואז ברירת מחדל.
- **חביון:** `speak` מודד זמן עד `onstart` ומחזיר `latencyMs` (יעד PRD §8.1: <300–500ms).
- **נפילה חיננית:** אם אין קול עברי כלל — מסמן `fellBack` ומקריא בקול ברירת המחדל ללא שגיאה.
- **מגבלה ידועה:** זמינות/איכות קולות he-IL תלויית-OS/דפדפן. קולות פרימיום (Almagu)
  ייכנסו כשכבה מקוונת בהמשך.

## ניקוד (`app/src/services/nikud/`)
- `nikudService.ts` — עדיפות מובטחת: **ידני > cache(nakdan) > רשת(Nakdan) > גלם(none)**.
  - תיקון ידני (`setManual`) **לעולם לא נדרס** ולא נשלח לרשת.
  - אופליין/כשל רשת → מחזיר טקסט גלם ללא שגיאה (אינווריאנט offline-first).
- `nikudCache.ts` — cache ב-IndexedDB (נשמר בין מופעים; נבדק עם fake-indexeddb).
- `nakdanClient.ts` — לקוח Dicta Nakdan. ⚠️ **TODO:** לאשר endpoint רשמי + רישוי
  שימוש לפני production; הפרסור best-effort.

## איך מריצים מקומית
```bash
cd app
npm install
npm run dev      # פתיחה בדפדפן — בדיקת קול עברי אמיתית (Web Speech API)
npm test         # טסטים (לוגיקה: layout/nikud/tts + smoke ל-UI)
npm run build    # build ל-PWA
```

## סיכונים פתוחים (להמשך)
- קול he-IL אופליין איכותי בכל פלטפורמת יעד (אנדרואיד/דסקטופ) — לאמת על מכשירים.
- Nakdan: endpoint/רישוי/דיוק; הומוגרפים ומורפולוגיה (PRD נספח C — חבילת QA עברית).
- חביון תחילת הקראה תחת עומס — למדוד על מכשיר יעד.
