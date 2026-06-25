import { describe, it, expect } from 'vitest';
import { emptyModel, learn, predictNext } from './predictor';

describe('predictor — I2', () => {
  function trained() {
    let m = emptyModel();
    m = learn(m, ['אני', 'רוצה', 'לאכול']);
    m = learn(m, ['אני', 'רוצה', 'לשתות']);
    m = learn(m, ['אני', 'אוהב', 'אותך']);
    return m;
  }

  it('מנבא לפי bigram — אחרי "אני" → "רוצה" (תדירות גבוהה)', () => {
    const preds = predictNext(trained(), ['אני']);
    expect(preds[0].word).toBe('רוצה');
  });

  it('אחרי "רוצה" מציע מילים שעקבו אחריה', () => {
    const preds = predictNext(trained(), ['אני', 'רוצה']).map((p) => p.word);
    expect(preds).toContain('לאכול');
    expect(preds).toContain('לשתות');
  });

  it('candidates מגביל למילות הלוח', () => {
    const preds = predictNext(trained(), ['אני'], { candidates: ['אוהב'] });
    expect(preds.map((p) => p.word)).toEqual(['אוהב']);
  });

  it('topN מגביל את מספר ההצעות', () => {
    const preds = predictNext(trained(), [], { topN: 2 });
    expect(preds.length).toBeLessThanOrEqual(2);
  });

  it('לא מציע את המילה האחרונה עצמה', () => {
    const preds = predictNext(trained(), ['רוצה']).map((p) => p.word);
    expect(preds).not.toContain('רוצה');
  });
});
