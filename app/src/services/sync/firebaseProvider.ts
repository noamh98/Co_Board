// services/sync/firebaseProvider.ts — Firebase/Firestore SyncProvider.
// PRD §4.8, ADR-0002. מימוש מאחורי SyncProvider interface.
// Firestore path: users/{uid}/{entityType}/{entityId}

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  type Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  type Auth,
} from 'firebase/auth';
import type { SyncProvider, SyncRecord } from './syncProvider';
import type { Versioned } from '../../domain/sync';
import { getDeviceId } from './crypto';
import { getFirebaseConfig } from '../../data/firebaseEnv';

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

function getFirebaseInstances(): { db: Firestore; auth: Auth } {
  if (!_app) {
    // G2: ולידציית env בעת init ראשון (lazy) — שגיאה ברורה אם חסר.
    _app = initializeApp(getFirebaseConfig());
    _db = getFirestore(_app);
    _auth = getAuth(_app);
  }
  return { db: _db!, auth: _auth! };
}

/**
 * חילוץ childId מתוך גוף הישות (Board/Profile) לקידום top-level במסמך
 * המסונכרן, כדי שחוקי Firestore יוכלו לאשר קריאה לפי ילד (D-01, approach A).
 * מחזיר undefined כשאין childId (למשל settings) — ואז השדה לא נכתב.
 */
function sharedChildId(data: unknown): string | undefined {
  if (data !== null && typeof data === 'object' && 'childId' in data) {
    const value = (data as { childId?: unknown }).childId;
    if (typeof value === 'string' && value !== '') return value;
  }
  return undefined;
}

export class FirebaseProvider implements SyncProvider {
  private _deviceId: string | null = null;

  isAvailable(): boolean {
    const { auth } = getFirebaseInstances();
    return auth.currentUser !== null && navigator.onLine;
  }

  async push(records: SyncRecord[]): Promise<void> {
    const { db, auth } = getFirebaseInstances();
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    await Promise.all(
      records.map((r) => {
        const ref = doc(db, 'users', uid, r.entityType, r.entityId);
        const childId = sharedChildId(r.versioned.data);
        return setDoc(ref, {
          ...r.versioned,
          entityType: r.entityType,
          entityId: r.entityId,
          ...(childId ? { childId } : {}),
        });
      }),
    );
  }

  async pull(since: number): Promise<SyncRecord[]> {
    const { db, auth } = getFirebaseInstances();
    const uid = auth.currentUser?.uid;
    if (!uid) return [];

    const entityTypes = ['board', 'profile', 'settings'] as const;
    const results: SyncRecord[] = [];

    for (const entityType of entityTypes) {
      const col = collection(db, 'users', uid, entityType);
      const q = query(col, where('updatedAt', '>', since));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const data = d.data();
        results.push({
          entityType,
          entityId: data.entityId as string,
          versioned: {
            data: data.data as unknown,
            version: data.version as number,
            updatedAt: data.updatedAt as number,
            deviceId: data.deviceId as string,
          } satisfies Versioned<unknown>,
        });
      }
    }
    return results;
  }

  getDeviceId(): string {
    return this._deviceId ?? 'firebase-device';
  }

  async signIn(email: string, password: string): Promise<string> {
    const { auth } = getFirebaseInstances();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    this._deviceId = await getDeviceId();
    return cred.user.uid;
  }

  async signUp(email: string, password: string): Promise<string> {
    const { auth } = getFirebaseInstances();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    this._deviceId = await getDeviceId();
    return cred.user.uid;
  }

  async signOut(): Promise<void> {
    const { auth } = getFirebaseInstances();
    await fbSignOut(auth);
  }

  getCurrentUid(): string | null {
    const { auth } = getFirebaseInstances();
    return auth.currentUser?.uid ?? null;
  }

  /** כניסה עם Google — wrapper נוחות (הלוגיקה המלאה ב-firebaseAuth.ts). */
  async signInWithGoogle(): Promise<string> {
    const { auth } = getFirebaseInstances();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    this._deviceId = await getDeviceId();
    return result.user.uid;
  }
}
