import { useEffect, useRef, useState } from 'react';
import type { Board, GridSize } from '../../domain/models';
import { generateBoard } from '../../services/ai/boardGenerator';
import { createLlmProvider } from '../../services/ai/aiProvider';
import { searchAndCache } from '../../services/symbols/symbolSearchService';
import type { NikudService } from '../../services/nikud/nikudService';
import {
  buildAiCacheKey,
  getCachedAiBoard,
  saveAiBoardToCache,
} from '../../data/aiBoardCache';
import { Modal } from '../ui/Modal';

// presentation/wizard/SmartCreatePanel.tsx — "יצירה חכמה" כ-hero (F1, פער Emorli #1).
// Ponytail: עוטף את לוגיקת היצירה הקיימת (generateBoard + createLlmProvider) — לא משכתב מנוע.
// מוסיף: (1) שדה-תיאור גדול כ-hero, (2) סליידרים חיים, (3) cache (F2) — יצירה חוזרת מיידית,
// (4) מצבי-משוב ברורים (loading/success/error) עם aria-live. סגנון דרך tokens.css (ללא inline).
//
// הערה (deferred): פלטת צבע-רקע פר-לוח דורשת שדה Board.backgroundColor + רינדור — לא נכלל
// כדי לא לשלוח UI חצי-מחווט. הריברנד הקורל כבר נותן רקע חם גלובלי. ראה CHANGES.md.

type Phase = 'form' | 'loading' | 'preview' | 'error';

export interface SmartCreatePanelProps {
  onGenerated: (board: Board) => void;
  onClose: () => void;
  nikudService: NikudService | null;
}

export function SmartCreatePanel({ onGenerated, onClose, nikudService }: SmartCreatePanelProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cols, setCols] = useState(5);
  const [rows, setRows] = useState(4);
  const [phase, setPhase] = useState<Phase>('form');
  const [board, setBoard] = useState<Board | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [fromCache, setFromCache] = useState(false);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    descRef.current?.focus();
  }, []);

  async function handleGenerate(): Promise<void> {
    const topic = description.trim();
    if (!topic) return;
    setPhase('loading');
    setErrorMsg('');
    setBoard(null);
    setFromCache(false);

    const size: GridSize = { rows, cols };
    try {
      // F2: cache לפי hash(topic+grid) — יצירה חוזרת מחזירה מיידית (גם אופליין).
      const key = await buildAiCacheKey(topic, size);
      const cached = await getCachedAiBoard(key);
      if (cached) {
        const named = name.trim() ? { ...cached, name: name.trim() } : cached;
        setBoard(named);
        setFromCache(true);
        setPhase('preview');
        return;
      }

      const generated = await generateBoard(topic, size, {
        llm: createLlmProvider(),
        findSymbol: async (word) => {
          try {
            const results = await searchAndCache(word);
            const first = results[0];
            return first ? `arasaac:${first.arasaacId}` : undefined;
          } catch {
            return undefined;
          }
        },
        getNikud: async (word) => {
          if (!nikudService) return undefined;
          try {
            return (await nikudService.getNikud(word)).nikud;
          } catch {
            return undefined;
          }
        },
      });
      await saveAiBoardToCache(key, generated);
      const named = name.trim() ? { ...generated, name: name.trim() } : generated;
      setBoard(named);
      setPhase('preview');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }

  const words =
    board?.placements.map((p) => board.cells[p.cellId]?.label).filter(Boolean) ?? [];

  return (
    <Modal title="✨ יצירה חכמה" onClose={onClose}>
      <div className="smart-create" dir="rtl">
        <p className="hint" style={{ margin: 0 }}>
          הנושא נשלח לשרת ה-AI ליצירת מילים בלבד — אין שמירת נתוני ילד.
        </p>

        {(phase === 'form' || phase === 'error') && (
          <>
            <label className="wizard__label" htmlFor="sc-name">
              שם הלוח <span className="hint">(אופציונלי — יושלם אוטומטית)</span>
            </label>
            <input
              id="sc-name"
              className="wizard__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: מר תפוח אדמה"
              dir="rtl"
            />

            <label className="wizard__label" htmlFor="sc-desc">
              תיאור הלוח
            </label>
            <textarea
              id="sc-desc"
              ref={descRef}
              className="wizard__input smart-create__desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תארו את הלוח שאתם צריכים…"
              rows={3}
              dir="rtl"
            />

            <div className="smart-create__sliders">
              <div className="ui-slider">
                <div className="ui-slider__header">
                  <label className="ui-slider__label" htmlFor="sc-cols">עמודות</label>
                  <span className="ui-slider__value" aria-hidden="true">{cols}</span>
                </div>
                <input
                  id="sc-cols"
                  className="ui-slider__input"
                  type="range"
                  min={1}
                  max={8}
                  value={cols}
                  onChange={(e) => setCols(Number(e.target.value))}
                  aria-label="מספר עמודות"
                  aria-valuetext={`${cols} עמודות`}
                />
              </div>
              <div className="ui-slider">
                <div className="ui-slider__header">
                  <label className="ui-slider__label" htmlFor="sc-rows">שורות</label>
                  <span className="ui-slider__value" aria-hidden="true">{rows}</span>
                </div>
                <input
                  id="sc-rows"
                  className="ui-slider__input"
                  type="range"
                  min={1}
                  max={8}
                  value={rows}
                  onChange={(e) => setRows(Number(e.target.value))}
                  aria-label="מספר שורות"
                  aria-valuetext={`${rows} שורות`}
                />
              </div>
            </div>
            <p className="hint" style={{ margin: 0 }}>{rows} × {cols} = {rows * cols} תאים</p>

            {phase === 'error' && (
              <p className="smart-create__state smart-create__state--error" role="alert">
                שגיאה ביצירת הלוח: {errorMsg}
              </p>
            )}

            <button
              type="button"
              className="ui-btn ui-btn--primary ui-btn--lg"
              onClick={() => void handleGenerate()}
              disabled={!description.trim()}
            >
              ✨ יצירת לוח חכם
            </button>
          </>
        )}

        {phase === 'loading' && (
          <p className="smart-create__state smart-create__state--loading" aria-live="polite">
            בונה לוח…
          </p>
        )}

        {phase === 'preview' && board && (
          <>
            <p
              className="smart-create__state smart-create__state--success"
              aria-live="polite"
            >
              ✓ הלוח מוכן{fromCache ? ' (מהמטמון)' : ''} — {board.name}
            </p>
            <p className="hint" style={{ margin: 0 }}>
              {board.grid.rows} × {board.grid.cols} — {words.length} מילים
            </p>
            <div className="row gap-2" role="list" aria-label="מילים שנוצרו" style={{ flexWrap: 'wrap' }}>
              {words.map((w, i) => (
                <span key={i} role="listitem" className="board-toolbar__token">{w}</span>
              ))}
            </div>
            <div className="row gap-3" style={{ flexWrap: 'wrap', paddingTop: 'var(--sp-2)' }}>
              <button type="button" className="ui-btn ui-btn--primary" onClick={() => onGenerated(board)}>
                אשר והוסף ללוח
              </button>
              <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setPhase('form')}>
                נסה שנית
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
