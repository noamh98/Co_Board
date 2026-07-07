import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbForTests } from './db';
import { createSettingsRepo, getSyncEnabled, setSyncEnabled } from './settingsRepo';
import { DEFAULT_ACCESS_SETTINGS } from '../domain/accessSettings';

function resetIndexedDb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  resetDbForTests();
}

beforeEach(resetIndexedDb);

describe('settingsRepo — selectedVoiceURI (FR-010)', () => {
  it('מחזיר null לפני כל שמירה', async () => {
    const s = createSettingsRepo();
    expect(await s.getSelectedVoiceURI()).toBeNull();
  });

  it('setSelectedVoiceURI + get round-trip', async () => {
    const s = createSettingsRepo();
    await s.setSelectedVoiceURI('com.apple.ttsbundle.Carmit-compact');
    expect(await s.getSelectedVoiceURI()).toBe('com.apple.ttsbundle.Carmit-compact');
    await s.setSelectedVoiceURI(null);
    expect(await s.getSelectedVoiceURI()).toBeNull();
  });
});

describe('settingsRepo — ttsRate / ttsPitch (M15 הרחבה)', () => {
  it('getTtsRate מחזיר 1.0 לפני שמירה', async () => {
    const s = createSettingsRepo();
    expect(await s.getTtsRate()).toBe(1.0);
  });

  it('setTtsRate + getTtsRate round-trip', async () => {
    const s = createSettingsRepo();
    await s.setTtsRate(1.5);
    expect(await s.getTtsRate()).toBe(1.5);
  });

  it('getTtsPitch מחזיר 1.0 לפני שמירה', async () => {
    const s = createSettingsRepo();
    expect(await s.getTtsPitch()).toBe(1.0);
  });

  it('setTtsPitch + getTtsPitch round-trip', async () => {
    const s = createSettingsRepo();
    await s.setTtsPitch(0.8);
    expect(await s.getTtsPitch()).toBe(0.8);
  });
});

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
      highContrast: false,
    };
    await s.saveAccessSettings(custom);
    // Phase I adds scanning/prediction/cellMinPx fields — merged with defaults on read.
    const result = await s.getAccessSettings();
    expect(result).toMatchObject(custom);
    expect(result.scanningEnabled).toBe(DEFAULT_ACCESS_SETTINGS.scanningEnabled);
    expect(result.predictionEnabled).toBe(DEFAULT_ACCESS_SETTINGS.predictionEnabled);
    expect(result.cellMinPx).toBe(DEFAULT_ACCESS_SETTINGS.cellMinPx);
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

describe('settingsRepo — syncEnabled consent (B-11)', () => {
  it('מחזיר false לפני כל שמירה (מקומי בלבד כברירת מחדל)', async () => {
    expect(await getSyncEnabled()).toBe(false);
  });

  it('setSyncEnabled(true) נשמר ונקרא בין "טעינות" (round-trip)', async () => {
    await setSyncEnabled(true);
    expect(await getSyncEnabled()).toBe(true);
  });

  it('ניתן לכבות שוב', async () => {
    await setSyncEnabled(true);
    await setSyncEnabled(false);
    expect(await getSyncEnabled()).toBe(false);
  });
});
