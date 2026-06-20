import { describe, it, expect, beforeEach } from 'vitest';
import { openDB } from 'idb';
import { IDBFactory } from 'fake-indexeddb';
import {
  DB_NAME,
  STORE_NIKUD,
  STORE_BOARDS,
  STORE_PROFILES,
  STORE_SETTINGS,
  STORE_SYMBOLS,
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

describe('מיגרציית DB v2→v3 — אינווריאנט: לא הורסת נתונים', () => {
  it('נתוני v2 שורדים שדרוג ל-v3, ונוסף store symbols', async () => {
    // הקמת DB בגרסה 2 — כל ה-stores של v2, עם רשומת לוח.
    const v2 = await openDB(DB_NAME, 2, {
      upgrade(db) {
        db.createObjectStore(STORE_NIKUD, { keyPath: 'text' });
        db.createObjectStore(STORE_BOARDS, { keyPath: 'id' });
        db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      },
    });
    await v2.put(STORE_BOARDS, { id: 'board-1', name: 'לוח ראשי', archived: false });
    v2.close();
    resetDbForTests();

    // שדרוג ל-v3 דרך getDb → upgrade אדיטיבי.
    const db = await getDb();
    const names = Array.from(db.objectStoreNames);

    // כל ה-stores הישנים עדיין קיימים.
    expect(names).toContain(STORE_NIKUD);
    expect(names).toContain(STORE_BOARDS);
    expect(names).toContain(STORE_PROFILES);
    expect(names).toContain(STORE_SETTINGS);

    // store חדש נוסף.
    expect(names).toContain(STORE_SYMBOLS);

    // הרשומה הישנה עדיין קיימת — לוח לא אבד.
    const board = await db.get(STORE_BOARDS, 'board-1');
    expect(board).toMatchObject({ name: 'לוח ראשי', archived: false });
  });
});
