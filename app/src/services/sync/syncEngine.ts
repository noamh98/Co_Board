// services/sync/syncEngine.ts — מנוע סנכרון: pull→merge→push. אסינכרוני, לא חוסם UI.
// אינווריאנט: כשל רשת = no-op שקט (לא alert, לא throw לשכבת UI).
// PRD §4.8, HANDOFF §4.

import type { SyncProvider } from './syncProvider';
import { mergeLastWriteWins, type Versioned } from '../../domain/sync';
import { syncQueue } from '../../data/syncQueue';
import { backupRepo } from '../../data/backupRepo';
import { getDb, STORE_BOARDS, STORE_PROFILES } from '../../data/db';
import type { Board, Profile } from '../../domain/models';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'disabled';

type StatusListener = (status: SyncStatus) => void;

export function createSyncEngine(provider: SyncProvider, syncEnabled: () => boolean) {
  let status: SyncStatus = 'idle';
  const listeners: StatusListener[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSyncAt = 0;

  function setStatus(s: SyncStatus): void {
    status = s;
    listeners.forEach((l) => l(s));
  }

  function getStatus(): SyncStatus {
    return status;
  }

  function onStatusChange(listener: StatusListener): () => void {
    listeners.push(listener);
    return () => {
      const i = listeners.indexOf(listener);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  async function runSync(): Promise<void> {
    if (!syncEnabled()) {
      setStatus('disabled');
      return;
    }
    if (!navigator.onLine || !provider.isAvailable()) {
      setStatus('offline');
      return;
    }
    setStatus('syncing');
    try {
      await _doSync();
      lastSyncAt = Date.now();
      setStatus('idle');
    } catch {
      // כשל = no-op שקט. לא מציג שגיאה למשתמש בזמן שימוש ילד.
      setStatus('error');
    }
  }

  async function _doSync(): Promise<void> {
    const db = await getDb();

    // 1. pull מהענן
    const remoteRecords = await provider.pull(lastSyncAt);

    // 2. merge כל רשומה remote עם local
    for (const remote of remoteRecords) {
      if (remote.entityType === 'board') {
        const localBoard = (await db.get(STORE_BOARDS, remote.entityId)) as
          | Board
          | undefined;
        if (!localBoard) {
          await db.put(STORE_BOARDS, remote.versioned.data as Board);
          continue;
        }
        const localV: Versioned<Board> = {
          data: localBoard,
          version: 1,
          updatedAt: 0,
          deviceId: provider.getDeviceId(),
        };
        const { winner, loser } = mergeLastWriteWins(localV, remote.versioned as Versioned<Board>);
        if (loser) {
          await backupRepo.saveVersion({
            entityType: 'board',
            entityId: remote.entityId,
            version: loser.version,
            savedAt: Date.now(),
            data: loser.data,
          });
        }
        await db.put(STORE_BOARDS, winner.data);
      } else if (remote.entityType === 'profile') {
        const localProfile = (await db.get(STORE_PROFILES, remote.entityId)) as
          | Profile
          | undefined;
        if (!localProfile) {
          await db.put(STORE_PROFILES, remote.versioned.data as Profile);
          continue;
        }
        const localV: Versioned<Profile> = {
          data: localProfile,
          version: 1,
          updatedAt: 0,
          deviceId: provider.getDeviceId(),
        };
        const { winner, loser } = mergeLastWriteWins(localV, remote.versioned as Versioned<Profile>);
        if (loser) {
          await backupRepo.saveVersion({
            entityType: 'profile',
            entityId: remote.entityId,
            version: loser.version,
            savedAt: Date.now(),
            data: loser.data,
          });
        }
        await db.put(STORE_PROFILES, winner.data);
      }
    }

    // 3. push outbox לענן
    const pending = await syncQueue.peek(50);
    if (pending.length > 0) {
      const records = pending.map((item) => ({
        entityType: item.entityType,
        entityId: item.entityId,
        versioned: {
          data: item.data,
          version: item.version,
          updatedAt: item.updatedAt,
          deviceId: item.deviceId,
        } satisfies Versioned<unknown>,
      }));
      await provider.push(records);
      await syncQueue.ackAll(pending.map((p) => p.id));
    }
  }

  /** קריאה מ-UI אחרי שמירה מקומית — debounce 3 שניות. */
  function scheduleSync(delayMs = 3000): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void runSync();
    }, delayMs);
  }

  function dispose(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
  }

  return { runSync, scheduleSync, getStatus, onStatusChange, dispose };
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;
