import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BoardView } from './BoardView';
import type { Board } from '../../domain/models';

const board: Board = {
  id: 'b1',
  name: 'לוח בדיקה',
  grid: { rows: 1, cols: 2 },
  cells: {
    'cell-1': {
      id: 'cell-1',
      label: 'תא 1',
      fitzgerald: 'noun',
      isCore: false,
      action: { type: 'speak' },
    },
    'cell-2': {
      id: 'cell-2',
      label: 'תא 2',
      fitzgerald: 'noun',
      isCore: false,
      action: { type: 'speak' },
    },
  },
  placements: [
    { cellId: 'cell-1', row: 0, col: 0 },
    { cellId: 'cell-2', row: 0, col: 1 },
  ],
};

describe('BoardView — modeling highlights (M13)', () => {
  it('תא עם id ב-modelingHighlights מקבל class cell--modeling-highlight; תא ללא id — לא', () => {
    const { container } = render(
      <BoardView
        board={board}
        onCell={vi.fn()}
        modelingHighlights={new Set(['cell-1'])}
      />,
    );
    const highlighted = container.querySelectorAll('.cell--modeling-highlight');
    expect(highlighted).toHaveLength(1);
    const notHighlighted = container.querySelectorAll(
      '[role="gridcell"]:not(.cell--modeling-highlight)',
    );
    expect(notHighlighted).toHaveLength(1);
  });
});
