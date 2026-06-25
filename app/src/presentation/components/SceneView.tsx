// presentation/components/SceneView.tsx — לוח סצנה חזותי (VSD, I7).
// תמונת רקע + אזורים לחיצים (hotspots) במיקום/גודל באחוזים. לחיצה מפעילה action.

import type { Board, SceneRegion } from '../../domain/models';

export function SceneView({
  board,
  onRegion,
}: {
  board: Board;
  onRegion: (region: SceneRegion) => void;
}) {
  const scene = board.scene;
  if (!scene) return null;
  return (
    <div className="scene" role="group" aria-label={board.name}>
      <img src={scene.backgroundUri} alt={board.name} className="scene__bg" />
      {scene.regions.map((r) => (
        <button
          key={r.id}
          type="button"
          className="scene__hotspot"
          aria-label={r.label}
          onClick={() => onRegion(r)}
          style={{
            insetInlineStart: `${r.x}%`,
            top: `${r.y}%`,
            width: `${r.w}%`,
            height: `${r.h}%`,
          }}
        >
          <span className="sr-only">{r.label}</span>
        </button>
      ))}
    </div>
  );
}
