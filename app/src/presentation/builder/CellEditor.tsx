import { useRef, useState } from 'react';
import type { Board, Cell, CellAction, CellPlacement, Fitzgerald } from '../../domain/models';
import { FITZGERALD, categoryForLabel } from '../../domain/fitzgerald';
import { addCell } from '../../domain/boardEditor';
import { ViolationError } from '../../domain/boardEditor';
import { createSymbolRepo } from '../../data/symbolRepo';
import { createMediaRepo, type MediaMimeType, type MediaSource as MediaEntrySource } from '../../data/mediaRepo';
import { cropImage, removeBackground, compressToWebP } from '../../services/image/imageService';
import type { NikudService } from '../../services/nikud/nikudService';
import { uploadMedia } from '../../services/sync/mediaSync';
import { LocalStubStorageProvider, FirebaseStorageProvider } from '../../services/sync/storageProvider';
import { HiddenToggle } from './HiddenToggle';
import { SymbolPicker } from './SymbolPicker';
import { useFocusTrap } from '../ui/useFocusTrap';

/** הגדרות סנכרון תמונות — מועברות מ-App.tsx דרך BuilderView (אופציונלי). */
export interface MediaSyncConfig {
  profileId: string;
  syncPhotos: boolean;
  authUserId?: string;
  /** אם true — משתמש ב-Firebase Storage; אחרת LocalStub (בדיקות/offline). */
  useFirebase?: boolean;
}

export interface CellEditorProps {
  cell: Cell | null;
  placement: CellPlacement | null;
  board: Board;
  nikudService: NikudService | null;
  onSave: (board: Board) => void;
  onCancel: () => void;
  mediaSyncConfig?: MediaSyncConfig;
}

// I5: רק הפעולות שהעורך חושף (פעולות I5 המורחבות נוצרות תוכניתית, לא דרך הבורר).
// טיפוס רחב (Record<string,string>) כדי שהרחבת CellAction לא תחייב מפתחות חדשים כאן.
const ACTION_LABELS: Record<string, string> = {
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

/** מימדי תמונה אמיתיים (px) — נחוץ ל-crop נכון (G1: file.size הם בייטים, לא פיקסלים). */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image load failed'));
    };
    img.src = url;
  });
}

export function CellEditor({ cell, placement, board, nikudService, onSave, onCancel, mediaSyncConfig }: CellEditorProps) {
  const [label, setLabel] = useState(cell?.label ?? '');
  const [nikud, setNikud] = useState(cell?.nikud ?? '');
  const [fitzgerald, setFitzgerald] = useState<Fitzgerald | undefined>(cell?.fitzgerald);
  const [fitzgeraldManual, setFitzgeraldManual] = useState(cell?.fitzgerald !== undefined);
  const [actionType, setActionType] = useState<CellAction['type']>(cell?.action.type ?? 'speak');
  const [targetBoardId, setTargetBoardId] = useState<string>(
    cell?.action.type === 'navigate' ? cell.action.targetBoardId : '',
  );
  const [imageUri, setImageUri] = useState<string | undefined>(cell?.imageUri);
  const [imagePreview, setImagePreview] = useState<string | undefined>(cell?.imageUri);
  const [isNikudLoading, setIsNikudLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  // A4: symbolId (ARASAAC) ו-audioId (הקלטה) מופרדים — לא עוד עומס על שדה אחד.
  const [symbolId, setSymbolId] = useState<string | undefined>(cell?.symbolId);
  const [audioId, setAudioId] = useState<string | undefined>(cell?.audioId);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [hidden, setHidden] = useState<boolean>(cell?.hidden ?? false);
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  /** blob מעובד (WebP) לשמירה ב-mediaRepo — מאופס בכל בחירת תמונה חדשה. */
  const blobRef = useRef<Blob | null>(null);
  const mediaSourceRef = useRef<MediaEntrySource>('gallery');

  const handleLabelChange = (val: string) => {
    setLabel(val);
    // הצעה אוטומטית לקטגוריה — רק אם המשתמש לא בחר ידנית
    if (!fitzgeraldManual) {
      const suggested = categoryForLabel(val);
      setFitzgerald(suggested);
    }
  };

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

  const handleImageFile = async (file: File, source: MediaEntrySource = 'gallery') => {
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    try {
      // G1: גזירה ריבועית ממורכזת לפי מימדי התמונה האמיתיים (היה file.size — בייטים).
      const { width, height } = await getImageDimensions(file);
      const side = Math.min(width, height);
      const cropped = await cropImage(file, {
        x: Math.floor((width - side) / 2),
        y: Math.floor((height - side) / 2),
        width: side,
        height: side,
      });
      const noBg = await removeBackground(cropped);
      const webp = await compressToWebP(noBg);
      blobRef.current = webp;
      mediaSourceRef.current = source;
      const uri = await blobToDataUri(webp);
      setImageUri(uri);
    } catch {
      blobRef.current = file;
      mediaSourceRef.current = source;
      const uri = await blobToDataUri(file);
      setImageUri(uri);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, source: MediaEntrySource = 'gallery') => {
    const file = e.target.files?.[0];
    if (file) void handleImageFile(file, source);
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
        // A4: הקלטת קול נשמרת כ-audio/webm (היה image/webp שגוי) ומזוהה ב-audioId.
        await repo.save({ id, uri, mimeType: 'audio/webm', source: 'recording', createdAt: Date.now() });
        setAudioId(id);
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

  const dialogRef = useFocusTrap<HTMLDivElement>(onCancel);

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

    const cellId = cell?.id ?? `cell-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const updatedCell: Cell = {
      id: cellId,
      label: trimmedLabel,
      ...(nikud ? { nikud } : {}),
      ...(fitzgerald ? { fitzgerald } : {}),
      ...(imageUri ? { imageUri } : {}),
      ...(symbolId ? { symbolId } : {}),
      ...(audioId ? { audioId } : {}),
      ...(cell?.isCore !== undefined ? { isCore: cell.isCore } : {}),
      ...(hidden ? { hidden: true } : {}),
      action: buildAction(),
    };

    try {
      let newBoard: Board;
      if (cell === null && placement !== null) {
        newBoard = addCell(board, updatedCell, { ...placement, cellId: updatedCell.id });
      } else if (cell !== null) {
        newBoard = {
          ...board,
          cells: { ...board.cells, [updatedCell.id]: updatedCell },
        };
      } else {
        return;
      }
      onSave(newBoard);

      // שמירת תמונה אישית ב-mediaRepo + סנכרון ברקע (לא חוסם UI).
      if (blobRef.current && mediaSyncConfig) {
        const blob = blobRef.current;
        const source = mediaSourceRef.current;
        const { profileId, syncPhotos, authUserId, useFirebase } = mediaSyncConfig;
        void (async () => {
          const mediaId = `media-${cellId}-${Date.now()}`;
          const mimeType: MediaMimeType = blob.type.startsWith('image/') ? blob.type as MediaMimeType : 'image/webp';
          const repo = createMediaRepo();
          const entry = {
            id: mediaId,
            cellId,
            profileId,
            mimeType,
            blob,
            encrypted: false,
            source,
            createdAt: Date.now(),
          };
          await repo.saveMedia(entry);

          if (syncPhotos && authUserId) {
            const storageProvider = useFirebase
              ? new FirebaseStorageProvider()
              : new LocalStubStorageProvider();
            try {
              await uploadMedia(authUserId, entry, storageProvider, repo);
            } catch {
              // העלאה נכשלה — הנתון המקומי שמור; יסונכרן בהזדמנות הבאה.
            }
          }
        })();
        blobRef.current = null;
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
        ref={dialogRef}
        className="cell-editor"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label={cell ? 'עריכת תא' : 'תא חדש'}
        tabIndex={-1}
        style={{
          background: 'var(--cl-surface)',
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
          <label htmlFor="ce-label" style={{ fontSize: '0.9rem', color: 'var(--cl-muted)', display: 'block', marginBottom: 4 }}>
            טקסט
          </label>
          <input
            id="ce-label"
            dir="rtl"
            autoFocus
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            style={{
              width: '100%',
              minHeight: 44,
              padding: '0 10px',
              border: '1px solid var(--cl-border)',
              borderRadius: 10,
              fontSize: '1rem',
            }}
          />
        </div>

        {/* Nikud */}
        <div className="cell-editor__field">
          <label htmlFor="ce-nikud" style={{ fontSize: '0.9rem', color: 'var(--cl-muted)', display: 'block', marginBottom: 4 }}>
            ניקוד
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="ce-nikud"
              dir="rtl"
              value={nikud}
              onChange={(e) => setNikud(e.target.value)}
              style={{
                flex: 1,
                minHeight: 44,
                padding: '0 10px',
                border: '1px solid var(--cl-border)',
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
                background: 'var(--cl-primary)',
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
          <label style={{ fontSize: '0.9rem', color: 'var(--cl-muted)', display: 'block', marginBottom: 6 }}>
            קטגוריה (פיצ׳ג׳רלד)
            {fitzgerald && !fitzgeraldManual && (
              <span style={{ fontSize: '0.78rem', color: 'var(--cl-muted)', marginRight: 6 }}>
                (הצעה אוטומטית)
              </span>
            )}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(Object.keys(FITZGERALD) as Fitzgerald[]).map((key) => {
              const { bg, text, label: catLabel } = FITZGERALD[key];
              const selected = fitzgerald === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  title={catLabel}
                  onClick={() => {
                    const next = selected ? undefined : key;
                    setFitzgerald(next);
                    setFitzgeraldManual(next !== undefined);
                  }}
                  style={{
                    background: bg,
                    color: text,
                    border: selected ? '3px solid var(--cl-primary)' : '2px solid rgba(0,0,0,0.12)',
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
          <label htmlFor="ce-action" style={{ fontSize: '0.9rem', color: 'var(--cl-muted)', display: 'block', marginBottom: 4 }}>
            פעולה
          </label>
          <select
            id="ce-action"
            value={actionType}
            onChange={(e) => setActionType(e.target.value as CellAction['type'])}
            style={{
              width: '100%',
              minHeight: 44,
              padding: '0 10px',
              border: '1px solid var(--cl-border)',
              borderRadius: 10,
              fontSize: '1rem',
              background: 'var(--cl-surface)',
            }}
          >
            {(Object.keys(ACTION_LABELS) as CellAction['type'][]).map((t) => (
              <option key={t} value={t}>{ACTION_LABELS[t]}</option>
            ))}
          </select>
          {actionType === 'navigate' && (
            <input
              dir="ltr"
              aria-label="מזהה לוח יעד"
              placeholder="מזהה לוח יעד"
              value={targetBoardId}
              onChange={(e) => setTargetBoardId(e.target.value)}
              style={{
                width: '100%',
                minHeight: 44,
                padding: '0 10px',
                border: '1px solid var(--cl-border)',
                borderRadius: 10,
                fontSize: '1rem',
                marginTop: 8,
              }}
            />
          )}
        </div>

        {/* Image */}
        <div className="cell-editor__field">
          <label style={{ fontSize: '0.9rem', color: 'var(--cl-muted)', display: 'block', marginBottom: 6 }}>
            תמונה
          </label>
          {imagePreview && (
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
              <img
                src={imagePreview}
                alt="תצוגה מקדימה"
                style={{
                  width: 80,
                  height: 80,
                  objectFit: 'contain',
                  borderRadius: 10,
                  border: '1px solid var(--cl-border)',
                  display: 'block',
                }}
              />
              <button
                type="button"
                onClick={() => { setImageUri(undefined); setImagePreview(undefined); }}
                aria-label="מחק תמונה"
                style={{
                  position: 'absolute',
                  top: -6,
                  left: -6,
                  width: 22,
                  height: 22,
                  border: 'none',
                  borderRadius: '50%',
                  background: 'var(--cl-danger)',
                  color: '#fff',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label
              style={{
                minHeight: 40,
                padding: '0 12px',
                border: '1px solid var(--cl-border)',
                borderRadius: 10,
                background: 'var(--cl-surface-alt)',
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
                onChange={(e) => handleFileChange(e, 'gallery')}
                style={{ display: 'none' }}
              />
            </label>
            <label
              style={{
                minHeight: 40,
                padding: '0 12px',
                border: '1px solid var(--cl-border)',
                borderRadius: 10,
                background: 'var(--cl-surface-alt)',
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
                onChange={(e) => handleFileChange(e, 'camera')}
                style={{ display: 'none' }}
              />
            </label>
            <button
              type="button"
              onClick={() => setSymbolPickerOpen(true)}
              style={{
                minHeight: 40,
                padding: '0 12px',
                border: '1px solid var(--cl-border)',
                borderRadius: 10,
                background: 'var(--cl-chip)',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--cl-primary)',
                fontWeight: 600,
              }}
            >
              סמלים ARASAAC
            </button>
          </div>
        </div>

        {symbolPickerOpen && (
          <SymbolPicker
            onSelect={(uri, arasaacId) => {
              setImageUri(uri);
              setImagePreview(uri);
              setSymbolId(String(arasaacId));
              setSymbolPickerOpen(false);
            }}
            onClose={() => setSymbolPickerOpen(false)}
          />
        )}

        {/* Voice recording */}
        <div className="cell-editor__field">
          <label style={{ fontSize: '0.9rem', color: 'var(--cl-muted)', display: 'block', marginBottom: 6 }}>
            הקלטת קול
          </label>
          {!navigator.mediaDevices ? (
            <span style={{ fontSize: '0.9rem', color: 'var(--cl-warn)' }}>הקלטה אינה זמינה</span>
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
                    background: 'var(--cl-primary)',
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
                    background: 'var(--cl-danger)',
                    color: '#fff',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  עצור
                </button>
              )}
              {audioId && (
                <span style={{ fontSize: '0.85rem', color: 'var(--cl-success)' }}>הקלטה נשמרה</span>
              )}
              {recordingError && (
                <span style={{ fontSize: '0.85rem', color: 'var(--cl-danger)' }}>{recordingError}</span>
              )}
            </div>
          )}
        </div>

        {/* Visibility (FR-014) */}
        <div className="cell-editor__field">
          <label style={{ fontSize: '0.9rem', color: 'var(--cl-muted)', display: 'block', marginBottom: 6 }}>
            חשיפה הדרגתית
          </label>
          <HiddenToggle hidden={hidden} onToggle={setHidden} />
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
              background: 'var(--cl-primary)',
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
              border: '1px solid var(--cl-border)',
              borderRadius: 16,
              background: 'var(--cl-surface-alt)',
              color: 'var(--cl-ink)',
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
