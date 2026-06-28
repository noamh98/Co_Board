"use strict";
// functions/src/acceptInvite.ts — Cloud Function: מימוש קוד שיתוף גישה לילד (B3).
// onCall — נגיש לכל משתמש מחובר; משתמש ב-Admin SDK ולכן עוקף את חוקי Firestore
// (המוזמן לעולם לא קורא את shareInvites/{code} ישירות — רק הבעלים יכול).
// זרימה: 1) טען shareInvites/{code} 2) ולידציה (קיים / לא פג / לא נוצל)
//        3) הענק childAccess/{childId}/members/{uid} 4) סמן used:true
//        5) החזר את רשומת הילד מ-users/{ownerUid}/children/{childId}.
// deploy: firebase deploy --only functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptInvite = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
exports.acceptInvite = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    // אימות: נדרשת כניסה (uid של המוזמן)
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'נדרשת כניסה');
    }
    const uid = request.auth.uid;
    const { code } = request.data;
    if (!code || typeof code !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'קוד שיתוף נדרש');
    }
    const db = (0, firestore_1.getFirestore)();
    const inviteRef = db.doc(`shareInvites/${code}`);
    const now = Date.now();
    // טרנזקציה אטומית: בדיקה + סימון used + הענקת גישה (מונע מימוש כפול / מרוץ).
    const child = await db.runTransaction(async (tx) => {
        const inviteSnap = await tx.get(inviteRef);
        if (!inviteSnap.exists) {
            throw new https_1.HttpsError('not-found', 'קוד שיתוף לא נמצא');
        }
        const invite = inviteSnap.data();
        if (invite.used === true) {
            throw new https_1.HttpsError('failed-precondition', 'קוד השיתוף כבר נוצל');
        }
        if (typeof invite.expiresAt === 'number' && invite.expiresAt < now) {
            throw new https_1.HttpsError('failed-precondition', 'קוד השיתוף פג תוקף');
        }
        const childRef = db.doc(`users/${invite.ownerUid}/children/${invite.childId}`);
        const childSnap = await tx.get(childRef);
        if (!childSnap.exists) {
            throw new https_1.HttpsError('not-found', 'רשומת הילד לא נמצאה');
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
            acceptedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return childSnap.data();
    });
    return child;
});
//# sourceMappingURL=acceptInvite.js.map