# M3 — Builder & Symbols

**תאריך:** 2026-06-20  
**FRs שמומשו:** FR-003, FR-004, FR-005/006, FR-007, FR-011, FR-017, FR-018

---

## מה נבנה

### Domain — boardEditor.ts
פונקציות TS טהורות (ללא I/O) לניהול עריכת לוח:

| פונקציה | תיאור |
|---------|--------|
| `addCell(board, cell, placement)` | מוסיף תא חדש; זורק Error אם המיקום תפוס |
| `removeCell(board, cellId, opts?)` | מסיר תא; זורק `ViolationError` על ליבה ללא `allowCoreMove` |
| `moveCell(board, cellId, placement, opts?)` | מזיז תא; זורק `ViolationError` על ליבה |
| `resizeBoard(board, newGrid)` | משנה גריד; שומר ליבה; מוחק fringe שנופל מחוץ לגריד |
| `UndoStack<T>` | מחסנית עם pointer — max 50 מצבים, push אחרי undo מוחק redo |

אינווריאנט: כל הפונקציות מחזירות Board חדש (immutable).

### Data — DB v3 + symbolRepo
- `db.ts`: DB_VERSION=3; store חדש `symbols` (keyPath: `id`) — upgrade אדיטיבי
- `symbolRepo.ts`: save/get/list/remove של `SymbolEntry` (`id`, `uri`, `mimeType`, `source`, `createdAt`)
- `migration.test.ts`: בדיקת v1→v2→v3 — נתוני v2 שורדים; store symbols נוסף

### Services — imageService
`services/image/imageService.ts` — כל הפונקציות עובדות offline (Canvas API בלבד):

| פונקציה | תיאור |
|---------|--------|
| `cropImage(file, rect)` | חיתוך תמונה ל-Blob (Canvas drawImage) |
| `removeBackground(blob)` | fallback offline — מחזיר blob מקורי ללא שגיאה |
| `compressToWebP(blob, maxKB?)` | כיווץ ל-WebP quality 0.85; fallback לoriginal אם לא נתמך |

### Presentation — Builder
`presentation/builder/CellEditor.tsx`:
- Modal לעריכת תא: label (RTL), ניקוד (auto-fill מ-NikudService + override ידני)
- Fitzgerald selector: 8 כפתורי צבע לפי FITZGERALD
- Action selector: speak/navigate/back/home/clear/deleteWord
- תמונה: העלאת קובץ (`type="file"`) + מצלמה (`capture="environment"`) → removeBackground → compressToWebP → data URI
- הקלטת קול: MediaRecorder API → blob → symbolRepo; fallback אם אין mediaDevices

`presentation/builder/BuilderView.tsx`:
- גריד HTML5 עם overlay עריכה (אותו CSS grid כ-BoardView)
- Drag-drop: `draggable`/`onDragStart`/`onDrop` — RTL-aware (col=0=ימין, CSS grid dir=rtl)
- Multi-select: checkbox לכל תא; bulk action bar מופיע כשנבחרו ≥2 תאים
- Bulk: שינוי Fitzgerald לכל הנבחרים; מחיקה (core cells מדולגות עם אזהרה)
- Undo/Redo: `UndoStack<Board>` ב-useRef; Ctrl+Z/Ctrl+Y keyboard shortcuts; כפתורים disabled לפי canUndo/canRedo
- Preview: מצב תצוגה מקדימה — BoardView read-only עם כפתור "חזור לעריכה"
- כל שינוי → `boardRepo.save` + `onBoardChange` callback

`AdultBar.tsx`: כפתור "ערוך לוח" (prop `onEditBoard?`)

`App.tsx`: `builderMode` state; BuilderView מחליף BoardView; onBoardChange מעדכן ctx.allBoards

---

## Definition of Done — סטטוס

| קריטריון | סטטוס |
|---------|--------|
| lint 0 errors | ✅ |
| 81 tests עוברות | ✅ |
| build ירוק | ✅ |
| Core לא זז (ViolationError נאכף + בדיקה) | ✅ |
| Builder שומר/טוען מ-IndexedDB | ✅ |
| Undo/Redo עד 50 שלבים | ✅ |
| תמונה: WebP compression + fallback offline | ✅ |
| RTL ב-drag-drop (col=0=ימין) | ✅ |

---

## מה לא בוצע (TODO M4+)
- `removeBackground` — fallback בלבד; @imgly/background-removal WASM דורש חבילת npm נוספת
- SymbolEntry.mimeType עבור תקליטות קוליות נשמר כ-`'image/webp'` (באג ידוע — יש לתקן ל-`'audio/webm'`)
- CellEditor cropImage: מעביר גישה ל-full-image crop (ללא בחירת crop-rect ע"י המשתמש)
- Bulk edit: גודל תא (FR-015) — לא מומש ב-M3
