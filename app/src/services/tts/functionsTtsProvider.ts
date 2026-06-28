// services/tts/functionsTtsProvider.ts — ספק TTS שקורא ל-proxy בשרת (Phase 0, H-KEY).
// מחליף את GoogleTtsProvider בצד-לקוח: שום מפתח Google ב-bundle/IDB. שומר על
// ה-interface של TTSProvider — HybridTtsService וכל ה-callers לא משתנים.
// כשל (לא-מחובר/אופליין/שגיאת-שרת) → throw → HybridTtsService נופל ל-browser speechSynthesis.

import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { TTSProvider, VoiceConfig } from './ttsProvider';
import { GOOGLE_HE_VOICES } from './googleTtsProvider';

// חייב להתאים ל-FUNCTIONS_REGION ב-functions/src/ttsProxy.ts.
const FUNCTIONS_REGION = 'europe-west1';

interface TtsProxyRequest {
  text: string;
  voiceId: string;
  rate?: number;
  pitch?: number;
}
interface TtsProxyResponse {
  audioContent: string; // base64 MP3
}

export class FunctionsTtsProvider implements TTSProvider {
  readonly name = 'google-proxy';
  readonly voices: VoiceConfig[] = GOOGLE_HE_VOICES;

  // זמין מבחינת יכולת — בדיקת online/auth נעשית ב-HybridTtsService ובשרת.
  isAvailable(): boolean {
    return true;
  }

  async synthesize(
    text: string,
    voice: VoiceConfig,
    opts: { rate?: number; pitch?: number } = {},
  ): Promise<Blob> {
    const fns = getFunctions(getApp(), FUNCTIONS_REGION);
    const call = httpsCallable<TtsProxyRequest, TtsProxyResponse>(fns, 'ttsProxy');
    const { data } = await call({
      text,
      voiceId: voice.id,
      rate: opts.rate ?? 1.0,
      pitch: opts.pitch ?? 1.0,
    });
    if (!data?.audioContent) throw new Error('ttsProxy: empty audioContent');
    const bytes = Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0));
    return new Blob([bytes], { type: 'audio/mpeg' });
  }
}
