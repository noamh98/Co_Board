import { useEffect, useState, type ReactNode } from 'react';
import type { AccessSettings } from '../../domain/accessSettings';
import { FITZGERALD } from '../../domain/fitzgerald';
import { Modal } from '../ui/Modal';
import { Toggle } from '../ui/Toggle';
import { Slider } from '../ui/Slider';

// פאנל הגדרות גישה מוטורית (FR-020, PRD §4.7) — מחולק לסקשנים עם אייקונים.
// controlled: onChange מעדכן את ה-state ב-App ושומר ב-settingsRepo.saveAccessSettings.
// פרטיות וסנכרון ממוזגים כסקשן (props אופציונליים).

export function AccessSettingsPanel({
  settings,
  onChange,
  onClose,
  voiceURI,
  onVoiceURIChange,
  ttsRate,
  onTtsRateChange,
  ttsPitch,
  onTtsPitchChange,
  darkMode,
  onDarkModeChange,
  syncEnabled,
  onSyncEnabledChange,
  syncPhotos,
  onSyncPhotosChange,
  isAuthenticated,
  onDeleteFromCloud,
  loginPanel,
}: {
  settings: AccessSettings;
  onChange: (next: AccessSettings) => void;
  onClose: () => void;
  voiceURI: string | null;
  onVoiceURIChange: (uri: string | null) => void;
  ttsRate: number;
  onTtsRateChange: (n: number) => void;
  ttsPitch: number;
  onTtsPitchChange: (n: number) => void;
  darkMode?: boolean;
  onDarkModeChange?: (enabled: boolean) => void;
  syncEnabled?: boolean;
  onSyncEnabledChange?: (enabled: boolean) => void;
  syncPhotos?: boolean;
  onSyncPhotosChange?: (enabled: boolean) => void;
  isAuthenticated?: boolean;
  onDeleteFromCloud?: () => Promise<void>;
  loginPanel?: ReactNode;
}) {
  const set = (patch: Partial<AccessSettings>) => onChange({ ...settings, ...patch });

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const load = () => {
      if (typeof speechSynthesis === 'undefined') return;
      setVoices(
        speechSynthesis.getVoices().filter((v) => v.lang === 'he-IL' || v.lang.startsWith('he')),
      );
    };
    load();
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.addEventListener('voiceschanged', load);
      return () => speechSynthesis.removeEventListener('voiceschanged', load);
    }
  }, []);

  const handleDelete = async () => {
    if (!onDeleteFromCloud) return;
    if (!confirm('האם למחוק את כל התמונות מהענן? התמונות יישמרו במכשיר זה.')) return;
    setDeleting(true);
    setDeleteMsg(null);
    try {
      await onDeleteFromCloud();
      setDeleteMsg({ ok: true, text: 'נמחק בהצלחה' });
    } catch {
      setDeleteMsg({ ok: false, text: 'מחיקה נכשלה — נסה שוב' });
    } finally {
      setDeleting(false);
    }
  };

  const hasPrivacy =
    onSyncEnabledChange !== undefined ||
    onSyncPhotosChange !== undefined ||
    loginPanel !== undefined;

  return (
    <Modal title="הגדרות גישה" onClose={onClose} aria-label="הגדרות גישה" className="settings-panel modal--drawer">

      {/* ── גישה מוטורית ── */}
      <section className="settings-section" aria-labelledby="s-motor">
        <div className="settings-section__header">
          <span className="settings-section__icon" aria-hidden="true">⚡</span>
          <h3 className="settings-section__title" id="s-motor">גישה מוטורית</h3>
        </div>
        <div className="settings-section__body">
          <Slider
            id="dwell-slider"
            label='זמן השהייה (Dwell)'
            value={settings.dwellTimeMs}
            min={0}
            max={3000}
            step={100}
            format={(v) => (v === 0 ? 'כבוי' : `${v} מ"ש`)}
            onChange={(v) => set({ dwellTimeMs: v })}
          />
          <Toggle
            id="activate-on-release"
            checked={settings.activateOnRelease}
            onChange={(v) => set({ activateOnRelease: v })}
            label="הפעלה בשחרור המגע (Activate on Release)"
          />
          <Toggle
            id="double-tap-prevention"
            checked={settings.doubleTapPrevention}
            onChange={(v) => set({ doubleTapPrevention: v })}
            label="מניעת מגע כפול (Double-Tap Prevention)"
          />
          <Toggle
            id="high-contrast"
            checked={settings.highContrast ?? false}
            onChange={(v) => set({ highContrast: v })}
            label="ניגודיות גבוהה"
            description="שחור/לבן עם גבולות חזקים — שומר על קוד הצבע של התאים (F4)"
          />
        </div>
      </section>

      {/* ── קול ודיבור ── */}
      <section className="settings-section" aria-labelledby="s-voice">
        <div className="settings-section__header">
          <span className="settings-section__icon" aria-hidden="true">🔊</span>
          <h3 className="settings-section__title" id="s-voice">קול ודיבור</h3>
        </div>
        <div className="settings-section__body">
          <div>
            <label htmlFor="voice-select" className="voice-select-label">קול דיבור</label>
            {voices.length === 0 ? (
              <p className="voice-none">אין קולות עבריים זמינים במכשיר</p>
            ) : (
              <select
                id="voice-select"
                className="voice-select"
                value={voiceURI ?? ''}
                onChange={(e) => onVoiceURIChange(e.target.value || null)}
              >
                <option value="">ברירת מחדל</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                ))}
              </select>
            )}
          </div>
          <Slider
            id="rate-slider"
            label="קצב הקראה"
            value={ttsRate}
            min={0.5}
            max={2.0}
            step={0.1}
            format={(v) => `${v.toFixed(1)}×`}
            onChange={onTtsRateChange}
          />
          <Slider
            id="pitch-slider"
            label="גובה צליל"
            value={ttsPitch}
            min={0.5}
            max={2.0}
            step={0.1}
            format={(v) => `${v.toFixed(1)}×`}
            onChange={onTtsPitchChange}
          />
        </div>
      </section>

      {/* ── תצוגה ── */}
      {onDarkModeChange !== undefined && (
        <section className="settings-section" aria-labelledby="s-display">
          <div className="settings-section__header">
            <span className="settings-section__icon" aria-hidden="true">🌙</span>
            <h3 className="settings-section__title" id="s-display">תצוגה</h3>
          </div>
          <div className="settings-section__body">
            <Toggle
              id="dark-mode"
              checked={darkMode ?? false}
              onChange={onDarkModeChange}
              label="מצב לילה"
              description="מפחית עצימות האור — מתאים לשימוש בחושך"
            />
          </div>
        </section>
      )}

      {/* ── פרטיות וסנכרון ── */}
      {hasPrivacy && (
        <section className="settings-section" aria-labelledby="s-privacy">
          <div className="settings-section__header">
            <span className="settings-section__icon" aria-hidden="true">🔒</span>
            <h3 className="settings-section__title" id="s-privacy">פרטיות וסנכרון</h3>
          </div>
          <div className="settings-section__body">
            <div className="privacy-section">
              <p className="privacy-section__desc">
                ברירת מחדל: נתוני הילד נשמרים <strong>מקומית בלבד</strong> במכשיר זה.
                הפעלת סנכרון תעלה לוחות ופרופילים לשרת המאובטח.
              </p>
              {onSyncEnabledChange && (
                <Toggle
                  id="sync-enabled"
                  checked={syncEnabled ?? false}
                  onChange={onSyncEnabledChange}
                  label="הפעל סנכרון ענן (גיבוי אוטומטי בין מכשירים)"
                  description="הנתונים מוצפנים לפני העלאה. ניתן לכבות בכל עת."
                />
              )}
              {onSyncPhotosChange && (
                <Toggle
                  id="sync-photos"
                  checked={syncPhotos ?? false}
                  onChange={onSyncPhotosChange}
                  label="סנכרן תמונות לענן"
                  description="ההצפנה מתבצעת במכשיר לפני ההעלאה. מפתח ההצפנה לא עולה לענן לעולם."
                  disabled={!isAuthenticated}
                />
              )}
              {onDeleteFromCloud && (
                <div className="privacy-section__actions">
                  <button
                    type="button"
                    className="ui-btn ui-btn--danger ui-btn--sm"
                    onClick={() => void handleDelete()}
                    disabled={deleting || !isAuthenticated}
                    aria-busy={deleting}
                  >
                    {deleting ? 'מוחק…' : 'מחק תמונות מהענן'}
                  </button>
                  {deleteMsg && (
                    <span
                      role={deleteMsg.ok ? 'status' : 'alert'}
                      className={`privacy-section__feedback privacy-section__feedback--${deleteMsg.ok ? 'ok' : 'err'}`}
                    >
                      {deleteMsg.text}
                    </span>
                  )}
                  <p className="privacy-section__note">
                    התמונות יישמרו במכשיר זה; רק העותק בענן יימחק.
                  </p>
                </div>
              )}
              {loginPanel}
            </div>
          </div>
        </section>
      )}

      {/* ── מקרא פיצג׳רלד ── */}
      <section className="settings-section" aria-labelledby="s-fitzgerald">
        <div className="settings-section__header">
          <span className="settings-section__icon" aria-hidden="true">🎨</span>
          <h3 className="settings-section__title" id="s-fitzgerald">מקרא צבעי פיצג׳רלד</h3>
        </div>
        <div className="settings-section__body">
          <div className="fitz-legend" role="list" aria-label="מקרא קטגוריות פיצג׳רלד">
            {(
              Object.entries(FITZGERALD) as Array<[string, { bg: string; text: string; label: string }]>
            ).map(([key, { bg, text, label }]) => (
              <span
                key={key}
                role="listitem"
                className="fitz-legend__chip"
                style={{ background: bg, color: text }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>
    </Modal>
  );
}
