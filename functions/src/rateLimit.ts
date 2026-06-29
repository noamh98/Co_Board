// functions/src/rateLimit.ts — מגביל-קצב פר-uid (fixed-window) מעל Firestore.
// משותף ל-ttsProxy ו-aiBoard. מטרה: חסימת חיוב בלתי-מוגבל אם מפתח/טוקן דולף.
// Ponytail: fixed-window אטומי בטרנזקציה אחת — מינימום שעובד, בלי תלות חיצונית.

import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

export interface RateLimitOptions {
  /** חלון הזמן במילישניות (למשל 60_000 = דקה). */
  windowMs: number;
  /** מספר קריאות מותר בחלון. */
  max: number;
}

/**
 * אוכף מכסה פר-uid לפעולה נתונה. זורק HttpsError('resource-exhausted') כשחורגים.
 * המסמך: `rateLimits/{uid}__{action}` עם { windowStart, count }.
 * חלון קבוע (fixed-window): פשוט, אטומי, ומספיק להגנת-חיוב (לא נדרש sliding מדויק).
 */
export async function enforceRateLimit(
  uid: string,
  action: string,
  opts: RateLimitOptions,
  db: Firestore = getFirestore(),
): Promise<void> {
  const ref = db.doc(`rateLimits/${uid}__${action}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.exists
      ? (snap.data() as { windowStart: number; count: number })
      : undefined;

    if (!data || now - data.windowStart >= opts.windowMs) {
      // חלון חדש — אפס מונה.
      tx.set(ref, { windowStart: now, count: 1 });
      return;
    }
    if (data.count >= opts.max) {
      throw new HttpsError(
        'resource-exhausted',
        'חרגת ממכסת השימוש. נסה שוב בעוד מספר רגעים.',
      );
    }
    tx.update(ref, { count: data.count + 1 });
  });
}
