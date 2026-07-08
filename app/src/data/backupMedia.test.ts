import { describe, it, expect } from 'vitest';
import {
  blobToBase64,
  base64ToBlob,
  serializeMediaEntry,
  deserializeMediaEntry,
} from './backupMedia';
import type { MediaEntry } from './mediaRepo';

describe('backupMedia — codec base64', () => {
  it('blobToBase64 → base64ToBlob שומר את התוכן (round-trip)', async () => {
    const original = new Blob(['שלום עולם 123'], { type: 'image/webp' });
    const b64 = await blobToBase64(original);
    expect(typeof b64).toBe('string');
    const restored = base64ToBlob(b64, 'image/webp');
    expect(restored.type).toBe('image/webp');
    expect(await restored.text()).toBe('שלום עולם 123');
  });

  it('מטפל בבלוב בינארי (בתים לא-ASCII)', async () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 254, 128, 127]);
    const original = new Blob([bytes], { type: 'image/png' });
    const restored = base64ToBlob(await blobToBase64(original), 'image/png');
    const out = new Uint8Array(await restored.arrayBuffer());
    expect(Array.from(out)).toEqual([0, 1, 2, 255, 254, 128, 127]);
  });

  it('מטפל בבלוב ריק', async () => {
    const b64 = await blobToBase64(new Blob([], { type: 'image/webp' }));
    expect(b64).toBe('');
    const restored = base64ToBlob('', 'image/webp');
    expect(await restored.text()).toBe('');
  });
});

describe('backupMedia — serialize/deserialize MediaEntry', () => {
  const entry: MediaEntry = {
    id: 'm-1',
    cellId: 'c-1',
    profileId: 'p-1',
    mimeType: 'image/jpeg',
    blob: new Blob(['payload'], { type: 'image/jpeg' }),
    encrypted: true,
    source: 'camera',
    createdAt: 42,
    syncedAt: 99,
  };

  it('serialize מקודד את הבלוב ושומר את המטא-דאטה', async () => {
    const s = await serializeMediaEntry(entry);
    expect(s.id).toBe('m-1');
    expect(s.encrypted).toBe(true);
    expect(s.source).toBe('camera');
    expect(s.syncedAt).toBe(99);
    expect(typeof s.dataBase64).toBe('string');
    expect('blob' in s).toBe(false);
  });

  it('deserialize משחזר MediaEntry עם Blob תואם-תוכן', async () => {
    const restored = deserializeMediaEntry(await serializeMediaEntry(entry));
    expect(restored.id).toBe('m-1');
    expect(restored.mimeType).toBe('image/jpeg');
    expect(restored.encrypted).toBe(true);
    expect(await restored.blob.text()).toBe('payload');
  });
});
