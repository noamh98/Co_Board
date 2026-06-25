export function SentenceBar({
  words,
  onSpeak,
  onDelete,
  onClear,
  onSave,
}: {
  words: string[];
  onSpeak: () => void;
  onDelete: () => void;
  onClear: () => void;
  onSave?: () => void;
}) {
  // F6: סדר קריאה הגיוני — [טקסט] → [דבר] → [פעולות עריכה]. הטקסט והדיבור קודמים;
  // מחק/נקה/שמור אחרונים (היו לפני הטקסט).
  return (
    <div className="sentence" dir="rtl">
      <div
        className="sentence__text"
        data-testid="sentence-text"
        aria-live="polite"
      >
        {words.join(' ')}
      </div>
      <button
        type="button"
        className="sentence__speak"
        onClick={onSpeak}
        aria-label="דבר"
      >
        דבר
      </button>
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
      {onSave && words.length > 0 && (
        <button
          type="button"
          className="sentence__btn sentence__btn--save"
          onClick={onSave}
          aria-label="שמור ביטוי"
        >
          שמור
        </button>
      )}
    </div>
  );
}
