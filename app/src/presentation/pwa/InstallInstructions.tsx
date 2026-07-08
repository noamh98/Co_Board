// presentation/pwa/InstallInstructions.tsx — רמז התקנה ל-iOS (C-07).
//
// באנר תחתון נגיש, *לא-חוסם* (אינו modal): מוצג רק ב-iOS Safari כשהאפליקציה
// אינה מותקנת עדיין, ומסביר "שיתוף → הוספה למסך הבית" + טיפ 'גישה מודרכת'
// (Guided Access) לנעילת המכשיר על האפליקציה. ניתן לסגירה, וההעדפה נשמרת.
//
// אינווריאנט: לעולם אינו חוסם את "הלחיצה הראשונה מדברת" — זהו באנר בתחתית המסך
// שאפשר להתעלם ממנו, ואינו לוכד פוקוס/מקלדת.

import { useCallback, useState, type CSSProperties } from 'react';
import { shouldShowIosInstallHint } from '../../domain/platform';

const DISMISS_KEY = 'coboard:iosInstallHintDismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function computeInitialVisible(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const displayModeStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  // navigator.standalone קיים רק ב-Safari ל-iOS (לא-סטנדרטי) — לכן גישה בטוחה.
  const navigatorStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  return shouldShowIosInstallHint({
    ua: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    displayModeStandalone,
    navigatorStandalone,
    dismissed: readDismissed(),
  });
}

const banner: CSSProperties = {
  position: 'fixed',
  insetInline: 'var(--sp-3, 12px)',
  insetBlockEnd: 'calc(env(safe-area-inset-bottom, 0px) + var(--sp-3, 12px))',
  zIndex: 60,
  background: 'var(--cl-surface)',
  color: 'var(--cl-ink)',
  border: '1px solid var(--cl-border)',
  borderRadius: 'var(--co-r-md, 16px)',
  boxShadow: 'var(--co-shadow)',
  padding: 'var(--sp-3, 12px)',
  maxWidth: '520px',
  marginInline: 'auto',
};

export function InstallInstructions() {
  const [visible, setVisible] = useState<boolean>(computeInitialVisible);
  const [expanded, setExpanded] = useState(false);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* אחסון חסום (מצב פרטי) — פשוט מסתירים לסשן הנוכחי. */
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <section
      className="ios-install-hint no-print"
      data-testid="ios-install-hint"
      aria-label="התקנת האפליקציה למסך הבית"
      dir="rtl"
      style={banner}
    >
      <div className="row" style={{ gap: 'var(--sp-2, 8px)', alignItems: 'flex-start' }}>
        <span aria-hidden="true" style={{ fontSize: '1.4rem', lineHeight: 1 }}>
          📲
        </span>
        <div className="grow">
          <strong style={{ display: 'block', marginBlockEnd: '4px' }}>
            להתקנת "לוח תקשורת" על המכשיר
          </strong>
          <p style={{ margin: 0, color: 'var(--cl-muted)', fontSize: 'var(--tx-sm, 0.9rem)' }}>
            כך תקבלו אייקון במסך הבית ומסך-מלא ללא סרגל הדפדפן.
          </p>

          {expanded && (
            <div style={{ marginBlockStart: 'var(--sp-2, 8px)' }}>
              <ol style={{ margin: 0, paddingInlineStart: '1.2em', lineHeight: 1.7 }}>
                <li>
                  הקישו על כפתור <strong>השיתוף</strong> (הריבוע עם החץ ⬆️) בסרגל Safari.
                </li>
                <li>
                  בחרו <strong>"הוספה למסך הבית"</strong>.
                </li>
                <li>
                  הקישו <strong>"הוסף"</strong> בפינה.
                </li>
              </ol>
              <p
                style={{
                  margin: 'var(--sp-2, 8px) 0 0',
                  padding: 'var(--sp-2, 8px)',
                  background: 'var(--cl-surface-alt)',
                  borderRadius: 'var(--co-r-sm, 12px)',
                  fontSize: 'var(--tx-sm, 0.9rem)',
                }}
              >
                💡 <strong>נעילה על האפליקציה (גישה מודרכת):</strong> הגדרות → נגישות → גישה
                מודרכת → הפעלה. לאחר מכן לחיצה משולשת על הכפתור הצדדי נועלת את המכשיר על
                האפליקציה, כדי שהילד/ה לא יצא/תצא בטעות.
              </p>
            </div>
          )}

          <div className="row" style={{ gap: 'var(--sp-2, 8px)', marginBlockStart: 'var(--sp-2, 8px)' }}>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              style={{
                background: 'var(--cl-primary)',
                color: 'var(--cl-on-primary)',
                border: 'none',
                borderRadius: 'var(--co-r-sm, 12px)',
                padding: '8px 14px',
                fontWeight: 700,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {expanded ? 'הסתר הוראות' : 'איך מתקינים?'}
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="סגור וזכור"
              style={{
                background: 'transparent',
                color: 'var(--cl-muted)',
                border: '1px solid var(--cl-border)',
                borderRadius: 'var(--co-r-sm, 12px)',
                padding: '8px 14px',
                fontWeight: 700,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              לא עכשיו
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
