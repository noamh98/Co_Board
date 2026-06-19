import { describe, it, expect, beforeEach } from 'vitest';
import { openDB } from 'idb';
import { IDBFactory } from 'fake-indexeddb';
import {
  DB_NAME,
  STORE_NIKUD,
  STORE_BOARDS,
  STORE_PROFILES,
  STORE_SETTINGS,
  getDb,
  resetDbForTests,
} from './db';

function resetIndexedDb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB =
    new IDBFactory();
  resetDbForTests();
}

beforeEach(resetIndexedDb);

describe('מיגרציית DB v1→v2 — אינווריאנט: לא הורסת נתונים', () => {
  it('נתוני ניקוד מ-v1 שורדים שדרוג, ונוספים stores חדשים', async () => {
    // הקמת DB ישן (v1) — store ניקוד בלבד, כמו לפני M1 — עם רשומה ידנית.
    const v1 = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NIKUD, { keyPath: 'text' });
      },
    });
    await v1.put(STORE_NIKUD, {
      text: 'אמא',
      nikud: 'אִמָּא',
      source: 'manual',
      updatedAt: 1,
    });
    v1.close();
    resetDbForTests();

    // שדרוג ל-v2 דרך getDb → upgrade אדיטיבי.
    const db = await getDb();
    const names = Array.from(db.objectStoreNames);
    expect(names).toContain(STORE_NIKUD);
    expect(names).toContain(STORE_BOARDS);
    expect(names).toContain(STORE_PROFILES);
    expect(names).toContain(STORE_SETTINGS);

    // הרשומה הישנה עדיין קיימת — תיקון ידני לא אבד.
    const entry = await db.get(STORE_NIKUD, 'אמא');
    expect(entry).toMatchObject({ nikud: 'אִמָּא', source: 'manual' });
  });
});
