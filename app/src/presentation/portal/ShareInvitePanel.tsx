// presentation/portal/ShareInvitePanel.tsx — שיתוף גישה מאוחד לילד (C-12).
// שני חלקים באותו דיאלוג: (א) יצירת קוד הזמנה + QR לסריקה (TTL 48 שעות, D-01);
// (ב) רשימת "מי מורשה" + ביטול גישה (D-05, אוחד לכאן מ-AccessListPanel).
// קוד אקראי חזק (32 תווי hex). ללא dialog מקונן — הכול section אחד.

import { useEffect, useState } from 'react';
import {
  createShareInvite,
  getChildAccessEntries,
  revokeChildAccess,
  type ChildAccessRole,
  type ChildAccessEntry,
} from '../../data/childRepo';
import { QrCodeView } from './QrCodeView';

interface Props {
  childId: string;
  childName: string;
  ownerUid: string;
  onClose: () => void;
}

const ROLE_LABELS: Record<ChildAccessRole, string> = {
  parent: 'הורה (עריכה)',
  clinician: 'קליני (עריכה)',
  staff: 'צוות (שימוש בלבד)',
};

function formatExpiry(expiresAt: number | undefined): string | null {
  if (!expiresAt || expiresAt <= 0) return null;
  if (expiresAt <= Date.now()) return 'פג תוקף';
  const d = new Date(expiresAt);
  return `בתוקף עד ${d.toLocaleDateString('he-IL')}`;
}

export function ShareInvitePanel({ childId, childName, ownerUid, onClose }: Props) {
  const [role, setRole] = useState<ChildAccessRole>('clinician');
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [entries, setEntries] = useState<ChildAccessEntry[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadEntries(); }, [childId]);

  async function loadEntries(): Promise<void> {
    setListLoading(true);
    setListError(null);
    try {
      const list = await getChildAccessEntries(childId);
      setEntries(list.sort((a, b) => a.grantedAt - b.grantedAt));
    } catch {
      setListError('שגיאה בטעינת רשימת ההרשאות — בדוק חיבור לרשת');
    } finally {
      setListLoading(false);
    }
  }

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
      // fallback: אין הרשאת clipboard — הקוד מוצג לבחירה ידנית.
    }
  }

  async function handleRevoke(memberUid: string): Promise<void> {
    setRevoking(memberUid);
    setListError(null);
    try {
      await revokeChildAccess(childId, memberUid);
      setEntries((prev) => prev.filter((e) => e.uid !== memberUid));
    } catch {
      setListError('ביטול הגישה נכשל — נסה שנית');
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div
      className="panel-overlay"
      dir="rtl"
      role="dialog"
      aria-label={`שיתוף וגישה — ${childName}`}
      aria-modal="true"
    >
      <div className="panel-overlay__content">
        <h2 className="panel-overlay__title">שיתוף וגישה — {childName}</h2>

        <section className="share-invite__section" aria-label="שתף גישה חדשה">
          <h3 className="share-invite__heading">שתף גישה חדשה</h3>

          {!code ? (
            <>
              <p>בחר תפקיד למשתמש המוזמן:</p>
              <select
                className="login-panel__input"
                value={role}
                aria-label="תפקיד המשתמש המוזמן"
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
              <div className="share-invite__qr">
                <QrCodeView value={code} label={`קוד QR לשיתוף — ${childName}`} />
              </div>
              <p className="auth-screen__body--muted">
                סרוק את הקוד או שלח את המספר לאיש הצוות — הוא יזין אותו בלחצן "קבל גישה".
              </p>
            </>
          )}
        </section>

        <section className="share-invite__section" aria-label={`מי מורשה — ${childName}`}>
          <h3 className="share-invite__heading">מי מורשה</h3>

          {listError && <p className="login-panel__error" role="alert">{listError}</p>}

          {listLoading ? (
            <p role="status">טוען…</p>
          ) : (
            <ul className="access-list" aria-label="רשימת מורשים">
              {entries.map((entry) => {
                const isOwner = entry.uid === ownerUid;
                const expiry = formatExpiry(entry.expiresAt);
                return (
                  <li key={entry.uid} className="access-list__item">
                    <div className="access-list__info">
                      <span className="access-list__role">{ROLE_LABELS[entry.role]}</span>
                      <span className="access-list__uid" dir="ltr">{entry.uid}</span>
                      {isOwner && <span className="access-list__badge">בעלים</span>}
                      {expiry && <span className="access-list__expiry">{expiry}</span>}
                    </div>
                    {!isOwner && (
                      <button
                        type="button"
                        className="login-panel__btn access-list__revoke"
                        onClick={() => void handleRevoke(entry.uid)}
                        disabled={revoking === entry.uid}
                        aria-label={`בטל גישה — ${ROLE_LABELS[entry.role]}`}
                      >
                        {revoking === entry.uid ? 'מבטל…' : 'בטל גישה'}
                      </button>
                    )}
                  </li>
                );
              })}
              {entries.length === 0 && (
                <li className="access-list__empty">אין הרשאות פעילות.</li>
              )}
            </ul>
          )}
        </section>

        <div className="panel-overlay__footer">
          <button type="button" className="login-panel__btn" onClick={onClose}>
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
