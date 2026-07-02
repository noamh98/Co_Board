// presentation/ui/ConfirmDialog.tsx — דיאלוג אישור נגיש על בסיס Modal (D1),
// מחליף window.confirm/alert הבלתי-נגישים ובלתי-מעוצבים (Phase 2.3, U-2/X-3).

import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  title?: string;
  /** שורות ההודעה — '\n' בטקסט מקורי הופך לפסקאות נפרדות. */
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** מסמן פעולה הרסנית (מחיקה/ארכוב) — הכפתור המאשר מקבל variant="danger". */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title = 'אישור פעולה',
  message,
  confirmLabel = 'אישור',
  cancelLabel = 'ביטול',
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message.split('\n').map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </Modal>
  );
}
