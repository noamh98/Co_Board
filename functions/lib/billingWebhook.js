"use strict";
// functions/src/billingWebhook.ts — Cloud Function (onRequest): webhook חיוב (2.5 / B-02).
// אבטחה (money-path): אימות חתימת-ספק לפני *כל* כתיבה. Admin SDK הוא הכותב היחיד
// של שדות-החיוב ב-families/{familyId} (כללי Firestore חוסמים כתיבת-לקוח אליהם).
//
// ⚠️ secret: `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET` (לא ב-repo, לא ב-bundle).
// ⚠️ [Verify — console] יצירת חשבון הספק, סוד ה-webhook והמפתחות החיים דורשים גישת-קונסולה
//    אנושית. עד אז — מצב TEST בלבד. לעולם אין להטמיע מפתחות חיים בקוד.
// ⚠️ [TBD — counsel] רישוי סימנים (E-04) — הטייר-בתשלום מדגיש העלאות/תמונות; ARASAAC מאחורי דגל.
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const region_1 = require("./region");
const billingSignature_1 = require("./billingSignature");
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
const STRIPE_WEBHOOK_SECRET = (0, params_1.defineSecret)('STRIPE_WEBHOOK_SECRET');
/** שולף familyId מאובייקט האירוע (metadata או client_reference_id). */
function resolveFamilyId(obj) {
    return obj?.metadata?.familyId ?? obj?.client_reference_id ?? undefined;
}
/**
 * מיישם אירוע חיוב מאומת על families/{familyId}. רק Admin SDK מגיע לכאן —
 * לכן מותר לו לכתוב את שדות-החיוב שכללי-הלקוח חוסמים.
 */
async function applyBillingEvent(event) {
    const obj = event.data?.object;
    const familyId = resolveFamilyId(obj);
    if (!familyId)
        return;
    const ref = (0, firestore_1.getFirestore)().collection('families').doc(familyId);
    const now = firestore_1.FieldValue.serverTimestamp();
    switch (event.type) {
        case 'checkout.session.completed':
            await ref.set({
                plan: 'paid',
                planStatus: 'active',
                billingProvider: 'stripe',
                billingCustomerId: obj?.customer ?? null,
                billingSubscriptionId: obj?.subscription ?? null,
                updatedAt: now,
            }, { merge: true });
            break;
        case 'customer.subscription.updated': {
            const periodEnd = obj?.current_period_end;
            await ref.set({
                plan: 'paid',
                planStatus: obj?.status ?? 'active',
                currentPeriodEnd: periodEnd != null ? periodEnd * 1000 : null,
                updatedAt: now,
            }, { merge: true });
            break;
        }
        case 'customer.subscription.deleted':
            await ref.set({ plan: 'free', planStatus: 'canceled', updatedAt: now }, { merge: true });
            break;
        default:
            // אירוע לא-מטופל — מאושרים 200 כדי שהספק לא ינסה שוב ללא צורך.
            break;
    }
}
exports.billingWebhook = (0, https_1.onRequest)({ region: region_1.FUNCTIONS_REGION, secrets: [STRIPE_WEBHOOK_SECRET], cors: false }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const sig = req.get('stripe-signature') ?? undefined;
    // חובה: raw body בדיוק כפי שנשלח, אחרת ה-HMAC לא יתאים.
    const payload = req.rawBody ? req.rawBody.toString('utf8') : '';
    if (!(0, billingSignature_1.verifyStripeSignature)(payload, sig, STRIPE_WEBHOOK_SECRET.value())) {
        res.status(400).send('Invalid signature');
        return;
    }
    let event;
    try {
        event = JSON.parse(payload);
    }
    catch {
        res.status(400).send('Invalid payload');
        return;
    }
    try {
        await applyBillingEvent(event);
    }
    catch {
        res.status(500).send('Processing error');
        return;
    }
    res.status(200).send('ok');
});
//# sourceMappingURL=billingWebhook.js.map