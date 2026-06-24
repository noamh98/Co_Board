// presentation/auth/RegisterPanel.tsx — הרשמה: שם + אימייל + סיסמה + אימות סיסמה.
// אחרי יצירת חשבון: שליחת מייל אימות + כתיבת status='pending' → מסך המתנה.
// RTL מלא. הודעות שגיאה בעברית.

import { useState } from 'react';

interface Props {
  onRegister: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  onGoogleSignIn?: () => Promise<void>;
  onBackToLogin: () => void;
  loading?: boolean;
}

function translateError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('email-already-in-use')) return 'כתובת אימייל כבר בשימוש';
  if (msg.includes('invalid-email')) return 'כתובת אימייל לא תקינה';
  if (msg.includes('weak-password')) return 'הסיסמה חלשה מדי (לפחות 6 תווים)';
  if (msg.includes('network-request-failed') || msg.includes('offline'))
    return 'אין חיבור לרשת — נסה שנית';
  return 'שגיאה בהרשמה, נסה שנית';
}

export function RegisterPanel({ onRegister, onGoogleSignIn, onBackToLogin, loading = false }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const passwordsMatch = password === confirm;
  const isDisabled =
    busy || loading || !displayName.trim() || !email.trim() || !password || !confirm;

  async function handleRegister(): Promise<void> {
    if (!passwordsMatch) {
      setError('הסיסמאות אינן תואמות');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onRegister(email.trim(), password, displayName.trim());
    } catch (e) {
      setError(translateError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle(): Promise<void> {
    if (!onGoogleSignIn) return;
    setError(null);
    setBusy(true);
    try {
      await onGoogleSignIn();
    } catch (e) {
      setError(translateError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="login-panel" dir="rtl" aria-label="הרשמה לסנכרון ענן">
      <h3 className="login-panel__title">הרשמה</h3>

      <label className="login-panel__label" htmlFor="reg-name">שם מלא</label>
      <input
        id="reg-name"
        className="login-panel__input"
        type="text"
        autoComplete="name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        disabled={busy || loading}
        dir="rtl"
      />

      <label className="login-panel__label" htmlFor="reg-email">אימייל</label>
      <input
        id="reg-email"
        className="login-panel__input"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={busy || loading}
        dir="ltr"
      />

      <label className="login-panel__label" htmlFor="reg-password">סיסמה</label>
      <input
        id="reg-password"
        className="login-panel__input"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={busy || loading}
        dir="ltr"
      />

      <label className="login-panel__label" htmlFor="reg-confirm">אימות סיסמה</label>
      <input
        id="reg-confirm"
        className="login-panel__input"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        disabled={busy || loading}
        dir="ltr"
        aria-invalid={confirm !== '' && !passwordsMatch}
      />
      {confirm !== '' && !passwordsMatch && (
        <p className="login-panel__error" role="alert">הסיסמאות אינן תואמות</p>
      )}

      {error && (
        <p className="login-panel__error" role="alert">{error}</p>
      )}

      <div className="login-panel__actions">
        <button
          type="button"
          className="login-panel__btn login-panel__btn--primary"
          onClick={() => void handleRegister()}
          disabled={isDisabled}
        >
          {busy ? 'נרשם…' : 'הרשמה'}
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

        <button
          type="button"
          className="login-panel__btn"
          onClick={onBackToLogin}
          disabled={busy}
        >
          חזרה לכניסה
        </button>
      </div>
    </section>
  );
}
