import { describe, it, expect, vi, afterEach } from 'vitest';
import { requestPersistentStorage } from './persistence';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestPersistentStorage', () => {
  it('מחזיר unsupported כשה-Storage API חסר', async () => {
    vi.stubGlobal('navigator', {});
    expect(await requestPersistentStorage()).toBe('unsupported');
  });

  it('מחזיר unsupported כש-persist אינו פונקציה', async () => {
    vi.stubGlobal('navigator', { storage: {} });
    expect(await requestPersistentStorage()).toBe('unsupported');
  });

  it('מחזיר already-persisted כשהאחסון כבר עמיד', async () => {
    const persist = vi.fn();
    vi.stubGlobal('navigator', {
      storage: { persisted: vi.fn().mockResolvedValue(true), persist },
    });
    expect(await requestPersistentStorage()).toBe('already-persisted');
    expect(persist).not.toHaveBeenCalled();
  });

  it('מחזיר persisted כשהדפדפן מאשר עמידות', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', {
      storage: { persisted: vi.fn().mockResolvedValue(false), persist },
    });
    expect(await requestPersistentStorage()).toBe('persisted');
    expect(persist).toHaveBeenCalledOnce();
  });

  it('מחזיר denied כשהדפדפן מסרב', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        persisted: vi.fn().mockResolvedValue(false),
        persist: vi.fn().mockResolvedValue(false),
      },
    });
    expect(await requestPersistentStorage()).toBe('denied');
  });

  it('מחזיר persisted גם ללא persisted() (feature-detect חלקי)', async () => {
    vi.stubGlobal('navigator', {
      storage: { persist: vi.fn().mockResolvedValue(true) },
    });
    expect(await requestPersistentStorage()).toBe('persisted');
  });

  it('מחזיר unsupported כש-persist זורק — לא מפיל את האונבורדינג', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        persisted: vi.fn().mockResolvedValue(false),
        persist: vi.fn().mockRejectedValue(new Error('nope')),
      },
    });
    expect(await requestPersistentStorage()).toBe('unsupported');
  });
});
