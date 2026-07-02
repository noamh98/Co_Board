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
const region_1 = require("./region");
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
// 3.4: איחוד regions — פרוס גם ב-us-central1 (ישן) וגם ב-europe-west1 (חדש) בו-זמנית,
// כדי לא לשבור לקוחות/מטמון PWA שטרם התעדכנו. ראה region.ts.
exports.approveUser = (0, https_1.onCall)({ region: [region_1.FUNCTIONS_REGION, ...region_1.LEGACY_MIGRATED_REGIONS] }, async (request) => {
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
    // עדכן custom claims — מיזוג עם claims קיימים כדי לא לדרוס (למשל admin).
    const existingUser = await (0, auth_1.getAuth)().getUser(uid);
    const existingClaims = existingUser.customClaims ?? {};
    const claims = {
        ...existingClaims,
        approved: status === 'approved',
    };
    await (0, auth_1.getAuth)().setCustomUserClaims(uid, claims);
    // עדכן Firestore
    await (0, firestore_1.getFirestore)().doc(`users/${uid}`).update({
        status,
        reviewedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true, uid, status };
});
//# sourceMappingURL=approveUser.js.map