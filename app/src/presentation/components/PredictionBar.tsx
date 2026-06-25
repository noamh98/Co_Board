// presentation/components/PredictionBar.tsx — שורת ניבוי מילה הבאה (I2).
// מוצגת רק כשהניבוי מופעל ויש הצעות. לחיצה מוסיפה את המילה למשפט.

export function PredictionBar({
  words,
  onPick,
}: {
  words: string[];
  onPick: (word: string) => void;
}) {
  if (words.length === 0) return null;
  return (
    <div className="prediction-bar" role="list" aria-label="הצעות מילה הבאה" aria-live="polite" aria-atomic="false">
      {words.map((w) => (
        <button
          key={w}
          type="button"
          role="listitem"
          className="prediction-bar__item"
          onClick={() => onPick(w)}
        >
          {w}
        </button>
      ))}
    </div>
  );
}
