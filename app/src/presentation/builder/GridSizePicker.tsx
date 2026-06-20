import { useState } from 'react';
import type { Board, GridSize } from '../../domain/models';
import { applyCellSize } from '../../domain/adaptivity';
import { ViolationError } from '../../domain/boardEditor';

// בורר גודל גריד דינמי (FR-015) — 2–8 בכל ציר.
// מאמת מול applyCellSize לפני שליחה: אם ליבה נופלת מחוץ לגריד — מציג אזהרה וחוסם.

const SIZES = [2, 3, 4, 5, 6, 7, 8];

export function GridSizePicker({
  board,
  onResize,
}: {
  board: Board;
  onResize: (newGrid: GridSize) => void;
}) {
  const [rows, setRows] = useState(board.grid.rows);
  const [cols, setCols] = useState(board.grid.cols);

  let warning: string | null = null;
  try {
    applyCellSize(board, { rows, cols });
  } catch (err) {
    if (err instanceof ViolationError) {
      warning = `גריד ${rows}×${cols} יוציא מילות ליבה מהלוח: ${err.violations
        .map((v) => v.label)
        .join(', ')}`;
    }
  }

  const unchanged = rows === board.grid.rows && cols === board.grid.cols;

  return (
    <div
      dir="rtl"
      style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
    >
      <label style={{ fontSize: '0.9rem', color: '#6b7280' }}>גודל גריד</label>
      <select
        aria-label="שורות"
        value={rows}
        onChange={(e) => setRows(Number(e.target.value))}
        className="adultbar__select"
      >
        {SIZES.map((n) => (
          <option key={n} value={n}>
            {n} שורות
          </option>
        ))}
      </select>
      <span>×</span>
      <select
        aria-label="עמודות"
        value={cols}
        onChange={(e) => setCols(Number(e.target.value))}
        className="adultbar__select"
      >
        {SIZES.map((n) => (
          <option key={n} value={n}>
            {n} עמודות
          </option>
        ))}
      </select>
      <button
        type="button"
        className="adultbar__btn"
        disabled={unchanged || warning !== null}
        onClick={() => onResize({ rows, cols })}
      >
        החל
      </button>
      {warning && (
        <span role="alert" style={{ color: '#b91c1c', fontSize: '0.85rem' }}>
          {warning}
        </span>
      )}
    </div>
  );
}
