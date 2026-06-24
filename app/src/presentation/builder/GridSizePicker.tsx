import { useState } from 'react';
import type { Board, GridSize } from '../../domain/models';
import { applyCellSize } from '../../domain/adaptivity';
import { cellSizeStatus, GRID_MIN, GRID_MAX } from '../../domain/adaptivity';
import { ViolationError } from '../../domain/boardEditor';

// בורר גודל גריד דינמי (FR-015) — 2–12 בכל ציר.
// מאמת מול applyCellSize לפני שליחה: אם ליבה נופלת מחוץ לגריד — מציג אזהרה וחוסם.
// כולל פריסטים מהירים (chips, RTL, aria-pressed) ובדיקת גודל-מטרה מינ' (~1.5 ס"מ).

const SIZES = Array.from({ length: GRID_MAX - GRID_MIN + 1 }, (_, i) => i + GRID_MIN);

const PRESETS: Array<{ rows: number; cols: number; label: string }> = [
  { rows: 2, cols: 2, label: '2×2' },
  { rows: 3, cols: 3, label: '3×3' },
  { rows: 4, cols: 4, label: '4×4' },
  { rows: 5, cols: 3, label: '5×3' },
  { rows: 5, cols: 5, label: '5×5' },
  { rows: 6, cols: 6, label: '6×6' },
  { rows: 6, cols: 8, label: '6×8' },
  { rows: 8, cols: 8, label: '8×8' },
];

export function GridSizePicker({
  board,
  onResize,
}: {
  board: Board;
  onResize: (newGrid: GridSize) => void;
}) {
  const [rows, setRows] = useState(board.grid.rows);
  const [cols, setCols] = useState(board.grid.cols);

  const applyPreset = (preset: { rows: number; cols: number }) => {
    setRows(preset.rows);
    setCols(preset.cols);
  };

  let violationWarning: string | null = null;
  try {
    applyCellSize(board, { rows, cols });
  } catch (err) {
    if (err instanceof ViolationError) {
      violationWarning = `גריד ${rows}×${cols} יוציא מילות ליבה מהלוח: ${err.violations
        .map((v) => v.label)
        .join(', ')}`;
    }
  }

  // min-cell-size guard (viewport-aware)
  const vpW = typeof window !== 'undefined' ? window.innerWidth : 360;
  const vpH = typeof window !== 'undefined' ? window.innerHeight * 0.7 : 500;
  const sizeStatus = cellSizeStatus(rows, cols, vpW, vpH);

  const unchanged = rows === board.grid.rows && cols === board.grid.cols;
  const isBlocked = violationWarning !== null || sizeStatus === 'block';
  const isPresetActive = (p: { rows: number; cols: number }) =>
    p.rows === rows && p.cols === cols;

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Preset chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            aria-pressed={isPresetActive(p)}
            onClick={() => applyPreset(p)}
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              border: isPresetActive(p)
                ? '2px solid #1d4ed8'
                : '1px solid #d1d5db',
              background: isPresetActive(p) ? '#dbeafe' : '#f3f4f6',
              color: isPresetActive(p) ? '#1d4ed8' : '#374151',
              fontSize: '0.82rem',
              fontWeight: isPresetActive(p) ? 700 : 400,
              cursor: 'pointer',
              minHeight: 32,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Free sliders */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
          disabled={unchanged || isBlocked}
          onClick={() => onResize({ rows, cols })}
        >
          החל
        </button>
      </div>

      {/* Warnings */}
      {violationWarning && (
        <span role="alert" style={{ color: '#b91c1c', fontSize: '0.85rem' }}>
          {violationWarning}
        </span>
      )}
      {!violationWarning && sizeStatus === 'block' && (
        <span role="alert" style={{ color: '#b91c1c', fontSize: '0.85rem' }}>
          גריד {rows}×{cols} יוצר תאים קטנים מדי לשימוש — בחר גריד קטן יותר
        </span>
      )}
      {!violationWarning && sizeStatus === 'warn' && (
        <span role="status" style={{ color: '#b45309', fontSize: '0.85rem' }}>
          גריד {rows}×{cols} — התאים קטנים; ייתכן שיהיה קשה ללחוץ עליהם
        </span>
      )}
    </div>
  );
}
