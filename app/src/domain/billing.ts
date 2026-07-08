// app/src/domain/billing.ts — לוגיקת שערי-תוכנית (plan gates) טהורה ונטולת-מסגרת.
// שכבת domain: ללא I/O, ניתנת-לבדיקה. מקור-אמת יחיד לחוקי free/paid בצד-לקוח.
// אבטחה/כסף: זהו UX-gate בלבד. אכיפת-אמת של תוכנית נעשית בכללי Firestore + webhook
// (functions/src/billingWebhook.ts) שרק Admin SDK כותב את שדות ה-billing. אין להסתמך
// על הקובץ הזה כשער-אבטחה — הוא משפר חוויה בלבד.
//
// [TBD — counsel] סימני ARASAAC הם CC BY-NC-SA (NonCommercial). אין להגיש טייר-בתשלום
// שמסתמך על ARASAAC בלבד (E-04). עד החלטת יועמ"ש, הטייר-בתשלום מדגיש העלאות-משתמש
// ותמונות; ARASAAC נשאר מאחורי דגל `arasaacLicensed` (ברירת-מחדל false).

/** תוכניות החיוב הנתמכות. */
export type Plan = 'free' | 'paid';

/** מצב המנוי כפי שמגיע מספק החיוב (Stripe/Paddle) דרך ה-webhook. */
export type PlanStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';

/** מקורות סמלים אפשריים לאריח. */
export type SymbolSet = 'user-upload' | 'photo' | 'arasaac';

/** עוגן החיוב המשפחתי (families/{familyId}) — תת-קבוצה רלוונטית ל-gates. */
export interface FamilyBilling {
  plan: Plan;
  planStatus?: PlanStatus;
  /** מדינת החיוב. הטייר-בתשלום מוגבל כרגע לישראל בלבד. */
  region?: string;
}

/** מגבלות כמותיות לכל תוכנית. */
export interface PlanLimits {
  maxChildren: number;
  maxBoards: number;
  cloudBackup: boolean;
  cloudTts: boolean;
}

export const FREE_LIMITS: PlanLimits = {
  maxChildren: 1,
  maxBoards: 3,
  cloudBackup: false,
  cloudTts: false,
};

export const PAID_LIMITS: PlanLimits = {
  maxChildren: 10,
  maxBoards: 100,
  cloudBackup: true,
  cloudTts: true,
};

/** מדינות שבהן הטייר-בתשלום זמין כרגע (מיטיגציית E-04: ישראל בלבד). */
export const PAID_REGIONS: readonly string[] = ['IL'];

/**
 * התוכנית האפקטיבית: מנוי שאינו active/trialing יורד חזרה ל-free-gates.
 * כך past_due/canceled לא נשארים עם הרשאות-תשלום (fail-safe לכיוון free).
 */
export function effectivePlan(billing: FamilyBilling): Plan {
  if (billing.plan !== 'paid') return 'free';
  const status = billing.planStatus ?? 'active';
  return status === 'active' || status === 'trialing' ? 'paid' : 'free';
}

/** מגבלות התוכנית האפקטיבית. */
export function limitsFor(billing: FamilyBilling): PlanLimits {
  return effectivePlan(billing) === 'paid' ? PAID_LIMITS : FREE_LIMITS;
}

/** האם ניתן להוסיף פרופיל-ילד נוסף בהתחשב בכמות הנוכחית. */
export function canCreateChild(billing: FamilyBilling, currentCount: number): boolean {
  return currentCount < limitsFor(billing).maxChildren;
}

/** האם ניתן להוסיף לוח נוסף בהתחשב בכמות הנוכחית. */
export function canCreateBoard(billing: FamilyBilling, currentCount: number): boolean {
  return currentCount < limitsFor(billing).maxBoards;
}

/** האם פיצ'ר-בוליאני של התוכנית (גיבוי-ענן/TTS-ענן) זמין. */
export function canUseFeature(
  billing: FamilyBilling,
  feature: 'cloudBackup' | 'cloudTts',
): boolean {
  return limitsFor(billing)[feature];
}

/** האם הטייר-בתשלום זמין למדינה נתונה (כרגע IL בלבד). */
export function isPaidAvailableInRegion(region: string | undefined): boolean {
  return region != null && PAID_REGIONS.includes(region);
}

/**
 * מקורות הסמלים המותרים לתוכנית.
 * חינם: העלאות/תמונות + ARASAAC (שימוש לא-מסחרי מותר, עם ייחוס).
 * בתשלום: מדגיש העלאות/תמונות. ARASAAC נכלל רק אם `arasaacLicensed` = true
 *   (מאחורי החלטת-יועמ"ש E-04). לעולם לא מחזיר ARASAAC-בלבד לטייר-בתשלום.
 */
export function allowedSymbolSets(
  plan: Plan,
  opts: { arasaacLicensed?: boolean } = {},
): SymbolSet[] {
  if (plan === 'free') {
    return ['user-upload', 'photo', 'arasaac'];
  }
  const base: SymbolSet[] = ['user-upload', 'photo'];
  if (opts.arasaacLicensed) base.push('arasaac');
  return base;
}
