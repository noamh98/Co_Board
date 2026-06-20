import { useCallback, useEffect, useRef, useState } from 'react';
import { searchAndCache, fetchAndCacheBlob, type SymbolResult, SymbolOfflineError } from '../../services/symbols/symbolSearchService';

interface SymbolPickerProps {
  onSelect: (imageUri: string, arasaacId: number) => void;
  onClose: () => void;
}

export function SymbolPicker({ onSelect, onClose }: SymbolPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await searchAndCache(q);
      setResults(res);
      if (res.length === 0) setError(null);
    } catch {
      setError('שגיאה — בדוק חיבור');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void doSearch(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  const handleSelect = async (result: SymbolResult) => {
    setLoading(true);
    try {
      const uri = await fetchAndCacheBlob(result.arasaacId);
      onSelect(uri, result.arasaacId);
    } catch (err) {
      if (err instanceof SymbolOfflineError) {
        setError('שגיאה — בדוק חיבור');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        dir="rtl"
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 20,
          width: '90%',
          maxWidth: 500,
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>סמלים ARASAAC</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              color: '#6b7280',
              lineHeight: 1,
            }}
            aria-label="סגור"
          >
            ×
          </button>
        </div>

        <input
          dir="rtl"
          autoFocus
          placeholder="חפש סמל (למשל: אמא, לאכול)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            minHeight: 44,
            padding: '0 10px',
            border: '1px solid #d1d5db',
            borderRadius: 10,
            fontSize: '1rem',
            boxSizing: 'border-box',
          }}
        />

        {loading && (
          <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', padding: 8 }}>
            טוען...
          </div>
        )}

        {!loading && error && (
          <div style={{ textAlign: 'center', color: '#b91c1c', fontSize: '0.9rem', padding: 8 }}>
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && query.trim() && (
          <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', padding: 8 }}>
            אין תוצאות
          </div>
        )}

        {results.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              overflowY: 'auto',
              flex: 1,
            }}
          >
            {results.map((r) => (
              <button
                key={r.arasaacId}
                type="button"
                onClick={() => void handleSelect(r)}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  background: '#f9fafb',
                  cursor: 'pointer',
                  padding: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <img
                  src={r.imageUrl}
                  alt={r.label}
                  loading="lazy"
                  style={{ width: 60, height: 60, objectFit: 'contain' }}
                />
                <span style={{ fontSize: '0.72rem', color: '#374151', textAlign: 'center', wordBreak: 'break-word' }}>
                  {r.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
