import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbForTests } from '../../data/db';
import { createMediaRepo, type MediaEntry } from '../../data/mediaRepo';
import { LocalStubStorageProvider } from './storageProvider';
import { uploadMedia, downloadMedia, deleteMediaFromStorage } from './mediaSync';

// Web Crypto stub — JSDOM לא מממש AES-GCM + PBKDF2 מלא
// לכן נבדוק את ה-flow (upload/download) עם מוק של crypto.ts
vi.mock('./crypto', () => ({
  encryptBlob: async (blob: Blob, _uid: string) => {
    // stub: מחזיר את ה-blob עם prefix "ENC:"
    const text = await blob.text();
    return new Blob([`ENC:${text}`], { type: 'application/octet-stream' });
  },
  decryptBlob: async (blob: Blob, _uid: string, mimeType: string) => {
    const text = await blob.text();
    if (!text.startsWith('ENC:')) return null;
    return new Blob([text.slice(4)], { type: mimeType });
  },
}));

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
    blob: new Blob(['imgdata'], { type: 'image/webp' }),
    encrypted: false,
    source: 'camera',
    createdAt: 1000,
    ...overrides,
  };
}

describe('uploadMedia', () => {
  it('מעלה blob מוצפן ל-Storage ומחזיר downloadUrl', async () => {
    const repo = createMediaRepo();
    const storage = new LocalStubStorageProvider();
    const entry = makeEntry();
    await repo.saveMedia(entry);

    const url = await uploadMedia('uid-123', entry, storage, repo);

    expect(url).toBe('stub://profiles/profile-a/media/media-1');
    expect(storage.storedPaths()).toContain('profiles/profile-a/media/media-1');
  });

  it('מעדכן syncedAt ו-downloadUrl ב-mediaRepo אחרי העלאה', async () => {
    const repo = createMediaRepo();
    const storage = new LocalStubStorageProvider();
    const entry = makeEntry();
    await repo.saveMedia(entry);

    await uploadMedia('uid-123', entry, storage, repo);

    const updated = await repo.getMedia('media-1');
    expect(updated?.syncedAt).toBeDefined();
    expect(updated?.downloadUrl).toBe('stub://profiles/profile-a/media/media-1');
  });

  it('ה-blob המועלה מוצפן (מכיל ENC: prefix)', async () => {
    const repo = createMediaRepo();
    const storage = new LocalStubStorageProvider();
    const entry = makeEntry({ blob: new Blob(['secret'], { type: 'image/webp' }) });
    await repo.saveMedia(entry);

    await uploadMedia('uid-123', entry, storage, repo);

    const uploaded = await storage.download('profiles/profile-a/media/media-1');
    const text = await uploaded.text();
    expect(text).toBe('ENC:secret');
  });
});

describe('downloadMedia', () => {
  it('מוריד, מפענח ושומר blob ב-mediaRepo', async () => {
    const repo = createMediaRepo();
    const storage = new LocalStubStorageProvider();
    const entry = makeEntry();
    await repo.saveMedia(entry);

    // העלה תחילה
    await uploadMedia('uid-123', entry, storage, repo);

    // הורד מחדש
    const blob = await downloadMedia('uid-123', 'profile-a', 'media-1', 'image/webp', storage, repo);
    expect(blob).not.toBeNull();
    const text = await blob!.text();
    expect(text).toBe('imgdata');
  });

  it('מחזיר null אם פענוח נכשל', async () => {
    const repo = createMediaRepo();
    const storage = new LocalStubStorageProvider();
    // מעלה blob לא מוצפן (ללא prefix ENC:)
    await storage.upload('profiles/profile-a/media/media-x', new Blob(['corrupted']));

    const blob = await downloadMedia('uid-123', 'profile-a', 'media-x', 'image/webp', storage, repo);
    expect(blob).toBeNull();
  });

  it('זורק שגיאה אם path לא קיים ב-Storage', async () => {
    const repo = createMediaRepo();
    const storage = new LocalStubStorageProvider();
    await expect(
      downloadMedia('uid-123', 'profile-a', 'no-such', 'image/webp', storage, repo),
    ).rejects.toThrow();
  });
});

describe('deleteMediaFromStorage', () => {
  it('מוחק קובץ מה-Storage', async () => {
    const storage = new LocalStubStorageProvider();
    await storage.upload('profiles/profile-a/media/del-1', new Blob(['x']));
    await deleteMediaFromStorage('profile-a', 'del-1', storage);
    expect(storage.storedPaths()).not.toContain('profiles/profile-a/media/del-1');
  });

  it('זורק שגיאה אם path לא קיים', async () => {
    const storage = new LocalStubStorageProvider();
    await expect(deleteMediaFromStorage('profile-a', 'nonexistent', storage)).rejects.toThrow();
  });
});

describe('אינווריאנט offline-first', () => {
  it('uploadMedia נכשל → entry מקומי נשמר ב-mediaRepo', async () => {
    const repo = createMediaRepo();
    const storage = new LocalStubStorageProvider();
    // storage שזורק שגיאה
    vi.spyOn(storage, 'upload').mockRejectedValueOnce(new Error('Network error'));

    const entry = makeEntry();
    await repo.saveMedia(entry);

    await expect(uploadMedia('uid-123', entry, storage, repo)).rejects.toThrow('Network error');

    // הנתון המקומי עדיין שמור
    const fetched = await repo.getMedia('media-1');
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe('media-1');
  });
});
