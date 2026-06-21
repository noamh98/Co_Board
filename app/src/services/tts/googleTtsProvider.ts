import type { TTSProvider, VoiceConfig } from './ttsProvider';

const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

export const GOOGLE_HE_VOICES: VoiceConfig[] = [
  { id: 'he-IL-Neural2-A', lang: 'he-IL', displayName: 'עברית נשי Neural2', gender: 'female', style: 'adult' },
  { id: 'he-IL-Neural2-C', lang: 'he-IL', displayName: 'עברית גברי Neural2', gender: 'male', style: 'adult' },
  { id: 'he-IL-Wavenet-A', lang: 'he-IL', displayName: 'עברית נשי Wavenet', gender: 'female', style: 'adult' },
  { id: 'he-IL-Wavenet-B', lang: 'he-IL', displayName: 'עברית גברי Wavenet', gender: 'male', style: 'adult' },
];

export class GoogleTtsProvider implements TTSProvider {
  readonly name = 'google';
  readonly voices = GOOGLE_HE_VOICES;

  constructor(private apiKey: string) {}

  isAvailable(): boolean { return this.apiKey.length > 0; }

  async synthesize(text: string, voice: VoiceConfig, opts: { rate?: number; pitch?: number } = {}): Promise<Blob> {
    const rate = opts.rate ?? 1.0;
    // Web Speech pitch: 0-2 centered at 1; Google: semitones -20 to +20
    const pitchSemitones = ((opts.pitch ?? 1.0) - 1.0) * 20;
    const body = {
      input: { text },
      voice: { languageCode: 'he-IL', name: voice.id },
      audioConfig: { audioEncoding: 'MP3', speakingRate: rate, pitch: pitchSemitones },
    };
    const res = await fetch(GOOGLE_TTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Google TTS HTTP ${res.status}`);
    const { audioContent } = await res.json() as { audioContent: string };
    const bytes = Uint8Array.from(atob(audioContent), c => c.charCodeAt(0));
    return new Blob([bytes], { type: 'audio/mpeg' });
  }
}
