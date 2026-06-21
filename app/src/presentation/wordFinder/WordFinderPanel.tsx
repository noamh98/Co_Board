// Word Finder Panel — FR-029 (Phase 2).
// מאפשר חיפוש מילה ותצוגת נתיב לחיצות: "בית > אוכל > עגבנייה".

import { useState } from 'react';
import type { Board } from '../../domain/models';
import { findPath, type CellPath } from '../../services/wordFinder/wordFinderService';

interface Props {
  boards: Record<string, Board>;
  homeId: string;
  onClose: () => void;
}

export function WordFinderPanel({ boards, homeId, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<CellPath | 'not-found' | null>(null);

  function handleSearch(): void {
    if (!query.trim()) return;
    const path = findPath(query, boards, homeId);
    setResult(path ?? 'not-found');
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        dir="rtl"
        role="dialog"
        aria-label="מאתר מילים"
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          minWidth: 320,
          maxWidth: 460,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>מאתר מילים</h2>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            aria-label="חיפוש מילה"
            placeholder="חיפוש מילה…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc' }}
          />
          <button type="button" className="adultbar__btn" onClick={handleSearch}>
            חפש
          </button>
        </div>

        {result === 'not-found' && (
          <p style={{ color: '#c00', margin: 0 }}>המילה לא נמצאה בלוחות.</p>
        )}

        {result && result !== 'not-found' && (
          <div>
            <p style={{ margin: '0 0 8px', fontWeight: 600 }}>נתיב:</p>
            <p style={{ margin: 0, lineHeight: 1.8 }}>
              {result.map((step, i) => (
                <span key={`${step.boardId}-${step.cellId}`}>
                  {i > 0 && (
                    <span style={{ margin: '0 4px', color: '#666' }}>{'>'}</span>
                  )}
                  <span
                    style={{
                      background: i === result.length - 1 ? '#d1fae5' : '#f3f4f6',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: '0.9rem',
                    }}
                  >
                    {step.label}
                  </span>
                </span>
              ))}
            </p>
          </div>
        )}

        <button type="button" className="adultbar__btn" onClick={onClose}>
          סגור
        </button>
      </div>
    </div>
  );
}
