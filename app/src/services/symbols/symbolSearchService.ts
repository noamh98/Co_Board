import { searchSymbols, getImageUrl } from './arasaacClient';
import { getFromCache, saveToCache } from '../../data/symbolCache';

export interface SymbolResult {
  arasaacId: number;
  label: string;
  imageUrl: string;
}

export class SymbolOfflineError extends Error {
  constructor() {
    super('סמל לא זמין — בדוק חיבור לרשת');
    this.name = 'SymbolOfflineError';
  }
}

export async function searchAndCache(query: string): Promise<SymbolResult[]> {
  const symbols = await searchSymbols(query);
  return symbols.map((s) => ({
    arasaacId: s.id,
    label: s.keywords[0] ?? String(s.id),
    imageUrl: getImageUrl(s.id),
  }));
}

export async function fetchAndCacheBlob(arasaacId: number): Promise<string> {
  const cached = await getFromCache(arasaacId);
  if (cached) return cached;

  let blob: Blob;
  try {
    const res = await fetch(getImageUrl(arasaacId));
    if (!res.ok) throw new SymbolOfflineError();
    blob = await res.blob();
  } catch (err) {
    if (err instanceof SymbolOfflineError) throw err;
    throw new SymbolOfflineError();
  }

  await saveToCache(arasaacId, blob);
  return URL.createObjectURL(blob);
}
