import { describe, it, expect, vi, beforeEach } from 'vitest';

// ממוקים firebase כדי לבדוק את נתיב המשיכה המשותף (D-01) ללא רשת אמיתית.
const getDocsMock = vi.fn();

interface MockCollection { __type: 'collection'; path: string }
interface MockQuery { __type: 'query'; col: MockCollection }

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn((..._a: unknown[]) => ({})),
  setDoc: vi.fn(),
  collection: vi.fn((_db: unknown, ...segs: string[]): MockCollection => ({
    __type: 'collection',
    path: segs.join('/'),
  })),
  query: vi.fn((col: MockCollection): MockQuery => ({ __type: 'query', col })),
  where: vi.fn((field: string, op: string, val: unknown) => ({ field, op, val })),
  getDocs: (...a: unknown[]) => getDocsMock(...a),
}));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: { uid: 'clinician' } })),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
}));
vi.mock('./crypto', () => ({
  getDeviceId: vi.fn(async () => 'device-1'),
}));
vi.mock('../../data/firebaseEnv', () => ({
  getFirebaseConfig: () => ({
    apiKey: 'x',
    authDomain: 'x',
    projectId: 'x',
    storageBucket: 'x',
    messagingSenderId: 'x',
    appId: 'x',
  }),
}));

import { FirebaseProvider } from './firebaseProvider';

function pathOf(arg: unknown): string {
  const a = arg as Partial<MockQuery & MockCollection>;
  if (a?.__type === 'query') return a.col?.path ?? '';
  if (a?.__type === 'collection') return a.path ?? '';
  return '';
}

beforeEach(() => {
  getDocsMock.mockReset();
});

describe('FirebaseProvider — D-01 shared child pull', () => {
  it('pull מושך מסמך לוח של ילד משותף מתת-העץ של הבעלים', async () => {
    getDocsMock.mockImplementation((arg: unknown) => {
      const path = pathOf(arg);
      if (path === 'users/clinician/sharedChildren') {
        return Promise.resolve({
          docs: [{ data: () => ({ ownerUid: 'owner-1', childId: 'c1' }) }],
        });
      }
      if (path === 'users/owner-1/board') {
        return Promise.resolve({
          docs: [
            {
              data: () => ({
                entityId: 'b1',
                childId: 'c1',
                version: 3,
                updatedAt: 42,
                deviceId: 'owner-device',
                data: { id: 'b1', name: 'לוח משותף', childId: 'c1' },
              }),
            },
          ],
        });
      }
      // כל שאר הנתיבים (own board/profile/settings, shared profile) — ריקים.
      return Promise.resolve({ docs: [] });
    });

    const provider = new FirebaseProvider();
    const records = await provider.pull(0);

    const shared = records.find((r) => r.entityType === 'board' && r.entityId === 'b1');
    expect(shared).toBeDefined();
    expect(shared!.versioned.version).toBe(3);
    expect(shared!.versioned.updatedAt).toBe(42);
  });

  it('pull בולע כשל גישה משותפת בשקט (לא שובר סנכרון)', async () => {
    getDocsMock.mockImplementation((arg: unknown) => {
      const path = pathOf(arg);
      if (path === 'users/clinician/sharedChildren') {
        return Promise.resolve({
          docs: [{ data: () => ({ ownerUid: 'owner-1', childId: 'c1' }) }],
        });
      }
      if (path === 'users/owner-1/board' || path === 'users/owner-1/profile') {
        return Promise.reject(new Error('permission-denied'));
      }
      return Promise.resolve({ docs: [] });
    });

    const provider = new FirebaseProvider();
    const records = await provider.pull(0);
    // אין רשומות משותפות, אך הקריאה לא זרקה.
    expect(records.every((r) => r.entityId !== 'b1')).toBe(true);
  });

  it('pull מדלג על מצביע ללא ownerUid/childId', async () => {
    getDocsMock.mockImplementation((arg: unknown) => {
      const path = pathOf(arg);
      if (path === 'users/clinician/sharedChildren') {
        return Promise.resolve({
          docs: [{ data: () => ({ childId: 'c1' }) }], // חסר ownerUid
        });
      }
      return Promise.resolve({ docs: [] });
    });

    const provider = new FirebaseProvider();
    const records = await provider.pull(0);
    expect(records).toHaveLength(0);
  });
});
