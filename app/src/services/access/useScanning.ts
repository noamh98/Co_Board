// services/access/useScanning.ts — hook סריקת מתגים (I3). מחבר את scanEngine ל-UI.
// סריקה לינארית מעל רשימת התאים הגלויים. אוטו (interval) או ידני (Space מקדם / Enter בוחר).
// סריקה שמיעתית: onHighlight נקרא בכל הדגשה (App מקריא את התווית).

import { useEffect, useRef, useState } from 'react';
import {
  initScan,
  advance,
  select,
  type ScanConfig,
  type ScanState,
} from '../../domain/scanning/scanEngine';

interface UseScanningOpts {
  enabled: boolean;
  itemCount: number;
  /** ms בין צעדים אוטומטיים. 0 או שלילי = ידני (מתג מקדם). */
  speedMs: number;
  auditory: boolean;
  onSelect: (index: number) => void;
  onHighlight?: (index: number) => void;
}

function linearIndex(s: ScanState, cfg: ScanConfig): number {
  return s.row * cfg.cols + s.col;
}

export function useScanning(opts: UseScanningOpts): { highlightedIndex: number | null } {
  const { enabled, itemCount, speedMs, auditory, onSelect, onHighlight } = opts;
  const [state, setState] = useState<ScanState | null>(null);
  const cfgRef = useRef<ScanConfig | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onHighlightRef = useRef(onHighlight);
  onHighlightRef.current = onHighlight;

  // אתחול/איפוס בכל שינוי הפעלה או מספר תאים
  useEffect(() => {
    if (!enabled || itemCount <= 0) {
      cfgRef.current = null;
      setState(null);
      return;
    }
    const cfg: ScanConfig = { mode: 'linear', rows: 1, cols: itemCount };
    cfgRef.current = cfg;
    setState(initScan(cfg));
  }, [enabled, itemCount]);

  // קידום אוטומטי
  useEffect(() => {
    if (!enabled || speedMs <= 0 || itemCount <= 0) return;
    const id = setInterval(() => {
      setState((s) => (s && cfgRef.current ? advance(cfgRef.current, s) : s));
    }, speedMs);
    return () => clearInterval(id);
  }, [enabled, speedMs, itemCount]);

  // סריקה שמיעתית — הקראה בכל שינוי הדגשה
  useEffect(() => {
    if (enabled && auditory && state && cfgRef.current) {
      onHighlightRef.current?.(linearIndex(state, cfgRef.current));
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

  const highlightedIndex =
    state && cfgRef.current ? linearIndex(state, cfgRef.current) : null;
  return { highlightedIndex };
}
