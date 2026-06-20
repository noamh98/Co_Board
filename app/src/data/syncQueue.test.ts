import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { syncQueue } from './syncQueue';
import { resetDbForTests } from './db';

function resetIdb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  resetDbForTests();
}

beforeEach(resetIdb);

const item = (id: string, at = 100) => ({
  id,
  entityType: 'board' as const,
  entityId: `board-${id}`,
  data: { name: 'test' },
  version: 1,
  updatedAt: at,
  deviceId: 'dev-a',
});

describe('syncQueue', () => {
  it('enqueue → count=1', async () => {
    await syncQueue.enqueue(item('c1'));
    expect(await syncQueue.count()).toBe(1);
  });

  it('peek מחזיר לפי סדר enqueuedAt', async () => {
    await syncQueue.enqueue(item('c2', 200));
    await syncQueue.enqueue(item('c1', 100));
    const peeked = await syncQueue.peek();
    expect(peeked[0].id).toBe('c1');
    expect(peeked[1].id).toBe('c2');
  });

  it('ack מסיר פריט', async () => {
    await syncQueue.enqueue(item('c1'));
    await syncQueue.ack('c1');
    expect(await syncQueue.count()).toBe(0);
  });

  it('ackAll מסיר כמה פריטים', async () => {
    await syncQueue.enqueue(item('c1'));
    await syncQueue.enqueue(item('c2'));
    await syncQueue.ackAll(['c1', 'c2']);
    expect(await syncQueue.count()).toBe(0);
  });

  it('clear מרוקן הכל', async () => {
    await syncQueue.enqueue(item('c1'));
    await syncQueue.enqueue(item('c2'));
    await syncQueue.clear();
    expect(await syncQueue.count()).toBe(0);
  });

  it('peek עם limit', async () => {
    for (let i = 0; i < 5; i++) await syncQueue.enqueue(item(`c${i}`));
    const peeked = await syncQueue.peek(3);
    expect(peeked).toHaveLength(3);
  });
});
