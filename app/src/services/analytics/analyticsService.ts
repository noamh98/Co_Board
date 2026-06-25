import { createSettingsRepo } from '../../data/settingsRepo';
import {
  logEvent,
  getEvents,
  clearProfileEvents,
} from '../../data/usageRepo';
import type { Cell } from '../../domain/models';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** fire-and-forget — לא חוסם TTS. no-op כש-analyticsEnabled=false. */
function trackCellPress(
  profileId: string,
  boardId: string,
  cell: Cell,
  sessionId: string,
): void {
  void (async () => {
    const repo = createSettingsRepo();
    if (!(await repo.getAnalyticsEnabled())) return;
    await logEvent({
      profileId,
      boardId,
      cellId: cell.id,
      label: cell.label,
      timestamp: Date.now(),
      sessionId,
    });
  })().catch(() => {
    // D3: fire-and-forget — כשל אנליטיקה לא יוצר unhandled rejection ולא חוסם TTS.
  });
}

async function getTopCells(
  profileId: string,
  n = 10,
  since?: number,
): Promise<{ label: string; count: number }[]> {
  const effectiveSince = since ?? Date.now() - WEEK_MS;
  const events = await getEvents(profileId, effectiveSince);
  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.label, (counts.get(e.label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

async function clearAllData(profileId: string): Promise<void> {
  await clearProfileEvents(profileId);
}

export const analyticsService = {
  trackCellPress,
  getTopCells,
  clearAllData,
};
