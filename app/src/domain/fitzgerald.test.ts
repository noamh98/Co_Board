import { describe, it, expect } from 'vitest';
import type { Fitzgerald } from './models';
import { FITZGERALD, fitzgeraldStyle, categoryForLabel } from './fitzgerald';

// ─── WCAG 2.1 contrast utilities ────────────────────────────────────────────

function hexToLinear(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return [lin(r), lin(g), lin(b)];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToLinear(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── FITZGERALD map completeness ─────────────────────────────────────────────

describe('FITZGERALD map', () => {
  const ALL_CATEGORIES: Fitzgerald[] = [
    'pronoun', 'verb', 'noun', 'adjective', 'preposition',
    'question', 'negation', 'social',
    'conjunction', 'adverb', 'determiner',
  ];

  it('מכיל את כל 11 הקטגוריות', () => {
    for (const cat of ALL_CATEGORIES) {
      expect(FITZGERALD[cat], `קטגוריה חסרה: ${cat}`).toBeDefined();
    }
  });

  it('לכל קטגוריה יש bg, text ו-label', () => {
    for (const cat of ALL_CATEGORIES) {
      const entry = FITZGERALD[cat];
      expect(entry.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.text).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it('ניגודיות WCAG 2.1 AA ≥ 4.5:1 לכל זוג bg/text', () => {
    for (const [cat, { bg, text }] of Object.entries(FITZGERALD)) {
      const ratio = contrastRatio(bg, text);
      expect(ratio, `קטגוריה "${cat}": ניגודיות ${ratio.toFixed(2)}:1 < 4.5`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('הצבעים רכים — bg לא רווי (saturation < 70%)', () => {
    for (const [cat, { bg }] of Object.entries(FITZGERALD)) {
      const r = parseInt(bg.slice(1, 3), 16);
      const g = parseInt(bg.slice(3, 5), 16);
      const b = parseInt(bg.slice(5, 7), 16);
      const max = Math.max(r, g, b) / 255;
      const min = Math.min(r, g, b) / 255;
      const saturation = max === 0 ? 0 : (max - min) / max;
      expect(saturation, `קטגוריה "${cat}": רוויות ${(saturation * 100).toFixed(0)}% ≥ 70%`).toBeLessThan(0.7);
    }
  });
});

// ─── fitzgeraldStyle ──────────────────────────────────────────────────────────

describe('fitzgeraldStyle', () => {
  it('מחזיר ערכי FITZGERALD לקטגוריה קיימת', () => {
    expect(fitzgeraldStyle('verb')).toEqual(FITZGERALD.verb);
    expect(fitzgeraldStyle('conjunction')).toEqual(FITZGERALD.conjunction);
  });

  it('מחזיר NEUTRAL (לבן, טקסט כהה) לקטגוריה undefined', () => {
    const neutral = fitzgeraldStyle(undefined);
    expect(neutral.bg).toBe('#ffffff');
    expect(neutral.text).toBe('#1f2937');
    expect(neutral.label).toBe('');
  });
});

// ─── categoryForLabel ─────────────────────────────────────────────────────────

describe('categoryForLabel', () => {
  const cases: Array<[string, Fitzgerald]> = [
    ['אני', 'pronoun'],
    ['היא', 'pronoun'],
    ['שלי', 'pronoun'],
    ['רוצה', 'verb'],
    ['לאכול', 'verb'],
    ['שותה', 'verb'],
    ['לא', 'negation'],
    ['עצור', 'negation'],
    ['תודה', 'social'],
    ['בבקשה', 'social'],
    ['שלום', 'social'],
    ['מה', 'question'],
    ['איפה', 'question'],
    ['למה', 'question'],
    ['גדול', 'adjective'],
    ['שמח', 'adjective'],
    ['יפה', 'adjective'],
    ['על', 'preposition'],
    ['ליד', 'preposition'],
    ['בתוך', 'preposition'],
    ['בית', 'noun'],
    ['אמא', 'noun'],
    ['כלב', 'noun'],
    ['או', 'conjunction'],
    ['אבל', 'conjunction'],
    ['גם', 'conjunction'],
    ['עכשיו', 'adverb'],
    ['מהר', 'adverb'],
    ['כאן', 'adverb'],
    ['כל', 'determiner'],
    ['הרבה', 'determiner'],
    ['מעט', 'determiner'],
  ];

  for (const [label, expected] of cases) {
    it(`"${label}" → ${expected}`, () => {
      expect(categoryForLabel(label)).toBe(expected);
    });
  }

  it('מחזיר undefined למילה לא מוכרת', () => {
    expect(categoryForLabel('שטויות')).toBeUndefined();
    expect(categoryForLabel('')).toBeUndefined();
  });

  it('מתעלם מפיסוק בסוף המילה', () => {
    expect(categoryForLabel('תודה.')).toBe('social');
    expect(categoryForLabel('מה?')).toBe('question');
  });
});
