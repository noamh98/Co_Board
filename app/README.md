# app — לוח תקשורת (PWA)

אפליקציית ה-AAC (React + TypeScript + Vite, offline-first, RTL מלא).
ראה `../docs/reviews/HANDOFF.md` לסקירה ו-`../PRD/PRD-he.md` לאפיון המלא.

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
├── presentation/   # UI (RTL): BoardView, CellButton, SentenceBar, AdultBar, PinGate
├── domain/         # models, fitzgerald, layout (אינווריאנט Motor Planning), access (RBAC/PIN), sampleBoard
├── services/       # tts/ (Web Speech), nikud/ (Nakdan + cache + override)
├── data/           # db (IndexedDB), boardRepo, profileRepo, settingsRepo, bootstrap (seed/פרופילים)
├── App.tsx         # מעטפת + פרוסה אנכית (טוען פרופיל+לוח מה-DB; נעול כברירת מחדל)
└── main.tsx        # entry + רישום Service Worker
```
פירוט שכבת ה-Data והפרופילים: `../docs/m1-data-profiles.md`.

## אינווריאנטים (אסור להפר — ראה HANDOFF §4)
- מילות ליבה לא זזות (Motor Planning) — `domain/layout.ts`.
- Offline-first — TTS/ניקוד/ניווט/נתונים עובדים ללא רשת (IndexedDB מקומי).
- ניקוד: ידני > cache > רשת > גלם; ידני לא נדרס.
- נתוני ילד מקומיים/פרטיים; מחיקה=ארכוב (שחזור אפשרי).
- מצב ילד נעול כברירת מחדל; מעבר לעריכה בקוד מטפל — `domain/access.ts`.
- RTL מלא בכל מסך.
