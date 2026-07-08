// presentation/portal/QrCodeView.tsx — רינדור קוד QR כ-SVG inline נגיש (C-12).
// שכבת presentation בלבד: מקבל ערך טקסט, מקודד דרך domain/qr (טהור), ומצייר
// מטריצה בוליאנית. אין רשת, אין תלות חיצונית — עובד offline לחלוטין.

import { useMemo } from 'react';
import { generateQr } from '../../domain/qr';

interface Props {
  /** הערך לקידוד. יומר לאותיות גדולות (charset אלפאנומרי תומך רק ב-A–Z). */
  value: string;
  /** תיאור נגיש ל-SVG (role="img"). */
  label: string;
  /** גודל התצוגה בפיקסלים (ריבוע). ברירת מחדל 220. */
  sizePx?: number;
}

const QUIET_ZONE = 4; // מודולים לבנים סביב הקוד (תקן ISO/IEC 18004).

export function QrCodeView({ value, label, sizePx = 220 }: Props) {
  const symbol = useMemo(() => {
    try {
      return generateQr(value.toUpperCase());
    } catch {
      return null;
    }
  }, [value]);

  if (!symbol) {
    return (
      <p className="qr-code__fallback" role="note">
        לא ניתן להציג קוד QR — השתמש בקוד הטקסט למעלה.
      </p>
    );
  }

  const dim = symbol.size + QUIET_ZONE * 2;
  const rects: string[] = [];
  for (let r = 0; r < symbol.size; r++) {
    for (let c = 0; c < symbol.size; c++) {
      if (symbol.modules[r][c]) {
        rects.push(`M${c + QUIET_ZONE},${r + QUIET_ZONE}h1v1h-1z`);
      }
    }
  }

  return (
    <svg
      className="qr-code"
      role="img"
      aria-label={label}
      width={sizePx}
      height={sizePx}
      viewBox={`0 0 ${dim} ${dim}`}
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={dim} height={dim} fill="#ffffff" />
      <path d={rects.join('')} fill="#000000" />
    </svg>
  );
}
