// domain/shareCode.ts — ולידציה/נרמול של קוד שיתוף גישה לילד (D-01).
// הקוד נוצר ב-data/childRepo.generateShareCode: 16 בייטים אקראיים → 32 תווי hex.
// שכבת דומיין טהורה (ללא תלות ב-DOM/רשת) — ניתנת לבדיקה ולשימוש חוזר ב-UI.

/** אורך קוד השיתוף בתווים (16 בייטים = 32 תווי hex). */
export const SHARE_CODE_LENGTH = 32;

const SHARE_CODE_PATTERN = /^[0-9a-f]{32}$/;

/**
 * נרמול קלט משתמש: הסרת רווחים (כולל פנימיים) והמרה לאותיות קטנות.
 * מאפשר הדבקה נוחה של הקוד גם אם נוספו רווחים/שורה חדשה.
 */
export function normalizeShareCode(raw: string): string {
  return raw.replace(/\s+/g, '').toLowerCase();
}

/** סינון קלט לתווי hex בלבד, חתוך לאורך הקוד — לשימוש ב-onChange של שדה קלט. */
export function sanitizeShareCodeInput(raw: string): string {
  return raw.toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, SHARE_CODE_LENGTH);
}

/** האם המחרוזת היא קוד שיתוף תקין (32 תווי hex, לאחר נרמול). */
export function isValidShareCode(raw: string): boolean {
  return SHARE_CODE_PATTERN.test(normalizeShareCode(raw));
}
