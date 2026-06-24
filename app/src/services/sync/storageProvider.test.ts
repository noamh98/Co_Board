import { describe, it, expect } from 'vitest';
import { LocalStubStorageProvider } from './storageProvider';

describe('LocalStubStorageProvider', () => {
  it('isAvailable מחזיר true תמיד', () => {
    const provider = new LocalStubStorageProvider();
    expect(provider.isAvailable()).toBe(true);
  });

  it('upload שומר blob ומחזיר stub:// URL', async () => {
    const provider = new LocalStubStorageProvider();
    const blob = new Blob(['data'], { type: 'application/octet-stream' });
    const url = await provider.upload('test/path/file.bin', blob);
    expect(url).toBe('stub://test/path/file.bin');
    expect(provider.storedPaths()).toContain('test/path/file.bin');
  });

  it('download מחזיר blob שהועלה', async () => {
    const provider = new LocalStubStorageProvider();
    const original = new Blob(['hello'], { type: 'application/octet-stream' });
    await provider.upload('a/b/c', original);
    const downloaded = await provider.download('a/b/c');
    const text = await downloaded.text();
    expect(text).toBe('hello');
  });

  it('download על path לא קיים זורק שגיאה', async () => {
    const provider = new LocalStubStorageProvider();
    await expect(provider.download('no/such/path')).rejects.toThrow('not found');
  });

  it('delete מסיר blob', async () => {
    const provider = new LocalStubStorageProvider();
    const blob = new Blob(['x'], { type: 'application/octet-stream' });
    await provider.upload('to/delete', blob);
    await provider.delete('to/delete');
    expect(provider.storedPaths()).not.toContain('to/delete');
    await expect(provider.download('to/delete')).rejects.toThrow();
  });

  it('מכיל כמה paths מקביל', async () => {
    const provider = new LocalStubStorageProvider();
    await provider.upload('p/1', new Blob(['a']));
    await provider.upload('p/2', new Blob(['b']));
    await provider.upload('p/3', new Blob(['c']));
    expect(provider.storedPaths()).toHaveLength(3);
  });

  it('upload על אותו path מחליף את הישן', async () => {
    const provider = new LocalStubStorageProvider();
    await provider.upload('same/path', new Blob(['old']));
    await provider.upload('same/path', new Blob(['new']));
    const downloaded = await provider.download('same/path');
    const text = await downloaded.text();
    expect(text).toBe('new');
    expect(provider.storedPaths()).toHaveLength(1);
  });
});
