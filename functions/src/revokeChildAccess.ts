// functions/src/revokeChildAccess.ts — Cloud Function: ביטול גישת-ילד (D-05).
// onCall — נגיש לכל משתמש מחובר; משתמש ב-Admin SDK ולכן עוקף חוקי Firestore.
// זרימה: 1) אימות כניסה 2) ולידציה של childId + memberUid
//        3) הרשאה: רק בעלי הילד (מי שמחזיק users/{caller}/children/{childId}) רשאי לבטל
//        4) מחיקת childAccess/{childId}/members/{memberUid}.
// אבטחה: מונע privilege-escalation (חבר רגיל לא יכול לבטל אחרים), ומונע self-lockout
//        של הבעלים (אי-אפשר לבטל את גישתך). מטפל ב-R-08 (over-access קליני).
// deploy: firebase deploy --only functions

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FUNCTIONS_REGION, LEGACY_MIGRATED_REGIONS } from './region';
import { writeAuditEntry } from './auditLog';

if (!getApps().length) initializeApp();

// 3.4: איחוד regions — פרוס גם ב-us-central1 (ישן) וגם ב-europe-west1 (חדש) בו-זמנית,
// כדי לא לשבור לקוחות/מטמון PWA שטרם התעדכנו. ראה region.ts.
export const revokeChildAccess = onCall(
  { region: [FUNCTIONS_REGION, ...LEGACY_MIGRATED_REGIONS] },
  async (request) => {
    // אימות: נדרשת כניסה (uid של הבעלים המבקש)
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'נדרשת כניסה');
    }
    const callerUid = request.auth.uid;

    const { childId, memberUid } = request.data as {
      childId?: string;
      memberUid?: string;
    };
    if (!childId || typeof childId !== 'string') {
      throw new HttpsError('invalid-argument', 'childId נדרש');
    }
    if (!memberUid || typeof memberUid !== 'string') {
      throw new HttpsError('invalid-argument', 'memberUid נדרש');
    }
    // מונע self-lockout: הבעלים אינו יכול לבטל את גישת עצמו דרך הפונקציה.
    if (memberUid === callerUid) {
      throw new HttpsError('failed-precondition', 'לא ניתן לבטל את גישת הבעלים');
    }

    const db = getFirestore();

    // הרשאה: רק בעלי הילד (מי שמחזיק users/{caller}/children/{childId}) רשאי לבטל.
    // חבר רגיל (clinician/staff) — גם אם מחזיק childAccess — אינו רשאי לבטל אחרים.
    const ownerChildSnap = await db.doc(`users/${callerUid}/children/${childId}`).get();
    if (!ownerChildSnap.exists) {
      throw new HttpsError('permission-denied', 'רק הבעלים של הילד רשאי לבטל גישה');
    }

    // מחיקה אידמפוטנטית — מחיקת חבר שכבר אינו קיים אינה שגיאה.
    await db.doc(`childAccess/${childId}/members/${memberUid}`).delete();

    // D-08: רשומת ביקורת — ביטול גישה. owner-scoped (ownerUid = הבעלים המבקש)
    // כדי שהבעלים יוכל לקרוא "מי איבד/ניגש לנתוני הילד". ללא PII (uids/childId בלבד).
    await writeAuditEntry(db, {
      action: 'access.revoke',
      actorUid: callerUid,
      targetUid: memberUid,
      childId,
      ownerUid: callerUid,
    });

    return { success: true, childId, memberUid };
  },
);
