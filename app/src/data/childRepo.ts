// data/childRepo.ts — ניהול תתי-פרופילי ילד ב-Firestore (2B).
// Schema: users/{uid}/children/{childId}
// childAccess: childAccess/{childId}/members/{uid}
// אינווריאנט: מחיקה = archivedAt (לא הסרה).

import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  type Firestore,
} from 'firebase/firestore';
import type { ProfilePreferences } from '../domain/models';

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

export interface ChildRecord {
  childId: string;
  name: string;
  age?: number;
  preferences?: ProfilePreferences;
  homeBoardId?: string;
  createdAt: number;
  archivedAt?: number;
}

export type ChildAccessRole = 'parent' | 'clinician' | 'staff';

export interface ChildAccessEntry {
  childId: string;
  uid: string;
  role: ChildAccessRole;
  grantedAt: number;
}

/** קוד שיתוף גישה לילד. */
export interface ShareInvite {
  code: string;
  childId: string;
  ownerUid: string;
  role: ChildAccessRole;
  createdAt: number;
  expiresAt: number;
}

function getDb(): Firestore {
  const existing = getApps()[0];
  const app = existing ?? initializeApp(FIREBASE_CONFIG);
  return getFirestore(app);
}

function childPath(uid: string, childId: string) {
  return doc(getDb(), 'users', uid, 'children', childId);
}

export async function getChild(uid: string, childId: string): Promise<ChildRecord | null> {
  const snap = await getDoc(childPath(uid, childId));
  if (!snap.exists()) return null;
  return snap.data() as ChildRecord;
}

export async function saveChild(uid: string, child: ChildRecord): Promise<void> {
  await setDoc(childPath(uid, child.childId), child);
}

export async function listChildren(uid: string): Promise<ChildRecord[]> {
  const col = collection(getDb(), 'users', uid, 'children');
  const q = query(col, where('archivedAt', '==', null));
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ChildRecord);
  } catch {
    // אם השאילתה נכשלת (offline), מחזיר רשימה ריקה חיננית
    return [];
  }
}

export async function archiveChild(uid: string, childId: string): Promise<void> {
  const ref = childPath(uid, childId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as ChildRecord;
  await setDoc(ref, { ...data, archivedAt: Date.now() });
}

export async function createChild(
  uid: string,
  name: string,
  age?: number,
  preferences?: ProfilePreferences,
  homeBoardId?: string,
): Promise<ChildRecord> {
  const childId = crypto.randomUUID();
  const child: ChildRecord = {
    childId,
    name,
    age,
    preferences,
    homeBoardId,
    createdAt: Date.now(),
  };
  await saveChild(uid, child);
  // הוסף גישה לבעלים (parent)
  await grantChildAccess(childId, uid, 'parent');
  return child;
}

// ── childAccess ──────────────────────────────────────────

async function grantChildAccess(
  childId: string,
  uid: string,
  role: ChildAccessRole,
): Promise<void> {
  const ref = doc(getDb(), 'childAccess', childId, 'members', uid);
  const entry: ChildAccessEntry = {
    childId,
    uid,
    role,
    grantedAt: Date.now(),
  };
  await setDoc(ref, entry);
}

export async function getChildAccessEntries(childId: string): Promise<ChildAccessEntry[]> {
  const col = collection(getDb(), 'childAccess', childId, 'members');
  try {
    const snap = await getDocs(col);
    return snap.docs.map((d) => d.data() as ChildAccessEntry);
  } catch {
    return [];
  }
}

// ── Share Invites ─────────────────────────────────────────

const TTL_48H = 48 * 60 * 60 * 1000;

export async function createShareInvite(
  childId: string,
  ownerUid: string,
  role: ChildAccessRole = 'clinician',
): Promise<ShareInvite> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const invite: ShareInvite = {
    code,
    childId,
    ownerUid,
    role,
    createdAt: Date.now(),
    expiresAt: Date.now() + TTL_48H,
  };
  await setDoc(doc(getDb(), 'shareInvites', code), invite);
  return invite;
}

export async function acceptShareInvite(
  code: string,
  uid: string,
): Promise<ChildRecord | null> {
  const ref = doc(getDb(), 'shareInvites', code);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('קוד שיתוף לא נמצא');
  const invite = snap.data() as ShareInvite;
  if (Date.now() > invite.expiresAt) throw new Error('קוד השיתוף פג תוקף');
  await grantChildAccess(invite.childId, uid, invite.role);
  // הצטרף גם ל-children של הבעלים
  const child = await getChild(invite.ownerUid, invite.childId);
  return child;
}
