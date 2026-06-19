// סרגל ניווט קבוע — PRD §4.4 (כפתורים במיקום גאומטרי קבוע בכל המסכים).

export function NavBar({
  canGoBack,
  onBack,
  onHome,
}: {
  canGoBack: boolean;
  onBack: () => void;
  onHome: () => void;
}) {
  return (
    <nav className="navbar" aria-label="ניווט">
      <button
        type="button"
        className="navbar__btn"
        onClick={onHome}
        aria-label="בית"
      >
        בית
      </button>
      <button
        type="button"
        className="navbar__btn navbar__btn--back"
        onClick={onBack}
        disabled={!canGoBack}
        aria-label="חזור"
        aria-disabled={!canGoBack}
      >
        חזור
      </button>
    </nav>
  );
}
