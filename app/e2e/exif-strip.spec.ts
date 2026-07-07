import { test, expect } from '@playwright/test';

// E-02 regression: real-browser (Chromium) proof that a full canvas re-encode —
// the exact technique used by services/image/imageService.ts -> sanitizeImage —
// strips EXIF/GPS from an uploaded JPEG. jsdom cannot re-encode real pixels, so
// the actual byte-level strip is verified here rather than in the unit test.

// A tiny 4x4 JPEG carrying an EXIF APP1 segment with a GPS IFD (generated via Pillow).
const GPS_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/4QDIRXhpZgAATU0AKgAAAAgAAwEOAAIAAAAbAAAAMgEQAAIAAAAMAAAAToglAAQAAAABAAAAWgAAAABDb19Cb2FyZCBFWElGIHRlc3QgZml4dHVyZQAAVGVzdENhbSBHUFMAAAQAAQACAAAAAk4AAAAAAgAFAAAAAwAAAJAAAwACAAAAAkUAAAAABAAFAAAAAwAAAKgAAAAAAAAAHwAAAAEAAAAuAAAAAQAAAAAAAAABAAAAIwAAAAEAAAANAAAAAQAAAAAAAAAB/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgABAAEAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A8Cooor8yP7jP/9k=';

test('E-02: canvas re-encode strips EXIF/GPS metadata from an uploaded JPEG', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async (b64: string) => {
    const bin = atob(b64);
    const inBytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) inBytes[i] = bin.charCodeAt(i);
    const blob = new Blob([inBytes], { type: 'image/jpeg' });

    // Mirrors imageService.sanitizeImage: load -> drawImage -> toBlob('image/webp').
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('image load failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(img, 0, 0);
    const out = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob null'))),
        'image/webp',
        0.85,
      );
    });
    URL.revokeObjectURL(url);
    const outBytes = new Uint8Array(await out.arrayBuffer());
    const decode = (bytes: Uint8Array): string => new TextDecoder('latin1').decode(bytes);
    return { inText: decode(inBytes), outText: decode(outBytes), outLen: outBytes.length };
  }, GPS_JPEG_B64);

  // Sanity: the fixture really carried EXIF/GPS before stripping.
  expect(result.inText.includes('Exif\u0000\u0000')).toBe(true);
  expect(result.inText.includes('Co_Board EXIF test fixture')).toBe(true);

  // After re-encode: a valid image with all EXIF/GPS metadata removed.
  expect(result.outLen).toBeGreaterThan(0);
  expect(result.outText.includes('Exif\u0000\u0000')).toBe(false);
  expect(result.outText.includes('Co_Board EXIF test fixture')).toBe(false);
});
