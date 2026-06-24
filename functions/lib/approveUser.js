"use strict";
// functions/src/approveUser.ts — Cloud Function: אישור/דחיית משתמש (2A).
// onCall — נגיש רק למשתמשים עם custom claim admin:true.
// מבצע: 1) setCustomUserClaims (approved: true/false) 2) עדכון Firestore status.
// deploy: firebase deploy --only functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveUser = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
exports.approveUser = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    // אימות: רק admin
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'נדרשת כניסה');
    }
    if (!request.auth.token['admin']) {
        throw new https_1.HttpsError('permission-denied', 'נדרשות הרשאות מנהל');
    }
    const { uid, status } = request.data;
    if (!uid || !['approved', 'rejected'].includes(status)) {
        throw new https_1.HttpsError('invalid-argument', 'uid ו-status נדרשים');
    }
    // עדכן custom claims
    const claims = status === 'approved'
        ? { approved: true }
        : { approved: false };
    await (0, auth_1.getAuth)().setCustomUserClaims(uid, claims);
    // עדכן Firestore
    await (0, firestore_1.getFirestore)().doc(`users/${uid}`).update({
        status,
        reviewedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true, uid, status };
});
//# sourceMappingURL=approveUser.js.map