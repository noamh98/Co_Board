import { describe, it, expect, vi } from 'vitest';
import { NikudService, type NikudCache, type CacheEntry } from './nikudService';
import { createIdbNikudCache } from './nikudCache';

function memCache(): NikudCache & { map: Map<string, CacheEntry> } {
  const map = new Map<string, CacheEntry>();
  return {
    map,
    async get(t) {
      return map.get(t);
    },
    async set(e) {
      map.set(e.text, e);
    },
  };
}

describe('NikudService — עדיפות מקורות ואופליין', () => {
  it('תיקון ידני מנצח רשת ו-cache (ולא פונה לרשת)', async () => {
    const cache = memCache();
    await cache.set({ text: 'ספר', nikud: 'סֵפֶר', source: 'manual', updatedAt: 1 });
    const fetcher = vi.fn(async () => 'סָפַר');
    const svc = new NikudService(cache, fetcher, () => true);

    const res = await svc.getNikud('ספר');
    expect(res).toEqual({ text: 'ספר', nikud: 'סֵפֶר', source: 'manual' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('cache (nakdan) מוחזר ללא פניית רשת', async () => {
    const cache = memCache();
    await cache.set({ text: 'שלום', nikud: 'שָׁלוֹם', source: 'nakdan', updatedAt: 1 });
    const fetcher = vi.fn(async () => 'XXX');
    const svc = new NikudService(cache, fetcher, () => true);

    expect((await svc.getNikud('שלום')).source).toBe('nakdan');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('online ללא cache → פונה לרשת ושומר ל-cache', async () => {
    const cache = memCache();
    const fetcher = vi.fn(async () => 'בּוֹא');
    const svc = new NikudService(cache, fetcher, () => true);

    const res = await svc.getNikud('בוא');
    expect(res).toEqual({ text: 'בוא', nikud: 'בּוֹא', source: 'nakdan' });
    expect(cache.map.get('בוא')?.source).toBe('nakdan');
  });

  it('offline ללא cache → גלם (none), ללא שגיאה וללא רשת', async () => {
    const cache = memCache();
    const fetcher = vi.fn(async () => 'לא-אמור-לרוץ');
    const svc = new NikudService(cache, fetcher, () => false);

    const res = await svc.getNikud('מים');
    expect(res).toEqual({ text: 'מים', nikud: 'מים', source: 'none' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('כשל רשת → נפילה חיננית ל-none', async () => {
    const cache = memCache();
    const fetcher = vi.fn(async () => {
      throw new Error('network');
    });
    const svc = new NikudService(cache, fetcher, () => true);
    expect((await svc.getNikud('דג')).source).toBe('none');
  });

  it('setManual נשמר ולא נדרס ע"י רשת בקריאה הבאה', async () => {
    const cache = memCache();
    const fetcher = vi.fn(async () => 'אוטומטי');
    const svc = new NikudService(cache, fetcher, () => true);

    await svc.setManual('אמא', 'אִמָּא');
    const res = await svc.getNikud('אמא');
    expect(res).toMatchObject({ source: 'manual', nikud: 'אִמָּא' });
  });

  it('cache מבוסס IndexedDB נשמר בין מופעים (fake-indexeddb)', async () => {
    const svc = new NikudService(createIdbNikudCache(), async () => 'תֵּן', () => true);
    await svc.getNikud('תן'); // ימשוך מרשת ויכתוב ל-IDB

    // מופע חדש, ללא fetcher, אופליין — חייב לקרוא מה-cache שנשמר.
    const svc2 = new NikudService(createIdbNikudCache(), undefined, () => false);
    expect((await svc2.getNikud('תן')).source).toBe('nakdan');
  });
});
