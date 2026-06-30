import type { CSSProperties } from 'react';
import type { Board, Cell } from '../../domain/models';
import { fitzgeraldStyle } from '../../domain/fitzgerald';
import { localSymbolPath, symbolIdFor } from '../../domain/symbolMap';
import './print.css';

// presentation/print/BoardPrintView.tsx — תצוגת הדפסה/PDF נקייה (F3, פער Emorli #3).
// משדרג את window.print() הגולמי לפריסת A4 RTL מעוצבת: גריד אריחים עם תווית-למעלה + סמל.
// Ponytail: רכיב נוסף שמרונדר תמיד (מוסתר על המסך, מופיע בהדפסה) — להפעלה: window.print().
// הקריאה ל-window.print() נשארת בסרגל-הלוח (BoardToolbar → onPrint).

function resolveImageUri(cell: Cell): string | undefined {
  if (cell.imageUri) return cell.imageUri;
  if (cell.symbolId?.startsWith('arasaac:')) {
    const id = Number(cell.symbolId.slice('arasaac:'.length));
    if (id > 0) return localSymbolPath(id);
  }
  const sid = symbolIdFor(cell.label);
  if (sid !== undefined) return localSymbolPath(sid);
  return undefined;
}

export interface BoardPrintViewProps {
  board: Board;
}

export function BoardPrintView({ board }: BoardPrintViewProps) {
  const { rows, cols } = board.grid;
  // ממפה placement→cell לפי רשת; תאים חסרים מודפסים כריקים (שומר על מבנה הגריד).
  const byPos = new Map<string, Cell>();
  for (const p of board.placements) {
    const cell = board.cells[p.cellId];
    if (cell && !cell.hidden) byPos.set(`${p.row}:${p.col}`, cell);
  }

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
  };

  const cells: Array<{ key: string; cell: Cell | null }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = byPos.get(`${r}:${c}`) ?? null;
      cells.push({ key: `${r}:${c}`, cell });
    }
  }

  return (
    <div className="board-print" aria-hidden="true">
      <h1 className="board-print__title">{board.nameNikud ?? board.name}</h1>
      <div className="board-print__grid" style={gridStyle}>
        {cells.map(({ key, cell }) => {
          if (!cell) {
            return <div key={key} className="board-print__cell board-print__empty" />;
          }
          const fz = fitzgeraldStyle(cell.fitzgerald);
          const img = resolveImageUri(cell);
          // CSS custom properties — Record<string,string> כי CSSProperties אינו תומך במפתחות שרירותיים.
          const cellStyle = (cell.fitzgerald
            ? { '--cell-tint': fz.bg, '--cell-ink': fz.text }
            : {}) as CSSProperties;
          return (
            <div key={key} className="board-print__cell" style={cellStyle}>
              {img && <img className="board-print__img" src={img} alt="" />}
              <span className="board-print__label">{cell.nikud ?? cell.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
