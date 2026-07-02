# REFACTOR-PLAN — פירוק App.tsx ו-index.css

> עיקרון מנחה: **אפס שינוי התנהגות**. כל שלב = PR קטן שמזיז קוד as-is, `App.test.tsx` (12KB) משמש רתמת רגרסיה ראשית ורץ אחרי כל שלב. אין מחיקות — רק הזזות.

## חלק א' — App.tsx (‎1,147 שורות → יעד <300)

### מיפוי אחריות נוכחי (לפי שורות ב-`476cdc9`)

| אזור | שורות | תוכן |
|------|--------|------|
| Lazy imports + types | 1-131 | 5 מסכים lazy, `AppView`, `vocalize` |
| State declarations | 134-190 | ‎40+ useState, ‎10 refs |
| Bootstrap effect | 205-299 | seed, prune, settings, TTS, nikud, auth listeners |
| Sync engine effect | 303-330 | יצירה/החלפה של SyncEngine |
| Profile-switch reset | 336-346 | איפוס navStack/sentence |
| Guided-access lock | 350-364 | popstate/beforeunload |
| Settings handlers | 366-394 | access/voice/rate/pitch/photos/dark |
| Theme effects | 397-412 | dark-mode / high-contrast classes |
| Board derivations | 436-455 | currentBoard, visibleCells, boardMaxLevel |
| Prediction (I2) | 458-480, 596-617 | model, predictions, addPredictedWord |
| onCell dispatcher | 491-581 | speak/navigate/modifyWord/… |
| Sentence ops | 583-593, 715-737 | speakSentence, save/load/delete phrase |
| Scanning (I3) | 620-637 | useScanning wiring |
| Lock/library/profile handlers | 641-713 | unlock/lock/open/archive/switch/create |
| Auth handlers + gate | 739-844 | signIn/out/register + 4 early returns |
| Render | 846-1147 | shell + board + 8 מודאלים |

### מבנה יעד

```
app/src/
  App.tsx                          # קומפוזיציה בלבד: hooks + layout + gate
  presentation/app/
    AuthGate.tsx                   # 4 ה-early-returns (loading/login/pending/rejected)
    AppModals.tsx                  # 8 המודאלים + openPanel יחיד
    useAppBootstrap.ts             # אפקט 205-299 (seed, settings, TTS, nikud, auth listener)
    useSyncEngine.ts               # אפקט 303-330 + syncEnabled/syncStatus
    useTtsSettings.ts              # voiceURI/rate/pitch + persist + speak() + speakOpts יציב
    useLockMode.ts                 # mode + guided-access effect + lock()/unlock()
    useBoardNavigation.ts          # navStack + currentBoard/visibleCells/level + profile-reset
    useSentence.ts                 # sentence + append/delete/clear/modifyWord + phrases
    usePrediction.ts               # predictions + model + addPredictedWord
    useCellDispatcher.ts           # onCell (צורך את ה-hooks האחרים)
  presentation/state/
    panelState.ts                  # type PanelId = 'settings'|'backup'|…; openPanel state
```

### סדר מיגרציה (R1→R6) — מהעלה הבטוח לליבה

| שלב | מה זז | סיכון | בדיקת שער |
|-----|--------|--------|-----------|
| R1 | `useTtsSettings` + `useLockMode` + theme effects — עלים ללא תלות בשאר | נמוך | App.test + בדיקת נעילה ידנית |
| R2 | `AuthGate.tsx` + auth handlers — early-returns הם בלוק סגור | נמוך | auth2.test, LoginPanel.test |
| R3 | `usePrediction` + scanning wiring — תלויים רק ב-visibleCells/sentence | נמוך-בינוני | בדיקות prediction/scanning קיימות |
| R4 | `useSentence` + `useBoardNavigation` — הלב של ה-state הנגזר | בינוני | App.test מלא; לשים לב ל-race המתועד ב-336-346 (להעביר את ההערה יחד עם הקוד!) |
| R5 | `useCellDispatcher` (onCell) + `useAppBootstrap` + `useSyncEngine` | בינוני-גבוה | App.test + speakCell.a4.test + sync tests; לשמר את סמנטיקת `alive` flag ואת ה-refs המסנכרנים |
| R6 | `AppModals` + `openPanel: PanelId \| null` (מחליף 8 booleans) — השינוי ההתנהגותי היחיד המותר: מודאל אחד פתוח בכל רגע (התנהגות רצויה ממילא) | נמוך | פתיחה/סגירה של כל 8 הפאנלים ידנית |

### כללי זהירות ספציפיים

- **ההערות המסומנות (D3/E1/C1/F7/I2…) הן תיעוד-החלטות — זזות עם הקוד, לא נמחקות.**
- ה-refs המסנכרנים (`syncEnabledRef`, `preventDupRef`, `predictionsRef`) קיימים כדי למנוע stale closures — כל hook שמקבל אותם חייב לשמר את הדפוס.
- שני ה-`eslint-disable exhaustive-deps` (שורות 329, 345) מנומקים; ברפקטור נכון הם צפויים להיעלם מעצמם — לא להשתיק חדשים.
- `vocalize` ו-`speakOpts` הופכים לחלק מ-`useTtsSettings`/`useSentence` — מבטל את שכפול `{voiceURI, rate, pitch}` (ממצא Q-3).

## חלק ב' — index.css (‎2,153 שורות → 12 קבצים)

### עיקרון

פיצול **הזזה-בלבד** לפי גבולות ה-sections הקיימים (לקובץ יש כבר הערות-מבנה). ה-cascade נשמר ע"י קובץ אינדקס שמייבא באותו סדר בדיוק. `tokens.css` ו-`mvpUx.css` ממשיכים להיטען אחרי — **אין לשנות את סדר הייבוא ב-`main.tsx`** (הערת F6 שם מסבירה למה).

### מבנה יעד

```
app/src/styles/
  index.css          # ייבוא בלבד, בסדר הנוכחי:
  base.css           # reset, טיפוגרפיה, משתני בסיס
  themes.css         # dark-mode (138+), high-contrast (172+), forced-colors (202+)
  app-shell.css      # .app, main landmark (239+), badges, header
  toolbar.css        # BoardToolbar, כפתורים, settings button (537+), phone icon-only (574+)
  sentence-bar.css   # sentence bar + phone wrap (679+)
  board.css          # grid, CellButton, Fitzgerald
  modals.css         # Modal, bottom-sheet (923+), checkbox נסתר (1026+)
  settings.css       # פאנלי הגדרות + legacy privacy-toggle (1329+)
  library.css        # BoardLibrary, BoardPreview, CategoryMenu
  features.css       # I2 ניבוי (2023+), I4 רמות (2045+), I3 סריקה (2066+), I13 הדפסה (2074+), I7 סצנה (2102+), I6 טיימר (2128+)
  builder.css        # builder + editors
```

(השיוך הסופי של selectors לקבצים ייקבע בזמן הביצוע לפי ההערות בקובץ; החלוקה למעלה לפי סמני-השורות שאותרו.)

### מיגרציה וסיכון

1. יצירת `styles/` והעתקת בלוקים כלשונם, קובץ-קובץ, כשה-`index.css` הישן מתרוקן בהדרגה — PR אחד לכל 3-4 קבצים.
2. אימות אחרי כל PR: `npm run build` + השוואה ויזואלית ידנית (מסכי מפתח: לוח ילד, builder, settings, ספרייה, print preview, dark, high-contrast).
3. **סיכון עיקרי: סדר cascade** — חוקים בעלי specificity זהה שסדרם קובע. מיטיגציה: ייבוא באותו סדר מקורי + diff של `dist/assets/*.css` לפני/אחרי (אמור להיות זהה byte-wise פרט לגבולות קבצים).
4. חיפוש CSS מת נדחה לאחרי הפיצול (קבצים קטנים = כלי כמו PurgeCSS בר-הרצה עם רשימת-שימור ל-classes דינמיים).

### הערכת מאמץ כוללת

- חלק א': ‎6 PRs, יום-יומיים מצטבר.
- חלק ב': ‎3-4 PRs, חצי יום-יום.
- ניתן לבצע במקביל (קבצים שונים), אך מומלץ CSS אחרי R6 כדי לא לערבב diff-ים.
