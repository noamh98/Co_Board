// functions/src/approveUser.ts — Cloud Function: אישור/דחיית משתמש (2A).
// onCall — נגיש רק למשתמשים עם custom claim admin:true.
// מבצע: 1) setCustomUserClaims (approved: true/false) 2) עדכון Firestore status.
// deploy: firebase deploy --only functions

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) initializeApp();

export const approveUser = onCall(
  { region: 'us-central1' },
  async (request) => {
    // אימות: רק admin
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'נדרשת כניסה');
    }
    if (!request.auth.token['admin']) {
      throw new HttpsError('permission-denied', 'נדרשות הרשאות מנהל');
    }

    const { uid, status } = request.data as { uid: string; status: 'approved' | 'rejected' };

    if (!uid || !['approved', 'rejected'].includes(status)) {
      throw new HttpsError('invalid-argument', 'uid ו-status נדרשים');
    }

    // עדכן custom claims
    const claims = status === 'approved'
      ? { approved: true }
      : { approved: false };
    await getAuth().setCustomUserClaims(uid, claims);

    // עדכן Firestore
    await getFirestore().doc(`users/${uid}`).update({
      status,
      reviewedAt: FieldValue.serverTimestamp(),
    });

    return { success: true, uid, status };
  },
);
