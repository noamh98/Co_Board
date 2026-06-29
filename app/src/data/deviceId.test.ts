import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { getDb, STORE_SETTINGS, resetDbForTests } from './db';
import { getDeviceId, _resetDeviceIdCacheForTests } from './deviceId';

// Phase 0 (CR-6): deviceId עבר מ-localStorage ל-IDB. מצב פרטי כבר לא מאפס אותו בכל טעינה.

function resetIdb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  resetDbForTests();
  _resetDeviceIdCacheForTests();
}

beforeEach(() => {
  resetIdb();
  localStorage.clear();
});

describe('deviceId — אחסון ב-IDB + מיגרציה (CR-6)', () => {
  it('יוצר מזהה ושומר אותו ב-IDB; קריאה חוזרת מחזירה אותו ערך', async () => {
    const id1 = await getDeviceId();
    expect(id1).toBeTruthy();
    _resetDeviceIdCacheForTests(); // מדמה טעינה מחדש (cache ריק).
    const id2 = await getDeviceId();
    expect(id2).toBe(id1); // יציב בין טעינות — מקור-אמת ב-IDB.
    const entry = (await (await getDb()).get(STORE_SETTINGS, 'deviceId')) as { value: string };
    expect(entry.value).toBe(id1);
  });

  it('מיגרציה חד-פעמית: ערך legacy מ-localStorage מאומץ', async () => {
    localStorage.setItem('sync-device-id', 'legacy-device-123');
    const id = await getDeviceId();
    expect(id).toBe('legacy-device-123');
    const entry = (await (await getDb()).get(STORE_SETTINGS, 'deviceId')) as { value: string };
    expect(entry.value).toBe('legacy-device-123');
  });
});
