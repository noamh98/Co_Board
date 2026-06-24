// presentation/ui/Slider.tsx — slider עם תצוגת ערך. WCAG 2.1 AA.

interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (value: number) => void;
}

export function Slider({ id, label, value, min, max, step, format, onChange }: SliderProps) {
  const display = format ? format(value) : String(value);
  return (
    <div className="ui-slider">
      <div className="ui-slider__header">
        <label htmlFor={id} className="ui-slider__label">{label}</label>
        <span className="ui-slider__value" aria-live="polite">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        className="ui-slider__input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={display}
      />
    </div>
  );
}
