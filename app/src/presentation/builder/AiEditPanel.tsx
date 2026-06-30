import { useState } from 'react';
import type { Board } from '../../domain/models';
import { editBoard } from '../../services/ai/aiBoardEditor';
import { Modal } from '../ui/Modal';

// presentation/builder/AiEditPanel.tsx — עריכת-AI שיחתית (F4, Phase 4). ⚠️ SCAFFOLD.
// UI מוכן: תיבת-פקודה חופשית ("תוסיף קטגוריית אוכל") → editBoard → diff על הלוח.
// המנוע עצמו (aiBoardEditor.editBoard) הוא stub עד שחוזה ה-patch ייקבע (ראה אותו קובץ).
// כך שאין כאן המצאת-תוצאה — הפאנל מציג שגיאת "בפיתוח" עד שהשרת יממש action=edit.

export interface AiEditPanelProps {
  board: Board;
  onEdited: (board: Board) => void;
  onClose: () => void;
}

type Phase = 'form' | 'loading' | 'error';

export function AiEditPanel({ board, onEdited, onClose }: AiEditPanelProps) {
  const [command, setCommand] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleApply(): Promise<void> {
    if (!command.trim()) return;
    setPhase('loading');
    setErrorMsg('');
    try {
      const { board: edited } = await editBoard(board, command);
      onEdited(edited);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }

  return (
    <Modal title="✨ עריכה חכמה" onClose={onClose}>
      <div className="smart-create" dir="rtl">
        <label className="wizard__label" htmlFor="ai-edit-cmd">מה לשנות בלוח?</label>
        <textarea
          id="ai-edit-cmd"
          className="wizard__input smart-create__desc"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="לדוגמה: תוסיף קטגוריית אוכל · החלף צבעים · סדר מחדש"
          rows={2}
          dir="rtl"
        />
        {phase === 'error' && (
          <p className="smart-create__state smart-create__state--error" role="alert">
            {errorMsg}
          </p>
        )}
        <button
          type="button"
          className="ui-btn ui-btn--primary"
          onClick={() => void handleApply()}
          disabled={!command.trim() || phase === 'loading'}
        >
          {phase === 'loading' ? 'מעדכן…' : 'החל שינוי'}
        </button>
      </div>
    </Modal>
  );
}
