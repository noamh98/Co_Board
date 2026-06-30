// data/backupValidation.ts — ולידציה ל-importBackup (Phase 3, H-IDB). ⚠️ scaffold-נתמך.
// CR (E): backupRepo.importBackup כותב JSON ללא ולידציה ישר ל-stores — קלט זדוני/פגום
// יכול להשחית את ה-DB. כאן type-guards אמיתיים; יש לחווט אותם ב-backupRepo.importBackup.

/** מבנה-העל הצפוי של קובץ גיבוי. הרחב לפי הפורמט בפועל ב-backupRepo. */
export interface BackupEnvelope {
  backupFormat: string; // למשל 'co-board-v1'
  exportedAt: number;
  boards?: unknown[];
  profiles?: unknown[];
  settings?: unknown[];
}

const SUPPORTED_FORMATS = new Set(['co-board-v1']);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** בדיקת מעטפת: פורמט נתמך + שדות-על תקינים. זורק הודעת-עברית ברורה בכשל. */
export function assertValidBackup(data: unknown): asserts data is BackupEnvelope {
  if (!isRecord(data)) throw new Error('קובץ הגיבוי אינו תקין');
  const fmt = data['backupFormat'];
  if (typeof fmt !== 'string' || !SUPPORTED_FORMATS.has(fmt)) {
    throw new Error('פורמט הגיבוי אינו נתמך');
  }
  for (const key of ['boards', 'profiles', 'settings'] as const) {
    const v = data[key];
    if (v !== undefined && !Array.isArray(v)) {
      throw new Error(`שדה "${key}" בגיבוי פגום`);
    }
  }
}

/** type-guard לרשומת board (מינימום: id+grid). הרחב לפי domain/models. */
export function isValidBoardRecord(v: unknown): boolean {
  return isRecord(v) && typeof v['id'] === 'string' && isRecord(v['grid']);
}

// TODO(Phase 3): ב-backupRepo.importBackup — לקרוא assertValidBackup(parsed) לפני כל put,
//   ולסנן רשומות עם isValidBoardRecord (לדחות במקום לשבור את ה-DB). להוסיף טסט.
