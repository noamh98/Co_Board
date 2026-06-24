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
  STORE_MEDIA,
  STORE_OUTBOX,
  STORE_VERSIONS,
  STORE_USAGE,
  STORE_SYMBOL_CACHE,
  STORE_PHRASES,
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

describe('מיגרציית DB v3→v4 — אינווריאנט: לא הורסת נתונים', () => {
  it('נתוני v3 שורדים שדרוג ל-v4, ונוספים stores outbox ו-versions', async () => {
    const v3 = await openDB(DB_NAME, 3, {
      upgrade(db) {
        db.createObjectStore(STORE_NIKUD, { keyPath: 'text' });
        db.createObjectStore(STORE_BOARDS, { keyPath: 'id' });
        db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        db.createObjectStore(STORE_SYMBOLS, { keyPath: 'id' });
      },
    });
    await v3.put(STORE_BOARDS, { id: 'board-v3', name: 'לוח v3', archived: false });
    v3.close();
    resetDbForTests();

    const db = await getDb();
    const names = Array.from(db.objectStoreNames);

    expect(names).toContain(STORE_NIKUD);
    expect(names).toContain(STORE_BOARDS);
    expect(names).toContain(STORE_PROFILES);
    expect(names).toContain(STORE_SETTINGS);
    expect(names).toContain(STORE_SYMBOLS);
    expect(names).toContain(STORE_OUTBOX);
    expect(names).toContain(STORE_VERSIONS);

    const board = await db.get(STORE_BOARDS, 'board-v3');
    expect(board).toMatchObject({ name: 'לוח v3', archived: false });
  });
});

describe('מיגרציית DB v4→v5 — אינווריאנט: לא הורסת נתונים', () => {
  it('נתוני v4 שורדים שדרוג ל-v5, ונוסף store usage עם אינדקסים', async () => {
    const v4 = await openDB(DB_NAME, 4, {
      upgrade(db) {
        db.createObjectStore(STORE_NIKUD, { keyPath: 'text' });
        db.createObjectStore(STORE_BOARDS, { keyPath: 'id' });
        db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        db.createObjectStore(STORE_SYMBOLS, { keyPath: 'id' });
        db.createObjectStore(STORE_OUTBOX, { keyPath: 'id' });
        db.createObjectStore(STORE_VERSIONS, { keyPath: 'key' });
      },
    });
    await v4.put(STORE_BOARDS, { id: 'board-v4', name: 'לוח v4', archived: false });
    v4.close();
    resetDbForTests();

    const db = await getDb();
    const names = Array.from(db.objectStoreNames);

    expect(names).toContain(STORE_NIKUD);
    expect(names).toContain(STORE_BOARDS);
    expect(names).toContain(STORE_PROFILES);
    expect(names).toContain(STORE_SETTINGS);
    expect(names).toContain(STORE_SYMBOLS);
    expect(names).toContain(STORE_OUTBOX);
    expect(names).toContain(STORE_VERSIONS);
    expect(names).toContain(STORE_USAGE);

    const board = await db.get(STORE_BOARDS, 'board-v4');
    expect(board).toMatchObject({ name: 'לוח v4', archived: false });
  });
});

describe('מיגרציית DB v7→v8 — תיקון mimeType הקלטות (P3)', () => {
  function makeV7(): Promise<import('idb').IDBPDatabase> {
    return openDB(DB_NAME, 7, {
      upgrade(db) {
        db.createObjectStore(STORE_NIKUD, { keyPath: 'text' });
        db.createObjectStore(STORE_BOARDS, { keyPath: 'id' });
        db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        db.createObjectStore(STORE_SYMBOLS, { keyPath: 'id' });
        db.createObjectStore(STORE_OUTBOX, { keyPath: 'id' });
        db.createObjectStore(STORE_VERSIONS, { keyPath: 'key' });
        const usage = db.createObjectStore(STORE_USAGE, { keyPath: 'id' });
        usage.createIndex('by-profile', 'profileId', { unique: false });
        usage.createIndex('by-timestamp', 'timestamp', { unique: false });
        db.createObjectStore(STORE_SYMBOL_CACHE, { keyPath: 'arasaacId' });
        const phrases = db.createObjectStore(STORE_PHRASES, { keyPath: 'id' });
        phrases.createIndex('by-profile', 'profileId', { unique: false });
      },
    });
  }

  it('entry הקלטה ישנה עם mimeType image/webp מתוקנת ל-audio/webm במיגרציה', async () => {
    const v7 = await makeV7();
    await v7.put(STORE_SYMBOLS, {
      id: 'rec-1',
      uri: 'data:audio/webm;base64,abc',
      mimeType: 'image/webp',
      source: 'recording',
      createdAt: 1000,
    });
    v7.close();
    resetDbForTests();

    const db = await getDb();
    const entry = await db.get(STORE_SYMBOLS, 'rec-1');
    expect(entry?.mimeType).toBe('audio/webm');
  });

  it('entry מצלמה עם mimeType image/webp לא מושפע ממיגרציה', async () => {
    const v7 = await makeV7();
    await v7.put(STORE_SYMBOLS, {
      id: 'cam-1',
      uri: 'data:image/webp;base64,abc',
      mimeType: 'image/webp',
      source: 'camera',
      createdAt: 1000,
    });
    v7.close();
    resetDbForTests();

    const db = await getDb();
    const entry = await db.get(STORE_SYMBOLS, 'cam-1');
    expect(entry?.mimeType).toBe('image/webp');
  });
});

describe('מיגרציית DB v9→v10 — הוספת store media (חלק 3)', () => {
  function makeV9(): Promise<import('idb').IDBPDatabase> {
    return openDB(DB_NAME, 9, {
      upgrade(db) {
        db.createObjectStore(STORE_NIKUD, { keyPath: 'text' });
        db.createObjectStore(STORE_BOARDS, { keyPath: 'id' });
        db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        db.createObjectStore(STORE_SYMBOLS, { keyPath: 'id' });
        db.createObjectStore(STORE_OUTBOX, { keyPath: 'id' });
        db.createObjectStore(STORE_VERSIONS, { keyPath: 'key' });
        const usage = db.createObjectStore(STORE_USAGE, { keyPath: 'id' });
        usage.createIndex('by-profile', 'profileId', { unique: false });
        usage.createIndex('by-timestamp', 'timestamp', { unique: false });
        db.createObjectStore(STORE_SYMBOL_CACHE, { keyPath: 'arasaacId' });
        const phrases = db.createObjectStore(STORE_PHRASES, { keyPath: 'id' });
        phrases.createIndex('by-profile', 'profileId', { unique: false });
        db.createObjectStore('audioCache', { keyPath: 'cacheKey' });
      },
    });
  }

  it('נתוני v9 שורדים שדרוג ל-v10, ונוסף store media עם אינדקס by-profile', async () => {
    const v9 = await makeV9();
    await v9.put(STORE_BOARDS, { id: 'board-v9', name: 'לוח v9', archived: false });
    v9.close();
    resetDbForTests();

    const db = await getDb();
    const names = Array.from(db.objectStoreNames);

    // כל ה-stores הישנים שרדו
    expect(names).toContain(STORE_NIKUD);
    expect(names).toContain(STORE_BOARDS);
    expect(names).toContain(STORE_SYMBOLS);

    // store חדש נוסף
    expect(names).toContain(STORE_MEDIA);

    // הרשומה הישנה עדיין קיימת
    const board = await db.get(STORE_BOARDS, 'board-v9');
    expect(board).toMatchObject({ name: 'לוח v9', archived: false });
  });

  it('store media כולל אינדקס by-profile', async () => {
    const v9 = await makeV9();
    v9.close();
    resetDbForTests();

    const db = await getDb();
    const tx = db.transaction(STORE_MEDIA, 'readonly');
    const indexNames = Array.from(tx.store.indexNames);
    expect(indexNames).toContain('by-profile');
  });
});
