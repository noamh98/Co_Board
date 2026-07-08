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

describe('BoardView — מבנה ARIA של הלוח (C-03/B-22)', () => {
  it('grid מכיל role="row" עוטפים, וכל gridcell יושב בתוך row', () => {
    const { container } = render(<BoardView board={board} onCell={vi.fn()} />);
    const grid = container.querySelector('[role="grid"]');
    expect(grid).not.toBeNull();
    // שורה יחידה (row=0) → role="row" אחד, ילד ישיר של ה-grid.
    const rows = grid!.querySelectorAll(':scope > [role="row"]');
    expect(rows).toHaveLength(1);
    // כל התאים חייבים להיות ילדים ישירים של role="row" (לא של ה-grid).
    const cellsInRows = grid!.querySelectorAll('[role="row"] > [role="gridcell"]');
    expect(cellsInRows).toHaveLength(2);
    const cellsDirectlyInGrid = grid!.querySelectorAll(':scope > [role="gridcell"]');
    expect(cellsDirectlyInGrid).toHaveLength(0);
  });

  it('מקבץ תאים ממספר שורות ל-role="row" נפרדים לפי placement.row', () => {
    const multiRow: Board = {
      ...board,
      grid: { rows: 2, cols: 2 },
      placements: [
        { cellId: 'cell-1', row: 0, col: 0 },
        { cellId: 'cell-2', row: 1, col: 0 },
      ],
    };
    const { container } = render(<BoardView board={multiRow} onCell={vi.fn()} />);
    const rows = container.querySelectorAll('[role="grid"] > [role="row"]');
    expect(rows).toHaveLength(2);
    rows.forEach((row) => {
      expect(row.querySelectorAll('[role="gridcell"]')).toHaveLength(1);
    });
  });
});
