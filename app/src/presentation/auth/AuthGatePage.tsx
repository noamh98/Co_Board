import { useState } from 'react';
import { LoginPanel } from './LoginPanel';
import { RegisterPanel } from './RegisterPanel';

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>;
  onGoogleSignIn?: () => Promise<void>;
  onRegister: (email: string, password: string, displayName: string) => Promise<void>;
}

export function AuthGatePage({ onSignIn, onGoogleSignIn, onRegister }: Props) {
  const [showRegister, setShowRegister] = useState(false);

  return (
    <div className="auth-gate" dir="rtl">
      <div className="auth-gate__brand">
        <span className="auth-gate__brand-name">Co_Board</span>
        <span className="auth-gate__brand-sub">לוח תקשורת</span>
      </div>
      <div className="auth-gate__card">
        {showRegister ? (
          <RegisterPanel
            onRegister={onRegister}
            onGoogleSignIn={onGoogleSignIn}
            onBackToLogin={() => setShowRegister(false)}
          />
        ) : (
          <LoginPanel
            onSignIn={onSignIn}
            onGoogleSignIn={onGoogleSignIn}
            onGoToRegister={() => setShowRegister(true)}
          />
        )}
      </div>
    </div>
  );
}
