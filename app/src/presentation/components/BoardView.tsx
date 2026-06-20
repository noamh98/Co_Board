import type { Board, Cell } from '../../domain/models';
import type { AccessSettings } from '../../domain/accessSettings';
import { CellButton } from './CellButton';

export function BoardView({
  board,
  onCell,
  accessSettings,
}: {
  board: Board;
  onCell: (c: Cell) => void;
  accessSettings?: AccessSettings;
}) {
  return (
    <div
      className="board"
      role="grid"
      aria-label={board.name}
      style={{
        gridTemplateColumns: `repeat(${board.grid.cols}, 1fr)`,
        gridTemplateRows: `repeat(${board.grid.rows}, 1fr)`,
      }}
    >
      {board.placements.map((p) => {
        const cell = board.cells[p.cellId];
        if (!cell || cell.hidden) return null;
        return (
          <div
            key={p.cellId}
            role="gridcell"
            // RTL: col=0 הוא הימני ביותר (הקונטיינר dir=rtl).
            style={{ gridColumn: p.col + 1, gridRow: p.row + 1 }}
          >
            <CellButton
              cell={cell}
              onActivate={() => onCell(cell)}
              settings={accessSettings}
            />
          </div>
        );
      })}
    </div>
  );
}
