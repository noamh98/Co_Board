import { buildCacheKey, getAudioFromCache, saveAudioToCache } from '../../data/audioCache';
import type { TTSProvider, VoiceConfig } from './ttsProvider';
import type { HebrewTts, SpeakOptions, SpeakResult, TtsLike } from './ttsService';

export class HybridTtsService implements TtsLike {
  private currentAudio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;

  constructor(
    private fallback: HebrewTts,
    private provider: TTSProvider | null,
    private isOnline: () => boolean = () => navigator.onLine,
    private now: () => number = () =>
      typeof performance !== 'undefined' ? performance.now() : Date.now(),
  ) {}

  async speak(text: string, opts: SpeakOptions = {}): Promise<SpeakResult> {
    const trimmed = text.trim();
    if (!trimmed) return { spoken: false, reason: 'empty' };

    // A6: עצור השמעה קודמת (אודיו + Web Speech) לפני התחלת חדשה.
    this.cancel();

    const voiceId = this.resolveVoiceId(opts);
    const rate = opts.rate ?? 1;
    const pitch = opts.pitch ?? 1;

    // 1. Cache hit
    try {
      const key = await buildCacheKey(trimmed, voiceId, rate, pitch);
      const cached = await getAudioFromCache(key);
      if (cached) return this.playBlob(cached, voiceId, true);

      // 2. Online + provider
      if (this.isOnline() && this.provider?.isAvailable()) {
        const voice = this.resolveVoiceConfig(opts);
        try {
          const blob = await this.provider.synthesize(trimmed, voice, { rate, pitch });
          await saveAudioToCache(key, blob, voiceId);
          return this.playBlob(blob, voiceId, false);
        } catch {
          // fall through to Web Speech
        }
      }
    } catch {
      // DB or crypto error — fall through to Web Speech
    }

    // 3. Offline fallback
    return this.fallback.speak(trimmed, opts);
  }

  cancel(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    this.fallback.cancel();
  }

  private resolveVoiceId(opts: SpeakOptions): string {
    if (!this.provider) return 'web-speech';
    return this.resolveVoiceConfig(opts).id;
  }

  private resolveVoiceConfig(opts: SpeakOptions): VoiceConfig {
    const voices = this.provider?.voices ?? [];
    const pref = opts.voicePref;
    if (pref === 'child' || pref === 'female') {
      return voices.find(v => v.gender === 'female') ?? voices[0];
    }
    if (pref === 'male') {
      return voices.find(v => v.gender === 'male') ?? voices[0];
    }
    return voices[0];
  }

  private playBlob(blob: Blob, voiceId: string, fromCache: boolean): Promise<SpeakResult> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.currentAudio = audio;
      this.currentObjectUrl = url;
      const t0 = this.now();

      const cleanup = () => {
        URL.revokeObjectURL(url);
        if (this.currentAudio === audio) {
          this.currentAudio = null;
          this.currentObjectUrl = null;
        }
      };

      audio.onended = () => {
        cleanup();
        resolve({ spoken: true, usedVoice: voiceId, latencyMs: this.now() - t0, offline: fromCache });
      };
      audio.onerror = () => {
        cleanup();
        resolve({ spoken: false, reason: 'audio-play-error' });
      };
      audio.play().catch(() => {
        cleanup();
        resolve({ spoken: false, reason: 'audio-play-rejected' });
      });
    });
  }
}
