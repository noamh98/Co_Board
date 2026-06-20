# ADR-0002: Sync & Backup Architecture (M5)

**תאריך:** 2026-06-20  
**סטטוס:** מאושר

## החלטה

`SyncProvider` interface backend-אגנוסטי + `FirebaseProvider` כספק ברירת מחדל (Firestore) + `LocalStubProvider` לבדיקות offline.

## הקשר

PRD §4.8 (FR-022, FR-023) דורש:
- גיבוי + שחזור גרסאות (Must MVP)
- סנכרון ענן דו-כיווני אסינכרוני (Should MVP/2)

אינווריאנטים קריטיים:
- Offline-first: מקור-אמת תמיד מקומי (IndexedDB)
- פרטיות: ברירת מחדל = לא עולה לענן ללא הסכמת הורה
- סנכרון לא חוסם UI/TTS/ניווט לעולם

## החלטה מפורטת

### שכבות

```
domain/sync.ts          — Versioned<T>, mergeLastWriteWins, ChangeSet (טהור TS)
data/syncQueue.ts        — outbox (שינויים ממתינים ל-push)
data/backupRepo.ts       — ייצוא/ייבוא JSON + היסטוריית גרסאות (offline, FR-022)
services/sync/
  syncProvider.ts        — interface SyncProvider + LocalStubProvider
  firebaseProvider.ts    — FirebaseProvider (Firestore)
  syncEngine.ts          — runSync(): pull→merge→push, debounce, offline-safe
  crypto.ts              — הצפנה לגיבויים (Web Crypto API, offline)
presentation/
  SyncStatus.tsx         — מחוון סטטוס במצב מבוגר
  BackupPanel.tsx         — ייצוא/ייבוא + שחזור גרסה
  PrivacyToggle.tsx       — שליטת הורה מה עולה לענן
```

### מיזוג (Merge Policy)

"אחרון מנצח" לפי `updatedAt` (timestamp ms). בשוויון — `deviceId` lexicographic (דטרמיניסטי). גרסה ישנה נשמרת ב-`versions` store לשחזור (לא אובדן נתונים).

### DB v4 (אדיטיבי)

- Store `outbox` — שינויים ממתינים ל-sync push
- Store `versions` — snapshot גרסאות לשחזור

### ספק Firebase

- Firestore path: `users/{uid}/{entityType}/{entityId}`
- Auth: email/password (Firebase Auth)
- Security rules: user רואה רק נתונים שלו
- TLS in transit, Firestore encryption at rest

### פרטיות ברירת מחדל

`syncEnabled = false` עד שהורה מאשר מפורשות (`PrivacyToggle`). ב-`syncEnabled=false`: `syncEngine.runSync()` = no-op שקט; גיבוי מקומי עובד תמיד.

## חלופות שנשקלו

| חלופה | נדחה כי |
|--------|---------|
| Supabase | תשתית Postgres מורכבת יותר לאמת-זמן; Firebase Realtime DB נח יותר לזה |
| Custom server | דורש DevOps, hosting, auth מאפס — MVP יקר מדי |
| Stub בלבד (M6 ספק) | FR-022 Must MVP, אבל FR-023 Should → Firebase עכשיו, חיבור מלא בוצע |

## השלכות

- תלות ב-Firebase SDK (~100KB gzip) — מקובל ל-PWA
- vendor lock-in מתון: interface מאפשר מעבר לספק אחר בשינוי קובץ אחד
- נדרש Firebase project + Firestore rules לפני deploy
