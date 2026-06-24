// presentation/ui/Button.tsx — כפתור עם variants. WCAG 2.1 AA.

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className,
  ...props
}: ButtonProps) {
  const cls = [
    'ui-btn',
    `ui-btn--${variant}`,
    size !== 'md' ? `ui-btn--${size}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={cls} {...props}>
      {icon && <span className="ui-btn__icon" aria-hidden="true">{icon}</span>}
      {children && <span className="ui-btn__text">{children}</span>}
    </button>
  );
}
