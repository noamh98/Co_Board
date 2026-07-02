"use strict";
// functions/src/region.ts — אזור משותף לכל ה-Cloud Functions (Phase 3.4: איחוד regions).
// ttsProxy/aiBoard כבר גרו כאן; acceptInvite/approveUser עברו מ-us-central1.
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_MIGRATED_REGIONS = exports.FUNCTIONS_REGION = void 0;
exports.FUNCTIONS_REGION = 'europe-west1';
/**
 * onCall({ region: [...] }) תומך בפריסה בו-זמנית של אותה פונקציה למספר אזורים —
 * כך acceptInvite/approveUser ממשיכות לענות גם ב-us-central1 (ללקוחות ישנים/מטמון
 * PWA שטרם התעדכנו) וגם ב-europe-west1 (החדש), בלי חלון-שבירה ובלי צורך בפריסה
 * מתואמת לקוח+שרת. את us-central1 יש להסיר מהמערך (ולפרוס שוב) רק אחרי שווידאו
 * בניטור/לוגים שאין יותר תעבורת production באזור הישן — זו ה"מחיקה הידנית".
 */
exports.LEGACY_MIGRATED_REGIONS = ['us-central1'];
//# sourceMappingURL=region.js.map