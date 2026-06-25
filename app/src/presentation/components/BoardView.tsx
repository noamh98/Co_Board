import { memo, useEffect, useMemo, useState } from 'react';
import type { Board, Cell } from '../../domain/models';
import type { AccessSettings } from '../../domain/accessSettings';
import { globalNikudService } from '../../services/nikud/nikudSingleton';
import { CellButton } from './CellButton';

// E1: memo — הלוח לא מתרנדר מחדש כשמשתנה state לא-קשור (למשל setSentence).
export const BoardView = memo(function BoardView({
  board,
  onCell,
  accessSettings,
  modelingHighlights,
}: {
  board: Board;
  onCell: (c: Cell) => void;
  accessSettings?: AccessSettings;
  modelingHighlights?: Set<string>;
}) {
  const visibleCells = useMemo(
    () =>
      board.placements
        .map((p) => board.cells[p.cellId])
        .filter((c): c is Cell => !!c && !c.hidden),
    [board],
  );

  // E2: ניקוד מחושב פעם אחת ברמת הלוח (deduped לפי label), לא קריאה לכל תא בנפרד.
  const [nikudMap, setNikudMap] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    const labels = Array.from(
      new Set(visibleCells.filter((c) => !c.nikud).map((c) => c.label)),
    );
    if (labels.length === 0) return;
    void Promise.all(
      labels.map(async (label) => {
        const res = await globalNikudService.getNikud(label);
        return [label, res.source !== 'none' ? res.nikud : label] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setNikudMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });
    return () => {
      cancelled = true;
    };
  }, [visibleCells]);

  const labelFor = (cell: Cell): string => cell.nikud ?? nikudMap[cell.label] ?? cell.label;

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
            className={modelingHighlights?.has(p.cellId) ? 'cell--modeling-highlight' : undefined}
            // RTL: col=0 הוא הימני ביותר (הקונטיינר dir=rtl).
            style={{ gridColumn: p.col + 1, gridRow: p.row + 1 }}
          >
            <CellButton
              cell={cell}
              onCell={onCell}
              settings={accessSettings}
              displayLabel={labelFor(cell)}
            />
          </div>
        );
      })}
    </div>
  );
});
