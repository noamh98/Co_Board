import { describe, it, expect, vi, beforeEach } from 'vitest';

// childRepo עובד מול Firestore — ממוקים firebase כדי לבדוק לוגיקה (A5).
const setDocMock = vi.fn();
const getDocsMock = vi.fn();
const getDocMock = vi.fn();

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: () => [{}],
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn((..._a: unknown[]) => ({})),
  getDoc: (...a: unknown[]) => getDocMock(...a),
  setDoc: (...a: unknown[]) => setDocMock(...a),
  collection: vi.fn((..._a: unknown[]) => ({})),
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

import { createChild, listChildren, listSharedChildren, type ChildRecord } from './childRepo';

beforeEach(() => {
  setDocMock.mockReset().mockResolvedValue(undefined);
  getDocsMock.mockReset();
  getDocMock.mockReset();
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

describe('childRepo — D-01 (listSharedChildren)', () => {
  it('שולף מצביעים + מסמך ילד מהבעלים ומחזיר ChildRecord עם ownerUid', async () => {
    // מצביעי sharedChildren של המשתמש המקבל
    getDocsMock.mockResolvedValue({
      docs: [
        { data: () => ({ childId: 'c1', ownerUid: 'owner-1', role: 'clinician', name: 'יובל', grantedAt: 1 }) },
      ],
    });
    // getChild(owner-1, c1) → מסמך הילד מתת-העץ של הבעלים
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ childId: 'c1', name: 'יובל', createdAt: 1, archivedAt: null }),
    });

    const shared = await listSharedChildren('clinician-1');
    expect(shared).toHaveLength(1);
    expect(shared[0].childId).toBe('c1');
    expect(shared[0].ownerUid).toBe('owner-1');
  });

  it('מדלג על ילד משותף מאורכב (archivedAt מוגדר)', async () => {
    getDocsMock.mockResolvedValue({
      docs: [
        { data: () => ({ childId: 'c1', ownerUid: 'owner-1', role: 'clinician', name: 'יובל', grantedAt: 1 }) },
      ],
    });
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ childId: 'c1', name: 'יובל', createdAt: 1, archivedAt: 999 }),
    });

    const shared = await listSharedChildren('clinician-1');
    expect(shared).toHaveLength(0);
  });

  it('בולע כשל שליפה בודד בשקט (גישה שפקעה) ולא שובר את הרשימה', async () => {
    getDocsMock.mockResolvedValue({
      docs: [
        { data: () => ({ childId: 'c1', ownerUid: 'owner-1', role: 'clinician', name: 'א', grantedAt: 1 }) },
        { data: () => ({ childId: 'c2', ownerUid: 'owner-2', role: 'clinician', name: 'ב', grantedAt: 1 }) },
      ],
    });
    getDocMock
      .mockRejectedValueOnce(new Error('permission-denied'))
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ childId: 'c2', name: 'ב', createdAt: 1, archivedAt: null }),
      });

    const shared = await listSharedChildren('clinician-1');
    expect(shared).toHaveLength(1);
    expect(shared[0].childId).toBe('c2');
  });

  it('מחזיר רשימה ריקה כשקריאת המצביעים נכשלת (offline)', async () => {
    getDocsMock.mockRejectedValue(new Error('offline'));
    const shared = await listSharedChildren('clinician-1');
    expect(shared).toEqual([]);
  });
});
