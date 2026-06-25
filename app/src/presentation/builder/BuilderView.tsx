import { useEffect, useRef, useState } from 'react';
import type { Board, Cell, CellPlacement } from '../../domain/models';
import type { Fitzgerald } from '../../domain/models';
import { FITZGERALD, fitzgeraldStyle } from '../../domain/fitzgerald';
import { moveCell, removeCell, UndoStack, ViolationError } from '../../domain/boardEditor';
import { applyCellSize } from '../../domain/adaptivity';
import type { GridSize } from '../../domain/models';
import { createBoardRepo } from '../../data/boardRepo';
import type { NikudService } from '../../services/nikud/nikudService';
import { BoardView } from '../components/BoardView';
import { CellEditor, type MediaSyncConfig } from './CellEditor';
import { GridSizePicker } from './GridSizePicker';

export interface BuilderViewProps {
  board: Board;
  onBoardChange: (b: Board) => void;
  onExitBuilder: () => void;
  nikudService: NikudService | null;
  mediaSyncConfig?: MediaSyncConfig;
}

export function BuilderView({ board, onBoardChange, onExitBuilder, nikudService, mediaSyncConfig }: BuilderViewProps) {
  const undoStackRef = useRef(new UndoStack<Board>(board));
  const [currentBoard, setCurrentBoard] = useState<Board>(board);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ cell: Cell | null; placement: CellPlacement | null } | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [draggedCellId, setDraggedCellId] = useState<string | null>(null);
  // G1: מצב undo/redo מנוטר ב-state — מתעדכן מיד, לא נקרא מ-ref בזמן render.
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const repo = useRef(createBoardRepo());

  const syncUndoState = () => {
    setCanUndo(undoStackRef.current.canUndo());
    setCanRedo(undoStackRef.current.canRedo());
  };

  const applyBoard = async (newBoard: Board) => {
    undoStackRef.current.push(newBoard);
    setCurrentBoard(newBoard);
    syncUndoState();
    onBoardChange(newBoard);
    await repo.current.save(newBoard);
  };

  const handleUndo = async () => {
    const prev = undoStackRef.current.undo();
    if (prev) {
      setCurrentBoard(prev);
      syncUndoState();
      onBoardChange(prev);
      await repo.current.save(prev);
    }
  };

  const handleRedo = async () => {
    const next = undoStackRef.current.redo();
    if (next) {
      setCurrentBoard(next);
      syncUndoState();
      onBoardChange(next);
      await repo.current.save(next);
    }
  };

  // G1: refs ל-undo/redo כדי שה-effect ירשם פעם אחת ([] deps), לא בכל render.
  const undoRef = useRef(handleUndo);
  undoRef.current = handleUndo;
  const redoRef = useRef(handleRedo);
  redoRef.current = handleRedo;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        void undoRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        void redoRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleSelect = (cellId: string) => {
    setSelectedCells((prev) => {
      const next = new Set(prev);
      if (next.has(cellId)) next.delete(cellId);
      else next.add(cellId);
      return next;
    });
  };

  const handleDrop = (targetPlacement: CellPlacement) => {
    if (!draggedCellId) return;
    try {
      const newBoard = moveCell(currentBoard, draggedCellId, targetPlacement);
      void applyBoard(newBoard);
    } catch (err) {
      if (err instanceof ViolationError) {
        const ok = window.confirm(`${err.message}\nהאם להמשיך?`);
        if (ok) {
          try {
            const newBoard = moveCell(currentBoard, draggedCellId, targetPlacement, { allowCoreMove: true });
            void applyBoard(newBoard);
          } catch (e2) {
            if (e2 instanceof Error) alert(e2.message);
          }
        }
      }
    }
    setDraggedCellId(null);
  };

  const handleBulkFitzgerald = (fitz: Fitzgerald) => {
    let newBoard = currentBoard;
    selectedCells.forEach((cellId) => {
      const cell = newBoard.cells[cellId];
      if (cell) {
        newBoard = { ...newBoard, cells: { ...newBoard.cells, [cellId]: { ...cell, fitzgerald: fitz } } };
      }
    });
    void applyBoard(newBoard);
    setSelectedCells(new Set());
  };

  const handleBulkDelete = () => {
    let newBoard = currentBoard;
    const skipped: string[] = [];
    selectedCells.forEach((cellId) => {
      try {
        newBoard = removeCell(newBoard, cellId);
      } catch (err) {
        if (err instanceof ViolationError) {
          skipped.push(currentBoard.cells[cellId]?.label ?? cellId);
        }
      }
    });
    if (skipped.length > 0) {
      alert(`התאים הבאים הם תאי ליבה ולא נמחקו: ${skipped.join(', ')}`);
    }
    void applyBoard(newBoard);
    setSelectedCells(new Set());
  };

  const handleResize = (newGrid: GridSize) => {
    try {
      // GridSizePicker חוסם כבר אם ליבה נופלת; שכבת הגנה כפולה כאן.
      void applyBoard(applyCellSize(currentBoard, newGrid));
    } catch (err) {
      if (err instanceof ViolationError) {
        alert(`לא ניתן לשנות גודל: מילות ליבה ייצאו מהלוח (${err.violations.map((v) => v.label).join(', ')})`);
      }
    }
  };

  const handleEditorSave = (newBoard: Board) => {
    void applyBoard(newBoard);
    setEditingCell(null);
  };

  // Build a lookup: "row-col" -> placement
  const placementMap = new Map<string, CellPlacement>();
  currentBoard.placements.forEach((p) => placementMap.set(`${p.row}-${p.col}`, p));

  const { rows, cols } = currentBoard.grid;

  if (previewMode) {
    return (
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
          }}
        >
          <button
            type="button"
            className="adultbar__btn"
            onClick={() => setPreviewMode(false)}
          >
            חזור לעריכה
          </button>
        </div>
        <BoardView board={currentBoard} onCell={() => undefined} />
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          background: 'var(--cl-surface)',
          borderBottom: '1px solid var(--cl-border)',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          className="adultbar__btn"
          style={{ background: 'var(--cl-primary)', color: 'var(--cl-on-primary)', borderColor: 'var(--cl-primary)' }}
          onClick={onExitBuilder}
        >
          חזור לתצוגת ילד
        </button>
        <span style={{ fontWeight: 600, fontSize: '1rem', flex: 1, textAlign: 'center' }}>
          {currentBoard.name}
        </span>
        <button
          type="button"
          className="adultbar__btn"
          disabled={!canUndo}
          onClick={() => void handleUndo()}
          style={{ background: 'var(--cl-surface-alt)', color: 'var(--cl-ink)', border: '1px solid var(--cl-border)' }}
        >
          בטל
        </button>
        <button
          type="button"
          className="adultbar__btn"
          disabled={!canRedo}
          onClick={() => void handleRedo()}
          style={{ background: 'var(--cl-surface-alt)', color: 'var(--cl-ink)', border: '1px solid var(--cl-border)' }}
        >
          בצע שנית
        </button>
        <button
          type="button"
          className="adultbar__btn"
          onClick={() => setPreviewMode(true)}
          style={{ background: 'var(--cl-surface-alt)', color: 'var(--cl-ink)', border: '1px solid var(--cl-border)' }}
        >
          תצוגה מקדימה
        </button>
        <GridSizePicker board={currentBoard} onResize={handleResize} />
      </div>

      {/* Bulk action bar */}
      {selectedCells.size >= 2 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: 'var(--cl-chip)',
            borderBottom: '1px solid var(--cl-chip-border)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--cl-primary)' }}>
            {selectedCells.size} תאים נבחרו
          </span>
          {(Object.keys(FITZGERALD) as Fitzgerald[]).map((key) => {
            const { bg, text, label } = FITZGERALD[key];
            return (
              <button
                key={key}
                type="button"
                title={label}
                onClick={() => handleBulkFitzgerald(key)}
                style={{
                  background: bg,
                  color: text,
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: 6,
                  padding: '2px 8px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  minHeight: 30,
                }}
              >
                {label}
              </button>
            );
          })}
          <button
            type="button"
            className="adultbar__btn"
            style={{ background: 'var(--cl-danger)', color: '#fff', borderColor: 'var(--cl-danger)' }}
            onClick={handleBulkDelete}
          >
            מחק
          </button>
          <button
            type="button"
            onClick={() => setSelectedCells(new Set())}
            style={{
              minHeight: 36,
              padding: '0 12px',
              border: '1px solid var(--cl-border)',
              borderRadius: 12,
              background: 'var(--cl-surface-alt)',
              color: 'var(--cl-ink)',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            בטל בחירה
          </button>
        </div>
      )}

      {/* Grid */}
      <div
        className="board"
        dir="rtl"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          flex: 1,
        }}
      >
        {Array.from({ length: rows }, (_, row) =>
          Array.from({ length: cols }, (_, col) => {
            const key = `${row}-${col}`;
            const p = placementMap.get(key);
            const cell = p ? currentBoard.cells[p.cellId] : undefined;
            const style = cell?.fitzgerald ? fitzgeraldStyle(cell.fitzgerald) : { bg: 'var(--cl-surface-alt)', text: 'var(--cl-ink)' };
            const isSelected = p ? selectedCells.has(p.cellId) : false;

            return (
              <div
                key={key}
                role="gridcell"
                style={{ gridColumn: col + 1, gridRow: row + 1, position: 'relative' }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop({ cellId: p?.cellId ?? '', row, col })}
              >
                {cell && p ? (
                  <div
                    className="cell"
                    // F5: אריח תפוס נגיש למקלדת (היה div onClick בלבד).
                    role="button"
                    tabIndex={0}
                    aria-label={`ערוך תא ${cell.label}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setEditingCell({ cell, placement: p });
                      }
                    }}
                    draggable
                    onDragStart={() => setDraggedCellId(p.cellId)}
                    onDragEnd={() => setDraggedCellId(null)}
                    style={{
                      background: style.bg,
                      color: style.text,
                      border: isSelected
                        ? '3px solid var(--cl-primary)'
                        : draggedCellId === p.cellId
                          ? '2px dashed var(--cl-muted)'
                          : '2px solid var(--cl-border)',
                      flexDirection: 'column',
                      gap: 4,
                      userSelect: 'none',
                      // hidden מוצג בעריכה עם שקיפות (FR-014); במצב ילד מוסתר לגמרי.
                      opacity: draggedCellId === p.cellId ? 0.5 : cell.hidden ? 0.4 : 1,
                      cursor: 'default',
                    }}
                    onClick={() => setEditingCell({ cell, placement: p })}
                  >
                    {/* Checkbox */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        zIndex: 2,
                      }}
                      onClick={(e) => { e.stopPropagation(); toggleSelect(p.cellId); }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(p.cellId)}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                        aria-label={`בחר תא ${cell.label}`}
                      />
                    </div>
                    {/* Core indicator */}
                    {cell.isCore && (
                      <span
                        title="תא ליבה"
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          fontSize: '0.75rem',
                        }}
                        aria-label="תא ליבה"
                      >
                        🔒
                      </span>
                    )}
                    {cell.imageUri && (
                      <img
                        src={cell.imageUri}
                        alt=""
                        style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6 }}
                      />
                    )}
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.2 }}>
                      {cell.label}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setEditingCell({
                        cell: null,
                        placement: { cellId: '', row, col },
                      })
                    }
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: 'var(--cell-min)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px dashed var(--cl-border)',
                      borderRadius: 'var(--r-lg)',
                      background: 'transparent',
                      color: 'var(--cl-muted)',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.stopPropagation(); handleDrop({ cellId: '', row, col }); }}
                  >
                    + הוסף
                  </button>
                )}
              </div>
            );
          }),
        )}
      </div>

      {/* CellEditor modal */}
      {editingCell !== null && (
        <CellEditor
          cell={editingCell.cell}
          placement={editingCell.placement}
          board={currentBoard}
          nikudService={nikudService}
          onSave={handleEditorSave}
          onCancel={() => setEditingCell(null)}
          mediaSyncConfig={mediaSyncConfig}
        />
      )}
    </div>
  );
}
