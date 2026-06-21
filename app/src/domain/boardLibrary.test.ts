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

  // M20 — סמלים לכל מילה (FR-002, PRD §4.2)
  const KNOWN_NO_SYMBOL = new Set(['iPad']);

  it('כל תא-מילה (action=speak) בעל סמל מקומי, פרט לחריגים מתועדים', () => {
    const noSymbol: string[] = [];
    for (const board of listBoardLibrary()) {
      for (const cell of Object.values(board.cells)) {
        if (cell.action.type !== 'speak') continue; // תאי ניווט/מערכת אינם מילים
        if (KNOWN_NO_SYMBOL.has(cell.label)) continue;
        if (!cell.imageUri || !cell.symbolId) noSymbol.push(cell.label);
      }
    }
    expect(noSymbol).toEqual([]);
  });

  it('imageUri מצביע לנתיב symbols מקומי (offline-first), לא ל-URL מרוחק', () => {
    for (const board of listBoardLibrary()) {
      for (const cell of Object.values(board.cells)) {
        if (!cell.imageUri) continue;
        expect(cell.imageUri).toContain('symbols/');
        expect(cell.imageUri).not.toMatch(/^https?:\/\//);
      }
    }
  });

  // M21 — ניקוד לכל מילה (FR-009, PRD §4.3)
  const NIKUD_MARK = /[ְ-ׇ]/; // טווח סימני ניקוד עברי
  const LATIN = /[A-Za-z]/; // מילים לועזיות (iPad) פטורות מניקוד

  it('כל תא-מילה בעל ניקוד לא-ריק המכיל סימן ניקוד אחד לפחות', () => {
    const noNikud: string[] = [];
    for (const board of listBoardLibrary()) {
      for (const cell of Object.values(board.cells)) {
        if (cell.action.type !== 'speak') continue;
        if (LATIN.test(cell.label)) continue;
        if (!cell.nikud || !NIKUD_MARK.test(cell.nikud)) noNikud.push(cell.label);
      }
    }
    expect(noNikud).toEqual([]);
  });

  it('הומוגרף "ספר" מנוקד כ-סֵפֶר (book) ולא סָפַר (counted)', () => {
    for (const board of listBoardLibrary()) {
      for (const cell of Object.values(board.cells)) {
        if (cell.label === 'ספר') expect(cell.nikud).toBe('סֵפֶר');
      }
    }
  });
});
