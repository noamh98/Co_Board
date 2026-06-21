export interface VoiceConfig {
  id: string;
  lang: string;
  displayName: string;
  gender: 'female' | 'male' | 'neutral';
  style?: 'child' | 'adult';
}

export interface TTSProvider {
  readonly name: string;
  readonly voices: VoiceConfig[];
  isAvailable(): boolean;
  synthesize(text: string, voice: VoiceConfig, opts: { rate?: number; pitch?: number }): Promise<Blob>;
}

/** Stub for tests — always throws so fallback is exercised. */
export class NullTTSProvider implements TTSProvider {
  readonly name = 'null';
  readonly voices: VoiceConfig[] = [];
  isAvailable(): boolean { return false; }
  async synthesize(): Promise<Blob> { throw new Error('NullTTSProvider'); }
}
