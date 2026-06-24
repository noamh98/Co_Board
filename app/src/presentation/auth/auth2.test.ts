// בדיקות 2A: RegisterPanel, PendingApprovalScreen, auth extensions.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../../services/sync/authService';

beforeEach(() => {
  authService._resetForTests();
});

describe('authService — הרחבות 2A', () => {
  it('setAuthUser מעדכן currentUser ומפעיל listeners', () => {
    const calls: unknown[] = [];
    const unsub = authService.onAuthChange((u) => calls.push(u));
    authService.setAuthUser({ uid: 'u1', email: 'a@b.com', emailVerified: true, status: 'approved' });
    expect(calls).toHaveLength(2);
    expect(authService.getCurrentUser()).toMatchObject({ uid: 'u1', status: 'approved' });
    unsub();
  });

  it('mergeAuthFields מוסיף שדות לuser קיים', () => {
    authService.setAuthUser({ uid: 'u2', email: 'b@c.com' });
    authService.mergeAuthFields({ status: 'pending', emailVerified: false });
    const u = authService.getCurrentUser();
    expect(u?.status).toBe('pending');
    expect(u?.emailVerified).toBe(false);
    expect(u?.uid).toBe('u2');
  });

  it('mergeAuthFields לא עושה כלום כשאין currentUser', () => {
    authService.mergeAuthFields({ status: 'approved' });
    expect(authService.getCurrentUser()).toBeNull();
  });

  it('setAuthUser(null) מנקה את המשתמש', () => {
    authService.setAuthUser({ uid: 'u3', email: 'c@d.com' });
    authService.setAuthUser(null);
    expect(authService.getCurrentUser()).toBeNull();
  });

  it('status pending נשמר אחרי merge', () => {
    authService.setAuthUser({ uid: 'u4', email: 'd@e.com' });
    authService.mergeAuthFields({ status: 'pending' });
    expect(authService.getCurrentUser()?.status).toBe('pending');
  });

  it('claims.admin=true נשמר אחרי merge', () => {
    authService.setAuthUser({ uid: 'u5', email: 'e@f.com' });
    authService.mergeAuthFields({ claims: { admin: true } });
    expect(authService.getCurrentUser()?.claims?.admin).toBe(true);
  });

  it('signIn קיים עדיין עובד (backwards compat)', async () => {
    const provider = {
      isAvailable: () => true,
      push: vi.fn().mockResolvedValue(undefined),
      pull: vi.fn().mockResolvedValue([]),
      getDeviceId: () => 'test',
      signIn: vi.fn().mockResolvedValue('uid-test'),
      signUp: vi.fn().mockResolvedValue('uid-test'),
      signOut: vi.fn().mockResolvedValue(undefined),
      getCurrentUid: () => 'uid-test',
    };
    const user = await authService.signIn(provider, 'test@x.com', 'pass');
    expect(user.uid).toBe('uid-test');
    expect(user.email).toBe('test@x.com');
  });
});
