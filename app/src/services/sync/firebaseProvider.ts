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
  signOut as fbSignOut,
  type Auth,
} from 'firebase/auth';
import type { SyncProvider, SyncRecord } from './syncProvider';
import type { Versioned } from '../../domain/sync';
import { getDeviceId } from './crypto';

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

function getFirebaseInstances(): { db: Firestore; auth: Auth } {
  if (!_app) {
    _app = initializeApp(FIREBASE_CONFIG);
    _db = getFirestore(_app);
    _auth = getAuth(_app);
  }
  return { db: _db!, auth: _auth! };
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
        return setDoc(ref, {
          ...r.versioned,
          entityType: r.entityType,
          entityId: r.entityId,
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

  async signOut(): Promise<void> {
    const { auth } = getFirebaseInstances();
    await fbSignOut(auth);
  }

  getCurrentUid(): string | null {
    const { auth } = getFirebaseInstances();
    return auth.currentUser?.uid ?? null;
  }
}
