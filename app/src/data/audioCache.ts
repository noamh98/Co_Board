import { getDb, STORE_AUDIO_CACHE } from './db';

export interface AudioCacheEntry {
  cacheKey: string;
  blob: Blob;
  voiceId: string;
  cachedAt: number;
  lastAccessedAt: number;
}

export async function buildCacheKey(
  text: string, voiceId: string, rate: number, pitch: number
): Promise<string> {
  const raw = `${text}\x00${voiceId}\x00${rate.toFixed(2)}\x00${pitch.toFixed(2)}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getAudioFromCache(key: string): Promise<Blob | null> {
  const db = await getDb();
  const entry = await db.get(STORE_AUDIO_CACHE, key) as AudioCacheEntry | undefined;
  if (!entry) return null;
  // update lastAccessedAt
  await db.put(STORE_AUDIO_CACHE, { ...entry, lastAccessedAt: Date.now() });
  return entry.blob;
}

export async function saveAudioToCache(key: string, blob: Blob, voiceId: string): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.put(STORE_AUDIO_CACHE, { cacheKey: key, blob, voiceId, cachedAt: now, lastAccessedAt: now });
}

export async function pruneAudioCache(maxEntries = 500): Promise<void> {
  const db = await getDb();
  const all = await db.getAll(STORE_AUDIO_CACHE) as AudioCacheEntry[];
  if (all.length <= maxEntries) return;
  const sorted = [...all].sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
  const toDelete = sorted.slice(0, all.length - maxEntries);
  const tx = db.transaction(STORE_AUDIO_CACHE, 'readwrite');
  await Promise.all(toDelete.map(e => tx.store.delete(e.cacheKey)));
  await tx.done;
}
