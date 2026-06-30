import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Cell } from '../../domain/models';
import { fitzgeraldStyle } from '../../domain/fitzgerald';
import {
  type AccessSettings,
  DEFAULT_ACCESS_SETTINGS,
} from '../../domain/accessSettings';
import {
  useDwellActivation,
  useActivateOnRelease,
  useDoubleTapPrevention,
} from '../../services/access/dwellService';
import { localSymbolPath, symbolIdFor } from '../../domain/symbolMap';
import { fetchAndCacheBlob } from '../../services/symbols/symbolSearchService';

export function resolveImageUri(cell: Cell): string | undefined {
  if (cell.imageUri) return cell.imageUri;
  if (cell.symbolId?.startsWith('arasaac:')) {
    const id = Number(cell.symbolId.slice('arasaac:'.length));
    if (id > 0) return localSymbolPath(id);
  }
  // נפילה: תאים ישנים ב-DB (נזרעו לפני M20) ללא symbolId — מיפוי לפי label.
  const sid = symbolIdFor(cell.label);
  if (sid !== undefined) return localSymbolPath(sid);
  return undefined;
}

/**
 * M21 — נפילה לסמלים שלא נארזו offline (למשל תאי AI עם arasaacId חדש שלא
 * נמצא ב-build-symbol-map.mjs). אם הנתיב המקומי נכשל בטעינה (404/SPA-fallback),
 * מנסה שליפה חיה מ-ARASAAC + cache ל-IndexedDB (services/symbols) במקום
 * להסתיר את התמונה לצמיתות.
 */
function useCellImageSrc(cell: Cell): { src: string | undefined; onError: () => void } {
  const baseUri = resolveImageUri(cell);
  const [src, setSrc] = useState<string | undefined>(baseUri);
  const [failed, setFailed] = useState(false);
  const triedFallbackRef = useRef(false);

  useEffect(() => {
    setSrc(resolveImageUri(cell));
    setFailed(false);
    triedFallbackRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell.id, cell.imageUri, cell.symbolId, cell.label]);

  const onError = useCallback(() => {
    if (triedFallbackRef.current) {
      setFailed(true);
      return;
    }
    triedFallbackRef.current = true;
    const id = cell.symbolId?.startsWith('arasaac:')
      ? Number(cell.symbolId.slice('arasaac:'.length))
      : NaN;
    if (id > 0) {
      fetchAndCacheBlob(id)
        .then((uri) => setSrc(uri))
        .catch(() => setFailed(true));
    } else {
      setFailed(true);
    }
  }, [cell.symbolId]);

  return { src: failed ? undefined : src, onError };
}

/**
 * תמונת-תא משותפת ל-CellButton (play) ול-BuilderView (editor) — עם נפילת fetch חיה.
 * אם מועבר className בלבד (ללא size/style) — גודל נשלט כליל ע"י CSS (כמו .cell__image
 * עם --cell-img-scale). אם מועבר size — מוחל style מפורש (שימוש ב-BuilderView).
 */
export function CellImage({
  cell,
  size,
  className,
  style,
}: {
  cell: Cell;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const { src, onError } = useCellImageSrc(cell);
  if (!src) return null;
  const resolvedStyle =
    style ?? (size !== undefined ? { width: size, height: size, objectFit: 'contain' as const, borderRadius: 6 } : undefined);
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className={className}
      style={resolvedStyle}
      onError={onError}
    />
  );
}

// E1: memo — לחיצה (setSentence) לא מרנדרת מחדש תאים שלא השתנו.
// E2: displayLabel (כולל ניקוד) מחושב ברמת BoardView ומועבר כ-prop — לא קריאת ניקוד לכל תא.
// F6: האריח הוא תווית-למעלה + סמל-מתחת (סדר נקבע ב-tokens.css: .cell__label{order:-1}).
// F7: גודל התמונה במשבצת נשלט ע"י settings.cellImageScale דרך משתנה --cell-img-scale.
export const CellButton = memo(function CellButton({
  cell,
  onCell,
  settings = DEFAULT_ACCESS_SETTINGS,
  displayLabel,
}: {
  cell: Cell;
  onCell: (cell: Cell) => void;
  settings?: AccessSettings;
  displayLabel?: string;
}) {
  const style = fitzgeraldStyle(cell.fitzgerald);
  const hasImageCandidate = resolveImageUri(cell) !== undefined;

  // E1: onActivate יציב לכל render (onCell יציב מ-App; cell יציב מהלוח).
  const handleActivate = useCallback(() => onCell(cell), [onCell, cell]);
  const guarded = useDoubleTapPrevention(handleActivate, settings);
  const release = useActivateOnRelease(guarded.onClick, settings);
  const dwell = useDwellActivation(guarded.onClick, settings);

  // F7: יחס גודל-תמונה (100% → 1). מצורף לכל אריח כדי לאפשר כיול גלובלי.
  const imgScale = (settings.cellImageScale ?? 100) / 100;
  // CSS custom properties — Record<string,string> כי CSSProperties אינו תומך במפתחות שרירותיים.
  const cssVars: Record<string, string> = { '--cell-img-scale': String(imgScale) };
  if (cell.fitzgerald) {
    // F1: --cell-ink = צבע הטקסט המכויל של Fitzgerald (ניגודיות AA בשני המצבים).
    cssVars['--cell-tint'] = style.bg;
    cssVars['--cell-ink'] = style.text;
  }

  return (
    <button
      type="button"
      className="cell"
      onClick={release.onClick}
      onPointerUp={release.onPointerUp}
      onPointerEnter={dwell.onPointerEnter}
      onPointerLeave={dwell.onPointerLeave}
      onPointerMove={dwell.onPointerMove}
      aria-label={cell.label}
      style={cssVars as CSSProperties}
    >
      {hasImageCandidate && (
        <span className="cell__icon">
          <CellImage cell={cell} className="cell__image" />
        </span>
      )}
      <span className="cell__label">{displayLabel ?? cell.nikud ?? cell.label}</span>
    </button>
  );
});
