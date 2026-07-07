import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cropImage,
  removeBackground,
  compressToWebP,
  sanitizeImage,
  ImageSanitizeError,
} from './imageService';

// Mock URL methods
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:mock'),
  revokeObjectURL: vi.fn(),
});

// Auto-fire onload when src is set on any HTMLImageElement
Object.defineProperty(HTMLImageElement.prototype, 'src', {
  set(_url: string) {
    setTimeout(() => {
      if (this.onload) this.onload(new Event('load'));
    }, 0);
  },
  get() {
    return '';
  },
  configurable: true,
});

// Provide naturalWidth/naturalHeight so canvas sizing doesn't produce 0x0
Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
  get() { return 100; },
  configurable: true,
});
Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
  get() { return 100; },
  configurable: true,
});

const fakeBlob = new Blob(['fake'], { type: 'image/webp' });

const fakeContext = {
  drawImage: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeContext) as any;
  HTMLCanvasElement.prototype.toBlob = vi.fn(function (
    callback: BlobCallback,
    _type?: string,
    _quality?: number
  ) {
    callback(fakeBlob);
  });
});

// --- E-02: GPS-tagged JPEG fixture (real EXIF + GPS IFD, generated via Pillow) ---
// jsdom mocks the canvas, so the REAL pixel re-encode / EXIF strip is asserted in
// the Playwright e2e (app/e2e/exif-strip.spec.ts). Here we only prove the fixture
// genuinely carries EXIF/GPS and that our byte detector is correct.
const GPS_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/4QDIRXhpZgAATU0AKgAAAAgAAwEOAAIAAAAbAAAAMgEQAAIAAAAMAAAAToglAAQAAAABAAAAWgAAAABDb19Cb2FyZCBFWElGIHRlc3QgZml4dHVyZQAAVGVzdENhbSBHUFMAAAQAAQACAAAAAk4AAAAAAgAFAAAAAwAAAJAAAwACAAAAAkUAAAAABAAFAAAAAwAAAKgAAAAAAAAAHwAAAAEAAAAuAAAAAQAAAAAAAAABAAAAIwAAAAEAAAANAAAAAQAAAAAAAAAB/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgABAAEAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A8Cooor8yP7jP/9k=';

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesContainAscii(bytes: Uint8Array, needle: string): boolean {
  const codes = Array.from(needle).map((c) => c.charCodeAt(0));
  for (let i = 0; i + codes.length <= bytes.length; i += 1) {
    let match = true;
    for (let j = 0; j < codes.length; j += 1) {
      if (bytes[i + j] !== codes[j]) { match = false; break; }
    }
    if (match) return true;
  }
  return false;
}

describe('removeBackground', () => {
  it('returns the same blob unchanged', async () => {
    const blob = new Blob(['data'], { type: 'image/png' });
    const result = await removeBackground(blob);
    expect(result).toBe(blob);
  });

  it('does not throw with an empty blob', async () => {
    const empty = new Blob([]);
    await expect(removeBackground(empty)).resolves.toBe(empty);
  });
});

describe('compressToWebP', () => {
  it('returns a Blob', async () => {
    const blob = new Blob(['data'], { type: 'image/png' });
    const result = await compressToWebP(blob);
    expect(result).toBeInstanceOf(Blob);
  });

  it('does not throw', async () => {
    const blob = new Blob(['data'], { type: 'image/png' });
    await expect(compressToWebP(blob)).resolves.toBeDefined();
  });

  it('throws (never returns the original) when canvas.toBlob returns null', async () => {
    HTMLCanvasElement.prototype.toBlob = vi.fn(function (callback: BlobCallback) {
      callback(null);
    });
    const original = new Blob(['original'], { type: 'image/png' });
    await expect(compressToWebP(original)).rejects.toBeInstanceOf(ImageSanitizeError);
  });

  it('throws (never returns the original) when getContext returns null', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
    const original = new Blob(['original'], { type: 'image/png' });
    await expect(compressToWebP(original)).rejects.toBeInstanceOf(ImageSanitizeError);
  });
});

describe('sanitizeImage (E-02: non-bypassable EXIF/GPS strip)', () => {
  it('returns a re-encoded blob, not the original input', async () => {
    const original = new Blob(['original'], { type: 'image/jpeg' });
    const result = await sanitizeImage(original);
    expect(result).toBe(fakeBlob);
    expect(result).not.toBe(original);
  });

  it('throws ImageSanitizeError when canvas.toBlob returns null', async () => {
    HTMLCanvasElement.prototype.toBlob = vi.fn(function (callback: BlobCallback) {
      callback(null);
    });
    await expect(
      sanitizeImage(new Blob(['x'], { type: 'image/jpeg' })),
    ).rejects.toBeInstanceOf(ImageSanitizeError);
  });

  it('throws ImageSanitizeError when getContext returns null', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
    await expect(
      sanitizeImage(new Blob(['x'], { type: 'image/jpeg' })),
    ).rejects.toBeInstanceOf(ImageSanitizeError);
  });

  it('throws ImageSanitizeError when the image fails to load (no original fallback)', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      set(_url: string) {
        setTimeout(() => {
          if (this.onerror) this.onerror(new Event('error'));
        }, 0);
      },
      get() {
        return '';
      },
      configurable: true,
    });
    try {
      await expect(
        sanitizeImage(new Blob(['x'], { type: 'image/jpeg' })),
      ).rejects.toBeInstanceOf(ImageSanitizeError);
    } finally {
      if (descriptor) Object.defineProperty(HTMLImageElement.prototype, 'src', descriptor);
    }
  });
});

describe('GPS EXIF fixture (E-02 regression baseline)', () => {
  it('the fixture JPEG genuinely contains EXIF + GPS metadata (detector sanity)', () => {
    const bytes = base64ToBytes(GPS_JPEG_B64);
    let hasApp1 = false;
    for (let i = 0; i + 1 < bytes.length; i += 1) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xe1) { hasApp1 = true; break; }
    }
    expect(hasApp1).toBe(true);
    expect(bytesContainAscii(bytes, 'Exif\u0000\u0000')).toBe(true);
    expect(bytesContainAscii(bytes, 'Co_Board EXIF test fixture')).toBe(true);
  });
});

describe('cropImage', () => {
  it('returns a Blob', async () => {
    const file = new File(['data'], 'test.png', { type: 'image/png' });
    const result = await cropImage(file, { x: 0, y: 0, width: 50, height: 50 });
    expect(result).toBeInstanceOf(Blob);
  });

  it('does not throw', async () => {
    const file = new File(['data'], 'test.png', { type: 'image/png' });
    await expect(cropImage(file, { x: 0, y: 0, width: 10, height: 10 })).resolves.toBeDefined();
  });

  it('calls drawImage on the canvas context', async () => {
    const file = new File(['data'], 'test.png', { type: 'image/png' });
    await cropImage(file, { x: 5, y: 10, width: 40, height: 30 });
    expect(fakeContext.drawImage).toHaveBeenCalled();
  });
});
