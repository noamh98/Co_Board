// presentation/app/AppModals.tsx — 8 המודאלים + openPanel יחיד (R6 ב-REFACTOR-PLAN).
// חולץ מ-App.tsx כלשונו. E3: פאנלי מבוגר כבדים נטענים lazily (code-splitting) — לא
// בבנדל הראשוני של מסך הילד.

import { Suspense, lazy } from 'react';
import type { AccessSettings } from '../../domain/accessSettings';
import type { ActiveContext } from '../../data/bootstrap';
import type { Board, Cell } from '../../domain/models';
import type { PhraseEntry } from '../../domain/phraseBank';
import type { AuthUser } from '../../services/sync/authService';
import { GOOGLE_HE_VOICES } from '../../services/tts/googleTtsProvider';
import { AccessSettingsPanel } from '../settings/AccessSettingsPanel';
import { BoardManagementSection } from '../settings/BoardManagementSection';
import { BackupPanel } from '../settings/BackupPanel';
import { PhraseBankPanel } from '../phraseBank/PhraseBankPanel';
import { WordFinderPanel } from '../wordFinder/WordFinderPanel';
import type { PanelId } from '../state/panelState';

const UsageDashboard = lazy(() =>
  import('../analytics/UsageDashboard').then((m) => ({ default: m.UsageDashboard })),
);
const AdminApprovalPanel = lazy(() =>
  import('../auth/AdminApprovalPanel').then((m) => ({ default: m.AdminApprovalPanel })),
);
const QuickStartWizard = lazy(() =>
  import('../wizard/QuickStartWizard').then((m) => ({ default: m.QuickStartWizard })),
);
const ChildrenDashboard = lazy(() =>
  import('../portal/ChildrenDashboard').then((m) => ({ default: m.ChildrenDashboard })),
);

interface AppModalsProps {
  openPanel: PanelId | null;
  setOpenPanel: (panel: PanelId | null) => void;

  ctx: ActiveContext | null;
  currentBoard: Board | null;
  authUser: AuthUser | null;

  accessSettings: AccessSettings;
  onChangeAccess: (next: AccessSettings) => void;
  selectedVoiceURI: string | null;
  onVoiceURIChange: (uri: string | null) => void;
  ttsRate: number;
  onTtsRateChange: (n: number) => void;
  ttsPitch: number;
  onTtsPitchChange: (n: number) => void;
  darkMode: boolean;
  onDarkModeChange: (enabled: boolean) => void;
  syncEnabled: boolean;
  onSyncEnabledChange: (enabled: boolean) => void;
  syncPhotos: boolean;
  onSyncPhotosChange: (enabled: boolean) => void;
  onDeleteFromCloud: (() => Promise<void>) | undefined;

  onSwitchProfile: (id: string) => void;
  onCreateProfile: (name: string) => void;
  onEditBoard: () => void;
  onNewBoardFromLibrary: () => void;
  onOpenPhraseBank: () => void;
  modelingActive: boolean;
  onToggleModeling: () => void;
  onSignOut: () => void;

  onBoardImported: (board: Board) => void;
  onWizardComplete: (profileId: string) => void;

  phrases: PhraseEntry[];
  onLoadPhrase: (cells: Cell[]) => void;
  onDeletePhrase: (id: string) => void;

  /** 3.1 (B-07): קוד הזמנה מ-deep-link → נמסר לפורטל לפתיחת מסך קבלת ההזמנה. */
  initialInviteCode?: string;
  /** 3.1 (B-07): נקרא כשזרימת ההזמנה הסתיימה — לניקוי ה-URL/state ב-App. */
  onInviteConsumed?: () => void;
}

export function AppModals({
  openPanel,
  setOpenPanel,
  ctx,
  currentBoard,
  authUser,
  accessSettings,
  onChangeAccess,
  selectedVoiceURI,
  onVoiceURIChange,
  ttsRate,
  onTtsRateChange,
  ttsPitch,
  onTtsPitchChange,
  darkMode,
  onDarkModeChange,
  syncEnabled,
  onSyncEnabledChange,
  syncPhotos,
  onSyncPhotosChange,
  onDeleteFromCloud,
  onSwitchProfile,
  onCreateProfile,
  onEditBoard,
  onNewBoardFromLibrary,
  onOpenPhraseBank,
  modelingActive,
  onToggleModeling,
  onSignOut,
  onBoardImported,
  onWizardComplete,
  phrases,
  onLoadPhrase,
  onDeletePhrase,
  initialInviteCode,
  onInviteConsumed,
}: AppModalsProps) {
  const closePanel = (): void => setOpenPanel(null);

  return (
    <>
      {openPanel === 'settings' && (
        <AccessSettingsPanel
          settings={accessSettings}
          onChange={onChangeAccess}
          onClose={closePanel}
          voiceURI={selectedVoiceURI}
          onVoiceURIChange={onVoiceURIChange}
          ttsRate={ttsRate}
          onTtsRateChange={onTtsRateChange}
          ttsPitch={ttsPitch}
          onTtsPitchChange={onTtsPitchChange}
          darkMode={darkMode}
          onDarkModeChange={onDarkModeChange}
          syncEnabled={syncEnabled}
          onSyncEnabledChange={onSyncEnabledChange}
          syncPhotos={syncPhotos}
          onSyncPhotosChange={onSyncPhotosChange}
          isAuthenticated={!!authUser}
          onDeleteFromCloud={authUser ? onDeleteFromCloud : undefined}
          ttsApiKey="proxy"
          googleVoices={GOOGLE_HE_VOICES}
          managementSection={
            ctx ? (
              <BoardManagementSection
                profiles={ctx.profiles}
                activeProfileId={ctx.activeProfile.id}
                onSwitch={onSwitchProfile}
                onCreate={onCreateProfile}
                onOpenWizard={() => setOpenPanel('wizard')}
                onEditBoard={() => { closePanel(); onEditBoard(); }}
                onNewBoard={() => { closePanel(); onNewBoardFromLibrary(); }}
                onOpenBackup={() => setOpenPanel('backup')}
                onOpenAnalytics={() => setOpenPanel('analytics')}
                onOpenPhraseBank={() => { closePanel(); onOpenPhraseBank(); }}
                onOpenWordFinder={() => setOpenPanel('wordFinder')}
                onOpenPortal={authUser ? () => setOpenPanel('portal') : undefined}
                onOpenAdmin={authUser?.claims?.admin ? () => setOpenPanel('admin') : undefined}
                onSignOut={authUser ? onSignOut : undefined}
                modelingActive={modelingActive}
                onToggleModeling={() => { onToggleModeling(); closePanel(); }}
              />
            ) : undefined
          }
        />
      )}

      {/* פאנל אדמין */}
      {openPanel === 'admin' && (
        <Suspense fallback={null}>
          <AdminApprovalPanel onClose={closePanel} />
        </Suspense>
      )}

      {/* פורטל ילדים — רק כשמאושר + מחובר */}
      {openPanel === 'portal' && authUser?.uid && (
        <Suspense fallback={null}>
          <ChildrenDashboard
            uid={authUser.uid}
            onClose={closePanel}
            initialInviteCode={initialInviteCode}
            onInviteConsumed={onInviteConsumed}
          />
        </Suspense>
      )}

      {openPanel === 'backup' && (
        <BackupPanel
          onClose={closePanel}
          currentBoard={currentBoard}
          onBoardImported={onBoardImported}
        />
      )}

      {openPanel === 'analytics' && ctx && (
        <Suspense fallback={null}>
          <UsageDashboard profileId={ctx.activeProfile.id} onClose={closePanel} />
        </Suspense>
      )}

      {/* ה-wizard נפתח מתוך ההגדרות ומחזיר אליהן בסגירה/השלמה (כמו במקור, בו
          settingsOpen לא נסגר כשה-wizard פתוח מעליו). */}
      {openPanel === 'wizard' && (
        <Suspense fallback={null}>
          <QuickStartWizard onComplete={onWizardComplete} onClose={() => setOpenPanel('settings')} />
        </Suspense>
      )}

      {openPanel === 'phraseBank' && (
        <PhraseBankPanel
          phrases={phrases}
          onLoad={onLoadPhrase}
          onDelete={onDeletePhrase}
          onClose={closePanel}
        />
      )}

      {openPanel === 'wordFinder' && ctx && (
        <WordFinderPanel
          boards={ctx.allBoards}
          homeId={ctx.activeProfile.homeBoardId}
          onClose={closePanel}
        />
      )}
    </>
  );
}
