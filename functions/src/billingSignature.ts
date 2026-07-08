// functions/src/billingSignature.ts — אימות חתימת webhook תואם-Stripe, טהור וניתן-לבדיקה.
// ללא תלות ב-firebase (אין initializeApp/I/O) כדי שהבדיקה תייבא רק את הפונקציה הטהורה.
// scheme: `t=<ts>,v1=<hmac>`; HMAC-SHA256 של `${t}.${payload}` עם סוד ה-webhook.

import { createHmac, timingSafeEqual } from 'node:crypto';

/** סובלנות-זמן מרבית בין חותמת-הזמן בחתימה לזמן-השרת (מונע replay), בשניות. */
export const SIGNATURE_TOLERANCE_SEC = 300;

/** משווה שני מחרוזות-hex בזמן-קבוע. false אם אורכים שונים (לא זורק). */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

/**
 * אימות חתימת webhook תואמת-Stripe. טהור וניתן-לבדיקה (ללא I/O).
 * @param payload   גוף-הבקשה הגולמי (raw), כמחרוזת בדיוק כפי שנשלח.
 * @param sigHeader ערך הכותרת `Stripe-Signature` (`t=...,v1=...[,v1=...]`).
 * @param secret    סוד ה-webhook (whsec_...).
 * @param nowSec    זמן נוכחי בשניות (להזרקה בבדיקות; ברירת-מחדל = עכשיו).
 * @returns true רק אם קיים v1 תקין וחותמת-הזמן בתוך הסובלנות.
 */
export function verifyStripeSignature(
  payload: string,
  sigHeader: string | undefined,
  secret: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!sigHeader || !secret) return false;

  let timestamp = '';
  const v1: string[] = [];
  for (const part of sigHeader.split(',')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === 't') timestamp = value;
    else if (key === 'v1') v1.push(value);
  }
  if (!timestamp || v1.length === 0) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(nowSec - ts) > SIGNATURE_TOLERANCE_SEC) return false;

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`, 'utf8')
    .digest('hex');

  return v1.some((candidate) => timingSafeEqualHex(candidate, expected));
}
