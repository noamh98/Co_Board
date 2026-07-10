"use strict";
// functions/src/auditLog.ts — יומן ביקורת לפעולות המשפיעות על גישה (D-08).
// כל Cloud Function שמעניק/מבטל גישת-ילד או משנה סטטוס חשבון כותב רשומת auditLog
// דרך Admin SDK (עוקף חוקי Firestore). התוכן נטול-PII: מזהי uid/childId/role בלבד —
// ללא שמות ילדים וללא קודי-שיתוף. נחשף לקריאה-בלבד: לבעלים (ownerUid) או Admin
// (ראה firebase/firestore.rules). רשומה ללא ownerUid ניתנת לקריאה ל-Admin בלבד.
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditEntryInTransaction = writeAuditEntryInTransaction;
exports.writeAuditEntry = writeAuditEntry;
const firestore_1 = require("firebase-admin/firestore");
/** בונה מסמך רשומה: שדות אופציונליים מושמטים כדי לא לכתוב undefined. */
function buildEntry(input) {
    const entry = {
        action: input.action,
        actorUid: input.actorUid,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    };
    if (input.targetUid !== undefined)
        entry.targetUid = input.targetUid;
    if (input.childId !== undefined)
        entry.childId = input.childId;
    if (input.ownerUid !== undefined)
        entry.ownerUid = input.ownerUid;
    if (input.role !== undefined)
        entry.role = input.role;
    return entry;
}
/**
 * כתיבת רשומת ביקורת בתוך טרנזקציה — אטומית עם הפעולה המבוקרת:
 * אם הטרנזקציה נכשלת, גם הרשומה לא נכתבת (ולהיפך). מזהה-מסמך אקראי.
 */
function writeAuditEntryInTransaction(db, tx, input) {
    tx.set(db.collection('auditLog').doc(), buildEntry(input));
}
/** כתיבת רשומת ביקורת עצמאית (מחוץ לטרנזקציה), לאחר שהפעולה הצליחה. */
async function writeAuditEntry(db, input) {
    await db.collection('auditLog').doc().set(buildEntry(input));
}
//# sourceMappingURL=auditLog.js.map