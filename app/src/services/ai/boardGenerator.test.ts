import { describe, it, expect } from 'vitest';
import { generateBoard } from './boardGenerator';

describe('boardGenerator — I8', () => {
  it('מחולל לוח מנושא: מילים + POS→Fitzgerald + סמל', async () => {
    const board = await generateBoard(
      'בעלי חיים',
      { rows: 1, cols: 2 },
      {
        llm: async () => [
          { word: 'כלב', pos: 'noun' },
          { word: 'רץ', pos: 'verb' },
        ],
        findSymbol: async (w) => (w === 'כלב' ? 'arasaac:123' : undefined),
      },
    );
    expect(board.name).toBe('בעלי חיים');
    expect(Object.keys(board.cells)).toHaveLength(2);
    expect(board.cells['gen-0'].label).toBe('כלב');
    expect(board.cells['gen-0'].fitzgerald).toBe('noun');
    expect(board.cells['gen-0'].symbolId).toBe('arasaac:123');
    expect(board.cells['gen-1'].fitzgerald).toBe('verb');
    expect(board.placements).toHaveLength(2);
  });

  it('כשל ה-LLM מתפשט החוצה (נפילה חיננית בקורא)', async () => {
    await expect(
      generateBoard('x', { rows: 1, cols: 1 }, {
        llm: async () => {
          throw new Error('network');
        },
      }),
    ).rejects.toThrow();
  });
});
