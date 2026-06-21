import { useState } from 'react';
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
import { localSymbolPath } from '../../domain/symbolMap';

function resolveImageUri(cell: Cell): string | undefined {
  if (cell.imageUri) return cell.imageUri;
  if (cell.symbolId?.startsWith('arasaac:')) {
    const id = Number(cell.symbolId.slice('arasaac:'.length));
    if (id > 0) return localSymbolPath(id);
  }
  return undefined;
}

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
  const [imgError, setImgError] = useState(false);
  const imageUri = resolveImageUri(cell);

  const guarded = useDoubleTapPrevention(onActivate, settings);
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
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {imageUri && !imgError && (
        <img
          src={imageUri}
          className="cell__image"
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      )}
      <span className="cell__label">{cell.label}</span>
    </button>
  );
}
