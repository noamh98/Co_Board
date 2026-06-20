// services/sync/authService.ts — Auth facade עבור App.tsx.
// עוטף FirebaseProvider.signIn/signOut ומספק onAuthChange listener.

import type { SyncProvider } from './syncProvider';

export interface AuthUser {
  uid: string;
  email: string;
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

  _resetForTests(): void {
    _currentUser = null;
    _listeners.clear();
  },
};
