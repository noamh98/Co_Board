import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { SymbolPicker } from './SymbolPicker';

vi.mock('../../services/symbols/symbolSearchService', () => ({
  searchAndCache: vi.fn(),
  fetchAndCacheBlob: vi.fn(),
  SymbolOfflineError: class SymbolOfflineError extends Error {
    constructor() {
      super('offline');
      this.name = 'SymbolOfflineError';
    }
  },
}));

import { searchAndCache, fetchAndCacheBlob } from '../../services/symbols/symbolSearchService';

const mockSearch = searchAndCache as ReturnType<typeof vi.fn>;
const mockFetchBlob = fetchAndCacheBlob as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockSearch.mockReset();
  mockFetchBlob.mockReset();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SymbolPicker', () => {
  it('מציג מצב ריק ללא חיפוש', () => {
    render(<SymbolPicker onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText(/חפש סמל/)).toBeInTheDocument();
    expect(screen.queryByText(/אין תוצאות/)).not.toBeInTheDocument();
  });

  it('מציג תוצאות אחרי חיפוש', async () => {
    mockSearch.mockResolvedValueOnce([
      { arasaacId: 1, label: 'אמא', imageUrl: 'https://example.com/1.png' },
      { arasaacId: 2, label: 'לאכול', imageUrl: 'https://example.com/2.png' },
    ]);
    render(<SymbolPicker onSelect={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/חפש סמל/), { target: { value: 'אמא' } });
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    await waitFor(() => {
      expect(screen.getByText('אמא')).toBeInTheDocument();
      expect(screen.getByText('לאכול')).toBeInTheDocument();
    });
  });

  it('לחיצה על סמל קוראת onSelect עם URI ו-id', async () => {
    mockSearch.mockResolvedValueOnce([
      { arasaacId: 42, label: 'שתייה', imageUrl: 'https://example.com/42.png' },
    ]);
    mockFetchBlob.mockResolvedValueOnce('blob:selected');
    const onSelect = vi.fn();
    render(<SymbolPicker onSelect={onSelect} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/חפש סמל/), { target: { value: 'שתייה' } });
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    await waitFor(() => expect(screen.getByText('שתייה')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('שתייה'));
    });
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('blob:selected', 42));
  });
});
