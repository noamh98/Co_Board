import type { AccessSettings } from '../../domain/accessSettings';

// פאנל הגדרות גישה מוטורית (FR-020, PRD §4.7).
// controlled: onChange מעדכן את ה-state ב-App ושומר ב-settingsRepo.saveAccessSettings.

export function AccessSettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: AccessSettings;
  onChange: (next: AccessSettings) => void;
  onClose: () => void;
}) {
  const set = (patch: Partial<AccessSettings>) => onChange({ ...settings, ...patch });

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

        <button type="button" className="adultbar__btn" onClick={onClose}>
          סגור
        </button>
      </div>
    </div>
  );
}
