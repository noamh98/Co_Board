// services/tts/ttsWiring.ts — מרכז יצירת ספק ה-TTS (Phase 0, H-KEY).
// מטרה: לצמצם את השינוי ב-App.tsx לשורה אחת — להחליף `new GoogleTtsProvider(apiKey)`
// ב-`createTtsProvider()`. כך אין מפתח בלקוח, וה-fallback ל-browser speechSynthesis נשמר.
//
// שילוב ב-App.tsx (ראה Claude-Code-Integration-Prompt):
//   - להסיר את envKey/getTtsApiKey ואת `new GoogleTtsProvider(...)`.
//   - `if (alive && tts) ttsRef.current = createHybridTts(tts, createTtsProvider());`

import type { TTSProvider } from './ttsProvider';
import { FunctionsTtsProvider } from './functionsTtsProvider';

/**
 * מחזיר את ספק ה-TTS המקוון (proxy בשרת). הקראה אופליין נשארת ב-HybridTtsService
 * שנופל ל-browser speechSynthesis כשאין רשת/הספק נכשל.
 */
export function createTtsProvider(): TTSProvider {
  return new FunctionsTtsProvider();
}
