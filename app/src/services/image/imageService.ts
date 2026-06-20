export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
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

export async function compressToWebP(blob: Blob, maxKB?: number): Promise<Blob> {
  try {
    const img = await loadImage(blob);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((result) => {
        if (!result) {
          resolve(blob);
          return;
        }
        if (maxKB !== undefined && result.size > maxKB * 1024) {
          resolve(result);
          return;
        }
        resolve(result);
      }, 'image/webp', 0.85);
    });
  } catch {
    return blob;
  }
}
