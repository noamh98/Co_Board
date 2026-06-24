// services/sync/firebaseAuth.ts — פעולות Auth מורחבות (Firebase-specific).
// כל שאר ה-Auth (signIn/signUp/signOut) נשאר ב-authService + SyncProvider.
// מודול זה: Google OAuth · email verification · user status · admin approval.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendEmailVerification,
  onAuthStateChanged,
  signOut as fbSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface UserRecord {
  uid: string;
  email: string;
  displayName: string;
  status: UserStatus;
  createdAt: number;
}

function getFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  const existing = getApps()[0];
  const app = existing ?? initializeApp(FIREBASE_CONFIG);
  return { app, auth: getAuth(app), db: getFirestore(app) };
}

/** כניסה עם Google (popup, fallback redirect). */
export async function signInWithGoogle(): Promise<{
  uid: string;
  email: string;
  displayName?: string;
  isNewUser: boolean;
}> {
  const { auth } = getFirebase();
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');

  try {
    const result = await signInWithPopup(auth, provider);
    const isNew = !!result.user.metadata.creationTime &&
      result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
    return {
      uid: result.user.uid,
      email: result.user.email ?? '',
      displayName: result.user.displayName ?? undefined,
      isNewUser: isNew,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // popup חסום → עבור ל-redirect
    if (msg.includes('popup-blocked') || msg.includes('cancelled-popup-request')) {
      const { auth: a2 } = getFirebase();
      await signInWithRedirect(a2, new GoogleAuthProvider());
      // getRedirectResult ייקרא בטעינה הבאה
      return { uid: '', email: '', isNewUser: false };
    }
    throw err;
  }
}

/** בדיקת תוצאת Redirect (קרא בעת טעינת הדף). */
export async function checkRedirectResult(): Promise<{
  uid: string;
  email: string;
  displayName?: string;
} | null> {
  const { auth } = getFirebase();
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    return {
      uid: result.user.uid,
      email: result.user.email ?? '',
      displayName: result.user.displayName ?? undefined,
    };
  } catch {
    return null;
  }
}

/** שלח אימות מייל למשתמש המחובר הנוכחי. */
export async function sendVerificationEmail(): Promise<void> {
  const { auth } = getFirebase();
  if (!auth.currentUser) throw new Error('אין משתמש מחובר');
  await sendEmailVerification(auth.currentUser);
}

/** האם האימייל של המשתמש הנוכחי מאומת? */
export function isEmailVerified(): boolean {
  const { auth } = getFirebase();
  return auth.currentUser?.emailVerified ?? false;
}

/** האם יש למשתמש admin claim? */
export async function getAdminClaim(): Promise<boolean> {
  const { auth } = getFirebase();
  if (!auth.currentUser) return false;
  const tokenResult = await auth.currentUser.getIdTokenResult();
  return tokenResult.claims['admin'] === true;
}

/** קרא את status מ-Firestore users/{uid}. */
export async function getUserStatus(uid: string): Promise<UserStatus | null> {
  const { db } = getFirebase();
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return (snap.data()['status'] as UserStatus) ?? null;
  } catch {
    return null;
  }
}

/** צור רשומת משתמש ב-Firestore עם status='pending'. */
export async function createUserRecord(
  uid: string,
  name: string,
  email: string,
): Promise<void> {
  const { db } = getFirebase();
  const ref = doc(db, 'users', uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return;
  await setDoc(ref, {
    uid,
    displayName: name,
    email,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

/** קבל רשימת users בסטטוס pending (אדמין בלבד). */
export async function getPendingUsers(): Promise<UserRecord[]> {
  const { db } = getFirebase();
  const q = query(collection(db, 'users'), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      email: (data['email'] as string) ?? '',
      displayName: (data['displayName'] as string) ?? '',
      status: 'pending',
      createdAt: (data['createdAt'] as { toMillis(): number } | null)?.toMillis() ?? 0,
    };
  });
}

/** אשר/דחה משתמש — קריאה ל-Cloud Function approveUser (אדמין בלבד). */
export async function setUserStatusViaFunction(
  uid: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  const { app } = getFirebase();
  const fns = getFunctions(app, 'us-central1');
  const approveUser = httpsCallable(fns, 'approveUser');
  await approveUser({ uid, status });
}

/** האזן לשינויי auth state — מחזיר פונקציית unsubscribe. */
export function onFirebaseAuthChange(
  cb: (user: User | null) => void,
): () => void {
  const { auth } = getFirebase();
  return onAuthStateChanged(auth, cb);
}

/** יציאה מ-Firebase Auth. */
export async function signOutFirebase(): Promise<void> {
  const { auth } = getFirebase();
  await fbSignOut(auth);
}
