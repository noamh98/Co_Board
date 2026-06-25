import { memo, useEffect, useMemo, useState } from 'react';
import type { Board, Cell, CellPlacement } from '../../domain/models';
import type { AccessSettings } from '../../domain/accessSettings';
import { globalNikudService } from '../../services/nikud/nikudSingleton';
import { isFrozenCore } from '../../domain/growingVocab';
import { CellButton } from './CellButton';

// E1: memo — הלוח לא מתרנדר מחדש כשמשתנה state לא-קשור (למשל setSentence).
export const BoardView = memo(function BoardView({
  board,
  onCell,
  accessSettings,
  modelingHighlights,
  level,
  scanIndex,
}: {
  board: Board;
  onCell: (c: Cell) => void;
  accessSettings?: AccessSettings;
  modelingHighlights?: Set<string>;
  /** I4 — רמת חשיפה לאוצר צומח. undefined = הצג הכל (התנהגות קודמת). */
  level?: number;
  /** I3 — אינדקס התא המודגש בסריקה (מתוך רשימת התאים הגלויים בסדר רינדור). */
  scanIndex?: number | null;
}) {
  // רשימת התאים הגלויים בסדר רינדור (משותפת לניקוד, לסריקה ולתצוגה).
  const rendered = useMemo(() => {
    const out: { p: CellPlacement; cell: Cell }[] = [];
    for (const p of board.placements) {
      const cell = board.cells[p.cellId];
      if (!cell || cell.hidden) continue;
      if (level !== undefined && !isFrozenCore(cell) && (cell.level ?? 0) > level) continue;
      out.push({ p, cell });
    }
    return out;
  }, [board, level]);

  // E2: ניקוד מחושב פעם אחת ברמת הלוח (deduped לפי label), לא קריאה לכל תא בנפרד.
  const [nikudMap, setNikudMap] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    const labels = Array.from(
      new Set(rendered.filter(({ cell }) => !cell.nikud).map(({ cell }) => cell.label)),
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
  }, [rendered]);

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
      {rendered.map(({ p, cell }, i) => {
        const cls = [
          modelingHighlights?.has(p.cellId) ? 'cell--modeling-highlight' : '',
          scanIndex === i ? 'cell--scan-highlight' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <div
            key={p.cellId}
            role="gridcell"
            className={cls || undefined}
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
