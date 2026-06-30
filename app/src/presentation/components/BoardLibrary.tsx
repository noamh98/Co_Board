// presentation/components/BoardLibrary.tsx — "בית" של המבוגר: ספריית לוחות (גלריה).
// מאמץ את מבנה אמור-לי (לא צבע — Co_Board נשאר קורל): "+ לוח חדש" בראש, ואז קבוצות
// מתקפלות של כרטיסים. כל כרטיס = <BoardPreview/> + שם + תג מימדים; ב-editMode כפתור
// ארכוב (✕). לחיצה על כרטיס → onOpen(boardId).
//
// קבוצות (לפי הקוד הקיים, בלי המצאת ישויות):
//   • "הלוחות שלי"  — לוחות שאינם isCoreBoard (המשתמש יצר/שכפל)
//   • "לוחות תבנית" — לוחות isCoreBoard (מובנים)
// "יצירה מתבנית" ממשיכה לחיות מאחורי "+ לוח חדש" → NewBoardChooser הקיים (לא משוכפל).
//
// נגישות: role="region" לספרייה; כותרת-קבוצה כפתור עם aria-expanded + aria-controls;
// כרטיסים כפתורים עם תיאור עברי; ארכוב כפתור נפרד (לא button-in-button).

import { useState } from 'react';
import type { Board } from '../../domain/models';
import { BoardPreview } from './BoardPreview';

export interface BoardLibraryProps {
  /** כל הלוחות הפעילים (לא-מאורכבים) — בד"כ Object.values(ctx.allBoards). */
  boards: Board[];
  /** לוח הבית של הפרופיל הפעיל (מסומן בכרטיס). */
  homeId: string;
  /** מצב עריכה — חושף כפתורי ארכוב על כרטיסי "הלוחות שלי". */
  editMode: boolean;
  onOpen: (boardId: string) => void;
  onNew: () => void;
  onArchive: (boardId: string) => void;
}

interface Group {
  id: string;
  label: string;
  boards: Board[];
  /** האם להציג ארכוב על כרטיסי הקבוצה (לא על לוחות מובנים/בית). */
  archivable: boolean;
}

function BoardCard({
  board,
  isHome,
  showArchive,
  onOpen,
  onArchive,
}: {
  board: Board;
  isHome: boolean;
  showArchive: boolean;
  onOpen: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const { rows, cols } = board.grid;
  const name = board.nameNikud ?? board.name;
  return (
    <li className="board-card">
      <button
        type="button"
        className="board-card__open"
        onClick={() => onOpen(board.id)}
        aria-label={`${board.name}, ${rows} על ${cols}${isHome ? ', לוח בית' : ''}`}
      >
        <BoardPreview board={board} className="board-card__preview" />
        <span className="board-card__name">{name}</span>
        <span className="board-card__meta">
          {isHome && (
            <span className="board-card__home" aria-hidden="true">
              🏠
            </span>
          )}
          <span className="board-card__tag">
            {rows}×{cols}
          </span>
        </span>
      </button>
      {showArchive && (
        <button
          type="button"
          className="board-card__archive"
          onClick={() => onArchive(board.id)}
          aria-label={`העברה לארכיון: ${board.name}`}
          title="העברה לארכיון"
        >
          ✕
        </button>
      )}
    </li>
  );
}

export function BoardLibrary({
  boards,
  homeId,
  editMode,
  onOpen,
  onNew,
  onArchive,
}: BoardLibraryProps) {
  const groups: Group[] = [
    {
      id: 'mine',
      label: 'הלוחות שלי',
      boards: boards.filter((b) => !b.isCoreBoard),
      archivable: true,
    },
    {
      id: 'templates',
      label: 'לוחות תבנית',
      boards: boards.filter((b) => b.isCoreBoard),
      archivable: false,
    },
  ].filter((g) => g.boards.length > 0);

  // קבוצות פתוחות כברירת מחדל; אפשר לכווץ.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (id: string): void =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <section className="board-library" dir="rtl" aria-label="ספריית לוחות">
      <button type="button" className="board-library__new" onClick={onNew}>
        <span aria-hidden="true">＋</span> לוח חדש
      </button>

      {groups.length === 0 && (
        <p className="board-library__empty">אין עדיין לוחות — צרו לוח חדש כדי להתחיל.</p>
      )}

      {groups.map((g) => {
        const isOpen = !collapsed[g.id];
        const bodyId = `library-group-${g.id}`;
        return (
          <div className="library-group" key={g.id}>
            <button
              type="button"
              className="library-group__label"
              aria-expanded={isOpen}
              aria-controls={bodyId}
              onClick={() => toggle(g.id)}
            >
              <span className="library-group__chevron" aria-hidden="true">
                {isOpen ? '▾' : '▸'}
              </span>
              {g.label}
              <span className="library-group__count">{g.boards.length}</span>
            </button>
            {isOpen && (
              <ul id={bodyId} className="library-group__body" role="list">
                {g.boards.map((b) => (
                  <BoardCard
                    key={b.id}
                    board={b}
                    isHome={b.id === homeId}
                    showArchive={editMode && g.archivable && b.id !== homeId}
                    onOpen={onOpen}
                    onArchive={onArchive}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
