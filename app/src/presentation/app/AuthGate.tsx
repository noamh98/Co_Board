// presentation/app/AuthGate.tsx — שער האימות (R2 ב-REFACTOR-PLAN).
// חולץ מ-App.tsx כלשונו: עוטף את האפליקציה ומציג loading/login/pending/rejected
// לפי מצב ה-auth. ללא VITE_FIREBASE_API_KEY (בדיקות/dev מקומי) — שקוף לגמרי.

import type { ReactNode } from 'react';
import { AuthGatePage } from '../auth/AuthGatePage';
import { PendingApprovalScreen } from '../auth/PendingApprovalScreen';
import { RejectedScreen } from '../auth/RejectedScreen';
import { sendVerificationEmail } from '../../services/sync/firebaseAuth';
import type { AuthUser } from '../../services/sync/authService';

interface AuthGateProps {
  authChecked: boolean;
  authUser: AuthUser | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onRegister: (email: string, password: string, displayName: string) => Promise<void>;
  onSignOut: () => void;
  children: ReactNode;
}

export function AuthGate({
  authChecked,
  authUser,
  onSignIn,
  onGoogleSignIn,
  onRegister,
  onSignOut,
  children,
}: AuthGateProps) {
  if (!import.meta.env.VITE_FIREBASE_API_KEY) return <>{children}</>;

  if (!authChecked) {
    return (
      <div className="app app--loading" dir="rtl" role="status" aria-label="טוען…">
        <div className="app__loading">טוען…</div>
      </div>
    );
  }
  if (!authUser) {
    return (
      <AuthGatePage
        onSignIn={onSignIn}
        onGoogleSignIn={onGoogleSignIn}
        onRegister={onRegister}
      />
    );
  }
  if (authUser.status === 'pending') {
    return (
      <PendingApprovalScreen
        email={authUser.email}
        displayName={authUser.displayName}
        emailVerified={authUser.emailVerified}
        onSignOut={onSignOut}
        onResendVerification={sendVerificationEmail}
      />
    );
  }
  if (authUser.status === 'rejected') {
    return <RejectedScreen email={authUser.email} onSignOut={onSignOut} />;
  }
  return <>{children}</>;
}
