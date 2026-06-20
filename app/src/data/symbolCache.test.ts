import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFromCache, saveToCache, pruneCache } from './symbolCache';
import { resetDbForTests } from './db';

beforeEach(() => {
  resetDbForTests();
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock') });
});

describe('symbolCache', () => {
  it('save→get מחזיר object URL', async () => {
    const blob = new Blob(['data'], { type: 'image/png' });
    await saveToCache(1, blob);
    const url = await getFromCache(1);
    expect(url).toMatch(/^blob:/);
  });

  it('cache miss מחזיר null', async () => {
    const result = await getFromCache(9999);
    expect(result).toBeNull();
  });

  it('pruneCache מסיר ישנים', async () => {
    const blob = new Blob(['old'], { type: 'image/png' });
    const db = await import('./db').then((m) => m.getDb());
    await db.put('symbolCache', {
      arasaacId: 42,
      blob,
      cachedAt: Date.now() - 40 * 24 * 60 * 60 * 1000,
    });
    await pruneCache(30);
    const result = await getFromCache(42);
    expect(result).toBeNull();
  });

  it('pruneCache שומר חדשים', async () => {
    const blob = new Blob(['new'], { type: 'image/png' });
    await saveToCache(7, blob);
    await pruneCache(30);
    const result = await getFromCache(7);
    expect(result).toMatch(/^blob:/);
  });
});
