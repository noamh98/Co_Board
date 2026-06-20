# M8 — ARASAAC Symbol Search & Offline Cache

תאריך: 2026-06-21

## מה נבנה

חיפוש סמלים עברי מ-ARASAAC API (חינמי, ללא מפתח) ישירות מתוך CellEditor, עם cache offline ב-IndexedDB.

## קבצים חדשים

| קובץ | תיאור |
|------|--------|
| `src/services/symbols/arasaacClient.ts` | HTTP client ל-ARASAAC v1 REST |
| `src/services/symbols/symbolSearchService.ts` | cache-first + SymbolOfflineError |
| `src/data/symbolCache.ts` | IndexedDB getFromCache/saveToCache/pruneCache |
| `src/presentation/builder/SymbolPicker.tsx` | modal חיפוש RTL, גריד 4×5 |

## קבצים שונו

| קובץ | שינוי |
|------|--------|
| `src/data/db.ts` | DB_VERSION=6, STORE_SYMBOL_CACHE אדיטיבי |
| `src/presentation/builder/CellEditor.tsx` | כפתור ARASAAC + SymbolPicker + כפתור × תמונה |
| `src/App.tsx` | `void pruneCache(30)` ב-init |

## אינווריאנטים

- **Offline safety**: `fetchAndCacheBlob` זורק `SymbolOfflineError` בכשל רשת — לא קורס
- **No API key**: URL ציבורי בלבד (`api.arasaac.org/v1`, `static.arasaac.org`), ללא Authorization
- **Cache-first**: `getFromCache` נקרא תמיד לפני `fetch`
- **DB v6 אדיטיבי**: STORE_SYMBOL_CACHE נוסף עם `!contains` guard — לא שובר v5
- **pruneCache(30)**: נקרא ב-App init, עם early-exit אם אין ישנים (לא יוצר transaction מיותר)

## CI

- lint: 0 errors (1 warning קיים מ-M7)
- tests: 171 passed (+15 חדשים)
- build: ✓
