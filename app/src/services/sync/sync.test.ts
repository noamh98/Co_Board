import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { LocalStubProvider } from './syncProvider';
import { createSyncEngine } from './syncEngine';
import { syncQueue } from '../../data/syncQueue';
import { createBoardRepo } from '../../data/boardRepo';
import { getDb, STORE_BOARDS, resetDbForTests } from '../../data/db';
import type { Board } from '../../domain/models';

function resetIdb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  resetDbForTests();
}

beforeEach(resetIdb);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LocalStubProvider', () => {
  it('push ואז pull מחזיר אותן רשומות', async () => {
    const provider = new LocalStubProvider('dev-test');
    await provider.push([
      {
        entityType: 'board',
        entityId: 'b1',
        versioned: { data: { name: 'לוח' }, version: 1, updatedAt: 100, deviceId: 'dev-test' },
      },
    ]);
    const pulled = await provider.pull(0);
    expect(pulled).toHaveLength(1);
    expect(pulled[0].entityId).toBe('b1');
  });

  it('pull עם since מסנן רשומות ישנות', async () => {
    const provider = new LocalStubProvider('dev-test');
    await provider.push([
      { entityType: 'board', entityId: 'b1', versioned: { data: {}, version: 1, updatedAt: 50, deviceId: 'dev-test' } },
      { entityType: 'board', entityId: 'b2', versioned: { data: {}, version: 1, updatedAt: 200, deviceId: 'dev-test' } },
    ]);
    const pulled = await provider.pull(100);
    expect(pulled).toHaveLength(1);
    expect(pulled[0].entityId).toBe('b2');
  });

  it('push כפול — מעדכן במקום להוסיף', async () => {
    const provider = new LocalStubProvider();
    await provider.push([
      { entityType: 'board', entityId: 'b1', versioned: { data: { v: 1 }, version: 1, updatedAt: 100, deviceId: 'd' } },
    ]);
    await provider.push([
      { entityType: 'board', entityId: 'b1', versioned: { data: { v: 2 }, version: 2, updatedAt: 200, deviceId: 'd' } },
    ]);
    const all = await provider.pull(0);
    expect(all).toHaveLength(1);
    expect((all[0].versioned.data as { v: number }).v).toBe(2);
  });

  it('signIn מחזיר stub-uid', async () => {
    const provider = new LocalStubProvider();
    const uid = await provider.signIn('a@b.com', '123');
    expect(uid).toBe('stub-uid');
  });
});

describe('SyncEngine — offline', () => {
  it('offline → status=offline, לא זורק', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const provider = new LocalStubProvider();
    const engine = createSyncEngine(provider, () => true);
    await engine.runSync();
    expect(engine.getStatus()).toBe('offline');
    engine.dispose();
  });

  it('syncEnabled=false → status=disabled, לא זורק', async () => {
    const provider = new LocalStubProvider();
    const engine = createSyncEngine(provider, () => false);
    await engine.runSync();
    expect(engine.getStatus()).toBe('disabled');
    engine.dispose();
  });

  it('onStatusChange מקבל עדכונים', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const provider = new LocalStubProvider();
    const engine = createSyncEngine(provider, () => true);
    const statuses: string[] = [];
    engine.onStatusChange((s) => statuses.push(s));
    await engine.runSync();
    expect(statuses).toContain('offline');
    engine.dispose();
  });
});

describe('SyncEngine — online stub', () => {
  it('outbox enqueue → runSync → ack', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const provider = new LocalStubProvider('dev-a');
    const engine = createSyncEngine(provider, () => true);

    await syncQueue.enqueue({
      id: 'change-1',
      entityType: 'board',
      entityId: 'b1',
      data: { id: 'b1', name: 'לוח' },
      version: 1,
      updatedAt: Date.now(),
      deviceId: 'dev-a',
    });

    expect(await syncQueue.count()).toBe(1);
    await engine.runSync();
    expect(await syncQueue.count()).toBe(0);

    const pulled = await provider.pull(0);
    expect(pulled.some((r) => r.entityId === 'b1')).toBe(true);
    engine.dispose();
  });
});

function makeBoard(id: string, name: string): Board {
  return { id, name, grid: { rows: 1, cols: 1 }, cells: {}, placements: [] };
}

// A1: חיווט outbox + LWW אמיתי. נכשל על הקוד הישן (save לא עשה enqueue).
describe('SyncEngine — outbox wiring + LWW (A1)', () => {
  it('boardRepo.save מכניס ל-outbox ונדחף בסנכרון', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const provider = new LocalStubProvider('dev-a');
    const engine = createSyncEngine(provider, () => true);

    await createBoardRepo().save(makeBoard('b1', 'לוח'));
    expect(await syncQueue.count()).toBe(1); // לפני התיקון: 0 (save לא עשה enqueue)

    await engine.runSync();
    expect(await syncQueue.count()).toBe(0);
    const pulled = await provider.pull(0);
    expect(pulled.some((r) => r.entityId === 'b1')).toBe(true);
    engine.dispose();
  });

  it('LWW: remote חדש יותר מנצח, מעדכן מקומי ומבטל push מיושן', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const provider = new LocalStubProvider('dev-remote');
    // remote עם updatedAt רחוק בעתיד → תמיד חדש יותר מהשמירה המקומית
    await provider.push([
      {
        entityType: 'board',
        entityId: 'b1',
        versioned: {
          data: makeBoard('b1', 'remote'),
          version: 9,
          updatedAt: 9_999_999_999_999,
          deviceId: 'dev-remote',
        },
      },
    ]);
    // שמירה מקומית (updatedAt=עכשיו, ישן יותר מ-remote)
    await createBoardRepo().save(makeBoard('b1', 'local'));

    const engine = createSyncEngine(provider, () => true);
    await engine.runSync();

    const db = await getDb();
    const local = (await db.get(STORE_BOARDS, 'b1')) as Board;
    expect(local.name).toBe('remote'); // remote ניצח
    expect(await syncQueue.count()).toBe(0); // ה-push המיושן בוטל
    engine.dispose();
  });
});
