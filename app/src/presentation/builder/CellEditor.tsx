import { useRef, useState } from 'react';
import type { Board, Cell, CellAction, CellPlacement, Fitzgerald } from '../../domain/models';
import { FITZGERALD } from '../../domain/fitzgerald';
import { addCell } from '../../domain/boardEditor';
import { ViolationError } from '../../domain/boardEditor';
import { createSymbolRepo } from '../../data/symbolRepo';
import { cropImage, removeBackground, compressToWebP } from '../../services/image/imageService';
import type { NikudService } from '../../services/nikud/nikudService';

export interface CellEditorProps {
  cell: Cell | null;
  placement: CellPlacement | null;
  board: Board;
  nikudService: NikudService | null;
  onSave: (board: Board) => void;
  onCancel: () => void;
}

const ACTION_LABELS: Record<CellAction['type'], string> = {
  speak: 'דבר',
  navigate: 'נווט',
  back: 'חזור',
  home: 'בית',
  clear: 'נקה',
  deleteWord: 'מחק',
};

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

export function CellEditor({ cell, placement, board, nikudService, onSave, onCancel }: CellEditorProps) {
  const [label, setLabel] = useState(cell?.label ?? '');
  const [nikud, setNikud] = useState(cell?.nikud ?? '');
  const [fitzgerald, setFitzgerald] = useState<Fitzgerald | undefined>(cell?.fitzgerald);
  const [actionType, setActionType] = useState<CellAction['type']>(cell?.action.type ?? 'speak');
  const [targetBoardId, setTargetBoardId] = useState<string>(
    cell?.action.type === 'navigate' ? cell.action.targetBoardId : '',
  );
  const [imageUri, setImageUri] = useState<string | undefined>(cell?.imageUri);
  const [imagePreview, setImagePreview] = useState<string | undefined>(cell?.imageUri);
  const [isNikudLoading, setIsNikudLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSymbolId, setRecordingSymbolId] = useState<string | undefined>(cell?.symbolId);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleAutoNikud = async () => {
    if (!nikudService || !label.trim()) return;
    setIsNikudLoading(true);
    try {
      const result = await nikudService.getNikud(label);
      setNikud(result.nikud);
    } finally {
      setIsNikudLoading(false);
    }
  };

  const handleImageFile = async (file: File) => {
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    try {
      const cropped = await cropImage(file, { x: 0, y: 0, width: file.size, height: file.size });
      const noBg = await removeBackground(cropped);
      const webp = await compressToWebP(noBg);
      const uri = await blobToDataUri(webp);
      setImageUri(uri);
    } catch {
      // Fallback: read file directly
      const uri = await blobToDataUri(file);
      setImageUri(uri);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleImageFile(file);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices) {
      setRecordingError('הקלטה אינה זמינה');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const uri = await blobToDataUri(blob);
        const id = `rec-${Date.now()}`;
        const repo = createSymbolRepo();
        await repo.save({ id, uri, mimeType: 'image/webp', source: 'recording', createdAt: Date.now() });
        setRecordingSymbolId(id);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
      setRecordingError(null);
    } catch {
      setRecordingError('לא ניתן לגשת למיקרופון');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const buildAction = (): CellAction => {
    if (actionType === 'navigate') return { type: 'navigate', targetBoardId };
    return { type: actionType } as CellAction;
  };

  const handleSave = () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      alert('יש להזין טקסט לתא');
      return;
    }

    const updatedCell: Cell = {
      id: cell?.id ?? `cell-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: trimmedLabel,
      ...(nikud ? { nikud } : {}),
      ...(fitzgerald ? { fitzgerald } : {}),
      ...(imageUri ? { imageUri } : {}),
      ...(recordingSymbolId ? { symbolId: recordingSymbolId } : cell?.symbolId ? { symbolId: cell.symbolId } : {}),
      ...(cell?.isCore !== undefined ? { isCore: cell.isCore } : {}),
      ...(cell?.hidden !== undefined ? { hidden: cell.hidden } : {}),
      action: buildAction(),
    };

    try {
      if (cell === null && placement !== null) {
        const newBoard = addCell(board, updatedCell, { ...placement, cellId: updatedCell.id });
        onSave(newBoard);
      } else if (cell !== null) {
        const newBoard: Board = {
          ...board,
          cells: { ...board.cells, [updatedCell.id]: updatedCell },
        };
        onSave(newBoard);
      }
    } catch (err) {
      if (err instanceof ViolationError) {
        alert(`שגיאת מוטוריקה: ${err.message}`);
      } else if (err instanceof Error) {
        alert(err.message);
      }
    }
  };

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
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="cell-editor"
        dir="rtl"
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          minWidth: 340,
          maxWidth: 480,
          width: '100%',
          maxHeight: '90dvh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
          {cell ? 'ערוך תא' : 'תא חדש'}
        </h2>

        {/* Label */}
        <div className="cell-editor__field">
          <label style={{ fontSize: '0.9rem', color: '#6b7280', display: 'block', marginBottom: 4 }}>
            טקסט
          </label>
          <input
            dir="rtl"
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{
              width: '100%',
              minHeight: 44,
              padding: '0 10px',
              border: '1px solid #d1d5db',
              borderRadius: 10,
              fontSize: '1rem',
            }}
          />
        </div>

        {/* Nikud */}
        <div className="cell-editor__field">
          <label style={{ fontSize: '0.9rem', color: '#6b7280', display: 'block', marginBottom: 4 }}>
            ניקוד
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              dir="rtl"
              value={nikud}
              onChange={(e) => setNikud(e.target.value)}
              style={{
                flex: 1,
                minHeight: 44,
                padding: '0 10px',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                fontSize: '1rem',
              }}
            />
            <button
              type="button"
              onClick={() => void handleAutoNikud()}
              disabled={isNikudLoading || !nikudService}
              style={{
                minHeight: 44,
                padding: '0 12px',
                border: 'none',
                borderRadius: 10,
                background: '#3f6f8f',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {isNikudLoading ? '...' : 'מלא אוטומטי'}
            </button>
          </div>
        </div>

        {/* Fitzgerald color */}
        <div className="cell-editor__field">
          <label style={{ fontSize: '0.9rem', color: '#6b7280', display: 'block', marginBottom: 6 }}>
            קטגוריה (פיצ׳ג׳רלד)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(Object.keys(FITZGERALD) as Fitzgerald[]).map((key) => {
              const { bg, text, label: catLabel } = FITZGERALD[key];
              const selected = fitzgerald === key;
              return (
                <button
                  key={key}
                  type="button"
                  title={catLabel}
                  onClick={() => setFitzgerald(selected ? undefined : key)}
                  style={{
                    background: bg,
                    color: text,
                    border: selected ? '3px solid #1f2937' : '2px solid rgba(0,0,0,0.12)',
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: '0.82rem',
                    fontWeight: selected ? 700 : 400,
                    cursor: 'pointer',
                    minHeight: 36,
                  }}
                >
                  {catLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action */}
        <div className="cell-editor__field">
          <label style={{ fontSize: '0.9rem', color: '#6b7280', display: 'block', marginBottom: 4 }}>
            פעולה
          </label>
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value as CellAction['type'])}
            style={{
              width: '100%',
              minHeight: 44,
              padding: '0 10px',
              border: '1px solid #d1d5db',
              borderRadius: 10,
              fontSize: '1rem',
              background: '#fff',
            }}
          >
            {(Object.keys(ACTION_LABELS) as CellAction['type'][]).map((t) => (
              <option key={t} value={t}>{ACTION_LABELS[t]}</option>
            ))}
          </select>
          {actionType === 'navigate' && (
            <input
              dir="ltr"
              placeholder="מזהה לוח יעד"
              value={targetBoardId}
              onChange={(e) => setTargetBoardId(e.target.value)}
              style={{
                width: '100%',
                minHeight: 44,
                padding: '0 10px',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                fontSize: '1rem',
                marginTop: 8,
              }}
            />
          )}
        </div>

        {/* Image */}
        <div className="cell-editor__field">
          <label style={{ fontSize: '0.9rem', color: '#6b7280', display: 'block', marginBottom: 6 }}>
            תמונה
          </label>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="תצוגה מקדימה"
              style={{
                width: 80,
                height: 80,
                objectFit: 'contain',
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                marginBottom: 8,
                display: 'block',
              }}
            />
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label
              style={{
                minHeight: 40,
                padding: '0 12px',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                background: '#f3f4f6',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              גלריה
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
            <label
              style={{
                minHeight: 40,
                padding: '0 12px',
                border: '1px solid #d1d5db',
                borderRadius: 10,
                background: '#f3f4f6',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              מצלמה
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {/* Voice recording */}
        <div className="cell-editor__field">
          <label style={{ fontSize: '0.9rem', color: '#6b7280', display: 'block', marginBottom: 6 }}>
            הקלטת קול
          </label>
          {!navigator.mediaDevices ? (
            <span style={{ fontSize: '0.9rem', color: '#b45309' }}>הקלטה אינה זמינה</span>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {!isRecording ? (
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  style={{
                    minHeight: 40,
                    padding: '0 14px',
                    border: 'none',
                    borderRadius: 10,
                    background: '#3f6f8f',
                    color: '#fff',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  הקלט קול
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  style={{
                    minHeight: 40,
                    padding: '0 14px',
                    border: 'none',
                    borderRadius: 10,
                    background: '#b91c1c',
                    color: '#fff',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  עצור
                </button>
              )}
              {recordingSymbolId && (
                <span style={{ fontSize: '0.85rem', color: '#16a34a' }}>הקלטה נשמרה</span>
              )}
              {recordingError && (
                <span style={{ fontSize: '0.85rem', color: '#b91c1c' }}>{recordingError}</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start', marginTop: 4 }}>
          <button
            type="button"
            onClick={handleSave}
            style={{
              minHeight: 44,
              padding: '0 22px',
              border: 'none',
              borderRadius: 16,
              background: '#3f6f8f',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            שמור
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              minHeight: 44,
              padding: '0 18px',
              border: '1px solid #d1d5db',
              borderRadius: 16,
              background: '#f3f4f6',
              color: '#1f2937',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
