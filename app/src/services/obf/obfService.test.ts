import { describe, it, expect } from 'vitest';
import { exportToOBF, importFromOBF, InvalidOBFError } from './obfService';
import type { Board } from '../../domain/models';

function makeBoard(overrides: Partial<Board> = {}): Board {
  return {
    id: 'board-1',
    name: 'לוח בדיקה',
    grid: { rows: 2, cols: 2 },
    cells: {
      c1: { id: 'c1', label: 'אני', isCore: true, action: { type: 'speak' } },
      c2: { id: 'c2', label: 'רוצה', fitzgerald: 'verb', action: { type: 'speak' } },
    },
    placements: [
      { cellId: 'c1', row: 0, col: 0 },
      { cellId: 'c2', row: 0, col: 1 },
    ],
    ...overrides,
  };
}

describe('OBF — round-trip export→import', () => {
  it('round-trip שומר label, grid, ומספר תאים', () => {
    const board = makeBoard();
    const imported = importFromOBF(exportToOBF(board));
    expect(imported.name).toBe(board.name);
    expect(imported.grid).toEqual(board.grid);
    expect(Object.keys(imported.cells)).toHaveLength(2);
  });

  it('תא עם label ו-isCore שורד round-trip', () => {
    const board = makeBoard();
    const imported = importFromOBF(exportToOBF(board));
    const c1 = imported.cells['c1'];
    expect(c1.label).toBe('אני');
    expect(c1.isCore).toBe(true);
  });

  it('תא עם imageUri שורד round-trip', () => {
    const board = makeBoard({
      cells: {
        c1: {
          id: 'c1',
          label: 'כלב',
          imageUri: 'data:image/webp;base64,abc',
          action: { type: 'speak' },
        },
      },
      placements: [{ cellId: 'c1', row: 0, col: 0 }],
    });
    const imported = importFromOBF(exportToOBF(board));
    expect(imported.cells['c1'].imageUri).toBe('data:image/webp;base64,abc');
  });

  it('תא navigate שורד round-trip עם targetBoardId', () => {
    const board = makeBoard({
      cells: {
        nav: {
          id: 'nav',
          label: 'אוכל',
          action: { type: 'navigate', targetBoardId: 'board-food' },
        },
      },
      placements: [{ cellId: 'nav', row: 0, col: 0 }],
    });
    const imported = importFromOBF(exportToOBF(board));
    const navCell = imported.cells['nav'];
    expect(navCell.action.type).toBe('navigate');
    if (navCell.action.type === 'navigate') {
      expect(navCell.action.targetBoardId).toBe('board-food');
    }
  });

  it('לוח ריק (0 תאים) מיוצא ומיובא ללא שגיאה', () => {
    const board = makeBoard({ cells: {}, placements: [] });
    const imported = importFromOBF(exportToOBF(board));
    expect(Object.keys(imported.cells)).toHaveLength(0);
    expect(imported.placements).toHaveLength(0);
  });
});

describe('OBF — importFromOBF שגיאות', () => {
  it('OBF לא תקין → InvalidOBFError', () => {
    expect(() =>
      importFromOBF({ format: 'wrong' as 'open-board-0.1', id: '', name: '', grid: { rows: 1, columns: 1, order: [] }, buttons: [] }),
    ).toThrow(InvalidOBFError);
  });
});
