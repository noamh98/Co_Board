import { useEffect, useRef, useState } from 'react';
import type { Board, GridSize } from '../../domain/models';
import { generateBoard } from '../../services/ai/boardGenerator';
import { createLlmProvider } from '../../services/ai/aiProvider';
import { searchAndCache } from '../../services/symbols/symbolSearchService';
import type { NikudService } from '../../services/nikud/nikudService';

interface AiBoardPanelProps {
  onGenerated: (b: Board) => void;
  onClose: () => void;
  nikudService: NikudService | null;
}

type Phase = 'form' | 'loading' | 'preview' | 'error';

export function AiBoardPanel({ onGenerated, onClose, nikudService }: AiBoardPanelProps) {
  const [topic, setTopic] = useState('');
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(3);
  const [phase, setPhase] = useState<Phase>('form');
  const [board, setBoard] = useState<Board | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const topicRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    topicRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleGenerate() {
    const trimmed = topic.trim();
    if (!trimmed) return;

    setPhase('loading');
    setErrorMsg('');
    setBoard(null);

    const size: GridSize = { rows, cols };

    try {
      const generated = await generateBoard(trimmed, size, {
        llm: createLlmProvider(),
        findSymbol: async (word) => {
          try {
            const results = await searchAndCache(word);
            const first = results[0];
            if (!first) return undefined;
            return String(first.arasaacId);
          } catch {
            return undefined;
          }
        },
        getNikud: async (word) => {
          if (!nikudService) return undefined;
          try {
            const r = await nikudService.getNikud(word);
            return r.nikud;
          } catch {
            return undefined;
          }
        },
      });
      setBoard(generated);
      setPhase('preview');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }

  function handleReset() {
    setPhase('form');
    setBoard(null);
    setErrorMsg('');
  }

  const words =
    board?.placements
      .map((p) => board.cells[p.cellId]?.label)
      .filter(Boolean) ?? [];

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--cl-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--z-modal)',
        padding: 'var(--sp-4)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="יצירת לוח עם AI"
        tabIndex={-1}
        style={{
          background: 'var(--cl-surface)',
          borderRadius: 'var(--r-lg)',
          padding: 'var(--sp-6)',
          width: 'min(480px, 100%)',
          maxHeight: 'min(90dvh, 680px)',
          overflowY: 'auto',
          boxShadow: 'var(--sh-xl)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-4)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--sp-4)',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 'var(--tx-xl)',
              fontWeight: 700,
              color: 'var(--cl-ink)',
            }}
          >
            יצירת לוח עם AI
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            style={{
              minWidth: 'var(--target-sm)',
              minHeight: 'var(--target-sm)',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              background: 'var(--cl-surface-alt)',
              color: 'var(--cl-ink)',
              fontSize: 'var(--tx-lg)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Privacy note — always visible, non-dismissible */}
        <div
          role="note"
          style={{
            background: 'var(--cl-chip)',
            border: '1px solid var(--cl-chip-border)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--sp-3) var(--sp-4)',
            fontSize: 'var(--tx-sm)',
            color: 'var(--cl-muted)',
            lineHeight: 1.5,
          }}
        >
          הנושא נשלח לשרת AI ליצירת מילים בלבד. אין שמירת נתוני ילד.
        </div>

        {/* Form — topic + grid size */}
        {(phase === 'form' || phase === 'error') && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              <label
                htmlFor="ai-topic"
                style={{ fontWeight: 600, fontSize: 'var(--tx-base)', color: 'var(--cl-ink)' }}
              >
                נושא הלוח
              </label>
              <input
                id="ai-topic"
                ref={topicRef}
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleGenerate(); }}
                placeholder="לדוגמה: בית ספר, אוכל, רגשות"
                dir="rtl"
                style={{
                  minHeight: '44px',
                  padding: '0 var(--sp-3)',
                  border: '1.5px solid var(--cl-border)',
                  borderRadius: 'var(--r-md)',
                  background: 'var(--cl-surface)',
                  color: 'var(--cl-ink)',
                  fontSize: 'var(--tx-base)',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: 'var(--sp-4)',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
                <label
                  htmlFor="ai-rows"
                  style={{ fontWeight: 600, fontSize: 'var(--tx-sm)', color: 'var(--cl-ink)' }}
                >
                  שורות
                </label>
                <select
                  id="ai-rows"
                  value={rows}
                  onChange={(e) => setRows(Number(e.target.value))}
                  style={{
                    minHeight: 'var(--target-sm)',
                    padding: '0 var(--sp-3)',
                    border: '1px solid var(--cl-border)',
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--cl-surface)',
                    color: 'var(--cl-ink)',
                    fontSize: 'var(--tx-base)',
                  }}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
                <label
                  htmlFor="ai-cols"
                  style={{ fontWeight: 600, fontSize: 'var(--tx-sm)', color: 'var(--cl-ink)' }}
                >
                  עמודות
                </label>
                <select
                  id="ai-cols"
                  value={cols}
                  onChange={(e) => setCols(Number(e.target.value))}
                  style={{
                    minHeight: 'var(--target-sm)',
                    padding: '0 var(--sp-3)',
                    border: '1px solid var(--cl-border)',
                    borderRadius: 'var(--r-sm)',
                    background: 'var(--cl-surface)',
                    color: 'var(--cl-ink)',
                    fontSize: 'var(--tx-base)',
                  }}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  fontSize: 'var(--tx-sm)',
                  color: 'var(--cl-muted)',
                  alignSelf: 'flex-end',
                  paddingBottom: '2px',
                }}
              >
                {rows} × {cols} = {rows * cols} תאים
              </div>
            </div>

            {phase === 'error' && (
              <p
                role="alert"
                style={{
                  margin: 0,
                  fontSize: 'var(--tx-sm)',
                  color: 'var(--cl-error)',
                  background: 'var(--cl-error-bg)',
                  borderRadius: 'var(--r-sm)',
                  padding: 'var(--sp-2) var(--sp-3)',
                }}
              >
                שגיאה ביצירת הלוח: {errorMsg}
              </p>
            )}

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!topic.trim()}
              style={{
                minHeight: 'var(--target-min)',
                padding: '0 var(--sp-5)',
                border: 'none',
                borderRadius: 'var(--r-md)',
                background: 'var(--cl-primary)',
                color: 'var(--cl-on-primary)',
                fontSize: 'var(--tx-base)',
                fontWeight: 700,
                cursor: topic.trim() ? 'pointer' : 'not-allowed',
                opacity: topic.trim() ? 1 : 0.5,
                alignSelf: 'flex-start',
                transition: 'background var(--ease-fast)',
              }}
            >
              צור לוח
            </button>
          </>
        )}

        {/* Loading */}
        {phase === 'loading' && (
          <div
            aria-live="polite"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-3)',
              padding: 'var(--sp-5) 0',
              color: 'var(--cl-muted)',
              fontSize: 'var(--tx-base)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: '20px',
                height: '20px',
                border: '2.5px solid var(--cl-border)',
                borderTopColor: 'var(--cl-primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            מייצר לוח...
          </div>
        )}

        {/* Preview */}
        {phase === 'preview' && board && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--tx-md)',
                  fontWeight: 700,
                  color: 'var(--cl-ink)',
                }}
              >
                {board.name}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--tx-sm)',
                  color: 'var(--cl-muted)',
                }}
              >
                {board.grid.rows} × {board.grid.cols} — {words.length} מילים
              </p>
              <div
                role="list"
                aria-label="מילים שנוצרו"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--sp-2)',
                }}
              >
                {words.map((w, i) => (
                  <span
                    key={i}
                    role="listitem"
                    style={{
                      background: 'var(--cl-chip)',
                      border: '1px solid var(--cl-chip-border)',
                      borderRadius: 'var(--r-full)',
                      padding: '4px 12px',
                      fontSize: 'var(--tx-sm)',
                      fontWeight: 600,
                      color: 'var(--cl-ink)',
                    }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 'var(--sp-3)',
                flexWrap: 'wrap',
                paddingTop: 'var(--sp-2)',
                borderTop: '1px solid var(--cl-border)',
              }}
            >
              <button
                type="button"
                onClick={() => onGenerated(board)}
                style={{
                  minHeight: 'var(--target-min)',
                  padding: '0 var(--sp-5)',
                  border: 'none',
                  borderRadius: 'var(--r-md)',
                  background: 'var(--cl-primary)',
                  color: 'var(--cl-on-primary)',
                  fontSize: 'var(--tx-base)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                אשר והוסף ללוח
              </button>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  minHeight: 'var(--target-min)',
                  padding: '0 var(--sp-5)',
                  border: '1.5px solid var(--cl-border)',
                  borderRadius: 'var(--r-md)',
                  background: 'var(--cl-surface-alt)',
                  color: 'var(--cl-ink)',
                  fontSize: 'var(--tx-base)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                נסה שנית
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
