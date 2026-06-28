import { useCallback, useEffect, useState } from 'react';
import {
  type AccessSettings,
  DEFAULT_ACCESS_SETTINGS,
} from '../../domain/accessSettings';
import { createSettingsRepo } from '../../data/settingsRepo';

// presentation/state/useAccessSettings.ts — חילוץ ניהול הגדרות-גישה מ-App.tsx (H-APP, Phase 3).
// מימוש פונקציונלי מלא (לא stub): טוען מ-IDB פעם אחת, שומר בכל שינוי. App.tsx יכול לאמץ
// אותו במקום ה-useState + onChangeAccess הידניים. אינווריאנט: אפס שינוי-התנהגות.

export interface UseAccessSettings {
  accessSettings: AccessSettings;
  setAccessSettings: (next: AccessSettings) => void;
  /** עדכון שדה בודד (immutably) + שמירה. */
  patch: (partial: Partial<AccessSettings>) => void;
}

export function useAccessSettings(): UseAccessSettings {
  const [accessSettings, setState] = useState<AccessSettings>(DEFAULT_ACCESS_SETTINGS);

  useEffect(() => {
    let alive = true;
    void createSettingsRepo()
      .getAccessSettings()
      .then((s) => {
        if (alive) setState(s);
      });
    return () => {
      alive = false;
    };
  }, []);

  const setAccessSettings = useCallback((next: AccessSettings) => {
    setState(next);
    void createSettingsRepo().saveAccessSettings(next);
  }, []);

  const patch = useCallback(
    (partial: Partial<AccessSettings>) => {
      setState((prev) => {
        const next = { ...prev, ...partial };
        void createSettingsRepo().saveAccessSettings(next);
        return next;
      });
    },
    [],
  );

  return { accessSettings, setAccessSettings, patch };
}
