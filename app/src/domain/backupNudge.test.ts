import { describe, it, expect } from 'vitest';
import {
  daysSinceBackup,
  backupUrgency,
  getBackupStatus,
  backupNudgeText,
} from './backupNudge';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

describe('daysSinceBackup', () => {
  it('מחזיר null כשמעולם לא סונכרן (0)', () => {
    expect(daysSinceBackup(0, NOW)).toBeNull();
  });

  it('מחזיר null לערך לא-חיובי או לא-תקין', () => {
    expect(daysSinceBackup(-5, NOW)).toBeNull();
    expect(daysSinceBackup(Number.NaN, NOW)).toBeNull();
  });

  it('מחזיר 0 לגיבוי מהיום', () => {
    expect(daysSinceBackup(NOW - 3 * 60 * 60 * 1000, NOW)).toBe(0);
  });

  it('מעגל כלפי מטה למספר ימים שלמים', () => {
    expect(daysSinceBackup(NOW - 2 * DAY - 5 * 60 * 60 * 1000, NOW)).toBe(2);
  });

  it('חותמת עתידית (שעון מוטה) => 0', () => {
    expect(daysSinceBackup(NOW + 5 * DAY, NOW)).toBe(0);
  });
});

describe('backupUrgency', () => {
  it('never כשאין גיבוי', () => {
    expect(backupUrgency(null)).toBe('never');
  });

  it('ok מתחת ל-7 ימים', () => {
    expect(backupUrgency(0)).toBe('ok');
    expect(backupUrgency(6)).toBe('ok');
  });

  it('stale ב-7 עד 29 ימים', () => {
    expect(backupUrgency(7)).toBe('stale');
    expect(backupUrgency(29)).toBe('stale');
  });

  it('critical ב-30 ימים ומעלה', () => {
    expect(backupUrgency(30)).toBe('critical');
    expect(backupUrgency(365)).toBe('critical');
  });
});

describe('getBackupStatus', () => {
  it('משלב ימים ודחיפות', () => {
    expect(getBackupStatus(0, NOW)).toEqual({ daysSince: null, urgency: 'never' });
    expect(getBackupStatus(NOW - 10 * DAY, NOW)).toEqual({
      daysSince: 10,
      urgency: 'stale',
    });
  });
});

describe('backupNudgeText', () => {
  it('מעולם לא גובה', () => {
    expect(backupNudgeText({ daysSince: null, urgency: 'never' })).toContain('מעולם');
  });

  it('היום / אתמול / N ימים', () => {
    expect(backupNudgeText({ daysSince: 0, urgency: 'ok' })).toBe('גובה היום');
    expect(backupNudgeText({ daysSince: 1, urgency: 'ok' })).toBe('גובה אתמול');
    expect(backupNudgeText({ daysSince: 12, urgency: 'stale' })).toBe(
      'גובה לאחרונה לפני 12 ימים',
    );
  });
});
