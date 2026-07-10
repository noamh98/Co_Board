"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingWebhook = exports.aiBoard = exports.ttsProxy = exports.revokeChildAccess = exports.acceptInvite = exports.approveUser = void 0;
// functions/src/index.ts — נקודת הכניסה ל-Cloud Functions.
var approveUser_1 = require("./approveUser");
Object.defineProperty(exports, "approveUser", { enumerable: true, get: function () { return approveUser_1.approveUser; } });
var acceptInvite_1 = require("./acceptInvite");
Object.defineProperty(exports, "acceptInvite", { enumerable: true, get: function () { return acceptInvite_1.acceptInvite; } });
var revokeChildAccess_1 = require("./revokeChildAccess");
Object.defineProperty(exports, "revokeChildAccess", { enumerable: true, get: function () { return revokeChildAccess_1.revokeChildAccess; } });
// Phase 0 (H-KEY): proxy-ים שמחזיקים את מפתחות צד-שלישי בשרת (לא ב-bundle).
var ttsProxy_1 = require("./ttsProxy");
Object.defineProperty(exports, "ttsProxy", { enumerable: true, get: function () { return ttsProxy_1.ttsProxy; } });
var aiBoard_1 = require("./aiBoard");
Object.defineProperty(exports, "aiBoard", { enumerable: true, get: function () { return aiBoard_1.aiBoard; } });
// Phase 2 (B-02): webhook חיוב עם אימות חתימה. Admin SDK כותב families/{familyId}.
var billingWebhook_1 = require("./billingWebhook");
Object.defineProperty(exports, "billingWebhook", { enumerable: true, get: function () { return billingWebhook_1.billingWebhook; } });
//# sourceMappingURL=index.js.map