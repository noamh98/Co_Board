export function SentenceBar({
  words,
  onSpeak,
  onDelete,
  onClear,
}: {
  words: string[];
  onSpeak: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="sentence">
      <button
        type="button"
        className="sentence__speak"
        onClick={onSpeak}
        aria-label="דבר"
      >
        דבר
      </button>
      <div
        className="sentence__text"
        data-testid="sentence-text"
        aria-live="polite"
      >
        {words.join(' ')}
      </div>
      <button
        type="button"
        className="sentence__btn"
        onClick={onDelete}
        aria-label="מחק מילה"
      >
        מחק
      </button>
      <button
        type="button"
        className="sentence__btn"
        onClick={onClear}
        aria-label="נקה הכל"
      >
        נקה
      </button>
    </div>
  );
}
