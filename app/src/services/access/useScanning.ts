// services/access/useScanning.ts — hook סריקת מתגים (I3). מחבר את scanEngine ל-UI.
// סריקה לינארית מעל רשימת התאים הגלויים. אוטו (interval) או ידני (Space מקדם / Enter בוחר).
// סריקה שמיעתית: onHighlight נקרא בכל הדגשה (App מקריא את התווית).

import { useEffect, useRef, useState } from 'react';
import {
  initScan,
  advance,
  select,
  highlightedIndices as getHighlightedIndices,
  type ScanConfig,
  type ScanMode,
  type ScanState,
} from '../../domain/scanning/scanEngine';

interface UseScanningOpts {
  enabled: boolean;
  itemCount: number;
  /** ms בין צעדים אוטומטיים. 0 או שלילי = ידני (מתג מקדם). */
  speedMs: number;
  auditory: boolean;
  /** I3 — מצב סריקה: linear (ברירת מחדל) או row-column. */
  mode?: ScanMode;
  /** I3 — מספר עמודות הגריד (ל-row-column בלבד). */
  gridCols?: number;
  onSelect: (index: number) => void;
  onHighlight?: (index: number) => void;
}

export function useScanning(opts: UseScanningOpts): { highlightedIndices: number[] } {
  const { enabled, itemCount, speedMs, auditory, mode = 'linear', gridCols = 1, onSelect, onHighlight } = opts;
  const [state, setState] = useState<ScanState | null>(null);
  const cfgRef = useRef<ScanConfig | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onHighlightRef = useRef(onHighlight);
  onHighlightRef.current = onHighlight;

  // אתחול/איפוס בכל שינוי הפעלה, מספר תאים, מצב סריקה או עמודות
  useEffect(() => {
    if (!enabled || itemCount <= 0) {
      cfgRef.current = null;
      setState(null);
      return;
    }
    let cfg: ScanConfig;
    if (mode === 'row-column' && gridCols > 1) {
      const cols = gridCols;
      const rows = Math.max(1, Math.ceil(itemCount / cols));
      cfg = { mode: 'row-column', rows, cols };
    } else {
      cfg = { mode: 'linear', rows: 1, cols: itemCount };
    }
    cfgRef.current = cfg;
    setState(initScan(cfg));
  }, [enabled, itemCount, mode, gridCols]);

  // קידום אוטומטי
  useEffect(() => {
    if (!enabled || speedMs <= 0 || itemCount <= 0) return;
    const id = setInterval(() => {
      setState((s) => (s && cfgRef.current ? advance(cfgRef.current, s) : s));
    }, speedMs);
    return () => clearInterval(id);
  }, [enabled, speedMs, itemCount]);

  // סריקה שמיעתית — הקראה בכל שינוי הדגשה (התא הראשון בשורה ב-row-column)
  useEffect(() => {
    if (enabled && auditory && state && cfgRef.current) {
      const first = getHighlightedIndices(cfgRef.current, state)[0] ?? 0;
      onHighlightRef.current?.(first);
    }
  }, [state, enabled, auditory]);

  // מקלדת/מתג: Enter בוחר; במצב ידני Space מקדם; במצב אוטו גם Space בוחר.
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent): void => {
      if (!cfgRef.current) return;
      const manual = speedMs <= 0;
      const isSelect = e.key === 'Enter' || (!manual && e.key === ' ');
      const isAdvance = manual && e.key === ' ';
      if (isSelect) {
        e.preventDefault();
        setState((s) => {
          if (!s || !cfgRef.current) return s;
          const r = select(cfgRef.current, s);
          if (r.selectedIndex !== null) onSelectRef.current(r.selectedIndex);
          return r.state;
        });
      } else if (isAdvance) {
        e.preventDefault();
        setState((s) => (s && cfgRef.current ? advance(cfgRef.current, s) : s));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, speedMs]);

  const highlighted =
    state && cfgRef.current ? getHighlightedIndices(cfgRef.current, state) : [];
  return { highlightedIndices: highlighted };
}
