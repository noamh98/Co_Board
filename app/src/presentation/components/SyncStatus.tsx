// presentation/components/SyncStatus.tsx — מחוון סטטוס סנכרון בממשק מבוגר.
// מוצג ב-AdultBar. לא מוצג במצב ילד נעול.

import type { SyncStatus as SyncStatusType } from '../../services/sync/syncEngine';

interface Props {
  status: SyncStatusType;
  pendingCount?: number;
}

const LABELS: Record<SyncStatusType, string> = {
  idle: 'מסונכרן',
  syncing: 'מסנכרן…',
  error: 'שגיאת סנכרון',
  offline: 'לא מחובר',
  disabled: 'סנכרון כבוי',
};

const STATUS_CLASS: Record<SyncStatusType, string> = {
  idle: 'sync-status--ok',
  syncing: 'sync-status--busy',
  error: 'sync-status--error',
  offline: 'sync-status--offline',
  disabled: 'sync-status--disabled',
};

export function SyncStatus({ status, pendingCount }: Props) {
  return (
    <span
      className={`sync-status ${STATUS_CLASS[status]}`}
      aria-label={`סטטוס סנכרון: ${LABELS[status]}`}
      title={pendingCount ? `${pendingCount} שינויים ממתינים` : undefined}
    >
      {LABELS[status]}
      {status === 'syncing' && <span className="sync-status__spinner" aria-hidden="true" />}
      {pendingCount != null && pendingCount > 0 && status !== 'syncing' && (
        <span className="sync-status__badge">{pendingCount}</span>
      )}
    </span>
  );
}
