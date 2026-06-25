import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Profile } from '../../domain/models';

// סרגל מותג עליון (Claude Design 2026): אווטאר + תפריט · ברכה לפי שעה · לוגו.
// אינו מחליף את ה-AdultBar/PinGate — "הגדרות והורים" מפנה לאותו זרימת מבוגר.

function greetingFor(d: Date = new Date()): string {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'בוקר טוב';
  if (h >= 12 && h < 17) return 'צהריים טובים';
  if (h >= 17 && h < 22) return 'ערב טוב';
  return 'לילה טוב';
}

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

export function BrandBar({
  profileName,
  onOpenAdult,
  onSignOut,
  onSignIn,
  status,
  profiles,
  activeProfileId,
  onSwitch,
  onOpenWizard,
  isAdult,
  authEmail,
  authDisplayName,
}: {
  profileName?: string;
  onOpenAdult: () => void;
  onSignOut?: () => void;
  /** פתיחת מסך כניסה — מוצג כשאין משתמש מחובר */
  onSignIn?: () => void;
  status?: ReactNode;
  /** רשימת פרופילים — מוצגת בתפריט במצב מבוגר */
  profiles?: Profile[];
  activeProfileId?: string;
  onSwitch?: (id: string) => void;
  /** יצירת פרופיל חדש */
  onOpenWizard?: () => void;
  /** האם במצב מבוגר (PIN הוכנס) */
  isAdult?: boolean;
  /** אימייל המשתמש המחובר */
  authEmail?: string;
  authDisplayName?: string;
}) {
  const [open, setOpen] = useState(false);
  const initials = profileName?.trim().charAt(0) || '◗';
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);

  // F5: נגישות מקלדת לתפריט — פוקוס לפריט ראשון, Escape סוגר ומחזיר פוקוס לכפתור,
  // Tab/Shift+Tab במלכודת בתוך התפריט.
  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    const items = menu
      ? Array.from(
          menu.querySelectorAll<HTMLElement>('button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])'),
        )
      : [];
    items[0]?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        avatarBtnRef.current?.focus();
      } else if (e.key === 'Tab' && items.length > 0) {
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

  const Avatar = ({ size }: { size: 'lg' | 'sm' }) => (
    <span
      className={`brandbar__avatar brandbar__avatar--${size}`}
      aria-hidden="true"
    >
      <span className="brandbar__avatar-inner">{initials}</span>
    </span>
  );

  return (
    <header className="brandbar">
      {/* F3: כותרת ראשית לקוראי-מסך (BrandBar החליף את ה-<h1> המקורי). */}
      <h1 className="sr-only">לוח תקשורת — Co_Board</h1>
      <div className="brandbar__avatar-wrap">
        <button
          ref={avatarBtnRef}
          type="button"
          className="brandbar__avatar-btn"
          aria-label="חשבון והגדרות"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <Avatar size="lg" />
        </button>

        {open && (
          <>
            <div
              className="brandbar__scrim"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div ref={menuRef} className="brandbar__menu" role="menu">
              {/* כותרת: פרופיל פעיל */}
              {profileName && (
                <div className="brandbar__menu-head">
                  <Avatar size="sm" />
                  <span className="brandbar__menu-id">
                    <span className="brandbar__menu-name">{profileName}</span>
                    <span className="brandbar__menu-sub">פרופיל פעיל</span>
                  </span>
                </div>
              )}

              {/* סטטוס חשבון ענן */}
              {authEmail ? (
                <div className="brandbar__menu-auth">
                  <span className="brandbar__menu-auth-name">{authDisplayName ?? authEmail.split('@')[0]}</span>
                  <span className="brandbar__menu-auth-email">{authEmail}</span>
                </div>
              ) : onSignIn ? (
                <>
                  <div className="brandbar__menu-sep" />
                  <button
                    type="button"
                    className="brandbar__menu-item brandbar__menu-item--signin"
                    role="menuitem"
                    onClick={() => { setOpen(false); onSignIn(); }}
                  >
                    <span className="brandbar__menu-icon" aria-hidden="true">☁</span>
                    התחברות לענן
                  </button>
                </>
              ) : null}

              {/* החלפת פרופיל — רק במצב מבוגר */}
              {isAdult && profiles && profiles.length > 0 && (
                <>
                  <div className="brandbar__menu-sep" />
                  <div className="brandbar__menu-section-label">החלפת פרופיל</div>
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`brandbar__menu-item brandbar__menu-item--profile${p.id === activeProfileId ? ' brandbar__menu-item--active' : ''}`}
                      role="menuitem"
                      onClick={() => { setOpen(false); onSwitch?.(p.id); }}
                    >
                      <span className="brandbar__menu-profile-dot" aria-hidden="true">
                        {p.id === activeProfileId ? '◉' : '◎'}
                      </span>
                      {p.name}
                    </button>
                  ))}
                  {onOpenWizard && (
                    <button
                      type="button"
                      className="brandbar__menu-item brandbar__menu-item--new"
                      role="menuitem"
                      onClick={() => { setOpen(false); onOpenWizard(); }}
                    >
                      <span className="brandbar__menu-icon" aria-hidden="true">＋</span>
                      פרופיל חדש
                    </button>
                  )}
                </>
              )}

              <div className="brandbar__menu-sep" />
              <button
                type="button"
                className="brandbar__menu-item"
                role="menuitem"
                onClick={() => { setOpen(false); onOpenAdult(); }}
              >
                <span className="brandbar__menu-icon" aria-hidden="true">🔒</span>
                הגדרות והורים
              </button>

              {onSignOut && (
                <>
                  <div className="brandbar__menu-sep" />
                  <button
                    type="button"
                    className="brandbar__menu-item brandbar__menu-item--danger"
                    role="menuitem"
                    onClick={() => { setOpen(false); onSignOut(); }}
                  >
                    <span className="brandbar__menu-icon" aria-hidden="true">⬅</span>
                    התנתקות
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="brandbar__center">
        {profileName && (
          <span className="brandbar__greet">
            {greetingFor()}, {profileName} <span aria-hidden="true">👋</span>
          </span>
        )}
        {status && <span className="brandbar__status">{status}</span>}
      </div>

      <div className="brandbar__logo">
        <span className="brandbar__logo-text">
          <span className="brandbar__logo-name">Co_Board</span>
          <span className="brandbar__logo-sub">לוח תקשורת</span>
        </span>
        <span className="brandbar__logo-mark" aria-hidden="true">
          {SpeechMark}
        </span>
      </div>
    </header>
  );
}
