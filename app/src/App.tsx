import { useEffect, useMemo, useRef, useState } from 'react';
import type { Cell } from './domain/models';
import {
  type AppMode,
  canManageProfiles,
  verifyPin,
} from './domain/access';
import {
  type ActiveContext,
  createProfile,
  ensureSeeded,
  loadActiveContext,
  switchActiveProfile,
} from './data/bootstrap';
import { createSettingsRepo } from './data/settingsRepo';
import {
  type AccessSettings,
  DEFAULT_ACCESS_SETTINGS,
} from './domain/accessSettings';
import { BoardView } from './presentation/components/BoardView';
import { BuilderView } from './presentation/builder/BuilderView';
import { SentenceBar } from './presentation/components/SentenceBar';
import { AdultBar } from './presentation/components/AdultBar';
import { PinGate } from './presentation/components/PinGate';
import { NavBar } from './presentation/components/NavBar';
import { AccessSettingsPanel } from './presentation/settings/AccessSettingsPanel';
import { BackupPanel } from './presentation/settings/BackupPanel';
import { SyncStatus } from './presentation/components/SyncStatus';
import { PrivacyToggle } from './presentation/settings/PrivacyToggle';
import { LoginPanel } from './presentation/auth/LoginPanel';
import { UsageDashboard } from './presentation/analytics/UsageDashboard';
import { analyticsService } from './services/analytics/analyticsService';
import { clearEvents } from './data/usageRepo';
import { pruneCache } from './data/symbolCache';
import { QuickStartWizard } from './presentation/wizard/QuickStartWizard';
import {
  createBrowserTts,
  waitForVoices,
  type HebrewTts,
} from './services/tts/ttsService';
import { NikudService } from './services/nikud/nikudService';
import { createIdbNikudCache } from './services/nikud/nikudCache';
import { createNakdanFetcher } from './services/nikud/nakdanClient';
import {
  type NavStack,
  createNavStack,
  navPush,
  navPop,
  navHome,
  navCurrent,
  navCanGoBack,
} from './domain/navigationStack';
import {
  createSyncEngine,
  type SyncEngine,
  type SyncStatus as SyncStatusType,
} from './services/sync/syncEngine';
import { LocalStubProvider } from './services/sync/syncProvider';
import { FirebaseProvider } from './services/sync/firebaseProvider';
import { authService, type AuthUser } from './services/sync/authService';

/** מה שמוקרא: ניקוד אם קיים, אחרת הטקסט הגלוי. */
function vocalize(c: Cell): string {
  return c.vocalization ?? c.nikud ?? c.label;
}

export function App() {
  const [ctx, setCtx] = useState<ActiveContext | null>(null);
  const [mode, setMode] = useState<AppMode>('locked');
  const [pinPrompt, setPinPrompt] = useState(false);
  const [sentence, setSentence] = useState<Cell[]>([]);
  const [hasHeVoice, setHasHeVoice] = useState<boolean | null>(null);
  const [navStack, setNavStack] = useState<NavStack | null>(null);
  const [builderMode, setBuilderMode] = useState(false);
  const [accessSettings, setAccessSettings] = useState<AccessSettings>(
    DEFAULT_ACCESS_SETTINGS,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>('disabled');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const ttsRef = useRef<HebrewTts | null>(null);
  const storedPinRef = useRef<string>('');
  const nikudRef = useRef<NikudService | null>(null);
  const syncEngineRef = useRef<SyncEngine | null>(null);
  /** sessionId חי כל הפעלה — לא נשמר, לא מקושר ל-uid */
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  // ref מסנכרן עם syncEnabled state כדי שקרוב syncEngine תמיד יראה ערך נוכחי
  const syncEnabledRef = useRef(false);

  // עדכן ref כשה-state משתנה
  useEffect(() => {
    syncEnabledRef.current = syncEnabled;
  }, [syncEnabled]);

  // אתחול: seed, PIN, קונטקסט פעיל, TTS, NikudService, auth listener
  useEffect(() => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    void clearEvents(Date.now() - 90 * DAY_MS);
    void pruneCache(30);

    let alive = true;
    void (async () => {
      await ensureSeeded();
      const settingsRepo = createSettingsRepo();
      storedPinRef.current = (await settingsRepo.getCaregiverPin()) ?? '';
      const access = await settingsRepo.getAccessSettings();
      const loaded = await loadActiveContext();
      if (alive) {
        setAccessSettings(access);
        setCtx(loaded);
        setNavStack(createNavStack(loaded.activeProfile.homeBoardId));
      }
    })();

    const tts = createBrowserTts();
    ttsRef.current = tts;
    if (!tts) {
      setHasHeVoice(false);
    } else {
      void waitForVoices().then(() => {
        if (alive) setHasHeVoice(tts.hasHebrewVoice());
      });
    }

    nikudRef.current = new NikudService(
      createIdbNikudCache(),
      createNakdanFetcher(),
    );

    const unsubAuth = authService.onAuthChange((u) => {
      if (alive) setAuthUser(u);
    });

    return () => {
      alive = false;
      unsubAuth();
    };
  }, []);

  // צור/החלף מנוע סנכרון כשה-provider משתנה (auth + syncEnabled)
  // אינווריאנט: FirebaseProvider נוצר רק כש-syncEnabled=true && authUser קיים
  useEffect(() => {
    syncEngineRef.current?.dispose();

    const provider =
      syncEnabled && authUser ? new FirebaseProvider() : new LocalStubProvider();

    const engine = createSyncEngine(provider, () => syncEnabledRef.current);
    syncEngineRef.current = engine;
    const unsub = engine.onStatusChange(setSyncStatus);

    if (syncEnabled && authUser) {
      void engine.runSync();
    } else {
      setSyncStatus('disabled');
    }

    return () => {
      unsub();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncEnabled, authUser?.uid]);

  // איפוס מחסנית ניווט כשמחליפים פרופיל
  useEffect(() => {
    if (!ctx) return;
    setNavStack(createNavStack(ctx.activeProfile.homeBoardId));
    setSentence([]);
  }, [ctx?.activeProfile.id]);

  // מצב נעול מלא (Guided Access, FR-019)
  useEffect(() => {
    if (mode !== 'locked') return;
    window.history.pushState(null, '', window.location.href);
    const onPop = () => window.history.pushState(null, '', window.location.href);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [mode]);

  const onChangeAccess = (next: AccessSettings): void => {
    setAccessSettings(next);
    void createSettingsRepo().saveAccessSettings(next);
  };

  const speak = (text: string): void => {
    void ttsRef.current?.speak(text);
  };

  const currentBoard = useMemo(() => {
    if (!ctx) return null;
    if (!navStack) return ctx.board;
    return ctx.allBoards[navCurrent(navStack)] ?? ctx.board;
  }, [navStack, ctx]);

  const onCell = (cell: Cell): void => {
    const action = cell.action;

    if (action.type === 'speak') {
      setSentence((s) => [...s, cell]);
      speak(vocalize(cell));
      if (ctx && currentBoard) {
        analyticsService.trackCellPress(
          ctx.activeProfile.id,
          currentBoard.id,
          cell,
          sessionIdRef.current,
        );
      }
      if (!cell.nikud && nikudRef.current) {
        void nikudRef.current.getNikud(cell.label);
      }
    } else if (action.type === 'navigate') {
      setNavStack((prev) =>
        prev ? navPush(prev, action.targetBoardId) : prev,
      );
    } else if (action.type === 'back') {
      setNavStack((prev) => (prev ? navPop(prev) : prev));
    } else if (action.type === 'home') {
      if (ctx) {
        setNavStack(navHome(ctx.activeProfile.homeBoardId));
      }
    } else if (action.type === 'deleteWord') {
      setSentence((s) => s.slice(0, -1));
    } else if (action.type === 'clear') {
      setSentence([]);
    }
  };

  const speakSentence = (): void => {
    if (sentence.length > 0) speak(sentence.map(vocalize).join(' '));
  };

  const tryUnlock = (pin: string): boolean => {
    if (!verifyPin(pin, storedPinRef.current)) return false;
    setMode('adult');
    setPinPrompt(false);
    return true;
  };

  const lock = (): void => setMode('locked');

  const onSwitch = (id: string): void => {
    void switchActiveProfile(id).then((next) => {
      setCtx(next);
    });
  };

  const onCreate = (name: string): void => {
    void (async () => {
      const profile = await createProfile(name);
      const next = await switchActiveProfile(profile.id);
      setCtx(next);
    })();
  };

  const onWizardComplete = (profileId: string): void => {
    setWizardOpen(false);
    void switchActiveProfile(profileId).then((next) => {
      setCtx(next);
    });
  };

  const onSignOut = (): void => {
    const provider = syncEnabled ? new FirebaseProvider() : new LocalStubProvider();
    void authService.signOut(provider);
  };

  const adult = canManageProfiles(mode);
  const canBack = navStack ? navCanGoBack(navStack) : false;

  // מחוון uid קצר לתצוגה ב-header
  const uidBadge = authUser ? authUser.email.split('@')[0] : null;

  return (
    <div className="app" dir="rtl">
      <header className="app__header">
        <h1 className="app__title">לוח תקשורת</h1>
        {ctx && (
          <span className="app__profile" aria-label="פרופיל פעיל">
            {ctx.activeProfile.name}
          </span>
        )}
        {adult && <SyncStatus status={syncStatus} />}
        {adult && uidBadge && (
          <span className="app__badge app__badge--user" aria-label="משתמש מחובר">
            {uidBadge}
          </span>
        )}
        <span
          className={
            hasHeVoice === false ? 'app__badge app__badge--warn' : 'app__badge'
          }
        >
          {hasHeVoice === null
            ? 'טוען קול…'
            : hasHeVoice
              ? 'קול עברי זמין'
              : 'אין קול עברי — הקראה בסיסית'}
        </span>
      </header>

      <div className="app__controls">
        {adult ? (
          ctx && (
            <AdultBar
              profiles={ctx.profiles}
              activeProfileId={ctx.activeProfile.id}
              onSwitch={onSwitch}
              onCreate={onCreate}
              onOpenWizard={() => setWizardOpen(true)}
              onLock={lock}
              onEditBoard={() => setBuilderMode(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenBackup={() => setBackupOpen(true)}
              onOpenAnalytics={() => setAnalyticsOpen(true)}
              onSignOut={authUser ? onSignOut : undefined}
            />
          )
        ) : pinPrompt ? (
          <PinGate onUnlock={tryUnlock} onCancel={() => setPinPrompt(false)} />
        ) : (
          <button
            type="button"
            className="app__adultbtn"
            onClick={() => setPinPrompt(true)}
          >
            מצב מבוגר
          </button>
        )}
      </div>

      <SentenceBar
        words={sentence.map((c) => c.label)}
        onSpeak={speakSentence}
        onDelete={() => setSentence((s) => s.slice(0, -1))}
        onClear={() => setSentence([])}
      />

      <NavBar
        canGoBack={canBack}
        onBack={() => setNavStack((prev) => (prev ? navPop(prev) : prev))}
        onHome={() => {
          if (ctx) setNavStack(navHome(ctx.activeProfile.homeBoardId));
        }}
      />

      {builderMode && ctx && currentBoard ? (
        <BuilderView
          board={currentBoard}
          onBoardChange={(b) => {
            setCtx((prev) =>
              prev
                ? {
                    ...prev,
                    board: prev.board.id === b.id ? b : prev.board,
                    allBoards: { ...prev.allBoards, [b.id]: b },
                  }
                : prev,
            );
          }}
          onExitBuilder={() => setBuilderMode(false)}
          nikudService={nikudRef.current}
        />
      ) : ctx && currentBoard ? (
        <BoardView board={currentBoard} onCell={onCell} accessSettings={accessSettings} />
      ) : (
        <div className="app__loading" role="status">
          טוען…
        </div>
      )}

      {settingsOpen && (
        <AccessSettingsPanel
          settings={accessSettings}
          onChange={onChangeAccess}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {settingsOpen && (
        <PrivacyToggle
          syncEnabled={syncEnabled}
          onChange={(enabled) => {
            setSyncEnabled(enabled);
          }}
        />
      )}

      {/* LoginPanel מוצג כש-syncEnabled=true ועדיין לא מחובר */}
      {settingsOpen && syncEnabled && !authUser && (
        <LoginPanel
          onSignIn={async (email, password) => {
            const provider = new FirebaseProvider();
            await authService.signIn(provider, email, password);
          }}
          onSignUp={async (email, password) => {
            const provider = new FirebaseProvider();
            await authService.signUp(provider, email, password);
          }}
        />
      )}

      {backupOpen && <BackupPanel onClose={() => setBackupOpen(false)} />}

      {analyticsOpen && ctx && (
        <UsageDashboard
          profileId={ctx.activeProfile.id}
          onClose={() => setAnalyticsOpen(false)}
        />
      )}

      {wizardOpen && (
        <QuickStartWizard
          onComplete={onWizardComplete}
          onClose={() => setWizardOpen(false)}
        />
      )}
    </div>
  );
}
