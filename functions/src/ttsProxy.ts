// functions/src/ttsProxy.ts — Cloud Function: proxy ל-Google TTS בצד-שרת (Phase 0, H-KEY).
// onCall (תבנית approveUser.ts). מחזיק את מפתח Google — הלקוח לעולם לא רואה אותו.
// אבטחה: כניסה + claim approved + rate-limit פר-uid. תאימות: מחזיר אותו audioContent
// (base64 MP3) שהלקוח כבר יודע להמיר ל-Blob — ה-interface של TTSProvider לא משתנה.
//
// ⚠️ region: נבחר 'europe-west1' בעקבות מיצוב הפרטיות של Emorli (AWS פרנקפורט).
//    TODO(אבטחה/רגולציה): לאמת דרישת COPPA/GDPR/חוק-הגנת-הפרטיות מול היועמ"ש לפני ייצור.
// ⚠️ secret: יש להגדיר `firebase functions:secrets:set GOOGLE_TTS_API_KEY` (לא ב-repo, לא ב-bundle).

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp, getApps } from 'firebase-admin/app';
import { enforceRateLimit } from './rateLimit';

if (!getApps().length) initializeApp();

export const FUNCTIONS_REGION = 'europe-west1';
const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const GOOGLE_TTS_API_KEY = defineSecret('GOOGLE_TTS_API_KEY');

// קולות he-IL מאושרים (מקור-אמת זהה ל-googleTtsProvider.GOOGLE_HE_VOICES בלקוח).
const ALLOWED_VOICES = new Set([
  'he-IL-Wavenet-A',
  'he-IL-Wavenet-B',
  'he-IL-Wavenet-C',
  'he-IL-Wavenet-D',
]);
const MAX_TEXT_LEN = 400;

interface TtsRequest {
  text: string;
  voiceId: string;
  rate?: number;
  pitch?: number; // 0–2 במונחי Web Speech (כמו בלקוח); נמיר לחצאי-טונים.
}

export const ttsProxy = onCall(
  { region: FUNCTIONS_REGION, secrets: [GOOGLE_TTS_API_KEY], timeoutSeconds: 20 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'נדרשת כניסה');
    }
    // רק משתמשים מאושרים (claim approved=true, נקבע ע"י approveUser).
    if (!request.auth.token['approved']) {
      throw new HttpsError('permission-denied', 'המשתמש אינו מאושר');
    }

    const { text, voiceId, rate, pitch } = (request.data ?? {}) as TtsRequest;
    if (typeof text !== 'string' || !text.trim()) {
      throw new HttpsError('invalid-argument', 'text נדרש');
    }
    if (text.length > MAX_TEXT_LEN) {
      throw new HttpsError('invalid-argument', `text ארוך מ-${MAX_TEXT_LEN} תווים`);
    }
    if (!ALLOWED_VOICES.has(voiceId)) {
      throw new HttpsError('invalid-argument', 'voiceId לא נתמך');
    }

    // מכסה: עד 120 קריאות בדקה לכל uid (הגנת-חיוב; הקראה רגילה מתחת לזה).
    await enforceRateLimit(request.auth.uid, 'tts', { windowMs: 60_000, max: 120 });

    const speakingRate = clamp(rate ?? 1.0, 0.25, 4.0);
    const pitchSemitones = clamp(((pitch ?? 1.0) - 1.0) * 20, -20, 20);

    const body = {
      input: { text },
      voice: { languageCode: 'he-IL', name: voiceId },
      audioConfig: { audioEncoding: 'MP3', speakingRate, pitch: pitchSemitones },
    };

    // timeout 15s — לא להשאיר את הפונקציה תלויה אם Google איטי (H-API).
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let res: Response;
    try {
      res = await fetch(GOOGLE_TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GOOGLE_TTS_API_KEY.value(),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      throw new HttpsError(
        'unavailable',
        err instanceof Error && err.name === 'AbortError'
          ? 'שירות ההקראה לא הגיב בזמן'
          : 'שירות ההקראה אינו זמין',
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new HttpsError('internal', `Google TTS HTTP ${res.status}`);
    }
    const { audioContent } = (await res.json()) as { audioContent: string };
    return { audioContent }; // base64 MP3 — הלקוח ממיר ל-Blob (audio/mpeg).
  },
);

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
