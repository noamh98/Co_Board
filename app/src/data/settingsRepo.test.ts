import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbForTests } from './db';
import { createSettingsRepo } from './settingsRepo';
import { DEFAULT_ACCESS_SETTINGS } from '../domain/accessSettings';

function resetIndexedDb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  resetDbForTests();
}

beforeEach(resetIndexedDb);

describe('settingsRepo — accessSettings (FR-020)', () => {
  it('ברירת מחדל כשלא נשמר דבר', async () => {
    const s = createSettingsRepo();
    expect(await s.getAccessSettings()).toEqual(DEFAULT_ACCESS_SETTINGS);
  });

  it('save/get round-trip', async () => {
    const s = createSettingsRepo();
    const custom = {
      dwellTimeMs: 1200,
      activateOnRelease: true,
      doubleTapPrevention: true,
      dwellPreviewMs: 250,
    };
    await s.saveAccessSettings(custom);
    expect(await s.getAccessSettings()).toEqual(custom);
  });

  it('שדה חסר ממוזג עם ברירת מחדל (upgrade אדיטיבי)', async () => {
    const s = createSettingsRepo();
    // מדמה ערך ישן שנשמר ללא dwellPreviewMs
    await s.setActiveProfileId('x'); // מוודא DB פתוח
    const db = await (await import('./db')).getDb();
    await db.put('settings', {
      key: 'accessSettings',
      value: JSON.stringify({ dwellTimeMs: 500, activateOnRelease: false, doubleTapPrevention: false }),
    });
    const out = await s.getAccessSettings();
    expect(out.dwellTimeMs).toBe(500);
    expect(out.dwellPreviewMs).toBe(DEFAULT_ACCESS_SETTINGS.dwellPreviewMs);
  });
});
