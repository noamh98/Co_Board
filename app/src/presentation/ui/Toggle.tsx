// presentation/ui/Toggle.tsx — מתג טוגל מודרני (iOS-style switch). RTL מלא.
// הנגישות: role="switch", aria-checked, keyboard support. WCAG 2.1 AA.

interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ id, checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <label className="ui-toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="ui-toggle__input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
      />
      <span className="ui-toggle__track" aria-hidden="true">
        <span className="ui-toggle__thumb" />
      </span>
      {(label || description) && (
        <span className="ui-toggle__content">
          {label && <span className="ui-toggle__label">{label}</span>}
          {description && (
            <span id={`${id}-desc`} className="ui-toggle__desc">{description}</span>
          )}
        </span>
      )}
    </label>
  );
}
