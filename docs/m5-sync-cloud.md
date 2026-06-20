# M5 — Sync & Cloud (2026-06-20)

FR-022 (גיבוי + שחזור גרסאות) + FR-023 (סנכרון ענן דו-כיווני).

## קבצים חדשים

| קובץ | תפקיד |
|------|--------|
| `domain/sync.ts` | Versioned<T>, mergeLastWriteWins, isRemoteNewer, toVersioned, bumpVersion |
| `domain/sync.test.ts` | 10 בדיקות: merge, conflict, version bump, tie-break |
| `data/syncQueue.ts` | outbox — enqueue/peek/ack/ackAll/count/clear |
| `data/backupRepo.ts` | exportBackup/importBackup (JSON), saveVersion/listVersions/restoreVersion |
| `data/syncQueue.test.ts` | 6 בדיקות |
| `data/backupRepo.test.ts` | 5 בדיקות: round-trip, שגיאות, restore |
| `services/sync/syncProvider.ts` | SyncProvider interface + LocalStubProvider |
| `services/sync/firebaseProvider.ts` | FirebaseProvider (Firestore + Auth) |
| `services/sync/syncEngine.ts` | createSyncEngine — pull→merge→push, debounce, offline-safe |
| `services/sync/crypto.ts` | encryptData/decryptData (AES-GCM Web Crypto, fallback) |
| `services/sync/sync.test.ts` | 8 בדיקות: stub push/pull, offline, outbox ack |
| `presentation/components/SyncStatus.tsx` | מחוון (idle/syncing/error/offline/disabled) |
| `presentation/settings/BackupPanel.tsx` | ייצוא/ייבוא JSON + שחזור גרסה |
| `presentation/settings/PrivacyToggle.tsx` | שליטת הורה — ברירת מחדל מקומי |
| `docs/adr-0002-sync.md` | ADR: SyncProvider interface, Firebase, חלופות |
| `app/.env.local` | Firebase config (gitignored — *.local) |

## שינויים בקבצים קיימים

| קובץ | שינוי |
|------|--------|
| `data/db.ts` | DB_VERSION=4, stores outbox + versions |
| `data/migration.test.ts` | בדיקת v3→v4 אדיטיבי |
| `presentation/components/AdultBar.tsx` | prop `onOpenBackup` + כפתור "גיבוי וסנכרון" |
| `App.tsx` | syncEngine ברקע, BackupPanel, SyncStatus, PrivacyToggle |
| `tsconfig.json` | הוסף `vite/client` ל-types (תמיכת import.meta.env) |

## תוצאות CI

- lint: 0 errors, 1 warning (react-hooks/exhaustive-deps ב-App.tsx — ידוע, מכוון)
- tests: 129 עוברות (+30 חדשות)
- build: ירוק (196KB gzip 63KB)

## מה חסר ל-M6

1. **Firebase Auth UI** — מסך login (email/password) לפני שניתן לאפשר סנכרון
2. **Firestore Security Rules** — `users/{uid}/**` read/write בבעלי uid בלבד
3. **החלפת provider** — `LocalStubProvider` → `FirebaseProvider` ב-App.tsx כשמשתמש מחובר
4. **FirebaseProvider.signIn** מחובר ל-PrivacyToggle (login → enable sync)
5. **createUserWithEmailAndPassword** — רישום משתמש חדש
