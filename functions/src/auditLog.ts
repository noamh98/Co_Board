// functions/src/auditLog.ts — יומן ביקורת לפעולות המשפיעות על גישה (D-08).
// כל Cloud Function שמעניק/מבטל גישת-ילד או משנה סטטוס חשבון כותב רשומת auditLog
// דרך Admin SDK (עוקף חוקי Firestore). התוכן נטול-PII: מזהי uid/childId/role בלבד —
// ללא שמות ילדים וללא קודי-שיתוף. נחשף לקריאה-בלבד: לבעלים (ownerUid) או Admin
// (ראה firebase/firestore.rules). רשומה ללא ownerUid ניתנת לקריאה ל-Admin בלבד.

import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';

/** סוגי הפעולות המבוקרות. מרחיבים כאן בלבד — ערכים סגורים לצורך אחידות שאילתות. */
export type AuditAction =
  | 'access.grant'
  | 'access.revoke'
  | 'user.approve'
  | 'user.reject';

export interface AuditEntryInput {
  /** הפעולה שבוצעה. */
  action: AuditAction;
  /** מי ביצע את הפעולה (uid מאומת). */
  actorUid: string;
  /** מושא הפעולה (uid החבר שהושפע), אם רלוונטי. */
  targetUid?: string;
  /** הילד שאליו נוגעת הפעולה, אם רלוונטי. */
  childId?: string;
  /** בעלי המשאב — קובע מי רשאי לקרוא את הרשומה. ללא ערך = Admin בלבד. */
  ownerUid?: string;
  /** התפקיד שהוענק, אם רלוונטי. */
  role?: string;
}

/** בונה מסמך רשומה: שדות אופציונליים מושמטים כדי לא לכתוב undefined. */
function buildEntry(input: AuditEntryInput): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    action: input.action,
    actorUid: input.actorUid,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (input.targetUid !== undefined) entry.targetUid = input.targetUid;
  if (input.childId !== undefined) entry.childId = input.childId;
  if (input.ownerUid !== undefined) entry.ownerUid = input.ownerUid;
  if (input.role !== undefined) entry.role = input.role;
  return entry;
}

/**
 * כתיבת רשומת ביקורת בתוך טרנזקציה — אטומית עם הפעולה המבוקרת:
 * אם הטרנזקציה נכשלת, גם הרשומה לא נכתבת (ולהיפך). מזהה-מסמך אקראי.
 */
export function writeAuditEntryInTransaction(
  db: Firestore,
  tx: Transaction,
  input: AuditEntryInput,
): void {
  tx.set(db.collection('auditLog').doc(), buildEntry(input));
}

/** כתיבת רשומת ביקורת עצמאית (מחוץ לטרנזקציה), לאחר שהפעולה הצליחה. */
export async function writeAuditEntry(db: Firestore, input: AuditEntryInput): Promise<void> {
  await db.collection('auditLog').doc().set(buildEntry(input));
}
