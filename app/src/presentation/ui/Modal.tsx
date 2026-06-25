// presentation/ui/Modal.tsx — מודאל רספונסיבי: desktop=מרכז, phone=bottom-sheet.
// WCAG 2.1/2.2 AA: role="dialog", aria-modal, מלכודת פוקוס + Escape + החזרת פוקוס (D1).

import type { ReactNode, MouseEvent } from 'react';
import { useFocusTrap } from './useFocusTrap';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  'aria-label'?: string;
  className?: string;
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  'aria-label': ariaLabel,
  className,
}: ModalProps) {
  const handleOverlay = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const dialogRef = useFocusTrap<HTMLDivElement>(onClose);

  return (
    <div className="modal-overlay" onClick={handleOverlay}>
      <div
        ref={dialogRef}
        className={['modal', className].filter(Boolean).join(' ')}
        role="dialog"
        aria-label={ariaLabel ?? title}
        aria-modal="true"
        tabIndex={-1}
        dir="rtl"
      >
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="סגור"
          >
            ✕
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
