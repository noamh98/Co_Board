import type { Cell } from '../../domain/models';
import { fitzgeraldStyle } from '../../domain/fitzgerald';

export function CellButton({
  cell,
  onActivate,
}: {
  cell: Cell;
  onActivate: () => void;
}) {
  const style = fitzgeraldStyle(cell.fitzgerald);
  return (
    <button
      type="button"
      className="cell"
      onClick={onActivate}
      aria-label={cell.label}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      <span className="cell__label">{cell.label}</span>
    </button>
  );
}
