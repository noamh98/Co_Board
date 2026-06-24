// services/sync/authService.ts — Auth facade עבור App.tsx.
// עוטף FirebaseProvider.signIn/signOut ומספק onAuthChange listener.
// 2A: הרחבת AuthUser (emailVerified, displayName, status, claims) + setAuthUser.

import type { SyncProvider } from './syncProvider';
import type { UserStatus } from './firebaseAuth';

export interface AuthUser {
  uid: string;
  email: string;
  emailVerified?: boolean;
  displayName?: string;
  status?: UserStatus;
  claims?: { admin?: boolean };
}

type AuthChangeCallback = (user: AuthUser | null) => void;

let _currentUser: AuthUser | null = null;
const _listeners = new Set<AuthChangeCallback>();

function notify(user: AuthUser | null): void {
  _currentUser = user;
  for (const cb of _listeners) cb(user);
}

export const authService = {
  async signIn(
    provider: SyncProvider,
    email: string,
    password: string,
  ): Promise<AuthUser> {
    const uid = await provider.signIn(email, password);
    const user: AuthUser = { uid, email };
    notify(user);
    return user;
  },

  async signUp(
    provider: SyncProvider,
    email: string,
    password: string,
  ): Promise<AuthUser> {
    const uid = await provider.signUp(email, password);
    const user: AuthUser = { uid, email };
    notify(user);
    return user;
  },

  async signOut(provider: SyncProvider): Promise<void> {
    await provider.signOut();
    notify(null);
  },

  getCurrentUser(): AuthUser | null {
    return _currentUser;
  },

  onAuthChange(cb: AuthChangeCallback): () => void {
    _listeners.add(cb);
    cb(_currentUser);
    return () => { _listeners.delete(cb); };
  },

  /** עדכן את המשתמש הנוכחי מחוץ (אחרי Google sign-in / status refresh). */
  setAuthUser(user: AuthUser | null): void {
    notify(user);
  },

  /** מיזוג שדות חדשים לתוך המשתמש הנוכחי (לא מחליף uid/email). */
  mergeAuthFields(fields: Partial<AuthUser>): void {
    if (!_currentUser) return;
    notify({ ..._currentUser, ...fields });
  },

  _resetForTests(): void {
    _currentUser = null;
    _listeners.clear();
  },
};
