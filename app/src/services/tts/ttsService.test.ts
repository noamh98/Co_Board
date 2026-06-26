import { describe, it, expect, vi } from 'vitest';
import {
  HebrewTts,
  type VoiceLike,
  type SpeechUtteranceLike,
  type SynthLike,
} from './ttsService';
import type { Cell } from '../../domain/models';
import type { SymbolRepo } from '../../data/symbolRepo';
import { speakCell } from './ttsService';

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

  it('speak() דוחה את synth.speak() לטיק הבא אחרי synth.cancel() — מונע תקיעת מנוע Chrome (QA: לופ דיבור ללא הפסקה)', async () => {
    // רגרסיה: cancel() ומיד speak() באותו tick גורם ל-Chrome לתקוע את המנוע
    // (speaking=true לנצח, ו-onstart/onerror לא נורים) — מה שנראה כלופ דיבור
    // אינסופי. התיקון: לדחות את synth.speak() ל-tick הבא אחרי synth.cancel().
    const calls: string[] = [];
    const synth: SynthLike = {
      getVoices: () => [voice('Carmit', 'he-IL', true)],
      cancel: () => calls.push('cancel'),
      speak: (u) => {
        calls.push('speak');
        queueMicrotask(() => u.onstart?.());
      },
    };
    const tts = new HebrewTts(synth, makeUtterance, () => 0);
    const promise = tts.speak('שלום');

    // סינכרונית, מיד אחרי הקריאה: cancel כבר נקרא, אבל speak עדיין לא —
    // הם לא קוראים זה לזה באותו tick.
    expect(calls).toEqual(['cancel']);

    await promise;
    expect(calls).toEqual(['cancel', 'speak']);
  });
});

describe('HebrewTts — voiceURI (FR-010)', () => {
  it('speak עם voiceURI=null → utt.voice לא מוגדר (ברירת מחדל)', async () => {
    const synth = mockSynth([voice('Carmit', 'he-IL', true)]);
    const tts = new HebrewTts(synth, makeUtterance, () => 0);
    await tts.speak('שלום', { voiceURI: null });
    expect(synth.spoken[0].voice).toBeNull();
  });

  it('speak עם voiceURI תואם → utt.voice מוגדר לקול הנבחר', async () => {
    const carmit: VoiceLike = { name: 'Carmit', lang: 'he-IL', localService: true, default: false, voiceURI: 'com.apple.ttsbundle.Carmit-compact' };
    const synth = mockSynth([carmit]);
    const tts = new HebrewTts(synth, makeUtterance, () => 0);
    await tts.speak('שלום', { voiceURI: 'com.apple.ttsbundle.Carmit-compact' });
    expect(synth.spoken[0].voice).toBe(carmit);
  });
});

describe('HebrewTts — rate/pitch (M15 הרחבה)', () => {
  it('speak עם rate=1.5 → utterance.rate=1.5', async () => {
    const synth = mockSynth([voice('Carmit', 'he-IL', true)]);
    const tts = new HebrewTts(synth, makeUtterance, () => 0);
    await tts.speak('שלום', { rate: 1.5 });
    expect(synth.spoken[0].rate).toBe(1.5);
  });

  it('speak עם pitch=0.8 → utterance.pitch=0.8', async () => {
    const synth = mockSynth([voice('Carmit', 'he-IL', true)]);
    const tts = new HebrewTts(synth, makeUtterance, () => 0);
    await tts.speak('שלום', { pitch: 0.8 });
    expect(synth.spoken[0].pitch).toBe(0.8);
  });
});

describe('speakCell', () => {
  const RECORDING_ENTRY = {
    id: 'sym1',
    uri: 'data:audio/webm;base64,fake',
    mimeType: 'image/webp' as const,
    source: 'recording' as const,
    createdAt: 0,
  };

  function makeRepo(resolveWith: (typeof RECORDING_ENTRY) | undefined): SymbolRepo {
    return {
      get: vi.fn().mockResolvedValue(resolveWith),
      save: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      remove: vi.fn(),
    };
  }

  function makeTts(): HebrewTts {
    const tts = new HebrewTts(mockSynth([voice('Carmit', 'he-IL')]), makeUtterance);
    vi.spyOn(tts, 'speak').mockResolvedValue({ spoken: true });
    return tts;
  }

  function makeCell(overrides: Partial<Cell> = {}): Cell {
    return { id: 'c1', label: 'כלב', action: { type: 'speak' }, ...overrides };
  }

  it('הקלטה קיימת → Audio.play נקרא; speak לא נקרא', async () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(globalThis, 'Audio').mockImplementation(
      () => ({ play: mockPlay, pause: vi.fn(), src: '' } as unknown as HTMLAudioElement),
    );

    const tts = makeTts();
    const repo = makeRepo(RECORDING_ENTRY);
    const cell = makeCell({ symbolId: 'sym1' });

    await speakCell(cell, repo, tts);

    expect(mockPlay).toHaveBeenCalled();
    expect(tts.speak).not.toHaveBeenCalled();
  });

  it('symbolId קיים אך אין entry → speak(label) נקרא', async () => {
    const tts = makeTts();
    const repo = makeRepo(undefined);
    const cell = makeCell({ symbolId: 'sym1' });

    await speakCell(cell, repo, tts);

    expect(tts.speak).toHaveBeenCalledWith('כלב', {});
  });

  it('אין symbolId → speak(label) נקרא, get לא נקרא', async () => {
    const tts = makeTts();
    const repo = makeRepo(undefined);
    const cell = makeCell({ label: 'שלום' });

    await speakCell(cell, repo, tts);

    expect(tts.speak).toHaveBeenCalledWith('שלום', {});
    expect(repo.get).not.toHaveBeenCalled();
  });
});
