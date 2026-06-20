// presentation/auth/LoginPanel.tsx — כניסה/הרשמה ל-AAC Cloud Sync.
// RTL מלא. הודעות שגיאה בעברית.

import { useState } from 'react';

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  loading?: boolean;
}

function translateError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('wrong-password') || msg.includes('invalid-credential'))
    return 'סיסמה שגויה או משתמש לא קיים';
  if (msg.includes('user-not-found')) return 'משתמש לא נמצא';
  if (msg.includes('email-already-in-use')) return 'כתובת אימייל כבר בשימוש';
  if (msg.includes('invalid-email')) return 'כתובת אימייל לא תקינה';
  if (msg.includes('weak-password')) return 'הסיסמה חלשה מדי (לפחות 6 תווים)';
  if (msg.includes('network-request-failed') || msg.includes('offline'))
    return 'אין חיבור לרשת — נסה שנית';
  return 'שגיאה בכניסה, נסה שנית';
}

export function LoginPanel({ onSignIn, onSignUp, loading = false }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isDisabled = busy || loading || !email.trim() || !password;

  async function handle(action: 'signIn' | 'signUp'): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      if (action === 'signIn') {
        await onSignIn(email.trim(), password);
      } else {
        await onSignUp(email.trim(), password);
      }
    } catch (e) {
      setError(translateError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="login-panel" dir="rtl" aria-label="כניסה לסנכרון ענן">
      <h3 className="login-panel__title">כניסה לסנכרון ענן</h3>

      <label className="login-panel__label" htmlFor="login-email">
        אימייל
      </label>
      <input
        id="login-email"
        className="login-panel__input"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={busy || loading}
        dir="ltr"
      />

      <label className="login-panel__label" htmlFor="login-password">
        סיסמה
      </label>
      <input
        id="login-password"
        className="login-panel__input"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={busy || loading}
        dir="ltr"
      />

      {error && (
        <p className="login-panel__error" role="alert">
          {error}
        </p>
      )}

      <div className="login-panel__actions">
        <button
          type="button"
          className="login-panel__btn login-panel__btn--primary"
          onClick={() => void handle('signIn')}
          disabled={isDisabled}
        >
          {busy ? 'מתחבר…' : 'כניסה'}
        </button>
        <button
          type="button"
          className="login-panel__btn"
          onClick={() => void handle('signUp')}
          disabled={isDisabled}
        >
          הרשמה
        </button>
      </div>
    </section>
  );
}
