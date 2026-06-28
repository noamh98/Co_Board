"use strict";
// functions/src/aiBoard.ts — Cloud Function: proxy ליצירת/עריכת לוח AI (Phase 0, H-KEY).
// onCall (תבנית approveUser.ts). מחזיק את endpoint/מפתח ה-AI — הלקוח לא רואה אותם.
// אבטחה: כניסה + claim approved + rate-limit פר-uid + timeout 15s (AbortController).
//
// ⚠️ הפרומפט/המודל/חוזה-הקלט של ה-AI אטומים (לא נחשפו בקוד שנמסר). לכן הפונקציה
//    *משכפלת בדיוק* את חוזה-הקריאה הקיים בלקוח (POST {topic, count} → {words:[{word,pos?}]}),
//    רק מעבירה אותו לצד-שרת ומוסיפה auth/quota/timeout. אסור להמציא פרומפט/מודל כאן.
//    TODO(AI): כשייחשף הפרומפט/המודל — להוסיף model-routing (מילות-זרע במודל זול) ב-action=generate.
//    TODO(F4/Phase 4): action='edit' — חוזה patch-diff על לוח קיים. כרגע stub (ראה למטה).
// ⚠️ secrets: `firebase functions:secrets:set AI_ENDPOINT` (ו-AI_API_KEY אם ה-endpoint דורש).
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiBoard = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const rateLimit_1 = require("./rateLimit");
const ttsProxy_1 = require("./ttsProxy");
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
const AI_ENDPOINT = (0, params_1.defineSecret)('AI_ENDPOINT');
// אופציונלי: מפתח/טוקן ל-endpoint. אם ריק — לא נשלח Authorization (תאימות ל-endpoint פתוח).
const AI_API_KEY = (0, params_1.defineSecret)('AI_API_KEY');
const MAX_TOPIC_LEN = 300;
const MAX_COUNT = 64; // לוח 8×8 = 64 — תקרה הגיונית; מגן מהוצאת-טוקנים חריגה.
exports.aiBoard = (0, https_1.onCall)({ region: ttsProxy_1.FUNCTIONS_REGION, secrets: [AI_ENDPOINT, AI_API_KEY], timeoutSeconds: 30 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'נדרשת כניסה');
    }
    if (!request.auth.token['approved']) {
        throw new https_1.HttpsError('permission-denied', 'המשתמש אינו מאושר');
    }
    const data = (request.data ?? {});
    const action = data.action ?? 'generate';
    // מכסה: עד 30 יצירות לדקה לכל uid (יצירת-לוח כבדה יותר מ-TTS).
    await (0, rateLimit_1.enforceRateLimit)(request.auth.uid, 'ai', { windowMs: 60_000, max: 30 });
    if (action === 'edit') {
        // TODO(F4/Phase 4): לממש patch-diff על לוח קיים תוך שמירת מבנה.
        // דורש חוזה פרומפט יציב שטרם נחשף — אסור להמציא. ראה AiEditPanel (stub בלקוח).
        throw new https_1.HttpsError('unimplemented', 'עריכת-AI שיחתית עדיין לא זמינה (Phase 4)');
    }
    const topic = typeof data.topic === 'string' ? data.topic.trim() : '';
    const count = Math.min(MAX_COUNT, Math.max(1, Math.floor(data.count ?? 0)));
    if (!topic)
        throw new https_1.HttpsError('invalid-argument', 'topic נדרש');
    if (topic.length > MAX_TOPIC_LEN) {
        throw new https_1.HttpsError('invalid-argument', `topic ארוך מ-${MAX_TOPIC_LEN} תווים`);
    }
    if (!count)
        throw new https_1.HttpsError('invalid-argument', 'count נדרש');
    const endpoint = AI_ENDPOINT.value();
    if (!endpoint) {
        throw new https_1.HttpsError('failed-precondition', 'AI endpoint לא הוגדר בשרת');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let res;
    try {
        const apiKey = AI_API_KEY.value();
        res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            },
            // חוזה זהה ללקוח הקודם — לא להמציא שדות חדשים.
            body: JSON.stringify({ topic, count }),
            signal: controller.signal,
        });
    }
    catch (err) {
        throw new https_1.HttpsError('unavailable', err instanceof Error && err.name === 'AbortError'
            ? 'שירות ה-AI לא הגיב בזמן'
            : 'שירות ה-AI אינו זמין');
    }
    finally {
        clearTimeout(timer);
    }
    if (!res.ok) {
        throw new https_1.HttpsError('internal', `AI HTTP ${res.status}`);
    }
    // מחזיר את אותה מעטפת {words} שהלקוח כבר יודע לפענח (aiProvider).
    const json = (await res.json());
    return { words: json.words ?? [] };
});
//# sourceMappingURL=aiBoard.js.map