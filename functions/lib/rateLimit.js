"use strict";
// functions/src/rateLimit.ts — מגביל-קצב פר-uid (fixed-window) מעל Firestore.
// משותף ל-ttsProxy ו-aiBoard. מטרה: חסימת חיוב בלתי-מוגבל אם מפתח/טוקן דולף.
// Ponytail: fixed-window אטומי בטרנזקציה אחת — מינימום שעובד, בלי תלות חיצונית.
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceRateLimit = enforceRateLimit;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
/**
 * אוכף מכסה פר-uid לפעולה נתונה. זורק HttpsError('resource-exhausted') כשחורגים.
 * המסמך: `rateLimits/{uid}__{action}` עם { windowStart, count }.
 * חלון קבוע (fixed-window): פשוט, אטומי, ומספיק להגנת-חיוב (לא נדרש sliding מדויק).
 */
async function enforceRateLimit(uid, action, opts, db = (0, firestore_1.getFirestore)()) {
    const ref = db.doc(`rateLimits/${uid}__${action}`);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const now = Date.now();
        const data = snap.exists
            ? snap.data()
            : undefined;
        if (!data || now - data.windowStart >= opts.windowMs) {
            // חלון חדש — אפס מונה.
            tx.set(ref, { windowStart: now, count: 1 });
            return;
        }
        if (data.count >= opts.max) {
            throw new https_1.HttpsError('resource-exhausted', 'חרגת ממכסת השימוש. נסה שוב בעוד מספר רגעים.');
        }
        tx.update(ref, { count: data.count + 1 });
    });
}
//# sourceMappingURL=rateLimit.js.map