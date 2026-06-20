import { getDb, STORE_USAGE } from './db';
import type { UsageEvent } from '../domain/usageEvent';

export async function logEvent(event: Omit<UsageEvent, 'id'>): Promise<void> {
  const db = await getDb();
  await db.put(STORE_USAGE, { ...event, id: crypto.randomUUID() });
}

export async function getEvents(
  profileId: string,
  since?: number,
): Promise<UsageEvent[]> {
  const db = await getDb();
  const all = (await db.getAllFromIndex(
    STORE_USAGE,
    'by-profile',
    profileId,
  )) as UsageEvent[];
  return since !== undefined ? all.filter((e) => e.timestamp >= since) : all;
}

/** מוחק אירועים ישנים מכל הפרופילים — לניקיון אוטומטי 90 יום. */
export async function clearEvents(olderThan: number): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_USAGE, 'readwrite');
  const store = tx.objectStore(STORE_USAGE);
  let cursor = await store.openCursor();
  while (cursor) {
    if ((cursor.value as UsageEvent).timestamp < olderThan) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}

/** מוחק את כל האירועים של פרופיל ספציפי (GDPR — לפי בקשת משתמש). */
export async function clearProfileEvents(profileId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_USAGE, 'readwrite');
  const store = tx.objectStore(STORE_USAGE);
  const index = store.index('by-profile');
  let cursor = await index.openCursor(profileId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}
