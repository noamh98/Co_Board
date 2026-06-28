import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbForTests } from './db';
import { createBoardRepo } from './boardRepo';
import { syncQueue } from './syncQueue';
import { getSyncMeta } from './syncMeta';
import { _resetDeviceIdCacheForTests } from './deviceId';
import type { Board } from '../domain/models';

// Phase 0 (CR-4): archive() חייב לדחוף ל-outbox — אחרת לוחות שאורכבו "חוזרים לחיים"
// אחרי סנכרון מהמכשיר השני. הטסט מאמת round-trip: שמירה → ארכוב → outbox מכיל archived=true.

function resetIdb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  resetDbForTests();
  _resetDeviceIdCacheForTests();
}

function board(id: string): Board {
  return {
    id,
    name: id,
    grid: { rows: 1, cols: 1 },
    cells: { c0: { id: 'c0', label: 'א', action: { type: 'speak' } } },
    placements: [{ cellId: 'c0', row: 0, col: 0 }],
  };
}

beforeEach(() => {
  resetIdb();
  localStorage.clear();
});

describe('boardRepo.archive — חיווט outbox (CR-4)', () => {
  it('save() מכניס את הלוח ל-outbox עם version 1', async () => {
    const repo = createBoardRepo();
    await repo.save(board('b1'));
    const pending = await syncQueue.peek();
    expect(pending.map((p) => p.id)).toContain('board:b1');
    expect(pending.find((p) => p.id === 'board:b1')?.version).toBe(1);
  });

  it('archive() דוחף את הלוח המאורכב ל-outbox (לא עוקף את הסנכרון)', async () => {
    const repo = createBoardRepo();
    await repo.save(board('b1'));
    await syncQueue.ackAll((await syncQueue.peek()).map((p) => p.id)); // נקה את הדחיפה הראשונה.

    await repo.archive('b1');

    const pending = await syncQueue.peek();
    const item = pending.find((p) => p.id === 'board:b1');
    expect(item).toBeDefined();
    expect((item!.data as Board).archived).toBe(true);
    // version התקדם (2) — המכשיר השני יקבל את הארכוב כ-LWW מנצח.
    const meta = await getSyncMeta('board', 'b1');
    expect(meta?.version).toBe(2);
  });

  it('לוח-ליבה (isCoreBoard) אינו נכנס ל-outbox', async () => {
    const repo = createBoardRepo();
    await repo.save({ ...board('core'), isCoreBoard: true });
    const pending = await syncQueue.peek();
    expect(pending.map((p) => p.id)).not.toContain('board:core');
  });
});
