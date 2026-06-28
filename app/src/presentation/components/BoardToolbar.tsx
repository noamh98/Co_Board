import type { CSSProperties } from 'react';

// presentation/components/BoardToolbar.tsx — סרגל-לוח בן 5 כפתורים (F6).
// נאמן לסרטון האפליקציה: 🖨️ הדפסה · ▶ השמעה · ⌫ מחיקת מילה · ✕ ניקוי · 🏠 בית.
// מחולץ מ-App.tsx (Ponytail: חילוץ, לא חדש). הגדרות-גודל (F7) דרך --tbtn-scale.
//
// נגישות: כל כפתור עם aria-label עברי; שורת ה-tokens עם aria-live="polite" (קורא-מסך
// מכריז על המילה שנוספה); ניקוי מסומן כ-danger (כפתור אדום נבדל).

export interface BoardToolbarProps {
  /** מילות המשפט הנוכחי (להצגה כ-tokens). */
  words: string[];
  onPrint: () => void;
  onSpeak: () => void;
  onDeleteWord: () => void;
  onClear: () => void;
  onHome: () => void;
  /** האם כפתור "בית" פעיל (יש לאן לחזור). */
  canGoHome?: boolean;
  /** גודל כפתורי הסרגל (%, F7). 100 = ברירת מחדל. */
  buttonScale?: number;
}

export function BoardToolbar({
  words,
  onPrint,
  onSpeak,
  onDeleteWord,
  onClear,
  onHome,
  canGoHome = true,
  buttonScale = 100,
}: BoardToolbarProps) {
  // CSS custom property — Record<string,string> (CSSProperties אינו תומך במפתחות שרירותיים).
  const style = { '--tbtn-scale': String(buttonScale / 100) } as CSSProperties;
  const hasWords = words.length > 0;

  return (
    <div className="board-toolbar" dir="rtl" style={style} role="toolbar" aria-label="כלי לוח">
      <button
        type="button"
        className="tbtn"
        onClick={onPrint}
        aria-label="הדפסה / שמירה כ-PDF"
        title="הדפסה"
      >
        🖨️
      </button>
      <button
        type="button"
        className="tbtn tbtn--brand"
        onClick={onSpeak}
        disabled={!hasWords}
        aria-label="השמעת המשפט"
        title="השמעה"
      >
        ▶
      </button>

      <div className="board-toolbar__tokens" aria-live="polite" aria-label="שורת קריאה">
        {words.map((w, i) => (
          <span className="board-toolbar__token" key={`${w}-${i}`}>
            {w}
          </span>
        ))}
      </div>

      <button
        type="button"
        className="tbtn"
        onClick={onDeleteWord}
        disabled={!hasWords}
        aria-label="מחיקת המילה האחרונה"
        title="מחיקת מילה"
      >
        ⌫
      </button>
      <button
        type="button"
        className="tbtn tbtn--danger"
        onClick={onClear}
        disabled={!hasWords}
        aria-label="ניקוי כל המשפט"
        title="ניקוי"
      >
        ✕
      </button>
      <button
        type="button"
        className="tbtn tbtn--brand"
        onClick={onHome}
        disabled={!canGoHome}
        aria-label="חזרה ללוח הבית"
        title="בית"
      >
        🏠
      </button>
    </div>
  );
}
