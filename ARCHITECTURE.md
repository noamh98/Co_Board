# ARCHITECTURE — לוח תקשורת (AAC)

> מבט ארכיטקטוני. לסקירה כללית ומצב עדכני ראה `docs/reviews/HANDOFF.md`; לאפיון מלא `PRD/PRD-he.md`.
> כל הקוד תחת `app/src/`. ארכיטקטורת 4-שכבות חד-כיוונית: התלות זורמת כלפי מטה בלבד.

## Module diagram

```mermaid
flowchart TD
    subgraph Presentation["Presentation — app/src/presentation/ + App.tsx"]
        App[App.tsx]
        Board[BoardView · CellButton · SentenceBar · NavBar]
        Adult[AdultBar · PinGate · settings/]
        Builder[builder/ — BuilderView · CellEditor · SymbolPicker · GridSizePicker]
        Panels[auth/ · phraseBank/ · analytics/ · wordFinder/ · wizard/]
    end

    subgraph Domain["Domain — app/src/domain/ (TS טהור, ללא UI)"]
        Models[models · fitzgerald]
        Layout[layout — Motor Planning]
        Access[access — RBAC/PIN]
        Nav[navigationStack · boardLibrary · boardTemplates]
        Editor[boardEditor · UndoStack · adaptivity · accessSettings]
        SyncD[sync · modelingSession · usageEvent · phraseBank · symbolMap]
    end

    subgraph Services["Services — app/src/services/"]
        TTS[tts/ — hybrid · google · ttsProvider]
        Nikud[nikud/ — Nakdan + cache]
        Image[image/ — crop · removeBg · webp]
        Symbols[symbols/ — ARASAAC client + search]
        SyncS[sync/ — provider · engine · firebase · crypto]
        Misc[analytics/ · obf/ · wordFinder/ · access/dwell]
    end

    subgraph Data["Data — app/src/data/ (offline-first)"]
        DB[(IndexedDB · idb · DB_VERSION=9)]
        Repos[boardRepo · profileRepo · settingsRepo · symbolRepo · usageRepo · phraseRepo · syncQueue · backupRepo · audioCache · symbolCache]
        Boot[bootstrap — seed/profiles]
    end

    Cloud[(Cloud — Firebase Auth/Firestore Hosting)]

    Presentation --> Domain
    Presentation --> Services
    Services --> Data
    Domain -.types.-> Services
    Repos --> DB
    Boot --> Repos
    SyncS -.async.-> Cloud
    TTS -.online.-> Cloud
    Nikud -.online.-> NakdanAPI[(Nakdan API)]
    Symbols -.online.-> ARASAAC[(ARASAAC API)]
```

## Module responsibilities

| שכבה | מודול | אחריות |
|------|-------|--------|
| Presentation | `App.tsx` | מעטפת, state ראשי, ניתוב פעולות `onCell`, מצב נעול/מבוגר, init של services |
| Presentation | `BoardView`/`CellButton`/`SentenceBar`/`NavBar` | רינדור לוח RTL, לחיצת תא, שורת משפט, ניווט קבוע |
| Presentation | `builder/` | עריכת לוח (drag-drop, undo/redo, multi-select, preview), עריכת תא, בחירת סמל |
| Presentation | `auth/ · settings/ · phraseBank/ · analytics/ · wordFinder/ · wizard/` | פאנלים למבוגר בלבד |
| Domain | `layout` | אינווריאנט Motor Planning — מילות ליבה לא זזות |
| Domain | `access` | RBAC, אימות PIN, הרשאות עריכה |
| Domain | `boardLibrary`/`boardTemplates`/`navigationStack` | לוחות מוכנים, תבניות, מחסנית ניווט |
| Domain | `boardEditor`/`adaptivity`/`accessSettings` | עריכה immutable, הסתרה/גריד דינמי, הגדרות גישה |
| Domain | `sync`/`modelingSession`/`usageEvent`/`phraseBank`/`symbolMap` | מיזוג גרסאות, מודלינג, אירועי שימוש, מיפוי סמלים |
| Services | `tts/` | TTS היברידי: cache→online→fallback אופליין |
| Services | `nikud/` | ניקוד אוטומטי (Nakdan) + cache + override ידני |
| Services | `image/` | crop · removeBackground (fallback) · compressToWebP (Canvas, offline) |
| Services | `symbols/` | חיפוש ARASAAC + cache offline |
| Services | `sync/` | provider אגנוסטי, engine (debounce/offline-safe), Firebase, crypto AES-GCM |
| Services | `analytics/ · obf/ · wordFinder/ · access/dwell` | תיעוד opt-in · OBF · חיפוש נתיב · hooks גישה |
| Data | `db` + `*Repo` | IndexedDB מקור-אמת מקומי; load/save/list; מחיקה=ארכוב |
| Data | `bootstrap` | seed ספריית לוחות + פרופיל דמו; createProfile (קלון) |

## Communication boundaries
- **חד-כיווני:** Presentation → Domain → Services → Data. שכבה לא קוראת כלפי מעלה.
- **Domain = TS טהור** — ללא תלות ב-React/DOM/IndexedDB; ניתן לבדיקה בבידוד (זה מה שמאפשר 244 טסטים).
- **Data = הגבול היחיד ל-IndexedDB.** כל גישה ל-DB עוברת דרך `*Repo`; שאר השכבות לא נוגעות ב-`idb` ישירות.
- **רשת = אופציונלית בלבד.** services/tts·nikud·symbols·sync יוצאים לרשת רק כשיש; כל אחד נופל חיננית למצב מקומי/cache (אינווריאנט offline-first).
- **Cloud מאחורי interface** (`SyncProvider`) — backend-אגנוסטי; `LocalStubProvider` לבדיקות, `FirebaseProvider` בייצור (רק כש-syncEnabled && authUser).
- **מיגרציות DB** רק ב-`data/db.ts` `upgrade`, תמיד אדיטיביות.
