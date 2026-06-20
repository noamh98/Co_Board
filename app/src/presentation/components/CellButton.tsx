import type { Cell } from '../../domain/models';
import { fitzgeraldStyle } from '../../domain/fitzgerald';
import {
  type AccessSettings,
  DEFAULT_ACCESS_SETTINGS,
} from '../../domain/accessSettings';
import {
  useDwellActivation,
  useActivateOnRelease,
  useDoubleTapPrevention,
} from '../../services/access/dwellService';

export function CellButton({
  cell,
  onActivate,
  settings = DEFAULT_ACCESS_SETTINGS,
}: {
  cell: Cell;
  onActivate: () => void;
  settings?: AccessSettings;
}) {
  const style = fitzgeraldStyle(cell.fitzgerald);

  // הרכבת שיטות הגישה (FR-020): מניעת-מגע-כפול עוטפת את ההפעלה, ואז
  // הפעלה-בשחרור קובעת אם היא ב-onClick או ב-onPointerUp. Dwell מוסיף ריחוף.
  const guarded = useDoubleTapPrevention(onActivate, settings);
  const release = useActivateOnRelease(guarded.onClick, settings);
  // Dwell עובר דרך guarded.onClick כדי שמניעת-מגע-כפול תחול גם על הפעלה בהשהיה.
  const dwell = useDwellActivation(guarded.onClick, settings);

  return (
    <button
      type="button"
      className="cell"
      onClick={release.onClick}
      onPointerUp={release.onPointerUp}
      onPointerEnter={dwell.onPointerEnter}
      onPointerLeave={dwell.onPointerLeave}
      onPointerMove={dwell.onPointerMove}
      aria-label={cell.label}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      <span className="cell__label">{cell.label}</span>
    </button>
  );
}
