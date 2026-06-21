import type { Cell } from './models';

export interface PhraseEntry {
  id: string;
  label: string;
  cells: Cell[];
  profileId: string;
  createdAt: number;
}

export function createPhrase(profileId: string, cells: Cell[]): PhraseEntry {
  return {
    id: crypto.randomUUID(),
    label: cells.map((c) => c.label).join(' '),
    cells,
    profileId,
    createdAt: Date.now(),
  };
}
