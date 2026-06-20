// domain/sync.ts — מודל סנכרון טהור (TS בלבד, ללא I/O).
// אינווריאנטים: offline-first; מיזוג = "אחרון מנצח" (updatedAt); גרסאות לא נמחקות.

export interface Versioned<T> {
  data: T;
  version: number;
  updatedAt: number; // epoch ms
  deviceId: string;
}

export interface ChangeSet<T> {
  entityType: string;
  entityId: string;
  local: Versioned<T>;
  remote: Versioned<T>;
}

export interface MergeResult<T> {
  winner: Versioned<T>;
  /** מוגדר כשהיה conflict — הצד שהפסיד, לשחזור */
  loser?: Versioned<T>;
}

/**
 * מיזוג "אחרון מנצח" — updatedAt גבוה יותר מנצח.
 * בשוויון: deviceId lexicographic (דטרמיניסטי, ללא אובדן).
 */
export function mergeLastWriteWins<T>(
  local: Versioned<T>,
  remote: Versioned<T>,
): MergeResult<T> {
  if (local.updatedAt > remote.updatedAt) {
    return { winner: local, loser: remote };
  }
  if (remote.updatedAt > local.updatedAt) {
    return { winner: remote, loser: local };
  }
  // שוויון — tie-break דטרמיניסטי לפי deviceId
  if (local.deviceId >= remote.deviceId) {
    return { winner: local, loser: remote };
  }
  return { winner: remote, loser: local };
}

/**
 * מחזיר true אם גרסה remote חדשה יותר מ-local (דורשת pull+merge).
 */
export function isRemoteNewer<T>(
  local: Versioned<T>,
  remote: Versioned<T>,
): boolean {
  if (remote.updatedAt !== local.updatedAt) return remote.updatedAt > local.updatedAt;
  return remote.deviceId > local.deviceId;
}

/** עוטף ערך קיים כ-Versioned עם version=1 ו-updatedAt=now. */
export function toVersioned<T>(
  data: T,
  deviceId: string,
  now = Date.now(),
): Versioned<T> {
  return { data, version: 1, updatedAt: now, deviceId };
}

/** מחזיר עותק של Versioned עם version ו-updatedAt מוגדלים. */
export function bumpVersion<T>(
  v: Versioned<T>,
  newData: T,
  deviceId: string,
  now = Date.now(),
): Versioned<T> {
  return { data: newData, version: v.version + 1, updatedAt: now, deviceId };
}
