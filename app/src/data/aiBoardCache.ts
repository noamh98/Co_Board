// data/aiBoardCache.ts — cache ללוחות שנוצרו ב-AI (Phase 1, F2).
// מפתח: hash(topic+grid+level). יצירה חוזרת של אותו לוח מחזירה מ-IDB — מונעת הוצאת LLM
// חוזרת ומאיצה את חוויית "הדקה". offline-first: cache hit עובד גם ללא רשת.

import { getDb, STORE_AI_CACHE } from './db';
import type { Board, GridSize } from '../domain/models';

interface AiCacheEntry {
  cacheKey: string;
  board: Board;
  cachedAt: number;
}

/** מפתח דטרמיניסטי לנושא+גריד (+level אופציונלי). SHA-256 → hex. */
export async function buildAiCacheKey(
  topic: string,
  grid: GridSize,
  level?: number,
): Promise<string> {
  const raw = `${topic.trim().toLowerCase()}\x00${grid.rows}x${grid.cols}\x00${level ?? ''}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function getCachedAiBoard(cacheKey: string): Promise<Board | null> {
  const db = await getDb();
  const entry = (await db.get(STORE_AI_CACHE, cacheKey)) as AiCacheEntry | undefined;
  return entry?.board ?? null;
}

export async function saveAiBoardToCache(cacheKey: string, board: Board): Promise<void> {
  const db = await getDb();
  await db.put(STORE_AI_CACHE, { cacheKey, board, cachedAt: Date.now() } satisfies AiCacheEntry);
}
