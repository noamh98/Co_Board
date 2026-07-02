// presentation/app/useThemeClasses.ts — classes גלובליים על <html> (R1 ב-REFACTOR-PLAN).
// חולץ מ-App.tsx כלשונו: dark-mode (הגדרת משתמש) + high-contrast (F4, מהגדרות הגישה).

import { useCallback, useEffect, useState } from 'react';
import { setDarkMode as persistDarkMode } from '../../data/settingsRepo';

export function useThemeClasses(highContrast: boolean) {
  const [darkMode, setDarkModeState] = useState(false);

  // מחיל/מסיר class dark-mode על <html> כך שכל CSS tokens מתעדכנים
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // F4: ערכת ניגודיות גבוהה — class על <html> (כמו dark-mode), נשלט מהגדרות הגישה.
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  const onDarkModeChange = (enabled: boolean): void => {
    setDarkModeState(enabled);
    void persistDarkMode(enabled);
  };

  /** הידרציה מהאחסון בעת bootstrap — בלי persist חוזר. */
  const hydrate = useCallback((enabled: boolean): void => {
    setDarkModeState(enabled);
  }, []);

  return { darkMode, onDarkModeChange, hydrate };
}
