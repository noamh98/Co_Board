# M12 — Voice Recording Playback

**תאריך:** 2026-06-21  
**CI:** lint 0 errors, 197 tests (+3), build ירוק.

## מה בוצע

### הבעיה
`ttsService.speak(label)` תמיד השתמש ב-Web Speech API. תאים עם הקלטה קולית (נשמרה ב-`symbolRepo` דרך CellEditor) לא ניגנו את ההקלטה — רק הקריאו את ה-label טקסטואלית.

### הפתרון: `speakCell`

**`app/src/services/tts/ttsService.ts`** — נוספה `speakCell(cell, symbolRepo, tts)`:

1. אם `cell.symbolId` קיים → `symbolRepo.get(symbolId)` → אם `entry.source === 'recording'` → `new Audio(entry.uri).play()`
2. אם Audio.play נכשל (catch) → fallback ל-`tts.speak(label)`
3. אם אין symbolId / אין entry / entry לא recording → `tts.speak(vocalization ?? nikud ?? label)`

הגיון: `SymbolEntry.uri` הוא data URI (base64) מ-`blobToDataUri()` ב-CellEditor — ניתן להשמעה ישירות ב-`Audio`.

**`app/src/App.tsx`** — `onCell` מחליף `speak(vocalize(cell))` ב-`void speakCell(cell, symbolRepoRef.current, ttsRef.current)`.

### אינווריאנטים (M12)
| מצב | התנהגות |
|-----|---------|
| symbolId + entry.source='recording' | `Audio(uri).play()` |
| symbolId + entry חסר / לא recording | `tts.speak(label)` |
| אין symbolId | `tts.speak(label)` — symbolRepo.get לא נקרא |
| Audio.play נכשל | fallback ל-`tts.speak(label)` — ללא קריסה |
| `speak` קיים (HebrewTts.speak) | ללא שינוי — תאימות לאחור מלאה |

### טסטים חדשים (`ttsService.test.ts` — +3)
1. הקלטה קיימת → `Audio.play` נקרא; `tts.speak` לא נקרא
2. symbolId קיים אך אין entry → `speak(label)` נקרא
3. אין symbolId → `speak(label)` נקרא, `repo.get` לא נקרא
