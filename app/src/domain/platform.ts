// domain/platform.ts — זיהוי-פלטפורמה טהור (framework-free) עבור רמז ההתקנה ל-iOS (C-07).
//
// שכבת domain נשארת נטולת-תלות בדפדפן: הפונקציות מקבלות את מחרוזת ה-userAgent
// ואת דגלי ה-standalone כפרמטרים, כדי שיהיו בדיקות-יחידה דטרמיניסטיות ללא גלובלים.
// רכיב המצגת (InstallInstructions) הוא זה שקורא ל-navigator/window ומעביר לכאן.

/**
 * האם המכשיר הוא iOS (iPhone/iPad/iPod).
 * iPadOS 13+ מדווח כ-"Macintosh" עם מסך-מגע — לכן מזהים גם Mac עם maxTouchPoints>1.
 */
export function isIos(ua: string, maxTouchPoints = 0): boolean {
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS מתחזה ל-Mac; אין iPhone/iPod עם מסך-מגע ב-userAgent של Mac.
  return /Macintosh/.test(ua) && maxTouchPoints > 1;
}

/**
 * האם ה-userAgent הוא Safari *אמיתי* (ולא דפדפן-בתוך-אפליקציה או Chrome/Firefox/Edge ל-iOS).
 * חשוב: "הוסף למסך הבית" ב-iOS זמין רק ב-Safari, לא ב-CriOS/FxiOS/EdgiOS/דפדפני-WebView.
 */
export function isSafari(ua: string): boolean {
  if (!/Safari/.test(ua)) return false;
  // דפדפנים אחרים ל-iOS + WebViews נפוצים.
  return !/(CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram|Line\/)/.test(ua);
}

/** האם האפליקציה כבר רצה כ-PWA מותקנת (מסך-מלא). */
export function isInStandaloneMode(
  displayModeStandalone: boolean,
  navigatorStandalone?: boolean,
): boolean {
  return displayModeStandalone === true || navigatorStandalone === true;
}

export interface IosInstallHintInput {
  ua: string;
  maxTouchPoints?: number;
  displayModeStandalone: boolean;
  navigatorStandalone?: boolean;
  dismissed: boolean;
}

/**
 * האם להציג את רמז ההתקנה ל-iOS: רק ב-iOS Safari, כשאיננה מותקנת עדיין,
 * וכשהמשתמש לא סגר את הרמז בעבר. אחרת — לא מציגים (כדי לא להטריד).
 */
export function shouldShowIosInstallHint(input: IosInstallHintInput): boolean {
  const { ua, maxTouchPoints = 0, displayModeStandalone, navigatorStandalone, dismissed } = input;
  if (dismissed) return false;
  if (!isIos(ua, maxTouchPoints)) return false;
  if (!isSafari(ua)) return false;
  return !isInStandaloneMode(displayModeStandalone, navigatorStandalone);
}
