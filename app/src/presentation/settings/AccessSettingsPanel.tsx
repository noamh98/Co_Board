import { useEffect, useState } from 'react';
import type { AccessSettings } from '../../domain/accessSettings';

// פאנל הגדרות גישה מוטורית (FR-020, PRD §4.7).
// controlled: onChange מעדכן את ה-state ב-App ושומר ב-settingsRepo.saveAccessSettings.

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
}) {
  const set = (patch: Partial<AccessSettings>) => onChange({ ...settings, ...patch });

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        dir="rtl"
        role="dialog"
        aria-label="הגדרות גישה"
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          minWidth: 320,
          maxWidth: 460,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>הגדרות גישה</h2>

        {/* Dwell Time slider */}
        <div>
          <label htmlFor="dwell-slider" style={{ display: 'block', marginBottom: 6 }}>
            זמן השהייה (Dwell):{' '}
            {settings.dwellTimeMs === 0 ? 'כבוי' : `${settings.dwellTimeMs} מ"ש`}
          </label>
          <input
            id="dwell-slider"
            type="range"
            min={0}
            max={3000}
            step={100}
            value={settings.dwellTimeMs}
            onChange={(e) => set({ dwellTimeMs: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={settings.activateOnRelease}
            onChange={(e) => set({ activateOnRelease: e.target.checked })}
          />
          הפעלה בשחרור המגע (Activate on Release)
        </label>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={settings.doubleTapPrevention}
            onChange={(e) => set({ doubleTapPrevention: e.target.checked })}
          />
          מניעת מגע כפול (Double-Tap Prevention)
        </label>

        {/* קול דיבור — FR-010 */}
        <div>
          <label htmlFor="voice-select" style={{ display: 'block', marginBottom: 6 }}>
            קול דיבור
          </label>
          {voices.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
              אין קולות עבריים זמינים במכשיר
            </p>
          ) : (
            <select
              id="voice-select"
              value={voiceURI ?? ''}
              onChange={(e) => onVoiceURIChange(e.target.value || null)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 6 }}
            >
              <option value="">ברירת מחדל</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* קצב הקראה — FR-010 הרחבה */}
        <div>
          <label htmlFor="rate-slider" style={{ display: 'block', marginBottom: 6 }}>
            קצב הקראה: {ttsRate.toFixed(1)}×
          </label>
          <input
            id="rate-slider"
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={ttsRate}
            onChange={(e) => onTtsRateChange(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* גובה צליל — FR-010 הרחבה */}
        <div>
          <label htmlFor="pitch-slider" style={{ display: 'block', marginBottom: 6 }}>
            גובה צליל: {ttsPitch.toFixed(1)}×
          </label>
          <input
            id="pitch-slider"
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={ttsPitch}
            onChange={(e) => onTtsPitchChange(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <button type="button" className="adultbar__btn" onClick={onClose}>
          סגור
        </button>
      </div>
    </div>
  );
}
