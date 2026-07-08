// functions/test/billingWebhook.test.ts — בדיקות אימות חתימת ה-webhook (2.5 / B-02).
// בודק את הפונקציה הטהורה verifyStripeSignature ללא emulator/רשת.
// דגש-אבטחה: חתימה חסרה/שגויה/מזויפת/ישנה חייבת להידחות לפני כל כתיבה.

import { createHmac } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { verifyStripeSignature, SIGNATURE_TOLERANCE_SEC } from '../src/billingWebhook';

const SECRET = 'whsec_test_secret';
const PAYLOAD = JSON.stringify({ type: 'checkout.session.completed', id: 'evt_1' });

/** בונה כותרת Stripe-Signature תקינה עבור payload/secret/ts נתונים. */
function sign(payload: string, secret: string, ts: number): string {
  const hmac = createHmac('sha256', secret).update(`${ts}.${payload}`, 'utf8').digest('hex');
  return `t=${ts},v1=${hmac}`;
}

describe('verifyStripeSignature', () => {
  const now = 1_700_000_000;

  it('accepts a fresh, correctly-signed payload', () => {
    const header = sign(PAYLOAD, SECRET, now);
    expect(verifyStripeSignature(PAYLOAD, header, SECRET, now)).toBe(true);
  });

  it('rejects a missing signature header', () => {
    expect(verifyStripeSignature(PAYLOAD, undefined, SECRET, now)).toBe(false);
    expect(verifyStripeSignature(PAYLOAD, '', SECRET, now)).toBe(false);
  });

  it('rejects an empty secret', () => {
    const header = sign(PAYLOAD, SECRET, now);
    expect(verifyStripeSignature(PAYLOAD, header, '', now)).toBe(false);
  });

  it('rejects a tampered payload', () => {
    const header = sign(PAYLOAD, SECRET, now);
    expect(verifyStripeSignature(PAYLOAD + 'x', header, SECRET, now)).toBe(false);
  });

  it('rejects a signature made with the wrong secret', () => {
    const header = sign(PAYLOAD, 'whsec_attacker', now);
    expect(verifyStripeSignature(PAYLOAD, header, SECRET, now)).toBe(false);
  });

  it('rejects a stale timestamp beyond tolerance (replay guard)', () => {
    const staleTs = now - SIGNATURE_TOLERANCE_SEC - 10;
    const header = sign(PAYLOAD, SECRET, staleTs);
    expect(verifyStripeSignature(PAYLOAD, header, SECRET, now)).toBe(false);
  });

  it('accepts a timestamp within tolerance', () => {
    const ts = now - SIGNATURE_TOLERANCE_SEC + 10;
    const header = sign(PAYLOAD, SECRET, ts);
    expect(verifyStripeSignature(PAYLOAD, header, SECRET, now)).toBe(true);
  });

  it('rejects a malformed header (no v1)', () => {
    expect(verifyStripeSignature(PAYLOAD, `t=${now}`, SECRET, now)).toBe(false);
  });

  it('rejects a header with non-numeric timestamp', () => {
    const hmac = createHmac('sha256', SECRET).update(`abc.${PAYLOAD}`, 'utf8').digest('hex');
    expect(verifyStripeSignature(PAYLOAD, `t=abc,v1=${hmac}`, SECRET, now)).toBe(false);
  });
});
