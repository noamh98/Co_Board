// services/storage/persistence.ts — B-10: בקשת אחסון עמיד (navigator.storage.persist).
// מונע פינוי שקט של IndexedDB ע"י הדפדפן — אובדן לוחות/הקלטות של הילד (סיכון R-03).
// נקרא באונבורדינג (מחווה של משתמש). feature-detected, idempotent, ולעולם לא זורק.

export type PersistResult = 'persisted' | 'already-persisted' | 'denied' | 'unsupported';

export async function requestPersistentStorage(): Promise<PersistResult> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.persist !== 'function'
  ) {
    return 'unsupported';
  }
  try {
    if (
      typeof navigator.storage.persisted === 'function' &&
      (await navigator.storage.persisted())
    ) {
      return 'already-persisted';
    }
    const granted = await navigator.storage.persist();
    return granted ? 'persisted' : 'denied';
  } catch {
    // כשל בלתי צפוי ב-API — מדווח כלא-נתמך במקום להפיל את זרימת האונבורדינג.
    return 'unsupported';
  }
}
