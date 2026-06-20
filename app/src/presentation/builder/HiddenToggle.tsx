// כפתור הסתרה/חשיפה של תא (FR-014) — חשיפה הדרגתית של אוצר מילים.
// תא מוסתר נשאר בלוח (אינו נמחק) ומוצג בעריכה עם opacity מופחת; במצב ילד הוא מוסתר.

export function HiddenToggle({
  hidden,
  onToggle,
}: {
  hidden: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="adultbar__btn"
      aria-pressed={hidden}
      onClick={() => onToggle(!hidden)}
      style={{
        background: hidden ? '#9ca3af' : '#f3f4f6',
        color: hidden ? '#fff' : '#1f2937',
        border: '1px solid #d1d5db',
      }}
    >
      {hidden ? 'מוסתר מהילד — הצג' : 'הסתר מהילד'}
    </button>
  );
}
