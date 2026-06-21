import { getDb, STORE_SYMBOLS } from './db';

export interface SymbolEntry {
  id: string;
  uri: string;
  mimeType: 'audio/webm' | 'image/webp' | 'image/png' | 'image/jpeg';
  source: 'camera' | 'gallery' | 'arasaac' | 'recording';
  createdAt: number;
}

export interface SymbolRepo {
  save(entry: SymbolEntry): Promise<void>;
  get(id: string): Promise<SymbolEntry | undefined>;
  list(): Promise<SymbolEntry[]>;
  remove(id: string): Promise<void>;
}

export function createSymbolRepo(): SymbolRepo {
  return {
    async save(entry) {
      const db = await getDb();
      await db.put(STORE_SYMBOLS, entry);
    },
    async get(id) {
      const db = await getDb();
      return (await db.get(STORE_SYMBOLS, id)) as SymbolEntry | undefined;
    },
    async list() {
      const db = await getDb();
      return (await db.getAll(STORE_SYMBOLS)) as SymbolEntry[];
    },
    async remove(id) {
      const db = await getDb();
      await db.delete(STORE_SYMBOLS, id);
    },
  };
}
