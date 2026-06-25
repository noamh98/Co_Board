import { describe, it, expect, vi, beforeEach } from 'vitest';
import { speakCell } from './ttsService';
import type { Cell } from '../../domain/models';
import type { SymbolRepo } from '../../data/symbolRepo';
import type { TtsLike } from './ttsService';

// A4: הקלטה מאוחסנת ב-audioId (נפרד מ-symbolId) ומושמעת ב-Audio.
describe('speakCell — A4 (audioId נפרד)', () => {
  let playMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    playMock = vi.fn().mockResolvedValue(undefined);
    (globalThis as unknown as { Audio: unknown }).Audio = vi.fn().mockImplementation(() => ({
      play: playMock,
      pause: vi.fn(),
      set src(_v: string) {},
    }));
  });

  it('משמיע הקלטה דרך cell.audioId ולא נופל ל-TTS', async () => {
    const symbolRepo = {
      get: vi.fn().mockResolvedValue({ id: 'rec-1', uri: 'blob:rec', source: 'recording' }),
    } as unknown as SymbolRepo;
    const tts = { speak: vi.fn().mockResolvedValue(undefined), cancel: vi.fn() } as unknown as TtsLike;
    const cell = { id: 'c1', label: 'שלום', audioId: 'rec-1', action: { type: 'speak' } } as Cell;

    await speakCell(cell, symbolRepo, tts, {});

    expect(symbolRepo.get).toHaveBeenCalledWith('rec-1');
    expect(playMock).toHaveBeenCalled();
    expect(tts.speak).not.toHaveBeenCalled();
  });

  it('ללא הקלטה — נופל ל-TTS', async () => {
    const symbolRepo = { get: vi.fn().mockResolvedValue(undefined) } as unknown as SymbolRepo;
    const tts = { speak: vi.fn().mockResolvedValue(undefined), cancel: vi.fn() } as unknown as TtsLike;
    const cell = { id: 'c2', label: 'מים', action: { type: 'speak' } } as Cell;

    await speakCell(cell, symbolRepo, tts, {});

    expect(tts.speak).toHaveBeenCalled();
  });
});
