// presentation/app/useSyncEngine.ts — חיווט מנוע הסנכרון (R5 ב-REFACTOR-PLAN).
// חולץ מ-App.tsx כלשונו, כולל ה-ref המסונכרן וה-eslint-disable המנומק.

import { useEffect, useRef, useState } from 'react';
import {
  createSyncEngine,
  type SyncEngine,
  type SyncStatus as SyncStatusType,
} from '../../services/sync/syncEngine';
import { LocalStubProvider } from '../../services/sync/syncProvider';
import { FirebaseProvider } from '../../services/sync/firebaseProvider';
import type { AuthUser } from '../../services/sync/authService';

export function useSyncEngine(authUser: AuthUser | null) {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>('disabled');
  const syncEngineRef = useRef<SyncEngine | null>(null);
  // ref מסנכרן עם syncEnabled state כדי שקרוב syncEngine תמיד יראה ערך נוכחי
  const syncEnabledRef = useRef(false);

  // עדכן ref כשה-state משתנה
  useEffect(() => {
    syncEnabledRef.current = syncEnabled;
  }, [syncEnabled]);

  // צור/החלף מנוע סנכרון כשה-provider משתנה (auth + syncEnabled)
  // אינווריאנט: FirebaseProvider נוצר רק כש-syncEnabled=true && authUser קיים
  useEffect(() => {
    syncEngineRef.current?.dispose();

    const provider =
      syncEnabled && authUser ? new FirebaseProvider() : new LocalStubProvider();

    const engine = createSyncEngine(provider, () => syncEnabledRef.current);
    syncEngineRef.current = engine;
    const unsub = engine.onStatusChange(setSyncStatus);

    // C1: חזרת רשת → סנכרון אוטומטי (עריכות אופליין מפסיקות להישאר תקועות עד reload).
    const onOnline = (): void => {
      void engine.runSync();
    };
    window.addEventListener('online', onOnline);

    if (syncEnabled && authUser) {
      void engine.runSync();
    } else {
      setSyncStatus('disabled');
    }

    return () => {
      unsub();
      window.removeEventListener('online', onOnline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncEnabled, authUser?.uid]);

  return { syncEnabled, setSyncEnabled, syncStatus, syncEngineRef };
}
