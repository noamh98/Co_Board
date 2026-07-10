// data/backupValidation.ts — ולידציה ל-importBackup (Phase 3, H-IDB).
// CR (E): backupRepo.importBackup כתב JSON ללא ולידציה ישר ל-stores — קלט זדוני/פגום
// יכול להשחית את ה-DB. type-guards כאן מחווטים ב-backupRepo.importBackup (3.5).
// D-10 (3.8): פורמט 2 מוסיף media (תמונות+הקלטות כ-data-URI) ו-symbols אישיים — שלמות ייצוא.

import type { Board, Profile } from '../domain/models';

/** מבנה-העל של קובץ גיבוי בפועל — תואם BackupData ב-backupRepo.ts. */
export interface BackupEnvelope {
  /** 1 = boards/profiles/settings בלבד; 2 = כולל media + symbols (D-10). */
  backupFormat: 1 | 2;
  exportedAt: number;
  deviceId: string;
  boards: unknown[];
  profiles: unknown[];
  settings: Record<string, unknown>;
  /** פורמט 2 בלבד — רשומות מדיה עם dataUri במקום Blob. */
  media?: unknown[];
  /** פורמט 2 בלבד — רשומות symbols אישיות (הקלטות/העלאות; לא ARASAAC). */
  symbols?: unknown[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** בדיקת מעטפת: פורמט נתמך + שדות-על תקינים. זורק הודעת-עברית ברורה בכשל. */
export function assertValidBackup(data: unknown): asserts data is BackupEnvelope {
  if (!isRecord(data)) throw new Error('קובץ הגיבוי אינו תקין');
  if (data['backupFormat'] !== 1 && data['backupFormat'] !== 2) {
    throw new Error('פורמט הגיבוי אינו נתמך');
  }
  if (typeof data['exportedAt'] !== 'number') {
    throw new Error('קובץ הגיבוי אינו תקין — חסר תאריך ייצוא');
  }
  if (typeof data['deviceId'] !== 'string') {
    throw new Error('קובץ הגיבוי אינו תקין — חסר מזהה מכשיר');
  }
  for (const key of ['boards', 'profiles'] as const) {
    if (!Array.isArray(data[key])) {
      throw new Error(`שדה "${key}" בגיבוי פגום`);
    }
  }
  if (!isRecord(data['settings'])) {
    throw new Error('שדה "settings" בגיבוי פגום');
  }
  // D-10: בפורמט 2 media/symbols אופציונליים אך אם קיימים — חייבים להיות מערכים.
  for (const key of ['media', 'symbols'] as const) {
    if (data[key] !== undefined && !Array.isArray(data[key])) {
      throw new Error(`שדה "${key}" בגיבוי פגום`);
    }
  }
}

/** type-guard לרשומת board (מינימום: id+grid). הרחב לפי domain/models. */
export function isValidBoardRecord(v: unknown): v is Board {
  return isRecord(v) && typeof v['id'] === 'string' && isRecord(v['grid']);
}

/** type-guard לרשומת profile (מינימום: id+homeBoardId). */
export function isValidProfileRecord(v: unknown): v is Profile {
  return isRecord(v) && typeof v['id'] === 'string' && typeof v['homeBoardId'] === 'string';
}

/** רשומת מדיה בגיבוי (D-10): MediaEntry עם dataUri (base64) במקום Blob. */
export interface MediaBackupRecord {
  id: string;
  cellId: string;
  profileId: string;
  mimeType: string;
  dataUri: string;
  encrypted: boolean;
  source: string;
  createdAt: number;
}

/** type-guard לרשומת מדיה בגיבוי — dataUri חייב להיות data-URI אמיתי. */
export function isValidMediaBackupRecord(v: unknown): v is MediaBackupRecord {
  return (
    isRecord(v) &&
    typeof v['id'] === 'string' &&
    typeof v['cellId'] === 'string' &&
    typeof v['profileId'] === 'string' &&
    typeof v['mimeType'] === 'string' &&
    typeof v['dataUri'] === 'string' &&
    v['dataUri'].startsWith('data:') &&
    typeof v['createdAt'] === 'number'
  );
}

/** type-guard לרשומת symbol בגיבוי (הקלטה/העלאה אישית; uri הוא data-URI). */
export function isValidSymbolBackupRecord(
  v: unknown,
): v is { id: string; uri: string; mimeType: string; source: string; createdAt: number } {
  return (
    isRecord(v) &&
    typeof v['id'] === 'string' &&
    typeof v['uri'] === 'string' &&
    typeof v['mimeType'] === 'string' &&
    typeof v['source'] === 'string' &&
    typeof v['createdAt'] === 'number'
  );
}
