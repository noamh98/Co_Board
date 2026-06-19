import { ROLE_CAN_EDIT, type Role } from './models';

// בקרת גישה (RBAC) ושער מצב-עריכה. לוגיקה טהורה וניתנת-לבדיקה (ללא I/O).
// אינווריאנט (HANDOFF §4, PRD §4.5/§8.3): מצב ילד נעול כברירת מחדל; מעבר לעריכה
// רק בקוד מטפל (PIN). ה-PIN הוא שער MVP מקומי — לא אמצעי אבטחה קריפטוגרפי.

/** מצב המכשיר: ילד נעול מול מבוגר (אחרי קוד מטפל). */
export type AppMode = 'locked' | 'adult';

/** קוד מטפל ברירת-מחדל בהקמה ראשונה — המבוגר יכול לשנותו (M4). */
export const DEFAULT_PIN = '1234';

/** התפקיד שמקבל המבוגר עם פתיחת השער. הורה = יכול לערוך (RBAC). */
export const ADULT_ROLE: Role = 'parent';

/** האם תפקיד נתון רשאי לערוך תוכן (FR-027). */
export function canEdit(role: Role): boolean {
  return ROLE_CAN_EDIT[role];
}

/** ניהול פרופילים (מעבר/יצירה) זמין רק במצב מבוגר — נעול בקוד (PRD §4.5). */
export function canManageProfiles(mode: AppMode): boolean {
  return mode === 'adult';
}

/**
 * אימות קוד מטפל. השוואה פשוטה (trim) — שער MVP בלבד.
 * קלט/קוד ריקים נדחים תמיד כדי למנוע פתיחה בטעות.
 */
export function verifyPin(input: string, stored: string): boolean {
  const a = input.trim();
  const b = stored.trim();
  if (!a || !b) return false;
  return a === b;
}
