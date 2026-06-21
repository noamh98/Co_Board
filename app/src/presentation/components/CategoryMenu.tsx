// תפריט קטגוריות — קפיצה ישירה לכל לוח בספרייה (זמין גם במצב משתמש נעול).
// FR-002: גישה לכל הקטגוריות, לא רק לאלו המקושרות מלוח הבית.

import type { Board } from '../../domain/models';
import { localSymbolPath, symbolIdFor } from '../../domain/symbolMap';

function boardSymbol(board: Board): string | undefined {
  const sid = symbolIdFor(board.name) ?? symbolIdFor(board.name.split(' ')[0]);
  return sid !== undefined ? localSymbolPath(sid) : undefined;
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
                  {b.name}
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
