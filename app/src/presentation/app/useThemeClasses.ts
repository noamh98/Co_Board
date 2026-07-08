// presentation/app/useThemeClasses.ts — classes גלובליים על <html> (R1 ב-REFACTOR-PLAN).
// חולץ מ-App.tsx כלשונו: dark-mode (הגדרת משתמש) + high-contrast (F4, מהגדרות הגישה).
// Phase 2 (2.3): נוספו reading-font (C-18, גופן קריא) + sensory-calm (C-06, ערכת רגיעה).

import { useCallback, useEffect, useState } from 'react';
import { setDarkMode as persistDarkMode } from '../../data/settingsRepo';

export function useThemeClasses(
  highContrast: boolean,
  readingFont = false,
  sensoryCalm = false,
) {
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

  // C-18: גופן קריא ידידותי-דיסלקציה — class על <html>, נשלט מהגדרות הגישה.
  useEffect(() => {
    if (readingFont) {
      document.documentElement.classList.add('reading-font');
    } else {
      document.documentElement.classList.remove('reading-font');
    }
  }, [readingFont]);

  // C-06: ערכת רגיעה חושית — class על <html>, נשלט מהגדרות הגישה.
  useEffect(() => {
    if (sensoryCalm) {
      document.documentElement.classList.add('sensory-calm');
    } else {
      document.documentElement.classList.remove('sensory-calm');
    }
  }, [sensoryCalm]);

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
