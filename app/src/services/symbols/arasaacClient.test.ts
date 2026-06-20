import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchSymbols, getImageUrl } from './arasaacClient';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

describe('arasaacClient', () => {
  it('searchSymbols — מחזיר תוצאות ממוקדות', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { _id: 1, keywords: [{ keyword: 'אמא' }] },
        { _id: 2, keywords: [{ keyword: 'לאכול' }] },
      ],
    });
    const results = await searchSymbols('אמא');
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ id: 1, keywords: ['אמא'] });
  });

  it('searchSymbols — query ריק מחזיר []', async () => {
    const results = await searchSymbols('   ');
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('searchSymbols — שגיאת רשת מחזירה []', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const results = await searchSymbols('בית');
    expect(results).toEqual([]);
  });

  it('getImageUrl — מחזיר URL נכון', () => {
    expect(getImageUrl(12345)).toBe(
      'https://static.arasaac.org/pictograms/12345/12345_2500.png',
    );
  });
});
