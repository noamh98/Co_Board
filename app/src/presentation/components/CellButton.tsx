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
      {cell.imageUri && !imgError && (
        <img
          src={cell.imageUri}
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
