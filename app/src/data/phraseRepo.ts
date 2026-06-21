import { getDb, STORE_PHRASES } from './db';
import type { PhraseEntry } from '../domain/phraseBank';

export async function savePhrase(entry: PhraseEntry): Promise<void> {
  const db = await getDb();
  await db.put(STORE_PHRASES, entry);
}

export async function listPhrases(profileId: string): Promise<PhraseEntry[]> {
  const db = await getDb();
  const index = db.transaction(STORE_PHRASES).store.index('by-profile');
  return index.getAll(profileId);
}

export async function deletePhrase(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_PHRASES, id);
}
