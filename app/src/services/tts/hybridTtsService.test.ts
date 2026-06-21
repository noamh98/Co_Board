import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HybridTtsService } from './hybridTtsService';
import type { TTSProvider, VoiceConfig } from './ttsProvider';
import type { HebrewTts, SpeakResult } from './ttsService';

// Mock audioCache module
vi.mock('../../data/audioCache', () => ({
  buildCacheKey: vi.fn(async () => 'test-cache-key'),
  getAudioFromCache: vi.fn(async () => null),
  saveAudioToCache: vi.fn(async () => {}),
}));

// Mock Audio class
class MockAudio {
  src = '';
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() { setTimeout(() => this.onended?.(), 0); return Promise.resolve(); }
  pause() {}
}
vi.stubGlobal('Audio', MockAudio);

// Mock URL
vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });

import * as audioCache from '../../data/audioCache';

const makeVoice = (gender: 'female' | 'male', id: string): VoiceConfig => ({
  id, lang: 'he-IL', displayName: id, gender, style: 'adult',
});

const VOICES: VoiceConfig[] = [
  makeVoice('female', 'he-IL-Neural2-A'),
  makeVoice('male', 'he-IL-Neural2-C'),
];

function makeFallback(result: SpeakResult = { spoken: true, usedVoice: 'web-speech' }): HebrewTts {
  return {
    speak: vi.fn(async () => result),
    cancel: vi.fn(),
  } as unknown as HebrewTts;
}

function makeProvider(shouldThrow = false): TTSProvider {
  return {
    name: 'mock',
    voices: VOICES,
    isAvailable: () => true,
    synthesize: shouldThrow
      ? vi.fn(async () => { throw new Error('provider error'); })
      : vi.fn(async () => new Blob(['audio'], { type: 'audio/mpeg' })),
  };
}

beforeEach(() => {
  vi.mocked(audioCache.buildCacheKey).mockResolvedValue('test-cache-key');
  vi.mocked(audioCache.getAudioFromCache).mockResolvedValue(null);
  vi.mocked(audioCache.saveAudioToCache).mockResolvedValue(undefined);
});

describe('HybridTtsService', () => {
  it('1. empty text → {spoken:false, reason:"empty"}, no cache/provider call', async () => {
    const fallback = makeFallback();
    const provider = makeProvider();
    const svc = new HybridTtsService(fallback, provider, () => true, () => 0);

    const result = await svc.speak('   ');

    expect(result).toEqual({ spoken: false, reason: 'empty' });
    expect(audioCache.buildCacheKey).not.toHaveBeenCalled();
    expect(provider.synthesize).not.toHaveBeenCalled();
    expect(fallback.speak).not.toHaveBeenCalled();
  });

  it('2. cache hit → audio played, provider NOT called', async () => {
    const cachedBlob = new Blob(['cached'], { type: 'audio/mpeg' });
    vi.mocked(audioCache.getAudioFromCache).mockResolvedValue(cachedBlob);

    const fallback = makeFallback();
    const provider = makeProvider();
    const svc = new HybridTtsService(fallback, provider, () => true, () => 0);

    const result = await svc.speak('שלום');

    expect(result.spoken).toBe(true);
    expect(result.offline).toBe(true); // from cache
    expect(provider.synthesize).not.toHaveBeenCalled();
    expect(fallback.speak).not.toHaveBeenCalled();
  });

  it('3. cache miss + online + provider succeeds → provider called, result cached, audio played', async () => {
    const fallback = makeFallback();
    const provider = makeProvider();
    const svc = new HybridTtsService(fallback, provider, () => true, () => 0);

    const result = await svc.speak('שלום');

    expect(provider.synthesize).toHaveBeenCalledOnce();
    expect(audioCache.saveAudioToCache).toHaveBeenCalledWith(
      'test-cache-key',
      expect.any(Blob),
      expect.any(String),
    );
    expect(result.spoken).toBe(true);
    expect(result.offline).toBe(false); // not from cache
    expect(fallback.speak).not.toHaveBeenCalled();
  });

  it('4. cache miss + offline → fallback.speak() called', async () => {
    const fallback = makeFallback();
    const provider = makeProvider();
    const svc = new HybridTtsService(fallback, provider, () => false, () => 0);

    await svc.speak('שלום');

    expect(provider.synthesize).not.toHaveBeenCalled();
    expect(fallback.speak).toHaveBeenCalledWith('שלום', {});
  });

  it('5. cache miss + online + provider throws → fallback.speak() called', async () => {
    const fallback = makeFallback();
    const provider = makeProvider(true); // throws
    const svc = new HybridTtsService(fallback, provider, () => true, () => 0);

    await svc.speak('שלום');

    expect(provider.synthesize).toHaveBeenCalledOnce();
    expect(fallback.speak).toHaveBeenCalledWith('שלום', {});
  });

  it('6. voicePref "female" → resolves to female voice', async () => {
    const fallback = makeFallback();
    const provider = makeProvider();
    const svc = new HybridTtsService(fallback, provider, () => true, () => 0);

    await svc.speak('שלום', { voicePref: 'female' });

    expect(provider.synthesize).toHaveBeenCalledWith(
      'שלום',
      expect.objectContaining({ gender: 'female' }),
      expect.any(Object),
    );
  });

  it('7. voicePref "male" → resolves to male voice', async () => {
    const fallback = makeFallback();
    const provider = makeProvider();
    const svc = new HybridTtsService(fallback, provider, () => true, () => 0);

    await svc.speak('שלום', { voicePref: 'male' });

    expect(provider.synthesize).toHaveBeenCalledWith(
      'שלום',
      expect.objectContaining({ gender: 'male' }),
      expect.any(Object),
    );
  });

  it('8. cancel() → pauses currentAudio and calls fallback.cancel()', async () => {
    const fallback = makeFallback();
    const provider = makeProvider();
    const svc = new HybridTtsService(fallback, provider, () => true, () => 0);

    // Start a speak but don't await — cancel immediately
    const blob = new Blob(['audio'], { type: 'audio/mpeg' });
    vi.mocked(audioCache.getAudioFromCache).mockResolvedValue(blob);

    // Kick off a speak (creates currentAudio)
    const speakPromise = svc.speak('שלום');

    // Give the async speak a tick to start
    await Promise.resolve();

    svc.cancel();

    // fallback.cancel should have been called
    expect(fallback.cancel).toHaveBeenCalled();

    // Clean up
    await speakPromise;
  });
});
