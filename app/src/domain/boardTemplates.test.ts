import { describe, it, expect } from 'vitest';
import { listTemplates, getTemplate } from './boardTemplates';

describe('boardTemplates', () => {
  it('listTemplates מחזיר 4 תבניות', () => {
    expect(listTemplates()).toHaveLength(4);
  });

  it('getTemplate מחזיר תבנית ידועה', () => {
    const t = getTemplate('core4x4');
    expect(t).toBeDefined();
    expect(t?.id).toBe('core4x4');
    expect(t?.nameHe).toContain('ליבה');
  });

  it('blank4x4 — לוח ריק ללא תאים', () => {
    const t = getTemplate('blank4x4');
    expect(t).toBeDefined();
    expect(Object.keys(t!.board.cells)).toHaveLength(0);
    expect(t!.board.placements).toHaveLength(0);
  });
});
