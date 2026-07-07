// presentation/builder/SceneEditor.tsx — עורך לוח סצנה (VSD, I7).
// מאפשר בחירת תמונת רקע, הוספת/עריכת אזורים לחיצים (hotspots) ושמירתם ב-Board.

import { useEffect, useRef, useState } from 'react';
import type { Board, CellAction, SceneRegion } from '../../domain/models';
import { SceneView } from '../components/SceneView';
import { sanitizeImage } from '../../services/image/imageService';

export interface SceneEditorProps {
  board: Board;
  onChange: (b: Board) => void;
  onClose: () => void;
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

function buildBoard(board: Board, backgroundUri: string, regions: SceneRegion[]): Board {
  return { ...board, kind: 'scene', scene: { backgroundUri, regions } };
}

export function SceneEditor({ board, onChange, onClose }: SceneEditorProps) {
  const [backgroundUri, setBackgroundUri] = useState<string>(
    board.scene?.backgroundUri ?? '',
  );
  const [regions, setRegions] = useState<SceneRegion[]>(
    board.scene?.regions ?? [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bgError, setBgError] = useState<string | null>(null);

  // Escape key → onClose
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgError(null);
    try {
      // E-02: רקעי סצנה הם תצלומים אישיים (בית/חדר הילד). re-encode דרך canvas
      // מסיר EXIF/GPS. fail-closed — בכשל לא שומרים את הבייטים המקוריים.
      const sanitized = await sanitizeImage(file);
      const uri = await blobToDataUri(sanitized);
      setBackgroundUri(uri);
      onChange(buildBoard(board, uri, regions));
    } catch {
      setBgError('עיבוד התמונה נכשל. נסו תמונה אחרת.');
    }
  };

  const updateRegions = (next: SceneRegion[]) => {
    setRegions(next);
    onChange(buildBoard(board, backgroundUri, next));
  };

  const addRegion = () => {
    const newRegion: SceneRegion = {
      id: `region-${Date.now()}`,
      x: 10,
      y: 10,
      w: 20,
      h: 20,
      label: '',
      action: { type: 'speak' },
    };
    const next = [...regions, newRegion];
    setSelectedId(newRegion.id);
    updateRegions(next);
  };

  const deleteRegion = (id: string) => {
    const next = regions.filter((r) => r.id !== id);
    if (selectedId === id) setSelectedId(null);
    updateRegions(next);
  };

  const patchRegion = (id: string, patch: Partial<SceneRegion>) => {
    const next = regions.map((r) => (r.id === id ? { ...r, ...patch } : r));
    updateRegions(next);
  };

  const patchAction = (id: string, actionType: 'speak' | 'navigate', targetBoardId?: string) => {
    const action: CellAction =
      actionType === 'navigate'
        ? { type: 'navigate', targetBoardId: targetBoardId ?? '' }
        : { type: 'speak' };
    patchRegion(id, { action });
  };

  // A board with the current scene state passed to SceneView for background rendering.
  // We pass a no-op onRegion — interaction in edit mode is handled by the overlay.
  const previewBoard: Board = {
    ...board,
    kind: 'scene',
    scene: { backgroundUri, regions: [] }, // regions rendered by overlay, not SceneView
  };

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="עורך סצנה"
        tabIndex={-1}
        style={{
          background: 'var(--cl-surface)',
          borderRadius: 'var(--r-lg)',
          padding: 24,
          width: '100%',
          maxWidth: 860,
          maxHeight: '92dvh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--cl-ink)' }}>
            עורך סצנה
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור עורך סצנה"
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '1.4rem',
              cursor: 'pointer',
              color: 'var(--cl-muted)',
              lineHeight: 1,
              padding: '4px 8px',
              minWidth: 44,
              minHeight: 44,
            }}
          >
            ×
          </button>
        </div>

        {/* Background picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label
            style={{
              minHeight: 40,
              padding: '0 14px',
              border: '1px solid var(--cl-border)',
              borderRadius: 10,
              background: 'var(--cl-surface-alt)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--cl-ink)',
              whiteSpace: 'nowrap',
            }}
          >
            בחר תמונת רקע
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => { void handleBgFile(e); }}
              style={{ display: 'none' }}
            />
          </label>
          {backgroundUri && (
            <img
              src={backgroundUri}
              alt="תמונת רקע"
              style={{
                height: 48,
                width: 80,
                objectFit: 'cover',
                borderRadius: 8,
                border: '1px solid var(--cl-border)',
              }}
            />
          )}
        </div>
        {bgError && (
          <p role="alert" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--cl-danger)' }}>
            {bgError}
          </p>
        )}

        {/* Two-column body: scene preview (inline-start) + region list (inline-end) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr minmax(260px, 340px)',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {/* Scene preview + hotspot overlay */}
          <div
            style={{
              position: 'relative',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid var(--cl-border)',
              background: 'var(--cl-surface-alt)',
              // maintain 16:9 aspect ratio
              aspectRatio: '16 / 9',
            }}
          >
            {backgroundUri ? (
              <>
                <SceneView board={previewBoard} onRegion={() => undefined} />
                {/* Hotspot overlay */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                  }}
                >
                  {regions.map((r) => {
                    const isSelected = r.id === selectedId;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        aria-label={`אזור: ${r.label || '(ללא תווית)'}`}
                        onClick={() => setSelectedId(isSelected ? null : r.id)}
                        style={{
                          position: 'absolute',
                          insetInlineStart: `${r.x}%`,
                          top: `${r.y}%`,
                          width: `${r.w}%`,
                          height: `${r.h}%`,
                          pointerEvents: 'all',
                          background: isSelected
                            ? 'rgba(31, 122, 92, 0.25)'
                            : 'rgba(20, 127, 168, 0.15)',
                          border: isSelected
                            ? '2px solid var(--cl-primary)'
                            : '2px dashed var(--cl-accent)',
                          borderRadius: 6,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          color: isSelected ? 'var(--cl-primary)' : 'var(--cl-ink)',
                          fontWeight: 600,
                          overflow: 'hidden',
                          padding: 2,
                          boxSizing: 'border-box',
                          outline: isSelected ? '2px solid var(--cl-primary)' : 'none',
                          outlineOffset: 2,
                        }}
                      >
                        <span
                          style={{
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textShadow: '0 1px 2px rgba(255,255,255,0.8)',
                          }}
                        >
                          {r.label || '…'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: 180,
                  color: 'var(--cl-muted)',
                  fontSize: '0.9rem',
                }}
              >
                בחר תמונת רקע כדי להתחיל
              </div>
            )}
          </div>

          {/* Region list panel */}
          <aside
            aria-label="רשימת אזורים"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxHeight: 520,
              overflowY: 'auto',
            }}
          >
            <button
              type="button"
              onClick={addRegion}
              aria-label="הוסף אזור חדש"
              style={{
                minHeight: 40,
                padding: '0 16px',
                border: 'none',
                borderRadius: 10,
                background: 'var(--cl-primary)',
                color: '#fff',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              + הוסף אזור
            </button>

            {regions.length === 0 && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--cl-muted)' }}>
                אין אזורים עדיין
              </p>
            )}

            {regions.map((r, idx) => {
              const isSelected = r.id === selectedId;
              const actionType = r.action.type === 'navigate' ? 'navigate' : 'speak';
              const targetBoardId =
                r.action.type === 'navigate' ? r.action.targetBoardId : '';

              return (
                <div
                  key={r.id}
                  style={{
                    border: isSelected
                      ? '2px solid var(--cl-primary)'
                      : '1px solid var(--cl-border)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    background: isSelected ? 'var(--cl-primary-lt)' : 'var(--cl-surface-alt)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {/* Row header: index + delete */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(isSelected ? null : r.id)}
                      aria-label={`בחר אזור ${idx + 1}`}
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--cl-muted)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                      }}
                    >
                      אזור {idx + 1}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRegion(r.id)}
                      aria-label={`מחק אזור ${idx + 1}`}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--cl-danger)',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: 6,
                        lineHeight: 1,
                        minWidth: 44,
                        minHeight: 44,
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Label */}
                  <div>
                    <label
                      htmlFor={`region-label-${r.id}`}
                      style={{ fontSize: '0.8rem', color: 'var(--cl-muted)', display: 'block', marginBottom: 3 }}
                    >
                      תווית
                    </label>
                    <input
                      id={`region-label-${r.id}`}
                      dir="rtl"
                      value={r.label}
                      onChange={(e) => patchRegion(r.id, { label: e.target.value })}
                      style={{
                        width: '100%',
                        minHeight: 36,
                        padding: '0 8px',
                        border: '1px solid var(--cl-border)',
                        borderRadius: 8,
                        fontSize: '0.9rem',
                        background: 'var(--cl-surface)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Position/size inputs: x y w h */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
                    {(['x', 'y', 'w', 'h'] as const).map((field) => (
                      <div key={field}>
                        <label
                          htmlFor={`region-${field}-${r.id}`}
                          style={{ fontSize: '0.75rem', color: 'var(--cl-muted)', display: 'block', marginBottom: 2 }}
                        >
                          {field === 'x' ? 'X%' : field === 'y' ? 'Y%' : field === 'w' ? 'W%' : 'H%'}
                        </label>
                        <input
                          id={`region-${field}-${r.id}`}
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={r[field]}
                          onChange={(e) => patchRegion(r.id, { [field]: Number(e.target.value) })}
                          style={{
                            width: '100%',
                            minHeight: 34,
                            padding: '0 6px',
                            border: '1px solid var(--cl-border)',
                            borderRadius: 8,
                            fontSize: '0.85rem',
                            background: 'var(--cl-surface)',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Action selector */}
                  <div>
                    <label
                      htmlFor={`region-action-${r.id}`}
                      style={{ fontSize: '0.8rem', color: 'var(--cl-muted)', display: 'block', marginBottom: 3 }}
                    >
                      פעולה
                    </label>
                    <select
                      id={`region-action-${r.id}`}
                      value={actionType}
                      onChange={(e) => {
                        const t = e.target.value as 'speak' | 'navigate';
                        patchAction(r.id, t, t === 'navigate' ? '' : undefined);
                      }}
                      style={{
                        width: '100%',
                        minHeight: 36,
                        padding: '0 8px',
                        border: '1px solid var(--cl-border)',
                        borderRadius: 8,
                        fontSize: '0.9rem',
                        background: 'var(--cl-surface)',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="speak">דבר</option>
                      <option value="navigate">נווט ללוח</option>
                    </select>

                    {actionType === 'navigate' && (
                      <input
                        dir="ltr"
                        aria-label={`מזהה לוח יעד לאזור ${idx + 1}`}
                        placeholder="מזהה לוח יעד"
                        value={targetBoardId}
                        onChange={(e) => patchAction(r.id, 'navigate', e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: 34,
                          padding: '0 8px',
                          border: '1px solid var(--cl-border)',
                          borderRadius: 8,
                          fontSize: '0.85rem',
                          marginTop: 6,
                          background: 'var(--cl-surface)',
                          boxSizing: 'border-box',
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </aside>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
          <button
            type="button"
            onClick={onClose}
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
            סיים
          </button>
          <button
            type="button"
            onClick={onClose}
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
