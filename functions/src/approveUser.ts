// functions/src/approveUser.ts — Cloud Function: אישור/דחיית משתמש (2A).
// onCall — נגיש רק למשתמשים עם custom claim admin:true.
// מבצע: 1) setCustomUserClaims (approved: true/false) 2) עדכון Firestore status.
// deploy: firebase deploy --only functions

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { FUNCTIONS_REGION, LEGACY_MIGRATED_REGIONS } from './region';
import { writeAuditEntry } from './auditLog';

if (!getApps().length) initializeApp();

// 3.4: איחוד regions — פרוס גם ב-us-central1 (ישן) וגם ב-europe-west1 (חדש) בו-זמנית,
// כדי לא לשבור לקוחות/מטמון PWA שטרם התעדכנו. ראה region.ts.
export const approveUser = onCall(
  { region: [FUNCTIONS_REGION, ...LEGACY_MIGRATED_REGIONS] },
  async (request) => {
    // אימות: רק admin
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'נדרשת כניסה');
    }
    if (!request.auth.token['admin']) {
      throw new HttpsError('permission-denied', 'נדרשות הרשאות מנהל');
    }
    const adminUid = request.auth.uid;

    const { uid, status } = request.data as { uid: string; status: 'approved' | 'rejected' };

    if (!uid || !['approved', 'rejected'].includes(status)) {
      throw new HttpsError('invalid-argument', 'uid ו-status נדרשים');
    }

    // עדכן custom claims — מיזוג עם claims קיימים כדי לא לדרוס (למשל admin).
    const existingUser = await getAuth().getUser(uid);
    const existingClaims = existingUser.customClaims ?? {};
    const claims = {
      ...existingClaims,
      approved: status === 'approved',
    };
    await getAuth().setCustomUserClaims(uid, claims);

    // עדכן Firestore
    const db = getFirestore();
    await db.doc(`users/${uid}`).update({
      status,
      reviewedAt: FieldValue.serverTimestamp(),
    });

    // D-08: רשומת ביקורת — אישור/דחיית חשבון. פעולת-אדמין ללא ownerUid ⇒ קריאה ל-Admin
    // בלבד (ראה firestore.rules). ללא PII (uids בלבד).
    await writeAuditEntry(db, {
      action: status === 'approved' ? 'user.approve' : 'user.reject',
      actorUid: adminUid,
      targetUid: uid,
    });

    return { success: true, uid, status };
  },
);
