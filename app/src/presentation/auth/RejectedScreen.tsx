// presentation/auth/RejectedScreen.tsx — מסך "בקשה נדחתה".

const SUPPORT_EMAIL = 'support@co-board.app';

interface Props {
  email: string;
  onSignOut: () => void;
}

export function RejectedScreen({ email, onSignOut }: Props) {
  return (
    <main
      className="auth-screen"
      dir="rtl"
      role="main"
      aria-label="בקשה נדחתה"
    >
      <div className="auth-screen__card">
        <h2 className="auth-screen__title">בקשת הגישה נדחתה</h2>
        <p className="auth-screen__body">
          בקשת הגישה של {email} לא אושרה.
        </p>
        <p className="auth-screen__body">
          לפרטים נוספים פנה אל:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="auth-screen__link">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <button type="button" className="login-panel__btn" onClick={onSignOut}>
          התנתק
        </button>
      </div>
    </main>
  );
}
