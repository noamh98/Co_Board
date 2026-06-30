import { type ReactNode, type CSSProperties } from 'react';
import { useLongPress, DEFAULT_LONG_PRESS_MS } from '../ui/useLongPress';

// סרגל מותג עליון נקי (MVP): לוגו (ימין) · מנעול/מצב-עריכה (שמאל) · גלגל.
// שחרור = לחיצה ארוכה על המנעול (בלי PIN). הקשחת mode==='locked' ב-App נשמרת.

const SpeechMark = (
  <svg
    viewBox="0 0 24 24"
    width="28"
    height="28"
    fill="none"
    stroke="#fff"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 5h11a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H9l-4 3.5V15a3 3 0 0 1-1-2.2V8a3 3 0 0 1 0-3z" />
    <circle cx="8" cy="10" r="1" fill="#fff" stroke="none" />
    <circle cx="11.5" cy="10" r="1" fill="#fff" stroke="none" />
    <circle cx="15" cy="10" r="1" fill="#fff" stroke="none" />
  </svg>
);

export interface BrandBarProps {
  isAdult: boolean;
  status?: ReactNode;
  onUnlock: () => void;
  onLock: () => void;
  onOpenSettings?: () => void;
  onOpenLibrary?: () => void;
  longPressMs?: number;
}

export function BrandBar({
  isAdult,
  status,
  onUnlock,
  onLock,
  onOpenSettings,
  onOpenLibrary,
  longPressMs = DEFAULT_LONG_PRESS_MS,
}: BrandBarProps) {
  const { handlers, pressing } = useLongPress(onUnlock, { durationMs: longPressMs });
  const lockStyle = { '--lp-ms': `${longPressMs}ms` } as CSSProperties;

  return (
    <header className="brandbar">
      <h1 className="sr-only">לוח תקשורת — Co_Board</h1>

      <div className="brandbar__logo">
        <span className="brandbar__logo-text">
          <span className="brandbar__logo-name">Co_Board</span>
          <span className="brandbar__logo-sub">לוח תקשורת</span>
        </span>
        <span className="brandbar__logo-mark" aria-hidden="true">
          {SpeechMark}
        </span>
      </div>

      <div className="brandbar__center">
        {status && <span className="brandbar__status">{status}</span>}
      </div>

      <div className="brandbar__lead">
        {isAdult ? (
          <>
            <button
              type="button"
              className="brandbar__lock brandbar__lock--open"
              onClick={onLock}
              aria-label="נעילה — חזרה למצב משתמש"
              title="נעילה"
            >
              <span className="brandbar__lock-icon" aria-hidden="true">🔓</span>
              <span className="brandbar__lock-label">מצב עריכה</span>
            </button>
            {onOpenLibrary && (
              <button
                type="button"
                className="brandbar__action"
                onClick={onOpenLibrary}
                aria-label="ספריית לוחות"
                title="ספרייה"
              >
                <span aria-hidden="true">⊞</span>
              </button>
            )}
            {onOpenSettings && (
              <button
                type="button"
                className="brandbar__action"
                onClick={onOpenSettings}
                aria-label="הגדרות"
                title="הגדרות"
              >
                <span aria-hidden="true">⚙</span>
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            className={`brandbar__lock${pressing ? ' brandbar__lock--pressing' : ''}`}
            style={lockStyle}
            aria-label="שחרור למצב עריכה (לחיצה ארוכה)"
            title="לחיצה ארוכה לשחרור"
            {...handlers}
          >
            <span className="brandbar__lock-fill" aria-hidden="true" />
            <span className="brandbar__lock-icon" aria-hidden="true">🔒</span>
          </button>
        )}
      </div>
    </header>
  );
}
