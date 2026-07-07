// presentation/portal/AcceptInviteScreen.tsx — קבלת גישה לילד ע"י קוד שיתוף (2B).
// הקוד הוא 32 תווי hex (data/childRepo.generateShareCode) — D-01.

import { useState } from 'react';
import { acceptShareInvite, type ChildRecord } from '../../data/childRepo';
import {
  isValidShareCode,
  normalizeShareCode,
  sanitizeShareCodeInput,
  SHARE_CODE_LENGTH,
} from '../../domain/shareCode';

interface Props {
  uid: string;
  onAccepted: (child: ChildRecord) => void;
  onClose: () => void;
}

export function AcceptInviteScreen({ uid, onAccepted, onClose }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept(): Promise<void> {
    const normalized = normalizeShareCode(code);
    if (!isValidShareCode(normalized)) {
      setError('קוד שיתוף לא תקין — יש להזין את הקוד המלא כפי שהתקבל');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const child = await acceptShareInvite(normalized, uid);
      if (!child) throw new Error('קוד שיתוף לא נמצא');
      onAccepted(child);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'שגיאה בקבלת הגישה';
      setError(msg.includes('פג תוקף') ? 'קוד השיתוף פג תוקף' :
               msg.includes('לא נמצא') ? 'קוד שיתוף לא נמצא' :
               'שגיאה בקבלת הגישה — בדוק את הקוד ונסה שנית');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="panel-overlay"
      dir="rtl"
      role="dialog"
      aria-label="קבל גישה לילד"
      aria-modal="true"
    >
      <div className="panel-overlay__content">
        <h2 className="panel-overlay__title">קבל גישה לילד</h2>
        <p>הזן את קוד השיתוף שקיבלת מההורה:</p>

        <label className="login-panel__label" htmlFor="invite-code">
          קוד שיתוף
        </label>
        <input
          id="invite-code"
          className="login-panel__input"
          type="text"
          maxLength={SHARE_CODE_LENGTH}
          value={code}
          onChange={(e) => setCode(sanitizeShareCodeInput(e.target.value))}
          disabled={loading}
          dir="ltr"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby={error ? 'invite-error' : undefined}
        />

        {error && (
          <p id="invite-error" className="login-panel__error" role="alert">
            {error}
          </p>
        )}

        <div className="panel-overlay__footer">
          <button
            type="button"
            className="login-panel__btn login-panel__btn--primary"
            onClick={() => void handleAccept()}
            disabled={loading || !isValidShareCode(code)}
          >
            {loading ? 'מאמת…' : 'קבל גישה'}
          </button>
          <button type="button" className="login-panel__btn" onClick={onClose}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
