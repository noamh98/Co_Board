// data/backupValidation.ts — ולידציה ל-importBackup (Phase 3, H-IDB).
// CR (E): backupRepo.importBackup כתב JSON ללא ולידציה ישר ל-stores — קלט זדוני/פגום
// יכול להשחית את ה-DB. type-guards כאן מחווטים ב-backupRepo.importBackup (3.5).

import type { Board, Profile } from '../domain/models';

/** מבנה-העל של קובץ גיבוי בפועל — תואם BackupData ב-backupRepo.ts. */
export interface BackupEnvelope {
  backupFormat: 1;
  exportedAt: number;
  deviceId: string;
  boards: unknown[];
  profiles: unknown[];
  settings: Record<string, unknown>;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** בדיקת מעטפת: פורמט נתמך + שדות-על תקינים. זורק הודעת-עברית ברורה בכשל. */
export function assertValidBackup(data: unknown): asserts data is BackupEnvelope {
  if (!isRecord(data)) throw new Error('קובץ הגיבוי אינו תקין');
  if (data['backupFormat'] !== 1) {
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
}

/** type-guard לרשומת board (מינימום: id+grid). הרחב לפי domain/models. */
export function isValidBoardRecord(v: unknown): v is Board {
  return isRecord(v) && typeof v['id'] === 'string' && isRecord(v['grid']);
}

/** type-guard לרשומת profile (מינימום: id+homeBoardId). */
export function isValidProfileRecord(v: unknown): v is Profile {
  return isRecord(v) && typeof v['id'] === 'string' && typeof v['homeBoardId'] === 'string';
}
