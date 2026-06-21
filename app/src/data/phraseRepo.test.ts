import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbForTests } from './db';
import { savePhrase, listPhrases, deletePhrase } from './phraseRepo';
import { createPhrase } from '../domain/phraseBank';
import type { Cell } from '../domain/models';

const cell = (label: string): Cell => ({
  id: crypto.randomUUID(),
  label,
  action: { type: 'speak' },
});

beforeEach(() => {
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB =
    new IDBFactory();
  resetDbForTests();
});

describe('phraseRepo', () => {
  it('save + list מחזיר את הביטוי השמור', async () => {
    const entry = createPhrase('p1', [cell('אני'), cell('רוצה')]);
    await savePhrase(entry);
    const results = await listPhrases('p1');
    expect(results).toHaveLength(1);
    expect(results[0]?.label).toBe('אני רוצה');
  });

  it('delete מסיר ביטוי', async () => {
    const entry = createPhrase('p1', [cell('שלום')]);
    await savePhrase(entry);
    await deletePhrase(entry.id);
    const results = await listPhrases('p1');
    expect(results).toHaveLength(0);
  });

  it('list מסונן לפי profileId — לא מחזיר ביטויים של פרופיל אחר', async () => {
    const e1 = createPhrase('p1', [cell('אני')]);
    const e2 = createPhrase('p2', [cell('אתה')]);
    await savePhrase(e1);
    await savePhrase(e2);
    const results = await listPhrases('p1');
    expect(results).toHaveLength(1);
    expect(results[0]?.profileId).toBe('p1');
  });
});
