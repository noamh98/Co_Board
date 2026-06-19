# app — לוח תקשורת (PWA)

אפליקציית ה-AAC (React + TypeScript + Vite, offline-first, RTL מלא).
ראה `../HANDOFF.md` לסקירה ו-`../PRD/PRD-he.md` לאפיון המלא.

## הרצה
```bash
npm install
npm run dev      # שרת פיתוח (פתח בדפדפן; בדיקת קול עברי אמיתית)
npm test         # Vitest
npm run lint     # ESLint
npm run build    # build ל-PWA (dist/)
npm run preview  # תצוגה מקדימה של ה-build
```

## מבנה (4 שכבות)
```
src/
├── presentation/   # UI (RTL): BoardView, CellButton, SentenceBar
├── domain/         # models, fitzgerald (צבעי קטגוריות), layout (אינווריאנט Motor Planning), sampleBoard
├── services/       # tts/ (Web Speech), nikud/ (Nakdan + cache + override)
├── data/           # db.ts (IndexedDB via idb) — מקור אמת מקומי
├── App.tsx         # מעטפת + פרוסה אנכית
└── main.tsx        # entry + רישום Service Worker
```

## אינווריאנטים (אסור להפר — ראה HANDOFF §4)
- מילות ליבה לא זזות (Motor Planning) — `domain/layout.ts`.
- Offline-first — TTS/ניקוד/ניווט עובדים ללא רשת.
- ניקוד: ידני > cache > רשת > גלם; ידני לא נדרס.
- RTL מלא בכל מסך.
