// תפריט קטגוריות — קפיצה ישירה לכל לוח בספרייה (זמין גם במצב משתמש נעול).
// FR-002: גישה לכל הקטגוריות, לא רק לאלו המקושרות מלוח הבית.

import { useEffect } from 'react';
import type { Board } from '../../domain/models';
import { localSymbolPath, symbolIdFor } from '../../domain/symbolMap';

function boardSymbol(board: Board): string | undefined {
  const words = [board.name, ...board.name.replace(/[—–-]/g, ' ').split(/\s+/).filter(Boolean)];
  for (const w of words) {
    const sid = symbolIdFor(w);
    if (sid !== undefined) return localSymbolPath(sid);
  }
  return undefined;
}

export function CategoryMenu({
  boards,
  homeId,
  onSelect,
  onClose,
}: {
  boards: Board[];
  homeId: string;
  onSelect: (boardId: string) => void;
  onClose: () => void;
}) {
  // C-16 — סגירה במקש Escape (נגישות מקלדת לדיאלוג מודאלי).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="catmenu-overlay"
      role="dialog"
      aria-label="בחירת קטגוריה"
      onClick={onClose}
    >
      <div className="catmenu" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="catmenu__head">
          <h2 className="catmenu__title">קטגוריות</h2>
          <button
            type="button"
            className="catmenu__close"
            onClick={onClose}
            aria-label="סגור"
          >
            ✕
          </button>
        </div>
        <div className="catmenu__grid">
          {boards.map((b) => {
            const img = boardSymbol(b);
            return (
              <button
                key={b.id}
                type="button"
                className="catmenu__item"
                onClick={() => onSelect(b.id)}
              >
                {img && (
                  <img
                    src={img}
                    className="catmenu__img"
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                  />
                )}
                <span className="catmenu__label">
                  {b.nameNikud ?? b.name}
                  {b.id === homeId ? ' (בית)' : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
