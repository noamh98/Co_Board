# M7 — Usage Analytics & Logging

תאריך: 2026-06-20

## מטרה
מעקב שימוש אנונימי opt-in — קלינאי רואה אילו תאים הילד לוחץ הכי הרבה (שבוע אחרון), כדי להתאים לוחות. ללא PII, ללא שיתוף לצד שלישי.

## קבצים חדשים

| קובץ | תפקיד |
|------|--------|
| `src/domain/usageEvent.ts` | UsageEvent interface (id/profileId/boardId/cellId/label/timestamp/sessionId) |
| `src/data/usageRepo.ts` | logEvent / getEvents / clearEvents / clearProfileEvents |
| `src/services/analytics/analyticsService.ts` | trackCellPress (void) / getTopCells / clearAllData |
| `src/presentation/analytics/UsageDashboard.tsx` | top-10 UI + opt-in toggle + GDPR clear |

## קבצים מעודכנים

| קובץ | שינוי |
|------|--------|
| `src/data/db.ts` | DB_VERSION=5, store `usage` + indexes by-profile / by-timestamp |
| `src/data/settingsRepo.ts` | getAnalyticsEnabled / setAnalyticsEnabled (ללא שינוי DB_VERSION) |
| `src/presentation/components/AdultBar.tsx` | prop onOpenAnalytics → כפתור "סטטיסטיקה" |
| `src/App.tsx` | sessionIdRef, clearEvents(90d) ב-init, trackCellPress ב-onCell, analyticsOpen state |

## אינווריאנטים (נאמתו בverifier)

| אינווריאנט | מימוש |
|------------|--------|
| Privacy | trackCellPress no-op כש-analyticsEnabled=false |
| No PII | UsageEvent: profileId (מקומי) + sessionId אקראי — לא uid/email |
| Performance | trackCellPress מחזיר void (fire-and-forget), לא חוסם TTS |
| GDPR | clearAllData מוחק כל events של profileId, לא רק ישנים |
| DB migration | v5 אדיטיבי — store usage נוסף ללא פגיעה ב-v4 |
| Auto-cleanup | clearEvents(Date.now() - 90*DAY_MS) ב-App init |

## בדיקות
- `usageRepo.test.ts` — 5 בדיקות (log→get→filter→clear→clearProfile)
- `analyticsService.test.ts` — 6 בדיקות (disabled/enabled/topCells/n-limit/since/clearAll)
- `UsageDashboard.test.tsx` — 4 בדיקות (disabled-state/data/confirm/toggle)
- `migration.test.ts` — נוסף טסט v4→v5

סה"כ: 156 טסטים עוברים (+16 מ-M6).
