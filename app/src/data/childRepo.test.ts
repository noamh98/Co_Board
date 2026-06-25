import { describe, it, expect, vi, beforeEach } from 'vitest';

// childRepo עובד מול Firestore — ממוקים firebase כדי לבדוק לוגיקה (A5).
const setDocMock = vi.fn();
const getDocsMock = vi.fn();

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: () => [{}],
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn((..._a: unknown[]) => ({})),
  getDoc: vi.fn(),
  setDoc: (...a: unknown[]) => setDocMock(...a),
  collection: vi.fn(() => ({})),
  query: vi.fn((..._a: unknown[]) => ({})),
  where: vi.fn((field: string, op: string, val: unknown) => ({ field, op, val })),
  getDocs: (...a: unknown[]) => getDocsMock(...a),
}));
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));
vi.mock('./firebaseEnv', () => ({
  getFirebaseConfig: () => ({
    apiKey: 'x',
    authDomain: 'x',
    projectId: 'x',
    storageBucket: 'x',
    messagingSenderId: 'x',
    appId: 'x',
  }),
}));

import { createChild, listChildren, type ChildRecord } from './childRepo';

beforeEach(() => {
  setDocMock.mockReset().mockResolvedValue(undefined);
  getDocsMock.mockReset();
});

describe('childRepo — A5 (ילד חדש מופיע בדאשבורד)', () => {
  it('createChild כותב archivedAt:null (אחרת השאילתה לא תופסת ילדים חדשים)', async () => {
    const child = await createChild('uid-1', 'דנה');
    expect(child.archivedAt).toBeNull();

    const savedChild = setDocMock.mock.calls
      .map((c) => c[1] as Partial<ChildRecord>)
      .find((d) => d?.name === 'דנה');
    expect(savedChild).toBeDefined();
    expect(savedChild!.archivedAt).toBeNull();
  });

  it('listChildren מחזיר ילדים פעילים', async () => {
    getDocsMock.mockResolvedValue({
      docs: [
        { data: () => ({ childId: 'c1', name: 'דנה', createdAt: 1, archivedAt: null }) },
      ],
    });
    const list = await listChildren('uid-1');
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('דנה');
  });
});
