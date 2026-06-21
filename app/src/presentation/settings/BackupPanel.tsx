// presentation/settings/BackupPanel.tsx — ייצוא/ייבוא JSON + שחזור גרסה (FR-022).
// FR-035: ייצוא/ייבוא OBF (Open Board Format) — Phase 2.
// עובד 100% offline. לא תלוי בספק ענן.

import { useState, useEffect, useRef } from 'react';
import { backupRepo, type VersionSnapshot } from '../../data/backupRepo';
import { getDeviceId } from '../../services/sync/crypto';
import type { Board } from '../../domain/models';
import { exportToOBF, importFromOBF, type OBFBoard } from '../../services/obf/obfService';
import { createBoardRepo } from '../../data/boardRepo';

interface Props {
  onClose: () => void;
  /** לוח נוכחי לייצוא OBF. אופציונלי — אם לא סופק, כפתור ייצוא OBF מוסתר. */
  currentBoard?: Board | null;
  /** קריאה-חזרה לאחר ייבוא OBF מוצלח — מאפשרת לרענן את הקונטקסט ב-App. */
  onBoardImported?: (board: Board) => void;
}

export function BackupPanel({ onClose, currentBoard, onBoardImported }: Props) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportingObf, setExportingObf] = useState(false);
  const [importingObf, setImportingObf] = useState(false);
  const [versions, setVersions] = useState<VersionSnapshot[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'ok' | 'error' } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const obfFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadVersions();
  }, []);

  async function loadVersions(): Promise<void> {
    const all = await backupRepo.listVersions('board', '');
    setVersions(all);
  }

  async function handleExport(): Promise<void> {
    setExporting(true);
    try {
      const deviceId = await getDeviceId();
      const backup = await backupRepo.exportBackup(deviceId);
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `luach-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ text: 'גיבוי יוצא בהצלחה', type: 'ok' });
    } catch {
      setMessage({ text: 'שגיאה בייצוא גיבוי', type: 'error' });
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(file: File): Promise<void> {
    setImporting(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text) as ReturnType<typeof JSON.parse>;
      await backupRepo.importBackup(backup);
      setMessage({ text: 'גיבוי יובא בהצלחה — רענן את הדף', type: 'ok' });
    } catch (e) {
      setMessage({ text: `שגיאה בייבוא: ${(e as Error).message}`, type: 'error' });
    } finally {
      setImporting(false);
    }
  }

  async function handleExportObf(): Promise<void> {
    if (!currentBoard) return;
    setExportingObf(true);
    try {
      const obf = exportToOBF(currentBoard);
      const json = JSON.stringify(obf, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentBoard.name.replace(/\s+/g, '-')}.obf`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ text: 'לוח יוצא בפורמט OBF', type: 'ok' });
    } catch {
      setMessage({ text: 'שגיאה בייצוא OBF', type: 'error' });
    } finally {
      setExportingObf(false);
    }
  }

  async function handleImportObf(file: File): Promise<void> {
    setImportingObf(true);
    try {
      const text = await file.text();
      const obf = JSON.parse(text) as OBFBoard;
      const board = importFromOBF(obf);
      await createBoardRepo().save(board);
      onBoardImported?.(board);
      setMessage({ text: `לוח "${board.name}" יובא בהצלחה`, type: 'ok' });
    } catch (e) {
      setMessage({ text: `שגיאה בייבוא OBF: ${(e as Error).message}`, type: 'error' });
    } finally {
      setImportingObf(false);
    }
  }

  async function handleRestore(entityType: string, entityId: string, version: number): Promise<void> {
    try {
      await backupRepo.restoreVersion(
        entityType as 'board' | 'profile',
        entityId,
        version,
      );
      setMessage({ text: `גרסה ${version} שוחזרה — רענן את הדף`, type: 'ok' });
    } catch {
      setMessage({ text: 'שגיאה בשחזור גרסה', type: 'error' });
    }
  }

  return (
    <div className="backup-panel" dir="rtl" role="dialog" aria-label="גיבוי ושחזור">
      <div className="backup-panel__header">
        <h2>גיבוי ושחזור</h2>
        <button type="button" onClick={onClose} aria-label="סגור">✕</button>
      </div>

      {message && (
        <div className={`backup-panel__msg backup-panel__msg--${message.type}`} role="alert">
          {message.text}
        </div>
      )}

      <section className="backup-panel__section">
        <h3>ייצוא גיבוי מקומי</h3>
        <p>מוריד קובץ JSON עם כל הלוחות, הפרופילים וההגדרות.</p>
        <button
          type="button"
          className="backup-panel__btn"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'מייצא…' : 'ייצא גיבוי'}
        </button>
      </section>

      <section className="backup-panel__section">
        <h3>ייבוא גיבוי</h3>
        <p>ייבוא קובץ גיבוי JSON. נתונים קיימים יוחלפו.</p>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImport(f);
          }}
        />
        <button
          type="button"
          className="backup-panel__btn"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
        >
          {importing ? 'מייבא…' : 'בחר קובץ גיבוי'}
        </button>
      </section>

      {/* OBF ייצוא — FR-035 */}
      {currentBoard && (
        <section className="backup-panel__section">
          <h3>ייצוא OBF</h3>
          <p>ייצא את הלוח הנוכחי בפורמט Open Board Format לשיתוף עם אפליקציות AAC אחרות.</p>
          <button
            type="button"
            className="backup-panel__btn"
            onClick={() => void handleExportObf()}
            disabled={exportingObf}
          >
            {exportingObf ? 'מייצא…' : 'ייצוא OBF'}
          </button>
        </section>
      )}

      {/* OBF ייבוא — FR-035 */}
      <section className="backup-panel__section">
        <h3>ייבוא OBF</h3>
        <p>ייבא לוח מקובץ Open Board Format (.obf).</p>
        <input
          ref={obfFileRef}
          type="file"
          accept=".obf,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImportObf(f);
          }}
        />
        <button
          type="button"
          className="backup-panel__btn"
          onClick={() => obfFileRef.current?.click()}
          disabled={importingObf}
        >
          {importingObf ? 'מייבא…' : 'ייבוא OBF'}
        </button>
      </section>

      {versions.length > 0 && (
        <section className="backup-panel__section">
          <h3>גרסאות שמורות לשחזור</h3>
          <ul className="backup-panel__versions">
            {versions.map((v) => (
              <li key={v.key} className="backup-panel__version-item">
                <span>{v.entityType} / {v.entityId} — גרסה {v.version}</span>
                <span className="backup-panel__version-date">
                  {new Date(v.savedAt).toLocaleString('he-IL')}
                </span>
                <button
                  type="button"
                  onClick={() => void handleRestore(v.entityType, v.entityId, v.version)}
                >
                  שחזר
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
