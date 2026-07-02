// presentation/state/panelState.ts — מזהה הפאנל הפתוח (R6 ב-REFACTOR-PLAN).
// מחליף 8 דגלי boolean נפרדים ב-App.tsx: מודאל אחד פתוח בכל רגע (התנהגות רצויה ממילא).

export type PanelId =
  | 'settings'
  | 'backup'
  | 'analytics'
  | 'wizard'
  | 'phraseBank'
  | 'wordFinder'
  | 'admin'
  | 'portal';
