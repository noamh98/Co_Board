// presentation/components/BoardPreview.tsx — תצוגה-מקדימה חיה של לוח (מיני-גריד).
// טהור, CSS בלבד, בלי תמונות/סמלים — מהיר כמו בסרטון אמור-לי: כל תא = "פס" צבוע
// לפי קטגוריית Fitzgerald (fitzgeraldStyle(...).bg). תאים ריקים = רקע ניטרלי דהוי.
//
// הצבע מגיע מ-domain/fitzgerald (מקור-האמת לצבעי AAC) — אסור להמציא צבעים כאן.
// נגישות: role="img" עם תיאור (שם הלוח + מימדים); תאי-הפנים aria-hidden.
// RTL: col=0 = עמודה ימנית ביותר (כמו בלוח עצמו) — grid טבעי תחת dir="rtl".

import type { CSSProperties } from 'react';
import type { Board, Fitzgerald } from '../../domain/models';
import { fitzgeraldStyle } from '../../domain/fitzgerald';

export interface BoardPreviewProps {
  board: Board;
  className?: string;
  /** תקרת מימדים לתצוגה (להגנה מפני לוחות ענקיים). ברירת מחדל 8×8. */
  maxCells?: { rows: number; cols: number };
}

export function BoardPreview({
  board,
  className,
  maxCells = { rows: 8, cols: 8 },
}: BoardPreviewProps) {
  const rows = Math.max(1, Math.min(board.grid.rows, maxCells.rows));
  const cols = Math.max(1, Math.min(board.grid.cols, maxCells.cols));

  // lookup "row-col" → קטגוריית Fitzgerald של התא, רק לתאים גלויים בתחום התצוגה.
  const byPos = new Map<string, Fitzgerald | undefined>();
  for (const p of board.placements) {
    if (p.row >= rows || p.col >= cols) continue;
    const cell = board.cells[p.cellId];
    if (!cell || cell.hidden) continue;
    byPos.set(`${p.row}-${p.col}`, cell.fitzgerald);
  }

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
  };

  const cls = ['board-preview', className].filter(Boolean).join(' ');

  return (
    <div
      className={cls}
      style={gridStyle}
      role="img"
      aria-label={`תצוגה מקדימה: ${board.name}, ${board.grid.rows} על ${board.grid.cols}`}
    >
      {Array.from({ length: rows * cols }, (_, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const has = byPos.has(`${row}-${col}`);
        const fitz = byPos.get(`${row}-${col}`);
        const bg = has ? fitzgeraldStyle(fitz).bg : 'var(--cl-border)';
        return (
          <span
            key={i}
            className={`board-preview__cell${has ? '' : ' board-preview__cell--empty'}`}
            style={{ background: bg }}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}
