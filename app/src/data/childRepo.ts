// data/childRepo.ts — ניהול תתי-פרופילי ילד ב-Firestore (2B).
// Schema: users/{uid}/children/{childId}
// childAccess: childAccess/{childId}/members/{uid}
// אינווריאנט: מחיקה = archivedAt (לא הסרה).

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
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
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseConfig } from './firebaseEnv';
import type { ProfilePreferences } from '../domain/models';
import { FUNCTIONS_REGION } from '../services/functionsRegion';

export interface ChildRecord {
  childId: string;
  name: string;
  age?: number;
  preferences?: ProfilePreferences;
  homeBoardId?: string;
  createdAt: number;
  /** null = פעיל (נכתב במפורש כדי שהשאילתה archivedAt==null תתפוס ילדים חדשים, A5). */
  archivedAt?: number | null;
}

export type ChildAccessRole = 'parent' | 'clinician' | 'staff';

export interface ChildAccessEntry {
  childId: string;
  uid: string;
  role: ChildAccessRole;
  grantedAt: number;
  /** פקיעת גישה אופציונלית (D-05) — millis. היעדר/0 = גישה קבועה; ערך בעבר = פקע. */
  expiresAt?: number;
}

/** קוד שיתוף גישה לילד. חד-פעמי (used) + פג-תוקף (expiresAt). */
export interface ShareInvite {
  code: string;
  childId: string;
  ownerUid: string;
  role: ChildAccessRole;
  createdAt: number;
  expiresAt: number;
  /** חד-פעמי — מסומן true לאחר מימוש (B3). */
  used: boolean;
}

function getApp(): FirebaseApp {
  // G2: ולידציית env (getFirebaseConfig) — שגיאה ברורה אם חסר משתנה סביבה.
  return getApps()[0] ?? initializeApp(getFirebaseConfig());
}

function getDb(): Firestore {
  return getFirestore(getApp());
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
    // A5: כתיבה מפורשת של null — אחרת listChildren (where archivedAt==null) מחזיר ריק.
    archivedAt: null,
  };
  await saveChild(uid, child);
  // הוסף גישה לבעלים (parent)
  await grantChildAccess(childId, uid, 'parent');
  return child;
}

// ── childAccess ────────────────────────────────────────────────

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

/**
 * ביטול גישת חבר לילד (D-05). מתבצע דרך Cloud Function revokeChildAccess
 * (Admin SDK) — הבעלים אינו כותב ישירות ל-childAccess של חבר אחר בחוקים
 * (owner-only write נשמר; המחיקה עוקפת חוקים בצד השרת עם אימות בעלות).
 */
export async function revokeChildAccess(
  childId: string,
  memberUid: string,
): Promise<void> {
  const call = httpsCallable<{ childId: string; memberUid: string }, { success: boolean }>(
    getFunctions(getApp(), FUNCTIONS_REGION),
    'revokeChildAccess',
  );
  await call({ childId, memberUid });
}

// ── Share Invites ──────────────────────────────────────────────

const TTL_48H = 48 * 60 * 60 * 1000;

/** קוד אקראי חזק (128 ביט, hex) מ-crypto.getRandomValues — לא נחזה (B3, מחליף 6 ספרות Math.random). */
function generateShareCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createShareInvite(
  childId: string,
  ownerUid: string,
  role: ChildAccessRole = 'clinician',
): Promise<ShareInvite> {
  const code = generateShareCode();
  const invite: ShareInvite = {
    code,
    childId,
    ownerUid,
    role,
    createdAt: Date.now(),
    expiresAt: Date.now() + TTL_48H,
    used: false,
  };
  // read owner-only ב-rules; הקריאה (accept) נעשית דרך Cloud Function בלבד.
  await setDoc(doc(getDb(), 'shareInvites', code), invite);
  return invite;
}

export async function acceptShareInvite(
  code: string,
  uid: string,
): Promise<ChildRecord | null> {
  // B3: מימוש דרך Cloud Function "acceptInvite" (Admin SDK) — קריאה ישירה ל-shareInvites
  // חסומה ב-rules (owner-only). השרת מאמת פג-תוקף+חד-פעמיות, מעניק גישה, ומסמן used=true.
  // uid נלקח בצד השרת מ-context.auth; נשמר בחתימה לתאימות קוראים/בדיקות.
  void uid;
  // 3.4: acceptInvite עברה ל-europe-west1 (עדיין נגישה גם ב-us-central1 עד מחיקה ידנית).
  const call = httpsCallable<{ code: string }, ChildRecord | null>(
    getFunctions(getApp(), FUNCTIONS_REGION),
    'acceptInvite',
  );
  const res = await call({ code });
  return res.data ?? null;
}
