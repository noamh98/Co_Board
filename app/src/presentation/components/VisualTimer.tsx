// presentation/components/VisualTimer.tsx — טיימר חזותי (I6).
// בר מתכווץ + ספירה לאחור. רכיב עצמאי לשימוש בלוחות ויסות/התנהגות.

import { useEffect, useRef, useState } from 'react';

export function VisualTimer({
  durationSec,
  running = true,
  onDone,
}: {
  durationSec: number;
  running?: boolean;
  onDone?: () => void;
}) {
  const [remaining, setRemaining] = useState(durationSec);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    setRemaining(durationSec);
  }, [durationSec]);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      onDoneRef.current?.();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(id);
  }, [running, remaining]);

  const pct = durationSec > 0 ? Math.max(0, (remaining / durationSec) * 100) : 0;
  return (
    <div className="visual-timer" role="timer" aria-label="טיימר חזותי" aria-live="off">
      <div className="visual-timer__track">
        <div className="visual-timer__bar" style={{ width: `${pct}%` }} />
      </div>
      <span className="visual-timer__text">{remaining}</span>
    </div>
  );
}
