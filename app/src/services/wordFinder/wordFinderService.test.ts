import { describe, it, expect } from 'vitest';
import { findPath } from './wordFinderService';
import type { Board } from '../../domain/models';

function makeBoards(): Record<string, Board> {
  return {
    home: {
      id: 'home',
      name: 'בית',
      grid: { rows: 2, cols: 2 },
      cells: {
        c_ani: { id: 'c_ani', label: 'אני', action: { type: 'speak' } },
        c_food_nav: {
          id: 'c_food_nav',
          label: 'אוכל',
          action: { type: 'navigate', targetBoardId: 'food' },
        },
      },
      placements: [
        { cellId: 'c_ani', row: 0, col: 0 },
        { cellId: 'c_food_nav', row: 0, col: 1 },
      ],
    },
    food: {
      id: 'food',
      name: 'אוכל',
      grid: { rows: 2, cols: 2 },
      cells: {
        c_tomato: { id: 'c_tomato', label: 'עגבנייה', action: { type: 'speak' } },
      },
      placements: [{ cellId: 'c_tomato', row: 0, col: 0 }],
    },
  };
}

describe('findPath — Word Finder (FR-029)', () => {
  it('מוצא מילה ישירה בלוח הבית', () => {
    const path = findPath('אני', makeBoards(), 'home');
    expect(path).not.toBeNull();
    expect(path!.at(-1)!.label).toBe('אני');
    expect(path!.at(-1)!.boardId).toBe('home');
  });

  it('מחזיר null עבור מילה שלא קיימת', () => {
    expect(findPath('בננה', makeBoards(), 'home')).toBeNull();
  });

  it('מוצא מילה דרך תא navigate (BFS דרך לוח אחר)', () => {
    const path = findPath('עגבנייה', makeBoards(), 'home');
    expect(path).not.toBeNull();
    // נתיב: אוכל (navigate) → עגבנייה
    expect(path!.length).toBe(2);
    expect(path![0].label).toBe('אוכל');
    expect(path![1].label).toBe('עגבנייה');
    expect(path![1].boardId).toBe('food');
  });

  it('BFS — מוצא נתיב קצר יותר לפני עמוק יותר', () => {
    // 'אני' נמצאת ישירות בבית (לא דרך navigate) — BFS מחזיר path[0]
    const path = findPath('אני', makeBoards(), 'home');
    expect(path!.length).toBe(1);
  });
});
