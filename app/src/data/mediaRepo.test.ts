import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbForTests } from './db';
import { createMediaRepo, type MediaEntry } from './mediaRepo';

function resetIndexedDb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  resetDbForTests();
}

beforeEach(resetIndexedDb);

function makeEntry(overrides?: Partial<MediaEntry>): MediaEntry {
  return {
    id: 'media-1',
    cellId: 'cell-1',
    profileId: 'profile-a',
    mimeType: 'image/webp',
    blob: new Blob(['test'], { type: 'image/webp' }),
    encrypted: false,
    source: 'gallery',
    createdAt: 1000,
    ...overrides,
  };
}

describe('mediaRepo — saveMedia / getMedia', () => {
  it('שמירה וקריאה round-trip', async () => {
    const repo = createMediaRepo();
    const entry = makeEntry();
    await repo.saveMedia(entry);
    const fetched = await repo.getMedia('media-1');
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe('media-1');
    expect(fetched?.mimeType).toBe('image/webp');
    expect(fetched?.profileId).toBe('profile-a');
  });

  it('getMedia מחזיר undefined לmedia לא קיים', async () => {
    const repo = createMediaRepo();
    const result = await repo.getMedia('no-such-id');
    expect(result).toBeUndefined();
  });

  it('saveMedia מעדכן entry קיים (upsert)', async () => {
    const repo = createMediaRepo();
    await repo.saveMedia(makeEntry({ syncedAt: undefined }));
    await repo.saveMedia(makeEntry({ syncedAt: 9999 }));
    const fetched = await repo.getMedia('media-1');
    expect(fetched?.syncedAt).toBe(9999);
  });
});

describe('mediaRepo — listByProfile', () => {
  it('מחזיר רק entries של הפרופיל המבוקש', async () => {
    const repo = createMediaRepo();
    await repo.saveMedia(makeEntry({ id: 'm-a1', profileId: 'profile-a' }));
    await repo.saveMedia(makeEntry({ id: 'm-a2', profileId: 'profile-a' }));
    await repo.saveMedia(makeEntry({ id: 'm-b1', profileId: 'profile-b' }));
    const listA = await repo.listByProfile('profile-a');
    expect(listA).toHaveLength(2);
    expect(listA.map((e) => e.id)).toContain('m-a1');
    expect(listA.map((e) => e.id)).toContain('m-a2');
    const listB = await repo.listByProfile('profile-b');
    expect(listB).toHaveLength(1);
  });

  it('מסנן entries מארכיב', async () => {
    const repo = createMediaRepo();
    await repo.saveMedia(makeEntry({ id: 'm-active', profileId: 'profile-a' }));
    await repo.saveMedia(makeEntry({ id: 'm-archived', profileId: 'profile-a', archived: true }));
    const list = await repo.listByProfile('profile-a');
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('m-active');
  });

  it('מחזיר רשימה ריקה לפרופיל ללא media', async () => {
    const repo = createMediaRepo();
    const list = await repo.listByProfile('empty-profile');
    expect(list).toHaveLength(0);
  });
});

describe('mediaRepo — deleteMedia (מחיקה רכה)', () => {
  it('deleteMedia מציב archived:true — לא מסיר מה-DB', async () => {
    const repo = createMediaRepo();
    await repo.saveMedia(makeEntry());
    await repo.deleteMedia('media-1');
    // הרשומה עדיין קיימת ב-DB
    const fetched = await repo.getMedia('media-1');
    expect(fetched).toBeDefined();
    expect(fetched?.archived).toBe(true);
  });

  it('deleteMedia על ID לא קיים לא קורס', async () => {
    const repo = createMediaRepo();
    await expect(repo.deleteMedia('nonexistent')).resolves.toBeUndefined();
  });

  it('entry מארכיב לא מופיע ב-listByProfile', async () => {
    const repo = createMediaRepo();
    await repo.saveMedia(makeEntry({ profileId: 'p-1' }));
    await repo.deleteMedia('media-1');
    const list = await repo.listByProfile('p-1');
    expect(list).toHaveLength(0);
  });
});

describe('mediaRepo — source + mimeType types', () => {
  it('שומר source=camera', async () => {
    const repo = createMediaRepo();
    await repo.saveMedia(makeEntry({ id: 'cam-1', source: 'camera' }));
    const fetched = await repo.getMedia('cam-1');
    expect(fetched?.source).toBe('camera');
  });

  it('שומר source=url', async () => {
    const repo = createMediaRepo();
    await repo.saveMedia(makeEntry({ id: 'url-1', source: 'url' }));
    const fetched = await repo.getMedia('url-1');
    expect(fetched?.source).toBe('url');
  });
});
