import { getDb, STORE_BOARDS } from './db';
import { recordLocalWrite } from './syncMeta';
import type { Board } from '../domain/models';

// מאגר לוחות מעל IndexedDB (Offline-first). מחיקה = ארכוב (archived=true), לא הסרה —
// כך שחזור גרסה/לוח שנמחק בטעות אפשרי גם אופליין (PRD §4.8/FR-022).

export interface BoardRepo {
  get(id: string): Promise<Board | undefined>;
  /** ברירת מחדל: רק לא-מאורכבים. includeArchived=true מחזיר הכול (לשחזור). */
  list(opts?: { includeArchived?: boolean }): Promise<Board[]>;
  save(board: Board): Promise<void>;
  /** ארכוב (מחיקה רכה) — הרשומה נשמרת עם archived=true. */
  archive(id: string): Promise<void>;
}

export function createBoardRepo(): BoardRepo {
  return {
    async get(id) {
      const db = await getDb();
      return (await db.get(STORE_BOARDS, id)) as Board | undefined;
    },
    async list(opts = {}) {
      const db = await getDb();
      const all = (await db.getAll(STORE_BOARDS)) as Board[];
      return opts.includeArchived ? all : all.filter((b) => !b.archived);
    },
    async save(board) {
      const db = await getDb();
      await db.put(STORE_BOARDS, board);
      // חיווט outbox (A1): כל שמירת לוח מקדמת version ונכנסת לתור הסנכרון.
      await recordLocalWrite('board', board.id, board);
    },
    async archive(id) {
      const db = await getDb();
      const existing = (await db.get(STORE_BOARDS, id)) as Board | undefined;
      if (!existing) return;
      await db.put(STORE_BOARDS, { ...existing, archived: true });
    },
  };
}
