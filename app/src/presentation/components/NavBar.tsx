// סרגל ניווט קבוע — PRD §4.4 (כפתורים במיקום גאומטרי קבוע בכל המסכים).

export function NavBar({
  canGoBack,
  onBack,
  onHome,
  onCategories,
}: {
  canGoBack: boolean;
  onBack: () => void;
  onHome: () => void;
  onCategories?: () => void;
}) {
  return (
    <nav className="navbar" aria-label="ניווט">
      <button
        type="button"
        className="navbar__btn"
        onClick={onHome}
        aria-label="בית"
      >
        <span className="navbar__btn-icon" aria-hidden="true">🏠</span>
        <span className="navbar__btn-text">בית</span>
      </button>
      {onCategories && (
        <button
          type="button"
          className="navbar__btn"
          onClick={onCategories}
          aria-label="קטגוריות"
        >
          <span className="navbar__btn-icon" aria-hidden="true">☰</span>
          <span className="navbar__btn-text">קטגוריות</span>
        </button>
      )}
      <button
        type="button"
        className="navbar__btn navbar__btn--back"
        onClick={onBack}
        disabled={!canGoBack}
        aria-label="חזור"
        aria-disabled={!canGoBack}
      >
        <span className="navbar__btn-icon" aria-hidden="true">↩</span>
        <span className="navbar__btn-text">חזור</span>
      </button>
    </nav>
  );
}
