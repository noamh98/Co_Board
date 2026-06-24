// presentation/auth/PendingApprovalScreen.tsx — מסך "ממתין לאישור אדמין".
// מוצג כשstatus='pending' — חוסם גישה לכל תוכן האפליקציה.
// RTL, נגישות מלאה.

interface Props {
  email: string;
  displayName?: string;
  onSignOut: () => void;
  onResendVerification?: () => Promise<void>;
  emailVerified?: boolean;
}

export function PendingApprovalScreen({
  email,
  displayName,
  onSignOut,
  onResendVerification,
  emailVerified = true,
}: Props) {
  return (
    <main
      className="auth-screen"
      dir="rtl"
      role="main"
      aria-label="ממתין לאישור"
    >
      <div className="auth-screen__card">
        <h2 className="auth-screen__title">ממתין לאישור</h2>

        {displayName && (
          <p className="auth-screen__sub">שלום, {displayName}</p>
        )}
        <p className="auth-screen__body">
          חשבונך ({email}) נוצר ומחכה לאישור המנהל.
        </p>

        {!emailVerified && (
          <div className="auth-screen__notice" role="status">
            <p>יש לאמת את כתובת האימייל תחילה.</p>
            {onResendVerification && (
              <button
                type="button"
                className="login-panel__btn"
                onClick={() => void onResendVerification()}
              >
                שלח מייל אימות שוב
              </button>
            )}
          </div>
        )}

        {emailVerified && (
          <p className="auth-screen__body auth-screen__body--muted">
            תקבל/י הודעה כשהחשבון יאושר.
          </p>
        )}

        <button
          type="button"
          className="login-panel__btn"
          onClick={onSignOut}
        >
          התנתק
        </button>
      </div>
    </main>
  );
}
