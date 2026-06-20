import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchAndCache, fetchAndCacheBlob, SymbolOfflineError } from './symbolSearchService';

vi.mock('./arasaacClient', () => ({
  searchSymbols: vi.fn(),
  getImageUrl: (id: number) => `https://static.arasaac.org/pictograms/${id}/${id}_2500.png`,
}));

vi.mock('../../data/symbolCache', () => ({
  getFromCache: vi.fn(),
  saveToCache: vi.fn(),
}));

import { searchSymbols } from './arasaacClient';
import { getFromCache, saveToCache } from '../../data/symbolCache';

const mockSearch = searchSymbols as ReturnType<typeof vi.fn>;
const mockGet = getFromCache as ReturnType<typeof vi.fn>;
const mockSave = saveToCache as ReturnType<typeof vi.fn>;

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockSearch.mockReset();
  mockGet.mockReset();
  mockSave.mockReset();
  mockFetch.mockReset();
});

describe('symbolSearchService', () => {
  it('searchAndCache מחזיר SymbolResult[]', async () => {
    mockSearch.mockResolvedValueOnce([
      { id: 1, keywords: ['אמא'] },
      { id: 2, keywords: ['לאכול'] },
    ]);
    const results = await searchAndCache('אמא');
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ arasaacId: 1, label: 'אמא' });
  });

  it('fetchAndCacheBlob — cache hit מחזיר URL בלי fetch', async () => {
    mockGet.mockResolvedValueOnce('blob:cached');
    const url = await fetchAndCacheBlob(1);
    expect(url).toBe('blob:cached');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetchAndCacheBlob — cache miss: fetch → save → URL', async () => {
    mockGet.mockResolvedValueOnce(null);
    const blob = new Blob(['img'], { type: 'image/png' });
    mockFetch.mockResolvedValueOnce({ ok: true, blob: async () => blob });
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:new' });
    mockSave.mockResolvedValueOnce(undefined);
    const url = await fetchAndCacheBlob(5);
    expect(mockSave).toHaveBeenCalledWith(5, blob);
    expect(url).toBe('blob:new');
  });

  it('fetchAndCacheBlob — offline: זורק SymbolOfflineError', async () => {
    mockGet.mockResolvedValueOnce(null);
    mockFetch.mockRejectedValueOnce(new Error('offline'));
    await expect(fetchAndCacheBlob(99)).rejects.toBeInstanceOf(SymbolOfflineError);
  });
});
