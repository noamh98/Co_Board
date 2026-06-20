import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cropImage, removeBackground, compressToWebP } from './imageService';

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

  it('returns original blob when canvas.toBlob returns null', async () => {
    HTMLCanvasElement.prototype.toBlob = vi.fn(function (callback: BlobCallback) {
      callback(null);
    });
    const original = new Blob(['original'], { type: 'image/png' });
    const result = await compressToWebP(original);
    expect(result).toBe(original);
  });

  it('returns original blob when getContext returns null', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
    const original = new Blob(['original'], { type: 'image/png' });
    const result = await compressToWebP(original);
    expect(result).toBe(original);
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
