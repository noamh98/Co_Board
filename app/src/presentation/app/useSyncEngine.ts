// presentation/app/useSyncEngine.ts — חיווט מנוע הסנכרון (R5 ב-REFACTOR-PLAN).
// חולץ מ-App.tsx כלשונו, כולל ה-ref המסונכרן וה-eslint-disable הממוקד.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSyncEngine,
  type SyncEngine,
  type SyncStatus as SyncStatusType,
} from '../../services/sync/syncEngine';
import { LocalStubProvider } from '../../services/sync/syncProvider';
import { FirebaseProvider } from '../../services/sync/firebaseProvider';
import { getSyncEnabled, setSyncEnabled as persistSyncEnabled } from '../../data/settingsRepo';
import type { AuthUser } from '../../services/sync/authService';

export function useSyncEngine(authUser: AuthUser | null) {
  const [syncEnabled, setSyncEnabledState] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>('disabled');
  const syncEngineRef = useRef<SyncEngine | null>(null);
  // ref מסונכרן עם syncEnabled state כדי שקרוב syncEngine תמיד יראה ערך נוכחי
  const syncEnabledRef = useRef(false);

  // B-11 (R-03): הידרציה של העדפת הסנכרון הנשמרת — משפחה שהפעילה גיבוי ענן
  // לא מאבדת את הבחירה בכל ריענון, כך שהסנכרון חוזר אוטומטית. ברירת המחדל
  // נשארת false (מקומי בלבד) — נתוני קטינים לא עולים לענן ללא הסכמה מפורשת.
  useEffect(() => {
    let alive = true;
    void getSyncEnabled().then((enabled) => {
      if (alive && enabled) setSyncEnabledState(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // B-11: setter שמתמיד את הבחירה ל-IDB בנוסף ל-state (חתימה זהה ל-callers).
  const setSyncEnabled = useCallback((enabled: boolean) => {
    setSyncEnabledState(enabled);
    void persistSyncEnabled(enabled);
  }, []);

  // עדכן ref כשה-state משתנה
  useEffect(() => {
    syncEnabledRef.current = syncEnabled;
  }, [syncEnabled]);

  // צור/החלף מנוע סנכרון כשה-provider משתנה (auth + syncEnabled)
  // אינוריאנט: FirebaseProvider נוצר רק כש-syncEnabled=true && authUser קיים
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
