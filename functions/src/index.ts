// functions/src/index.ts — נקודת הכניסה ל-Cloud Functions.
export { approveUser } from './approveUser';
export { acceptInvite } from './acceptInvite';
export { revokeChildAccess } from './revokeChildAccess';
// Phase 0 (H-KEY): proxy-ים שמחזיקים את מפתחות צד-שלישי בשרת (לא ב-bundle).
export { ttsProxy } from './ttsProxy';
export { aiBoard } from './aiBoard';
// Phase 2 (B-02): webhook חיוב עם אימות חתימה. Admin SDK כותב families/{familyId}.
export { billingWebhook } from './billingWebhook';
