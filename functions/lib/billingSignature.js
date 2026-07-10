"use strict";
// functions/src/billingSignature.ts — אימות חתימת webhook תואם-Stripe, טהור וניתן-לבדיקה.
// ללא תלות ב-firebase (אין initializeApp/I/O) כדי שהבדיקה תייבא רק את הפונקציה הטהורה.
// scheme: `t=<ts>,v1=<hmac>`; HMAC-SHA256 של `${t}.${payload}` עם סוד ה-webhook.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIGNATURE_TOLERANCE_SEC = void 0;
exports.verifyStripeSignature = verifyStripeSignature;
const node_crypto_1 = require("node:crypto");
/** סובלנות-זמן מרבית בין חותמת-הזמן בחתימה לזמן-השרת (מונע replay), בשניות. */
exports.SIGNATURE_TOLERANCE_SEC = 300;
/** משווה שני מחרוזות-hex בזמן-קבוע. false אם אורכים שונים (לא זורק). */
function timingSafeEqualHex(a, b) {
    if (a.length !== b.length)
        return false;
    try {
        return (0, node_crypto_1.timingSafeEqual)(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
    }
    catch {
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
function verifyStripeSignature(payload, sigHeader, secret, nowSec = Math.floor(Date.now() / 1000)) {
    if (!sigHeader || !secret)
        return false;
    let timestamp = '';
    const v1 = [];
    for (const part of sigHeader.split(',')) {
        const idx = part.indexOf('=');
        if (idx === -1)
            continue;
        const key = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        if (key === 't')
            timestamp = value;
        else if (key === 'v1')
            v1.push(value);
    }
    if (!timestamp || v1.length === 0)
        return false;
    const ts = Number(timestamp);
    if (!Number.isFinite(ts))
        return false;
    if (Math.abs(nowSec - ts) > exports.SIGNATURE_TOLERANCE_SEC)
        return false;
    const expected = (0, node_crypto_1.createHmac)('sha256', secret)
        .update(`${timestamp}.${payload}`, 'utf8')
        .digest('hex');
    return v1.some((candidate) => timingSafeEqualHex(candidate, expected));
}
//# sourceMappingURL=billingSignature.js.map