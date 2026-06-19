import { useState, type FormEvent } from 'react';

// שער קוד מטפל למעבר למצב עריכה/מבוגר (PRD §4.5/§8.3). שער MVP מקומי.
export function PinGate({
  onUnlock,
  onCancel,
}: {
  /** מחזיר true אם הקוד תקין (ההורה אימת מול ה-settings). */
  onUnlock: (pin: string) => boolean;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (!onUnlock(pin)) {
      setError(true);
      setPin('');
    }
  };

  return (
    <form className="pin" onSubmit={submit} aria-label="הזנת קוד מטפל">
      <label className="pin__label" htmlFor="pin-input">
        קוד מטפל
      </label>
      <input
        id="pin-input"
        className="pin__input"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={pin}
        onChange={(e) => {
          setPin(e.target.value);
          setError(false);
        }}
        aria-invalid={error}
      />
      <button type="submit" className="pin__btn">
        פתח
      </button>
      <button
        type="button"
        className="pin__btn pin__btn--ghost"
        onClick={onCancel}
      >
        ביטול
      </button>
      {error && (
        <span className="pin__error" role="alert">
          קוד שגוי
        </span>
      )}
    </form>
  );
}
