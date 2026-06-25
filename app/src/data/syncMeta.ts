// data/syncMeta.ts — מטא-נתוני סנכרון לכל ישות (version/updatedAt/deviceId) + חיווט ל-outbox.
// אינווריאנט (A1): כל שמירה מקומית של board/profile מקדמת version, שומרת meta אמיתי,
// ונכנסת ל-outbox עם id יציב `${type}:${id}` — אחרת השינוי לעולם לא נדחף לענן.
// שכבת Data טהורה — ללא תלות בשכבת services.

import { getDb, STORE_SETTINGS } from './db';
import { syncQueue } from './syncQueue';

const DEVICE_ID_KEY = 'sync-device-id';
const META_PREFIX = 'syncMeta:';

export interface EntityMeta {
  version: number;
  updatedAt: number; // epoch ms
  deviceId: string;
}

export type SyncEntityType = 'board' | 'profile';

/** מזהה מכשיר יציב (אותו מפתח localStorage שבו משתמש services/sync/crypto). */
export function getDeviceIdSync(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev-${Date.now()}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return 'local-device';
  }
}

const metaKey = (t: SyncEntityType, id: string): string => `${META_PREFIX}${t}:${id}`;

interface SettingEntry {
  key: string;
  value: string;
}

/** מחזיר את ה-meta האחרון שנשמר מקומית לישות, או undefined אם מעולם לא נכתבה מקומית. */
export async function getSyncMeta(
  t: SyncEntityType,
  id: string,
): Promise<EntityMeta | undefined> {
  const db = await getDb();
  const entry = (await db.get(STORE_SETTINGS, metaKey(t, id))) as
    | SettingEntry
    | undefined;
  if (!entry?.value) return undefined;
  try {
    return JSON.parse(entry.value) as EntityMeta;
  } catch {
    return undefined;
  }
}

/** שומר/מעדכן את ה-meta של ישות (settings store, מקומי בלבד — לא עולה לענן). */
export async function setSyncMeta(
  t: SyncEntityType,
  id: string,
  meta: EntityMeta,
): Promise<void> {
  const db = await getDb();
  await db.put(STORE_SETTINGS, { key: metaKey(t, id), value: JSON.stringify(meta) });
}

/**
 * מתעד שמירה מקומית: מקדם version, שומר meta אמיתי (updatedAt=now), ומכניס ל-outbox.
 * id יציב `${type}:${id}` → enqueue חוזר מחליף את הרשומה הקודמת (לא מצטבר).
 */
export async function recordLocalWrite(
  entityType: SyncEntityType,
  entityId: string,
  data: unknown,
  deviceId: string = getDeviceIdSync(),
): Promise<void> {
  const prev = await getSyncMeta(entityType, entityId);
  const next: EntityMeta = {
    version: (prev?.version ?? 0) + 1,
    updatedAt: Date.now(),
    deviceId,
  };
  await setSyncMeta(entityType, entityId, next);
  await syncQueue.enqueue({
    id: `${entityType}:${entityId}`,
    entityType,
    entityId,
    data,
    version: next.version,
    updatedAt: next.updatedAt,
    deviceId,
  });
}
