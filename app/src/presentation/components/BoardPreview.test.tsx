import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BoardPreview } from './BoardPreview';
import type { Board } from '../../domain/models';

// שלב 2 — מיני-גריד: מספר תאים נכון, תיאור נגיש עם מימדים, צבע Fitzgerald לתאים תפוסים.

function makeBoard(): Board {
  return {
    id: 'b1',
    name: 'לוח בדיקה',
    grid: { rows: 2, cols: 2 },
    cells: {
      a: { id: 'a', label: 'אני', fitzgerald: 'pronoun', action: { type: 'speak' } },
      b: { id: 'b', label: 'רוצה', fitzgerald: 'verb', action: { type: 'speak' } },
    },
    placements: [
      { cellId: 'a', row: 0, col: 0 },
      { cellId: 'b', row: 0, col: 1 },
      // (1,0) ו-(1,1) ריקים
    ],
  };
}

describe('BoardPreview', () => {
  it('מציג role=img עם שם הלוח והמימדים האמיתיים', () => {
    render(<BoardPreview board={makeBoard()} />);
    expect(
      screen.getByRole('img', { name: 'תצוגה מקדימה: לוח בדיקה, 2 על 2' }),
    ).toBeInTheDocument();
  });

  it('מצייר rows×cols תאי מיני-גריד', () => {
    const { container } = render(<BoardPreview board={makeBoard()} />);
    expect(container.querySelectorAll('.board-preview__cell')).toHaveLength(4);
    // שני תאים תפוסים, שניים ריקים
    expect(container.querySelectorAll('.board-preview__cell--empty')).toHaveLength(2);
  });

  it('מגביל מימדים לפי maxCells (הגנה מפני לוח ענק)', () => {
    const big: Board = {
      id: 'big',
      name: 'ענק',
      grid: { rows: 20, cols: 20 },
      cells: {},
      placements: [],
    };
    const { container } = render(<BoardPreview board={big} maxCells={{ rows: 6, cols: 6 }} />);
    expect(container.querySelectorAll('.board-preview__cell')).toHaveLength(36);
    // התיאור עדיין משקף את המימדים האמיתיים
    expect(screen.getByRole('img', { name: /20 על 20/ })).toBeInTheDocument();
  });
});
