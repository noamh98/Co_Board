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
        background: hidden ? 'var(--cl-muted)' : 'var(--cl-surface-alt)',
        color: hidden ? '#fff' : 'var(--cl-ink)',
        border: '1px solid var(--cl-border)',
      }}
    >
      {hidden ? 'מוסתר מהילד — הצג' : 'הסתר מהילד'}
    </button>
  );
}
