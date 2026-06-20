import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbForTests } from './db';
import {
  logEvent,
  getEvents,
  clearEvents,
  clearProfileEvents,
} from './usageRepo';

function resetIndexedDb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB =
    new IDBFactory();
  resetDbForTests();
}

beforeEach(resetIndexedDb);

const baseEvent = {
  profileId: 'profile-1',
  boardId: 'board-1',
  cellId: 'cell-1',
  label: 'אמא',
  timestamp: 1000,
  sessionId: 'session-1',
};

describe('usageRepo — M7', () => {
  it('logEvent שומר אירוע עם id אוטומטי', async () => {
    await logEvent(baseEvent);
    const events = await getEvents('profile-1');
    expect(events).toHaveLength(1);
    expect(events[0].id).toBeTruthy();
    expect(events[0].label).toBe('אמא');
  });

  it('getEvents מחזיר רק אירועי profileId המבוקש', async () => {
    await logEvent(baseEvent);
    await logEvent({ ...baseEvent, profileId: 'profile-2', label: 'אבא' });
    const events = await getEvents('profile-1');
    expect(events).toHaveLength(1);
    expect(events[0].label).toBe('אמא');
  });

  it('getEvents עם since מסנן לפי זמן', async () => {
    await logEvent({ ...baseEvent, timestamp: 500 });
    await logEvent({ ...baseEvent, timestamp: 2000 });
    const events = await getEvents('profile-1', 1000);
    expect(events).toHaveLength(1);
    expect(events[0].timestamp).toBe(2000);
  });

  it('clearEvents מוחק אירועים ישנים מכל הפרופילים', async () => {
    await logEvent({ ...baseEvent, timestamp: 100 });
    await logEvent({ ...baseEvent, timestamp: 3000 });
    await logEvent({ ...baseEvent, profileId: 'profile-2', timestamp: 50 });
    await clearEvents(1000);
    expect(await getEvents('profile-1')).toHaveLength(1);
    expect(await getEvents('profile-2')).toHaveLength(0);
  });

  it('clearProfileEvents מוחק את כל אירועי פרופיל ספציפי', async () => {
    await logEvent(baseEvent);
    await logEvent({ ...baseEvent, label: 'אבא' });
    await logEvent({ ...baseEvent, profileId: 'profile-2', label: 'ילד' });
    await clearProfileEvents('profile-1');
    expect(await getEvents('profile-1')).toHaveLength(0);
    expect(await getEvents('profile-2')).toHaveLength(1);
  });
});
