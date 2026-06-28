import { describe, it, expect, afterEach, vi } from 'vitest';

// Phase 0 (CR-3): כשאין crypto.subtle (לא-HTTPS / WebView ישן) — encryptData/encryptBlob
// חייבים *לזרוק*, לא להחזיר base64 "מוצפן" הפיך-טריוויאלית. הטסט מדמה היעדר subtle.

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('crypto — E2EE fail-loud (CR-3)', () => {
  it('encryptData זורק כש-crypto.subtle חסר (לא base64 שקט)', async () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', {
      // משאירים getRandomValues/randomUUID; מאפסים subtle בלבד.
      getRandomValues: real.getRandomValues?.bind(real),
      randomUUID: real.randomUUID?.bind(real),
      subtle: undefined,
    });
    vi.resetModules();
    const { encryptData, E2EE_UNAVAILABLE } = await import('./crypto');
    await expect(encryptData({ a: 1 })).rejects.toThrow(E2EE_UNAVAILABLE);
  });

  it('decryptData מחזיר null (לא מפענח base64) כש-subtle חסר', async () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', {
      getRandomValues: real.getRandomValues?.bind(real),
      randomUUID: real.randomUUID?.bind(real),
      subtle: undefined,
    });
    vi.resetModules();
    const { decryptData } = await import('./crypto');
    // base64 של JSON — בעבר היה "מפוענח" בשקט; עכשיו נדחה (null).
    const fakeB64 = btoa(JSON.stringify({ secret: 'child-data' }));
    await expect(decryptData(fakeB64)).resolves.toBeNull();
  });
});
