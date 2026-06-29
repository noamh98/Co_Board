import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWithTimeout } from './fetchWithTimeout';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('fetchWithTimeout — Phase 1 (H-API)', () => {
  it('זורק "הבקשה לא הגיבה בזמן" כשחלף ה-timeout (fetch שלא נענה)', async () => {
    vi.useFakeTimers();
    // fetch שלעולם לא נענה מעצמו — נדחה רק כשה-signal עובר abort (כמו fetch אמיתי).
    vi.stubGlobal('fetch', (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
    );

    const promise = fetchWithTimeout('https://example.test', undefined, 15000);
    // תופסים את הדחייה לפני קידום הזמן כדי למנוע unhandled rejection.
    const expectation = expect(promise).rejects.toThrow('הבקשה לא הגיבה בזמן');
    await vi.advanceTimersByTimeAsync(15000);
    await expectation;
  });

  it('מחזיר Response רגיל כש-fetch נענה מהר', async () => {
    const body = new Response('ok', { status: 200 });
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(body)));

    const resp = await fetchWithTimeout('https://example.test', undefined, 15000);
    expect(resp).toBe(body);
    expect(resp.status).toBe(200);
  });
});
