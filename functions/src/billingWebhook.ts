// functions/src/billingWebhook.ts — Cloud Function (onRequest): webhook חיוב (2.5 / B-02).
// אבטחה (money-path): אימות חתימת-ספק לפני *כל* כתיבה. Admin SDK הוא הכותב היחיד
// של שדות-החיוב ב-families/{familyId} (כללי Firestore חוסמים כתיבת-לקוח אליהם).
//
// ⚠️ secret: `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET` (לא ב-repo, לא ב-bundle).
// ⚠️ [Verify — console] יצירת חשבון הספק, סוד ה-webhook והמפתחות החיים דורשים גישת-קונסולה
//    אנושית. עד אז — מצב TEST בלבד. לעולם אין להטמיע מפתחות חיים בקוד.
// ⚠️ [TBD — counsel] רישוי סימנים (E-04) — הטייר-בתשלום מדגיש העלאות/תמונות; ARASAAC מאחורי דגל.
//
// אימות חתימה תואם-Stripe (scheme: `t=<ts>,v1=<hmac>`), מומש ב-node crypto כדי
// לא להוסיף תלות. חייב לרוץ מול ה-raw body (req.rawBody), אחרת החתימה לא תתאים.

import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { FUNCTIONS_REGION } from './region';

if (!getApps().length) initializeApp();

const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

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

interface StripeEventObject {
  metadata?: { familyId?: string };
  client_reference_id?: string;
  customer?: string;
  subscription?: string;
  status?: string;
  current_period_end?: number;
}

interface StripeEvent {
  type: string;
  data?: { object?: StripeEventObject };
}

/** שולף familyId מאובייקט האירוע (metadata או client_reference_id). */
function resolveFamilyId(obj: StripeEventObject | undefined): string | undefined {
  return obj?.metadata?.familyId ?? obj?.client_reference_id ?? undefined;
}

/**
 * מיישם אירוע חיוב מאומת על families/{familyId}. רק Admin SDK מגיע לכאן —
 * לכן מותר לו לכתוב את שדות-החיוב שכללי-הלקוח חוסמים.
 */
async function applyBillingEvent(event: StripeEvent): Promise<void> {
  const obj = event.data?.object;
  const familyId = resolveFamilyId(obj);
  if (!familyId) return;

  const ref = getFirestore().collection('families').doc(familyId);
  const now = FieldValue.serverTimestamp();

  switch (event.type) {
    case 'checkout.session.completed':
      await ref.set(
        {
          plan: 'paid',
          planStatus: 'active',
          billingProvider: 'stripe',
          billingCustomerId: obj?.customer ?? null,
          billingSubscriptionId: obj?.subscription ?? null,
          updatedAt: now,
        },
        { merge: true },
      );
      break;
    case 'customer.subscription.updated':
      await ref.set(
        {
          plan: 'paid',
          planStatus: obj?.status ?? 'active',
          currentPeriodEnd: obj?.current_period_end != null ? obj.current_period_end * 1000 : null,
          updatedAt: now,
        },
        { merge: true },
      );
      break;
    case 'customer.subscription.deleted':
      await ref.set(
        { plan: 'free', planStatus: 'canceled', updatedAt: now },
        { merge: true },
      );
      break;
    default:
      // אירוע לא-מטופל — מאושרים 200 כדי שהספק לא ינסה שוב ללא צורך.
      break;
  }
}

export const billingWebhook = onRequest(
  { region: FUNCTIONS_REGION, secrets: [STRIPE_WEBHOOK_SECRET], cors: false },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const sig = req.get('stripe-signature') ?? undefined;
    // חובה: raw body בדיוק כפי שנשלח, אחרת ה-HMAC לא יתאים.
    const payload = req.rawBody ? req.rawBody.toString('utf8') : '';

    if (!verifyStripeSignature(payload, sig, STRIPE_WEBHOOK_SECRET.value())) {
      res.status(400).send('Invalid signature');
      return;
    }

    let event: StripeEvent;
    try {
      event = JSON.parse(payload) as StripeEvent;
    } catch {
      res.status(400).send('Invalid payload');
      return;
    }

    try {
      await applyBillingEvent(event);
    } catch {
      res.status(500).send('Processing error');
      return;
    }

    res.status(200).send('ok');
  },
);
