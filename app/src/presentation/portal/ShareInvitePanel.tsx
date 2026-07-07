// presentation/portal/ShareInvitePanel.tsx — יצירת קוד שיתוף גישה לילד (2B).
// קוד אקראי חזק (32 תווי hex), TTL 48 שעות (D-01).

import { useState } from 'react';
import { createShareInvite, type ChildAccessRole } from '../../data/childRepo';

interface Props {
  childId: string;
  childName: string;
  ownerUid: string;
  onClose: () => void;
}

export function ShareInvitePanel({ childId, childName, ownerUid, onClose }: Props) {
  const [role, setRole] = useState<ChildAccessRole>('clinician');
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const invite = await createShareInvite(childId, ownerUid, role);
      setCode(invite.code);
    } catch {
      setError('שגיאה ביצירת קוד שיתוף — נסה שנית');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(): Promise<void> {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text (אין הרשאת clipboard)
    }
  }

  return (
    <div
      className="panel-overlay"
      dir="rtl"
      role="dialog"
      aria-label={`שיתוף גישה — ${childName}`}
      aria-modal="true"
    >
      <div className="panel-overlay__content">
        <h2 className="panel-overlay__title">שתף גישה — {childName}</h2>

        {!code ? (
          <>
            <p>בחר תפקיד למשתמש המוזמן:</p>
            <select
              className="login-panel__input"
              value={role}
              onChange={(e) => setRole(e.target.value as ChildAccessRole)}
            >
              <option value="parent">הורה (עריכה)</option>
              <option value="clinician">קליני (עריכה)</option>
              <option value="staff">צוות (שימוש בלבד)</option>
            </select>

            {error && <p className="login-panel__error" role="alert">{error}</p>}

            <div className="panel-overlay__footer">
              <button
                type="button"
                className="login-panel__btn login-panel__btn--primary"
                onClick={() => void handleCreate()}
                disabled={loading}
              >
                {loading ? 'יוצר…' : 'צור קוד שיתוף'}
              </button>
              <button type="button" className="login-panel__btn" onClick={onClose}>
                ביטול
              </button>
            </div>
          </>
        ) : (
          <>
            <p>קוד השיתוף (תקף 48 שעות):</p>
            <div className="share-invite__code" aria-label={`קוד שיתוף: ${code}`}>
              <span className="share-invite__digits">{code}</span>
              <button
                type="button"
                className="login-panel__btn"
                onClick={() => void handleCopy()}
                aria-label="העתק קוד"
              >
                {copied ? '✓ הועתק' : 'העתק'}
              </button>
            </div>
            <p className="auth-screen__body--muted">
              שלח/י קוד זה לאיש הצוות — הוא יזין אותו בלחצן "קבל גישה".
            </p>
            <button type="button" className="login-panel__btn" onClick={onClose}>
              סגור
            </button>
          </>
        )}
      </div>
    </div>
  );
}
