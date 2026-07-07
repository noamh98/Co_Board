// Phase 1: שירות זה אינו מבצע fetch חיצוני, וכל object URL נוצר ב-loadImage משוחרר
// (URL.revokeObjectURL) גם ב-onload וגם ב-onerror — אין דליפת זיכרון ואין מה לעטוף ב-timeout.
//
// E-02: כל נתיב ייבוא תמונה אישית עובר re-encode דרך canvas (sanitizeImage / cropImage /
// compressToWebP) שמסיר EXIF/GPS. ההבטחה: fail-closed — בכל כשל נזרקת שגיאה ולעולם לא
// מוחזר ה-blob המקורי (שעלול להכיל מיקום/מטא-דאטה של קטין).

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** נזרקת כאשר לא ניתן ל-re-encode תמונה (ולכן לא ניתן להסיר EXIF/GPS). */
export class ImageSanitizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageSanitizeError';
  }
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export async function cropImage(file: File, rect: CropRect): Promise<Blob> {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = rect.width;
  canvas.height = rect.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob returned null'));
    }, 'image/png');
  });
}

export async function removeBackground(blob: Blob): Promise<Blob> {
  return Promise.resolve(blob);
}

/**
 * E-02: מסיר מטא-דאטה (EXIF/GPS/ICC) מתמונה ע"י re-encode מלא דרך canvas.
 * הבטחת אבטחה — לא ניתן לעקיפה: בכל כשל (טעינה / context / toBlob) נזרקת
 * ImageSanitizeError במקום להחזיר את ה-blob המקורי. כך אף נתיב שקורא לפונקציה
 * לא יכול לשמור בטעות את הבייטים המקוריים עם מיקום GPS של קטין (fail-closed).
 */
export async function sanitizeImage(
  input: Blob,
  type: 'image/webp' | 'image/png' = 'image/webp',
  quality = 0.85,
): Promise<Blob> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(input);
  } catch (err) {
    throw new ImageSanitizeError(
      `Cannot load image for metadata stripping: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new ImageSanitizeError('Canvas 2D context unavailable — cannot strip image metadata');
  }
  ctx.drawImage(img, 0, 0);
  const result = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
  if (!result) {
    throw new ImageSanitizeError('canvas.toBlob returned null — cannot strip image metadata');
  }
  return result;
}

/**
 * E-02: דחיסה ל-WebP הבנויה מעל sanitizeImage — מסירה EXIF/GPS ואינה נופלת חזרה
 * ל-blob המקורי (בכשל נזרקת ImageSanitizeError). הפרמטר maxKB נשמר לתאימות חתימה בלבד.
 */
export async function compressToWebP(blob: Blob, _maxKB?: number): Promise<Blob> {
  return sanitizeImage(blob, 'image/webp', 0.85);
}
