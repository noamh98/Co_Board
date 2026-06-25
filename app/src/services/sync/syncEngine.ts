// services/sync/syncEngine.ts — מנוע סנכרון: pull→merge→push. אסינכרוני, לא חוסם UI.
// אינווריאנט: כשל רשת = no-op שקט (לא alert, לא throw לשכבת UI).
// PRD §4.8, HANDOFF §4.

import type { SyncProvider } from './syncProvider';
import { mergeLastWriteWins, type Versioned } from '../../domain/sync';
import { syncQueue } from '../../data/syncQueue';
import { getSyncMeta, setSyncMeta } from '../../data/syncMeta';
import { getLastSyncAt, setLastSyncAt } from '../../data/settingsRepo';
import { backupRepo } from '../../data/backupRepo';
import { getDb, STORE_BOARDS, STORE_PROFILES } from '../../data/db';
import type { Board, Profile } from '../../domain/models';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'disabled';

type StatusListener = (status: SyncStatus) => void;

export function createSyncEngine(provider: SyncProvider, syncEnabled: () => boolean) {
  let status: SyncStatus = 'idle';
  const listeners: StatusListener[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

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
    // guard נגד ריצה כפולה: סנכרון מקבילי עלול לדחוף/למזג פעמיים (A1).
    if (status === 'syncing') return;
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
      setStatus('idle');
    } catch {
      // כשל = no-op שקט. לא מציג שגיאה למשתמש בזמן שימוש ילד.
      setStatus('error');
    }
  }

  async function _doSync(): Promise<void> {
    const db = await getDb();

    // 1. pull אינקרמנטלי מהענן — מאז הסנכרון המוצלח האחרון (C2, נשמר ב-IDB).
    const since = await getLastSyncAt();
    const syncStartedAt = Date.now();
    const remoteRecords = await provider.pull(since);

    // 2. merge כל רשומה remote עם local
    for (const remote of remoteRecords) {
      if (remote.entityType === 'board') {
        const localBoard = (await db.get(STORE_BOARDS, remote.entityId)) as
          | Board
          | undefined;
        const remoteV = remote.versioned as Versioned<Board>;
        if (!localBoard) {
          await db.put(STORE_BOARDS, remoteV.data);
          await setSyncMeta('board', remote.entityId, {
            version: remoteV.version,
            updatedAt: remoteV.updatedAt,
            deviceId: remoteV.deviceId,
          });
          continue;
        }
        // LWW אמיתי: version/updatedAt מקומיים מ-syncMeta (לא 1/0 קשיחים).
        const meta = await getSyncMeta('board', remote.entityId);
        const localV: Versioned<Board> = {
          data: localBoard,
          version: meta?.version ?? 1,
          updatedAt: meta?.updatedAt ?? 0,
          deviceId: meta?.deviceId ?? provider.getDeviceId(),
        };
        const { winner, loser } = mergeLastWriteWins(localV, remoteV);
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
        if (winner === remoteV) {
          // remote ניצח → עדכן meta מקומי ובטל push מיושן מה-outbox (מונע דריסת ענן חדש).
          await setSyncMeta('board', remote.entityId, {
            version: remoteV.version,
            updatedAt: remoteV.updatedAt,
            deviceId: remoteV.deviceId,
          });
          await syncQueue.ack(`board:${remote.entityId}`);
        }
      } else if (remote.entityType === 'profile') {
        const localProfile = (await db.get(STORE_PROFILES, remote.entityId)) as
          | Profile
          | undefined;
        const remoteV = remote.versioned as Versioned<Profile>;
        if (!localProfile) {
          await db.put(STORE_PROFILES, remoteV.data);
          await setSyncMeta('profile', remote.entityId, {
            version: remoteV.version,
            updatedAt: remoteV.updatedAt,
            deviceId: remoteV.deviceId,
          });
          continue;
        }
        const meta = await getSyncMeta('profile', remote.entityId);
        const localV: Versioned<Profile> = {
          data: localProfile,
          version: meta?.version ?? 1,
          updatedAt: meta?.updatedAt ?? 0,
          deviceId: meta?.deviceId ?? provider.getDeviceId(),
        };
        const { winner, loser } = mergeLastWriteWins(localV, remoteV);
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
        if (winner === remoteV) {
          await setSyncMeta('profile', remote.entityId, {
            version: remoteV.version,
            updatedAt: remoteV.updatedAt,
            deviceId: remoteV.deviceId,
          });
          await syncQueue.ack(`profile:${remote.entityId}`);
        }
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

    // C2: שמור את חותמת הסנכרון — pull הבא יהיה אינקרמנטלי (לא מושך הכול שוב).
    await setLastSyncAt(syncStartedAt);
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
