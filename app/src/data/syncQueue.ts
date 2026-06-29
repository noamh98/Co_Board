// data/syncQueue.ts — outbox: תור שינויים מקומיים ממתינים ל-push לענן.
// הסתמאנטיקה: enqueue→peek→ack. לעולם לא חוסם UI.
// Phase 1: peek משתמש באינדקס by-updatedAt (במקום getAll+sort בכל סנכרון).

import { getDb, STORE_OUTBOX } from './db';

export interface OutboxItem {
  id: string;
  entityType: 'board' | 'profile' | 'settings';
  entityId: string;
  data: unknown;
  version: number;
  updatedAt: number;
  deviceId: string;
  enqueuedAt: number;
}

function createSyncQueue() {
  async function enqueue(item: Omit<OutboxItem, 'enqueuedAt'>): Promise<void> {
    const db = await getDb();
    await db.put(STORE_OUTBOX, { ...item, enqueuedAt: Date.now() });
  }

  async function peek(limit = 50): Promise<OutboxItem[]> {
    const db = await getDb();
    // אינדקס by-updatedAt → כבר ממוין עולה לפי updatedAt (FIFO לפי זמן שינוי).
    const all = (await db.getAllFromIndex(STORE_OUTBOX, 'by-updatedAt')) as OutboxItem[];
    return all.slice(0, limit);
  }

  async function ack(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(STORE_OUTBOX, id);
  }

  async function ackAll(ids: string[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(STORE_OUTBOX, 'readwrite');
    await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
  }

  async function count(): Promise<number> {
    const db = await getDb();
    return db.count(STORE_OUTBOX);
  }

  async function clear(): Promise<void> {
    const db = await getDb();
    await db.clear(STORE_OUTBOX);
  }

  return { enqueue, peek, ack, ackAll, count, clear };
}

export type SyncQueue = ReturnType<typeof createSyncQueue>;
export const syncQueue: SyncQueue = createSyncQueue();
