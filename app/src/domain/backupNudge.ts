// domain/backupNudge.ts — לוגיקה טהורה לחיווי "גובה לאחרונה" (B-11, R-03).
// שכבת domain: TypeScript טהור, ללא תלות ב-IO/DOM. משמש את נדג' הגיבוי.
// R-03: אובדן המכשיר = אובדן הלוחות ("הקול") של הילד/ה — לכן דוחפים לגיבוי.

const DAY_MS = 24 * 60 * 60 * 1000;

/** סף ימים שמעליו הגיבוי נחשב מיושן. */
const STALE_DAYS = 7;
/** סף ימים שמעליו הגיבוי נחשב קריטי. */
const CRITICAL_DAYS = 30;

export type BackupUrgency = 'never' | 'ok' | 'stale' | 'critical';

export interface BackupStatus {
  /** מספר ימים שלמים מאז הגיבוי המוצלח האחרון, או null אם מעולם לא גובה. */
  daysSince: number | null;
  urgency: BackupUrgency;
}

/**
 * מספר ימים שלמים מאז lastSyncAt (epoch ms).
 * 0 או ערך לא-חיובי => מעולם לא סונכרן => null.
 * חותמת עתידית (שעון מוטה) מטופלת כ-0 ימים.
 */
export function daysSinceBackup(
  lastSyncAt: number,
  now: number = Date.now(),
): number | null {
  if (!Number.isFinite(lastSyncAt) || lastSyncAt <= 0) return null;
  const diff = now - lastSyncAt;
  if (diff <= 0) return 0;
  return Math.floor(diff / DAY_MS);
}

/** דרגת דחיפות מתוך מספר הימים מאז הגיבוי האחרון. */
export function backupUrgency(daysSince: number | null): BackupUrgency {
  if (daysSince === null) return 'never';
  if (daysSince >= CRITICAL_DAYS) return 'critical';
  if (daysSince >= STALE_DAYS) return 'stale';
  return 'ok';
}

/** מצב גיבוי מלא (ימים + דחיפות) מתוך lastSyncAt. */
export function getBackupStatus(
  lastSyncAt: number,
  now: number = Date.now(),
): BackupStatus {
  const daysSince = daysSinceBackup(lastSyncAt, now);
  return { daysSince, urgency: backupUrgency(daysSince) };
}

/** טקסט עברי קצר לתצוגת הנדג'. */
export function backupNudgeText(status: BackupStatus): string {
  if (status.daysSince === null) return 'הנתונים מעולם לא גובו לענן';
  if (status.daysSince === 0) return 'גובה היום';
  if (status.daysSince === 1) return 'גובה אתמול';
  return `גובה לאחרונה לפני ${status.daysSince} ימים`;
}
