"use strict";
// functions/src/aiBoard.ts — Cloud Function: יצירת לוח AI דרך Gemini Flash.
// אבטחה: כניסה + claim approved + rate-limit פר-uid + timeout 15s.
// secret: GEMINI_API_KEY (מ-Google AI Studio — aistudio.google.com, חינמי).
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiBoard = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const rateLimit_1 = require("./rateLimit");
const ttsProxy_1 = require("./ttsProxy");
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)();
const GEMINI_API_KEY = (0, params_1.defineSecret)('GEMINI_API_KEY');
const MAX_TOPIC_LEN = 300;
const MAX_COUNT = 64;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
exports.aiBoard = (0, https_1.onCall)({ region: ttsProxy_1.FUNCTIONS_REGION, secrets: [GEMINI_API_KEY], timeoutSeconds: 30 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'נדרשת כניסה');
    if (!request.auth.token['approved'])
        throw new https_1.HttpsError('permission-denied', 'המשתמש אינו מאושר');
    const data = (request.data ?? {});
    const action = data.action ?? 'generate';
    await (0, rateLimit_1.enforceRateLimit)(request.auth.uid, 'ai', { windowMs: 60_000, max: 30 });
    if (action === 'edit') {
        // TODO(Phase 4): patch-diff על לוח קיים
        throw new https_1.HttpsError('unimplemented', 'עריכת-AI שיחתית עדיין לא זמינה (Phase 4)');
    }
    const topic = typeof data.topic === 'string' ? data.topic.trim() : '';
    const count = Math.min(MAX_COUNT, Math.max(1, Math.floor(data.count ?? 0)));
    if (!topic)
        throw new https_1.HttpsError('invalid-argument', 'topic נדרש');
    if (topic.length > MAX_TOPIC_LEN)
        throw new https_1.HttpsError('invalid-argument', `topic ארוך מ-${MAX_TOPIC_LEN} תווים`);
    if (!count)
        throw new https_1.HttpsError('invalid-argument', 'count נדרש');
    const apiKey = GEMINI_API_KEY.value();
    if (!apiKey)
        throw new https_1.HttpsError('failed-precondition', 'GEMINI_API_KEY לא הוגדר');
    const prompt = `צור רשימה של בדיוק ${count} מילים/מושגים בנושא: "${topic}".\n` +
        `החזר JSON בלבד — מערך words, כל פריט: {"word":"...","pos":"noun|verb|adj|other"}.\n` +
        `דוגמה: {"words":[{"word":"כלב","pos":"noun"}]}\n` +
        `אין טקסט מחוץ ל-JSON.`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let res;
    try {
        res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
            }),
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
    if (!res.ok)
        throw new https_1.HttpsError('internal', `Gemini HTTP ${res.status}`);
    const geminiRes = (await res.json());
    const raw = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonStr = raw.replace(/```json\n?|```/g, '').trim();
    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    }
    catch {
        throw new https_1.HttpsError('internal', 'Gemini החזיר תגובה לא תקינה');
    }
    return { words: parsed.words ?? [] };
});
//# sourceMappingURL=aiBoard.js.map