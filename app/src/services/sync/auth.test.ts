import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from './authService';
import type { SyncProvider } from './syncProvider';

function makeProvider(uid = 'uid-123'): SyncProvider {
  return {
    isAvailable: () => true,
    push: vi.fn().mockResolvedValue(undefined),
    pull: vi.fn().mockResolvedValue([]),
    getDeviceId: () => 'test-device',
    signIn: vi.fn().mockResolvedValue(uid),
    signUp: vi.fn().mockResolvedValue(uid),
    signOut: vi.fn().mockResolvedValue(undefined),
    getCurrentUid: vi.fn().mockReturnValue(uid),
  };
}

beforeEach(() => {
  authService._resetForTests();
});

describe('authService', () => {
  it('signIn מחזיר AuthUser ומעדכן currentUser', async () => {
    const p = makeProvider('u1');
    const user = await authService.signIn(p, 'a@b.com', 'pass');
    expect(user).toEqual({ uid: 'u1', email: 'a@b.com' });
    expect(authService.getCurrentUser()).toEqual({ uid: 'u1', email: 'a@b.com' });
  });

  it('signOut מנקה currentUser', async () => {
    const p = makeProvider();
    await authService.signIn(p, 'a@b.com', 'pass');
    await authService.signOut(p);
    expect(authService.getCurrentUser()).toBeNull();
  });

  it('onAuthChange מיידי עם מצב נוכחי', () => {
    const calls: (typeof authService.getCurrentUser)[] = [];
    const unsub = authService.onAuthChange((u) => calls.push(u as never));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBeNull();
    unsub();
  });

  it('onAuthChange מופעל אחרי signIn', async () => {
    const p = makeProvider('uid-x');
    const calls: unknown[] = [];
    const unsub = authService.onAuthChange((u) => calls.push(u));
    await authService.signIn(p, 'x@y.com', 'pw');
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual({ uid: 'uid-x', email: 'x@y.com' });
    unsub();
  });

  it('onAuthChange unsub מפסיק להאזין', async () => {
    const p = makeProvider();
    const calls: unknown[] = [];
    const unsub = authService.onAuthChange((u) => calls.push(u));
    unsub();
    await authService.signIn(p, 'a@b.com', 'p');
    expect(calls).toHaveLength(1); // רק הקריאה הראשונית
  });

  it('signIn שגיאה ← provider זורק', async () => {
    const p = makeProvider();
    (p.signIn as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('auth/wrong-password'));
    await expect(authService.signIn(p, 'bad@x.com', 'wrong')).rejects.toThrow('auth/wrong-password');
    expect(authService.getCurrentUser()).toBeNull();
  });
});
