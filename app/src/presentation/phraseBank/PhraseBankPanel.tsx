import type { PhraseEntry } from '../../domain/phraseBank';
import type { Cell } from '../../domain/models';

export function PhraseBankPanel({
  phrases,
  onLoad,
  onDelete,
  onClose,
}: {
  phrases: PhraseEntry[];
  onLoad: (cells: Cell[]) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="phrasebank-overlay"
      role="dialog"
      aria-label="בנק משפטים"
      dir="rtl"
    >
      <div className="phrasebank-panel">
        <div className="phrasebank-panel__header">
          <h2 className="phrasebank-panel__title">ביטויים שמורים</h2>
          <button
            type="button"
            className="phrasebank-panel__close"
            onClick={onClose}
            aria-label="סגור"
          >
            ×
          </button>
        </div>

        {phrases.length === 0 ? (
          <p className="phrasebank-panel__empty">אין ביטויים שמורים עדיין</p>
        ) : (
          <ul className="phrasebank-panel__list">
            {phrases.map((phrase) => (
              <li key={phrase.id} className="phrasebank-panel__item">
                <span className="phrasebank-panel__label">{phrase.label}</span>
                <button
                  type="button"
                  className="phrasebank-panel__load"
                  onClick={() => onLoad(phrase.cells)}
                  aria-label={`טען: ${phrase.label}`}
                >
                  טען
                </button>
                <button
                  type="button"
                  className="phrasebank-panel__delete"
                  onClick={() => onDelete(phrase.id)}
                  aria-label={`מחק: ${phrase.label}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
