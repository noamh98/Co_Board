import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbForTests, getDb, STORE_AUDIO_CACHE } from './db';
import {
  getAudioFromCache,
  saveAudioToCache,
  type AudioCacheEntry,
} from './audioCache';

// שולטים ב-Date.now (ולא בטיימרים) כדי לא להתנגש עם ה-event loop של fake-indexeddb.
function resetIndexedDb(): void {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB =
    new IDBFactory();
  resetDbForTests();
}

beforeEach(resetIndexedDb);
afterEach(() => vi.restoreAllMocks());

async function readEntry(key: string): Promise<AudioCacheEntry | undefined> {
  const db = await getDb();
  return (await db.get(STORE_AUDIO_CACHE, key)) as AudioCacheEntry | undefined;
}

describe('audioCache — Phase 1 debounce lastAccessedAt', () => {
  it('שני hits רצופים בתוך חלון 60ש\' אינם כותבים lastAccessedAt מחדש', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000_000);
    const key = 'k-within-window';
    await saveAudioToCache(key, new Blob(['a'], { type: 'audio/webm' }), 'voice-1');
    expect((await readEntry(key))?.lastAccessedAt).toBe(1_000_000);

    // שני hits 5 שניות אחרי השמירה — בתוך החלון → אסור rewrite.
    nowSpy.mockReturnValue(1_005_000);
    const b1 = await getAudioFromCache(key);
    const b2 = await getAudioFromCache(key);
    expect(b1).toBeTruthy();
    expect(b2).toBeTruthy();
    // lastAccessedAt נשאר כפי שהיה — 0 כתיבות (לכל היותר אחת).
    expect((await readEntry(key))?.lastAccessedAt).toBe(1_000_000);
  });

  it('כניסה ישנה: שני hits רצופים גורמים לכתיבה אחת בלבד', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000);
    const key = 'k-stale';
    await saveAudioToCache(key, new Blob(['b'], { type: 'audio/webm' }), 'voice-1');

    // hit ראשון הרבה אחרי השמירה (>60ש') → rewrite יחיד ל-lastAccessedAt=100_000.
    nowSpy.mockReturnValue(100_000);
    await getAudioFromCache(key);
    // hit שני 30ש' אחרי הראשון → בתוך החלון → דילוג.
    nowSpy.mockReturnValue(130_000);
    await getAudioFromCache(key);

    // אילו ה-hit השני היה כותב, הערך היה 130_000. כתיבה אחת בלבד התרחשה.
    expect((await readEntry(key))?.lastAccessedAt).toBe(100_000);
  });
});
