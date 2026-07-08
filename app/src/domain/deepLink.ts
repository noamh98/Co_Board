// domain/deepLink.ts — ניתוח קישור-עומק (deep link) של הזמנת גישה לילד (B-07).
// שכבת domain טהורה: מקבלת pathname+search, מחזירה יעד ניווט מובנה. נטולת תלות
// ב-DOM/רשת/framework — נייד verbatim לפורט Expo (react-navigation Linking / expo-router).
// שימוש חוזר ב-validators של domain/shareCode כדי לשמור מקור-אמת יחיד לפורמט הקוד.

import { isValidShareCode, normalizeShareCode } from './shareCode';

/** נתיב קאנוני של קישור הזמנה: /invite/<code>. */
export const INVITE_PATH_PREFIX = '/invite/';
/** שם פרמטר-השאילתה החלופי: ?invite=<code> (fallback לשיתוף שלא שומר path). */
export const INVITE_QUERY_KEY = 'invite';

/** יעד deep-link מסוג הזמנת גישה, עם קוד מנורמל ותקין (32 תווי hex). */
export interface InviteDeepLink {
  kind: 'invite';
  code: string;
}

/** איחוד יעדי ה-deep-link הנתמכים (כרגע: הזמנה בלבד). */
export type DeepLinkTarget = InviteDeepLink;

/**
 * מנתח deep-link להזמנת גישה. תומך בשתי צורות:
 *   1. נתיב:   /invite/<code>   (כולל / נגרר, hash, ורישיות מעורבת)
 *   2. שאילתה: ?invite=<code>   (fallback לשיתוף שלא שומר path)
 * מחזיר יעד מנורמל (code באותיות קטנות) רק אם הקוד תקין; אחרת null.
 */
export function parseInviteDeepLink(
  pathname: string,
  search = '',
): DeepLinkTarget | null {
  const candidate = extractPathCode(pathname) ?? extractQueryCode(search);
  if (candidate === null) return null;
  const code = normalizeShareCode(decodeSafe(candidate));
  return isValidShareCode(code) ? { kind: 'invite', code } : null;
}

/** בונה קישור-עומק מלא לשיתוף: <origin>/invite/<code>. origin ללא / נגרר. */
export function buildInviteLink(origin: string, code: string): string {
  const base = origin.replace(/\/+$/, '');
  return `${base}${INVITE_PATH_PREFIX}${normalizeShareCode(code)}`;
}

/** חילוץ הקטע שאחרי /invite/ בנתיב (case-insensitive), עד / או # או ?. */
function extractPathCode(pathname: string): string | null {
  const match = /\/invite\/([^/#?]+)/i.exec(pathname);
  return match?.[1] ?? null;
}

/** חילוץ ערך פרמטר invite= מתוך מחרוזת שאילתה גולמית. */
function extractQueryCode(search: string): string | null {
  const query = search.startsWith('?') ? search.slice(1) : search;
  if (!query) return null;
  for (const pair of query.split('&')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    if (pair.slice(0, eq).toLowerCase() === INVITE_QUERY_KEY) {
      return pair.slice(eq + 1);
    }
  }
  return null;
}

/** decodeURIComponent בטוח — מחזיר את הקלט המקורי אם הפענוח נכשל. */
function decodeSafe(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
