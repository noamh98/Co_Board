// services/config/featureFlags.test.ts — בדיקות לשירות דגלי-התכונה (B-17 / 4.8).
// ה-fetcher מוזרק — אין תלות ב-Firebase אמיתי (אינווריאנט: בדיקות בלי מפתח).

import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbForTests, getDb, STORE_SETTINGS } from '../../data/db';
import {
  loadFeatureFlags,
  isFeatureEnabled,
  resetFeatureFlagsForTests,
} from './featureFlags';

beforeEach(() => {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  resetDbForTests();
  resetFeatureFlagsForTests();
});

describe('loadFeatureFlags / isFeatureEnabled', () => {
  it('שליפה מוצלחת — הדגלים זמינים ונשמרים ל-cache מקומי', async () => {
    const flags = await loadFeatureFlags(async () => ({ newBuilder: true, expoPort: false }));
    expect(flags).toEqual({ newBuilder: true, expoPort: false });
    expect(await isFeatureEnabled('newBuilder')).toBe(true);
    expect(await isFeatureEnabled('expoPort')).toBe(false);

    const db = await getDb();
    const cached = (await db.get(STORE_SETTINGS, 'featureFlagsCache')) as { value: string };
    expect(JSON.parse(cached.value)).toEqual({ newBuilder: true, expoPort: false });
  });

  it('דגל לא-מוגדר מחזיר את ברירת המחדל של הקורא (שמרני: כבוי)', async () => {
    await loadFeatureFlags(async () => ({}));
    expect(await isFeatureEnabled('unknownFlag')).toBe(false);
    expect(await isFeatureEnabled('unknownFlag', true)).toBe(true);
  });

  it('offline-first: כשל שליפה נופל ל-cache האחרון-שנודע', async () => {
    const db = await getDb();
    await db.put(STORE_SETTINGS, {
      key: 'featureFlagsCache',
      value: JSON.stringify({ newBuilder: true }),
    });

    const flags = await loadFeatureFlags(async () => {
      throw new Error('offline');
    });
    expect(flags).toEqual({ newBuilder: true });
    expect(await isFeatureEnabled('newBuilder')).toBe(true);
  });

  it('כשל שליפה ללא cache — אובייקט ריק, שום דבר לא נשבר', async () => {
    const flags = await loadFeatureFlags(async () => {
      throw new Error('offline');
    });
    expect(flags).toEqual({});
    expect(await isFeatureEnabled('anything')).toBe(false);
  });

  it('memoization: השליפה רצה פעם אחת לכל חיי הטאב', async () => {
    let calls = 0;
    const fetcher = async () => {
      calls++;
      return { a: true };
    };
    await loadFeatureFlags(fetcher);
    await loadFeatureFlags(fetcher);
    await isFeatureEnabled('a');
    expect(calls).toBe(1);
  });
});
