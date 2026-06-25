import { memo, useCallback, useState, type CSSProperties } from 'react';
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
import { localSymbolPath, symbolIdFor } from '../../domain/symbolMap';

function resolveImageUri(cell: Cell): string | undefined {
  if (cell.imageUri) return cell.imageUri;
  if (cell.symbolId?.startsWith('arasaac:')) {
    const id = Number(cell.symbolId.slice('arasaac:'.length));
    if (id > 0) return localSymbolPath(id);
  }
  // נפילה: תאים ישנים ב-DB (נזרעו לפני M20) ללא symbolId — מיפוי לפי label.
  const sid = symbolIdFor(cell.label);
  if (sid !== undefined) return localSymbolPath(sid);
  return undefined;
}

// E1: memo — לחיצה (setSentence) לא מרנדרת מחדש תאים שלא השתנו.
// E2: displayLabel (כולל ניקוד) מחושב ברמת BoardView ומועבר כ-prop — לא קריאת ניקוד לכל תא.
export const CellButton = memo(function CellButton({
  cell,
  onCell,
  settings = DEFAULT_ACCESS_SETTINGS,
  displayLabel,
}: {
  cell: Cell;
  onCell: (cell: Cell) => void;
  settings?: AccessSettings;
  displayLabel?: string;
}) {
  const style = fitzgeraldStyle(cell.fitzgerald);
  const [imgError, setImgError] = useState(false);
  const imageUri = resolveImageUri(cell);

  // E1: onActivate יציב לכל render (onCell יציב מ-App; cell יציב מהלוח).
  const handleActivate = useCallback(() => onCell(cell), [onCell, cell]);
  const guarded = useDoubleTapPrevention(handleActivate, settings);
  const release = useActivateOnRelease(guarded.onClick, settings);
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
      style={
        cell.fitzgerald
          ? // F1: --cell-ink = צבע הטקסט המכויל של Fitzgerald (ניגודיות AA בשני המצבים).
            ({ ['--cell-tint']: style.bg, ['--cell-ink']: style.text } as CSSProperties)
          : undefined
      }
    >
      {imageUri && !imgError && (
        <span className="cell__icon">
          <img
            src={imageUri}
            className="cell__image"
            alt=""
            aria-hidden="true"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        </span>
      )}
      <span className="cell__label">{displayLabel ?? cell.nikud ?? cell.label}</span>
    </button>
  );
});
