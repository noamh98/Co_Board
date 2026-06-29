# presentation/state — פירוק `App.tsx` ל-hooks (H-APP · Phase 3) ⚠️ scaffolds

> **סדר מחייב:** פירוק `App.tsx` (1,093 ש') מתחיל **רק אחרי** ש-Phase 3 הוסיף טסטים
> קריטיים (boardRepo/syncMeta/predictionRepo/crypto/syncEngine) — הטסטים הם רשת-הביטחון
> שמוודאת *אפס שינוי-התנהגות*. ראה `02-Implementation-Program.md` §HANDOFF-C.

## מצב נוכחי
- `useAccessSettings.ts` — **ממומש** (חילוץ מלא של הגדרות-הגישה: load + save). מוכן לאימוץ ב-App.tsx.

## scaffolds נותרים (Opus יעצב את גבולות ה-state; Sonnet יחלץ מכני)
כל אחד מחלץ אשכול-state יחיד מ-App.tsx לכדי hook + (במידת הצורך) context יחיד,
במקום 20+ `useState` ו-prop-drilling (AccessSettingsPanel מקבל 11+ props):

| hook | אחריות (state נוכחי ב-App.tsx) | תלות |
|---|---|---|
| `useTtsConfig` | `ttsRef`, `fallbackTtsRef`, voiceURI, rate, pitch, יצירת ה-provider (`createTtsProvider`) | services/tts |
| `useSyncEngine` | `syncEngineRef`, `syncStatus`, `syncEnabled`, online-listener | services/sync |
| `useAuthState` | `authUser`, `authChecked`, Firebase auth listener, status/admin claim | services/sync |
| `usePrediction` | שורת ניבוי, `recordSequence`, context מילים | domain/prediction |
| `useModeling` | מצב modeling/highlight | domain/modelingSession |

**יעד:** `App.tsx` < 250 שורות הרכבה בלבד. **קבלה:** כל הטסטים הקיימים עוברים ללא שינוי.
**זהירות:** לא להתחיל לפני שהטסטים הקריטיים ירוקים.
