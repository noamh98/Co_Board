import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  ttsApiKey,
  onTtsApiKeyChange,
  googleVoices = [],
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
  ttsApiKey?: string | null;
  onTtsApiKeyChange?: (key: string | null) => void;
  googleVoices?: Array<{ id: string; displayName: string }>;
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
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const prevApiKeyRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (prevApiKeyRef.current === undefined) {
      setApiKeyInput(ttsApiKey ?? '');
    }
    prevApiKeyRef.current = ttsApiKey;
  }, [ttsApiKey]);

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

      {/* ── סריקה וניבוי (פאזה I) ── */}
      <section className="settings-section" aria-labelledby="s-scan">
        <div className="settings-section__header">
          <span className="settings-section__icon" aria-hidden="true">🔁</span>
          <h3 className="settings-section__title" id="s-scan">סריקה וניבוי</h3>
        </div>
        <div className="settings-section__body">
          <Toggle
            id="scanning-enabled"
            checked={settings.scanningEnabled ?? false}
            onChange={(v) => set({ scanningEnabled: v })}
            label="סריקת מתגים"
            description="הדגשה עוברת בין תאים; בחירה ב-Enter או מתג"
          />
          {settings.scanningEnabled && (
            <div>
              <label htmlFor="scan-mode" className="voice-select-label">מצב סריקה</label>
              <select
                id="scan-mode"
                className="voice-select"
                value={settings.scanMode ?? 'linear'}
                onChange={(e) => set({ scanMode: e.target.value as 'linear' | 'row-column' })}
              >
                <option value="linear">לינארי (תא-אחר-תא)</option>
                <option value="row-column">שורות-עמודות</option>
              </select>
            </div>
          )}
          <Toggle
            id="scan-auditory"
            checked={settings.scanAuditory ?? true}
            onChange={(v) => set({ scanAuditory: v })}
            label="סריקה שמיעתית"
            description="הקראת התווית בעת ההדגשה"
          />
          <Slider
            id="scan-speed"
            label="מהירות סריקה"
            value={settings.scanSpeedMs ?? 1200}
            min={0}
            max={3000}
            step={100}
            format={(v) => (v === 0 ? 'ידני' : `${v} מ"ש`)}
            onChange={(v) => set({ scanSpeedMs: v })}
          />
          <Toggle
            id="prediction-enabled"
            checked={settings.predictionEnabled ?? false}
            onChange={(v) => set({ predictionEnabled: v })}
            label="ניבוי מילה הבאה"
            description="שורת הצעות מעל הלוח (לומד מקומית, פרטי)"
          />
          <Slider
            id="cell-min"
            label="גודל תא מינימלי"
            value={settings.cellMinPx ?? 92}
            min={44}
            max={140}
            step={4}
            format={(v) => `${v}px`}
            onChange={(v) => set({ cellMinPx: v })}
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
            <label htmlFor="voice-select" className="voice-select-label">
              קול דיבור
              {ttsApiKey && <span className="tts-provider-badge"> Google TTS</span>}
            </label>
            {ttsApiKey ? (
              googleVoices.length > 0 ? (
                <select
                  id="voice-select"
                  className="voice-select"
                  value={voiceURI ?? googleVoices[0].id}
                  onChange={(e) => onVoiceURIChange(e.target.value)}
                >
                  {googleVoices.map((v) => (
                    <option key={v.id} value={v.id}>{v.displayName}</option>
                  ))}
                </select>
              ) : null
            ) : voices.length === 0 ? (
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

          {onTtsApiKeyChange && (
            <div className="tts-api-key-row">
              <label htmlFor="tts-api-key" className="voice-select-label">
                Google TTS — מפתח API
              </label>
              {ttsApiKey ? (
                <div className="tts-api-key-active">
                  <span className="tts-api-key-set">מפתח מוגדר ✓</span>
                  <button
                    type="button"
                    className="ui-btn ui-btn--danger ui-btn--sm"
                    onClick={() => { onTtsApiKeyChange(null); setApiKeyInput(''); }}
                  >
                    נקה
                  </button>
                </div>
              ) : (
                <div className="tts-api-key-input-row">
                  <input
                    id="tts-api-key"
                    type={showKey ? 'text' : 'password'}
                    className="tts-api-key-input"
                    value={apiKeyInput}
                    placeholder="AIza..."
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    autoComplete="off"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="ui-btn ui-btn--ghost ui-btn--sm"
                    onClick={() => setShowKey((s) => !s)}
                    aria-label={showKey ? 'הסתר מפתח' : 'הצג מפתח'}
                  >
                    {showKey ? '🙈' : '👁'}
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn--primary ui-btn--sm"
                    disabled={!apiKeyInput.trim()}
                    onClick={() => { if (apiKeyInput.trim()) onTtsApiKeyChange(apiKeyInput.trim()); }}
                  >
                    שמור
                  </button>
                </div>
              )}
              <p className="tts-api-key-hint">
                {ttsApiKey
                  ? 'Google TTS פעיל — קולות עבריים באיכות גבוהה (Wavenet). ראשונה מהרשת, אחר כך cache.'
                  : 'ללא מפתח: קול המכשיר (Microsoft Asaf). עם מפתח: קולות Wavenet איכותיים.'}
              </p>
            </div>
          )}

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
