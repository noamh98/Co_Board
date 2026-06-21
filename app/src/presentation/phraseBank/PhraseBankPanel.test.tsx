import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhraseBankPanel } from './PhraseBankPanel';
import type { PhraseEntry } from '../../domain/phraseBank';
import type { Cell } from '../../domain/models';

const cell = (label: string): Cell => ({
  id: 'c1',
  label,
  action: { type: 'speak' },
});

const samplePhrase: PhraseEntry = {
  id: 'ph-1',
  label: 'אני רוצה מים',
  cells: [cell('אני'), cell('רוצה'), cell('מים')],
  profileId: 'p1',
  createdAt: 1000,
};

describe('PhraseBankPanel', () => {
  it('מציג הודעת ריק כשאין ביטויים', () => {
    render(
      <PhraseBankPanel
        phrases={[]}
        onLoad={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('אין ביטויים שמורים עדיין')).toBeInTheDocument();
  });

  it('לחיצת "טען" קוראת onLoad עם תאי הביטוי', () => {
    const onLoad = vi.fn();
    render(
      <PhraseBankPanel
        phrases={[samplePhrase]}
        onLoad={onLoad}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /טען/ }));
    expect(onLoad).toHaveBeenCalledWith(samplePhrase.cells);
  });

  it('לחיצת × (מחק) קוראת onDelete עם ה-id', () => {
    const onDelete = vi.fn();
    render(
      <PhraseBankPanel
        phrases={[samplePhrase]}
        onLoad={vi.fn()}
        onDelete={onDelete}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /מחק/ }));
    expect(onDelete).toHaveBeenCalledWith('ph-1');
  });
});
