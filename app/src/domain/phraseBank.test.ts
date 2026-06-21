import { describe, it, expect } from 'vitest';
import { createPhrase } from './phraseBank';
import type { Cell } from './models';

const makeCell = (label: string): Cell => ({
  id: crypto.randomUUID(),
  label,
  action: { type: 'speak' },
});

describe('createPhrase', () => {
  it('label = cells joined by space', () => {
    const cells = [makeCell('אני'), makeCell('רוצה'), makeCell('מים')];
    const phrase = createPhrase('prof-1', cells);
    expect(phrase.label).toBe('אני רוצה מים');
  });

  it('each call returns unique id', () => {
    const cells = [makeCell('שלום')];
    const a = createPhrase('prof-1', cells);
    const b = createPhrase('prof-1', cells);
    expect(a.id).not.toBe(b.id);
  });
});
