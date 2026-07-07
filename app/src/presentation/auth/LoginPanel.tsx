// presentation/auth/LoginPanel.tsx — כניסה ל-AAC Cloud Sync.
// 2A: הוסף כפתור Google + קישור לדף הרשמה.
// D-04: הוסף תהליך איפוס סיסמה (”שכחתי סיסמה“) — הודעה ניטרלית (אנטי-enumeration).
// RTL מלא. הודעות שגיאה בעברית.
// Phase 1 (de-dup translateError): מיפוי קודי Firebase לעברית הועבר ל-translateFirebaseError.

import { useState } from 'react';
import { translateFirebaseError } from './translateFirebaseError';

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>;
  onGoogleSignIn?: () => Promise<void>;
  onGoToRegister?: () => void;
  /** D-04: שליחת מייל איפוס סיסמה. אם לא סופק — הקישור לא מוצג. */
  onPasswordReset?: (email: string) => Promise<void>;
  loading?: boolean;
}

export function LoginPanel({
  onSignIn,
  onGoogleSignIn,
  onGoToRegister,
  onPasswordReset,
  loading = false,
}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isDisabled = busy || loading || !email.trim() || !password;

  async function handleSignIn(): Promise<void> {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await onSignIn(email.trim(), password);
    } catch (e) {
      setError(translateFirebaseError(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle(): Promise<void> {
    if (!onGoogleSignIn) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await onGoogleSignIn();
    } catch (e) {
      setError(translateFirebaseError(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordReset(): Promise<void> {
    if (!onPasswordReset) return;
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('הזינו כתובת אימייל כדי לאפס סיסמה');
      return;
    }
    setBusy(true);
    try {
      await onPasswordReset(email.trim());
      // אנטי-enumeration: הודעה ניטרלית שאינה מאשרת אם הכתובת רשומה.
      setInfo('אם הכתובת רשומה במערכת, נשלח אליה קישור לאיפוס סיסמה. בדקו את תיבת הדואר.');
    } catch (e) {
      setError(translateFirebaseError(e instanceof Error ? e.message : String(e)));
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

      {info && (
        <p className="login-panel__info" role="status">
          {info}
        </p>
      )}

      {onPasswordReset && (
        <button
          type="button"
          className="login-panel__link"
          onClick={() => void handlePasswordReset()}
          disabled={busy || loading}
        >
          שכחתי סיסמה
        </button>
      )}

      <div className="login-panel__actions">
        <button
          type="button"
          className="login-panel__btn login-panel__btn--primary"
          onClick={() => void handleSignIn()}
          disabled={isDisabled}
        >
          {busy ? 'מתחבר…' : 'כניסה'}
        </button>

        {onGoogleSignIn && (
          <button
            type="button"
            className="login-panel__btn login-panel__btn--google"
            onClick={() => void handleGoogle()}
            disabled={busy || loading}
          >
            כניסה עם Google
          </button>
        )}

        {onGoToRegister && (
          <button
            type="button"
            className="login-panel__btn"
            onClick={onGoToRegister}
            disabled={busy}
          >
            הרשמה
          </button>
        )}
      </div>
    </section>
  );
}
