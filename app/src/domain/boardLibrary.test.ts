import { describe, it, expect } from 'vitest';
import {
  listBoardLibrary,
  getBoardById,
  CORE_VOCAB_6X6_BOARD,
  PAIN_HEALTH_BOARD,
  PAIN_HEALTH_BOARD_ID,
} from './boardLibrary';
import { listTemplates } from './boardTemplates';

describe('boardLibrary', () => {
  it('listBoardLibrary מחזירה 11 לוחות', () => {
    expect(listBoardLibrary()).toHaveLength(11);
  });

  it('כל לוח — grid תקין ו-placements בתוך גבולות', () => {
    for (const board of listBoardLibrary()) {
      const maxCells = board.grid.rows * board.grid.cols;
      expect(board.placements.length).toBeLessThanOrEqual(maxCells);
      for (const p of board.placements) {
        expect(p.row).toBeGreaterThanOrEqual(0);
        expect(p.row).toBeLessThan(board.grid.rows);
        expect(p.col).toBeGreaterThanOrEqual(0);
        expect(p.col).toBeLessThan(board.grid.cols);
      }
    }
  });

  it('אין id כפול בין כל התאים בכלל הספרייה', () => {
    const allCellIds: string[] = [];
    for (const board of listBoardLibrary()) {
      allCellIds.push(...Object.keys(board.cells));
    }
    const unique = new Set(allCellIds);
    expect(unique.size).toBe(allCellIds.length);
  });

  it('CORE_VOCAB_6X6_BOARD — 36 תאים, גריד 6×6, כולם isCore', () => {
    const board = CORE_VOCAB_6X6_BOARD;
    expect(board.grid.rows).toBe(6);
    expect(board.grid.cols).toBe(6);
    expect(Object.keys(board.cells)).toHaveLength(36);
    expect(board.placements).toHaveLength(36);
    for (const cell of Object.values(board.cells)) {
      expect(cell.isCore).toBe(true);
    }
  });

  it('PAIN_HEALTH_BOARD — יש תא עם label המכיל "כואב" ו-fitzgerald=negation', () => {
    const cells = Object.values(PAIN_HEALTH_BOARD.cells);
    const hurtCell = cells.find((c) => c.label.includes('כואב'));
    expect(hurtCell).toBeDefined();
    expect(hurtCell?.fitzgerald).toBe('negation');
  });

  it('getBoardById מחזיר לוח עם name מוגדר', () => {
    const board = getBoardById(PAIN_HEALTH_BOARD_ID);
    expect(board).toBeDefined();
    expect(board?.name).toBeTruthy();
  });

  it('listTemplates מחזירה לפחות 7 תבניות', () => {
    expect(listTemplates().length).toBeGreaterThanOrEqual(7);
  });
});
