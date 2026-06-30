import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbForTests } from '../../data/db';
import { syncQueue } from '../../data/syncQueue';
import { getLastSyncAt } from '../../data/settingsRepo';
import { _resetDeviceIdCacheForTests } from '../../data/deviceId';
import { createSyncEngine } from './syncEngine';
import type { SyncProvider } from './syncProvider';

// Phase 0 (H-SYNC): setLastSyncAt מתקדם *רק* בסיום נקי. כשל ב-push לא מקדם את החותמת —
// אחרת ה-pull הבא היה אינקרמנטלי ומפספס שינויים (סטיית-נתונים שקטה בין מכשירים).

function resetIdb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  resetDbForTests();
  _resetDeviceIdCacheForTests();
}

beforeEach(() => {
  resetIdb();
  localStorage.clear();
});

function provider(overrides: Partial<SyncProvider> = {}): SyncProvider {
  return {
    isAvailable: () => true,
    getDeviceId: () => 'test-device',
    pull: async () => [],
    push: async () => {},
    ...overrides,
  } as SyncProvider;
}

describe('syncEngine — setLastSyncAt רק בסיום נקי (H-SYNC)', () => {
  it('push שנכשל → lastSyncAt לא מתקדם, status=error', async () => {
    await syncQueue.enqueue({
      id: 'board:b1',
      entityType: 'board',
      entityId: 'b1',
      data: { id: 'b1' },
      version: 1,
      updatedAt: 123,
      deviceId: 'test-device',
    });

    const engine = createSyncEngine(
      provider({ push: async () => { throw new Error('network down'); } }),
      () => true,
    );
    await engine.runSync();

    expect(engine.getStatus()).toBe('error');
    expect(await getLastSyncAt()).toBe(0); // לא התקדם.
  });

  it('סנכרון נקי → lastSyncAt מתקדם, status=idle', async () => {
    const engine = createSyncEngine(provider(), () => true);
    await engine.runSync();
    expect(engine.getStatus()).toBe('idle');
    expect(await getLastSyncAt()).toBeGreaterThan(0); // התקדם.
  });
});
