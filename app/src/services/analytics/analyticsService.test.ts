import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbForTests } from '../../data/db';
import { createSettingsRepo } from '../../data/settingsRepo';
import { logEvent, getEvents } from '../../data/usageRepo';
import { analyticsService } from './analyticsService';
import type { Cell } from '../../domain/models';

function resetIndexedDb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB =
    new IDBFactory();
  resetDbForTests();
}

beforeEach(resetIndexedDb);

const mockCell: Cell = {
  id: 'cell-1',
  label: 'אמא',
  action: { type: 'speak' },
};

describe('analyticsService — M7', () => {
  it('trackCellPress כבוי — לא כותב ל-DB', async () => {
    // analyticsEnabled=false (ברירת מחדל)
    analyticsService.trackCellPress('p1', 'b1', mockCell, 'sess-1');
    await vi.waitFor(async () => {
      const events = await getEvents('p1');
      expect(events).toHaveLength(0);
    });
  });

  it('trackCellPress מופעל — שומר אירוע ב-DB', async () => {
    const repo = createSettingsRepo();
    await repo.setAnalyticsEnabled(true);
    analyticsService.trackCellPress('p1', 'b1', mockCell, 'sess-1');
    await vi.waitFor(async () => {
      const events = await getEvents('p1');
      expect(events).toHaveLength(1);
      expect(events[0].label).toBe('אמא');
    });
  });

  it('getTopCells מחזיר לפי count יורד', async () => {
    const repo = createSettingsRepo();
    await repo.setAnalyticsEnabled(true);
    const now = Date.now();
    await logEvent({ profileId: 'p1', boardId: 'b1', cellId: 'c1', label: 'אמא', timestamp: now, sessionId: 's' });
    await logEvent({ profileId: 'p1', boardId: 'b1', cellId: 'c1', label: 'אמא', timestamp: now, sessionId: 's' });
    await logEvent({ profileId: 'p1', boardId: 'b1', cellId: 'c2', label: 'אבא', timestamp: now, sessionId: 's' });
    const top = await analyticsService.getTopCells('p1', 10, 0);
    expect(top[0].label).toBe('אמא');
    expect(top[0].count).toBe(2);
    expect(top[1].label).toBe('אבא');
    expect(top[1].count).toBe(1);
  });

  it('getTopCells מגביל ל-n תוצאות', async () => {
    const now = Date.now();
    for (let i = 0; i < 15; i++) {
      await logEvent({ profileId: 'p1', boardId: 'b1', cellId: `c${i}`, label: `מילה${i}`, timestamp: now, sessionId: 's' });
    }
    const top = await analyticsService.getTopCells('p1', 5, 0);
    expect(top).toHaveLength(5);
  });

  it('getTopCells מסנן לפי since', async () => {
    const now = Date.now();
    await logEvent({ profileId: 'p1', boardId: 'b1', cellId: 'c1', label: 'ישן', timestamp: now - 10 * 24 * 60 * 60 * 1000, sessionId: 's' });
    await logEvent({ profileId: 'p1', boardId: 'b1', cellId: 'c2', label: 'חדש', timestamp: now, sessionId: 's' });
    const top = await analyticsService.getTopCells('p1', 10, now - 24 * 60 * 60 * 1000);
    expect(top).toHaveLength(1);
    expect(top[0].label).toBe('חדש');
  });

  it('clearAllData מוחק כל אירועי הפרופיל', async () => {
    const now = Date.now();
    await logEvent({ profileId: 'p1', boardId: 'b1', cellId: 'c1', label: 'אמא', timestamp: now, sessionId: 's' });
    await logEvent({ profileId: 'p2', boardId: 'b1', cellId: 'c1', label: 'אבא', timestamp: now, sessionId: 's' });
    await analyticsService.clearAllData('p1');
    expect(await getEvents('p1')).toHaveLength(0);
    expect(await getEvents('p2')).toHaveLength(1);
  });
});
