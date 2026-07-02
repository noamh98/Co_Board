// functions/src/acceptInvite.ts — Cloud Function: מימוש קוד שיתוף גישה לילד (B3).
// onCall — נגיש לכל משתמש מחובר; משתמש ב-Admin SDK ולכן עוקף את חוקי Firestore
// (המוזמן לעולם לא קורא את shareInvites/{code} ישירות — רק הבעלים יכול).
// זרימה: 1) טען shareInvites/{code} 2) ולידציה (קיים / לא פג / לא נוצל)
//        3) הענק childAccess/{childId}/members/{uid} 4) סמן used:true
//        5) החזר את רשומת הילד מ-users/{ownerUid}/children/{childId}.
// deploy: firebase deploy --only functions

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { FUNCTIONS_REGION, LEGACY_MIGRATED_REGIONS } from './region';

if (!getApps().length) initializeApp();

interface ShareInviteDoc {
  code: string;
  childId: string;
  ownerUid: string;
  role: 'parent' | 'clinician' | 'staff';
  createdAt: number;
  expiresAt: number;
  used?: boolean;
}

// defense-in-depth: role מועתק מההזמנה ל-childAccess — לא לכתוב ערך שרירותי
// שהגיע ממסמך שנוצר בלקוח (חוקי Firestore לא מוודאים את השדה ביצירה).
const ALLOWED_ROLES = new Set<ShareInviteDoc['role']>(['parent', 'clinician', 'staff']);

// 3.4: איחוד regions — פרוס גם ב-us-central1 (ישן) וגם ב-europe-west1 (חדש) בו-זמנית,
// כדי לא לשבור לקוחות/מטמון PWA שטרם התעדכנו. ראה region.ts.
export const acceptInvite = onCall(
  { region: [FUNCTIONS_REGION, ...LEGACY_MIGRATED_REGIONS] },
  async (request) => {
    // אימות: נדרשת כניסה (uid של המוזמן)
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'נדרשת כניסה');
    }
    const uid = request.auth.uid;

    const { code } = request.data as { code?: string };
    if (!code || typeof code !== 'string') {
      throw new HttpsError('invalid-argument', 'קוד שיתוף נדרש');
    }

    const db = getFirestore();
    const inviteRef = db.doc(`shareInvites/${code}`);
    const now = Date.now();

    // טרנזקציה אטומית: בדיקה + סימון used + הענקת גישה (מונע מימוש כפול / מרוץ).
    const child = await db.runTransaction(async (tx) => {
      const inviteSnap = await tx.get(inviteRef);
      if (!inviteSnap.exists) {
        throw new HttpsError('not-found', 'קוד שיתוף לא נמצא');
      }
      const invite = inviteSnap.data() as ShareInviteDoc;

      if (invite.used === true) {
        throw new HttpsError('failed-precondition', 'קוד השיתוף כבר נוצל');
      }
      if (typeof invite.expiresAt === 'number' && invite.expiresAt < now) {
        throw new HttpsError('failed-precondition', 'קוד השיתוף פג תוקף');
      }
      if (!ALLOWED_ROLES.has(invite.role)) {
        throw new HttpsError('failed-precondition', 'קוד השיתוף פגום');
      }

      const childRef = db.doc(`users/${invite.ownerUid}/children/${invite.childId}`);
      const childSnap = await tx.get(childRef);
      if (!childSnap.exists) {
        throw new HttpsError('not-found', 'רשומת הילד לא נמצאה');
      }

      // הענקת גישה ל-childAccess/{childId}/members/{uid}
      const memberRef = db.doc(`childAccess/${invite.childId}/members/${uid}`);
      tx.set(memberRef, {
        childId: invite.childId,
        uid,
        role: invite.role,
        grantedAt: now,
      });

      // סימון הקוד כמנוצל (חד-פעמי)
      tx.update(inviteRef, {
        used: true,
        acceptedBy: uid,
        acceptedAt: FieldValue.serverTimestamp(),
      });

      return childSnap.data();
    });

    return child;
  },
);
