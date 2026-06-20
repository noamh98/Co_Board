import { getDb, STORE_SYMBOL_CACHE } from './db';

export interface CachedSymbol {
  arasaacId: number;
  blob: Blob;
  cachedAt: number;
}

export async function getFromCache(arasaacId: number): Promise<string | null> {
  const db = await getDb();
  const entry = await db.get(STORE_SYMBOL_CACHE, arasaacId) as CachedSymbol | undefined;
  if (!entry) return null;
  return URL.createObjectURL(entry.blob);
}

export async function saveToCache(arasaacId: number, blob: Blob): Promise<void> {
  const db = await getDb();
  const entry: CachedSymbol = { arasaacId, blob, cachedAt: Date.now() };
  await db.put(STORE_SYMBOL_CACHE, entry);
}

export async function pruneCache(maxAgeDays = 30): Promise<void> {
  const db = await getDb();
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const all = await db.getAll(STORE_SYMBOL_CACHE) as CachedSymbol[];
  const toDelete = all.filter((e) => e.cachedAt < cutoff);
  if (toDelete.length === 0) return;
  const tx = db.transaction(STORE_SYMBOL_CACHE, 'readwrite');
  await Promise.all(toDelete.map((e) => tx.store.delete(e.arasaacId)));
  await tx.done;
}
