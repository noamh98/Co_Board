import { describe, it, expect, vi } from 'vitest';
import {
  HebrewTts,
  type VoiceLike,
  type SpeechUtteranceLike,
  type SynthLike,
} from './ttsService';

function voice(
  name: string,
  lang: string,
  localService = true,
  def = false,
): VoiceLike {
  return { name, lang, localService, default: def };
}

function makeUtterance(text: string): SpeechUtteranceLike {
  return {
    text,
    lang: '',
    voice: null,
    rate: 1,
    pitch: 1,
    volume: 1,
    onstart: null,
    onend: null,
    onerror: null,
  };
}

function mockSynth(
  voices: VoiceLike[],
  opts: { fail?: boolean } = {},
): SynthLike & { spoken: SpeechUtteranceLike[] } {
  const spoken: SpeechUtteranceLike[] = [];
  return {
    spoken,
    getVoices: () => voices,
    cancel: vi.fn(),
    speak: (u) => {
      spoken.push(u);
      queueMicrotask(() => {
        if (opts.fail) u.onerror?.({ error: 'synthesis-failed' });
        else u.onstart?.();
      });
    },
  };
}

describe('HebrewTts', () => {
  it('מזהה זמינות קול עברי', () => {
    expect(
      new HebrewTts(mockSynth([voice('Carmit', 'he-IL')]), makeUtterance).hasHebrewVoice(),
    ).toBe(true);
    expect(
      new HebrewTts(mockSynth([voice('Alex', 'en-US')]), makeUtterance).hasHebrewVoice(),
    ).toBe(false);
  });

  it('מעדיף קול עברי מקומי (אופליין) על מקוון', () => {
    const tts = new HebrewTts(
      mockSynth([voice('online-he', 'he-IL', false), voice('local-he', 'he-IL', true)]),
      makeUtterance,
    );
    expect(tts.pickVoice()?.name).toBe('local-he');
  });

  it('speak מצליח ומחזיר חביון + סימון אופליין', async () => {
    const synth = mockSynth([voice('Carmit', 'he-IL', true)]);
    const tts = new HebrewTts(synth, makeUtterance, () => 0);
    const res = await tts.speak('שלום');
    expect(res.spoken).toBe(true);
    expect(res.usedVoice).toBe('Carmit');
    expect(res.offline).toBe(true);
    expect(res.latencyMs).toBe(0);
    expect(synth.spoken[0].lang).toBe('he-IL');
  });

  it('נפילה חיננית כשאין קול עברי (fellBack=true)', async () => {
    const tts = new HebrewTts(mockSynth([voice('Alex', 'en-US')]), makeUtterance);
    const res = await tts.speak('שלום');
    expect(res.spoken).toBe(true);
    expect(res.fellBack).toBe(true);
  });

  it('טקסט ריק לא מוקרא', async () => {
    const tts = new HebrewTts(mockSynth([voice('Carmit', 'he-IL')]), makeUtterance);
    expect((await tts.speak('   ')).spoken).toBe(false);
  });

  it('שגיאת מנוע → spoken=false', async () => {
    const tts = new HebrewTts(
      mockSynth([voice('Carmit', 'he-IL')], { fail: true }),
      makeUtterance,
    );
    expect((await tts.speak('שלום')).spoken).toBe(false);
  });
});
