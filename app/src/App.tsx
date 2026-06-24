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
import { CategoryMenu } from './presentation/components/CategoryMenu';
import { AccessSettingsPanel } from './presentation/settings/AccessSettingsPanel';
import { BackupPanel } from './presentation/settings/BackupPanel';
import { SyncStatus } from './presentation/components/SyncStatus';
import { PrivacyToggle } from './presentation/settings/PrivacyToggle';
import { MediaPrivacyPanel } from './presentation/settings/MediaPrivacyPanel';
import { LoginPanel } from './presentation/auth/LoginPanel';
import { UsageDashboard } from './presentation/analytics/UsageDashboard';
import { analyticsService } from './services/analytics/analyticsService';
import { clearEvents } from './data/usageRepo';
import { pruneCache } from './data/symbolCache';
import { getSyncPhotos, setSyncPhotos } from './data/settingsRepo';
import { createMediaRepo } from './data/mediaRepo';
import { deleteMediaFromStorage } from './services/sync/mediaSync';
import { FirebaseStorageProvider } from './services/sync/storageProvider';
import { QuickStartWizard } from './presentation/wizard/QuickStartWizard';
import { PhraseBankPanel } from './presentation/phraseBank/PhraseBankPanel';
import { WordFinderPanel } from './presentation/wordFinder/WordFinderPanel';
import { createPhrase } from './domain/phraseBank';
import type { PhraseEntry } from './domain/phraseBank';
import { savePhrase, listPhrases, deletePhrase } from './data/phraseRepo';
import {
  createBrowserTts,
  createHybridTts,
  waitForVoices,
  speakCell,
  type TtsLike,
  type SpeakOptions,
} from './services/tts/ttsService';
import { GoogleTtsProvider } from './services/tts/googleTtsProvider';
import { getTtsApiKey } from './data/settingsRepo';
import { pruneAudioCache } from './data/audioCache';
import { createSymbolRepo, type SymbolRepo } from './data/symbolRepo';
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
import {
  type ModelingSession,
  createModelingSession,
  toggleHighlight,
} from './domain/modelingSession';

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
  const [phraseBankOpen, setPhraseBankOpen] = useState(false);
  const [wordFinderOpen, setWordFinderOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [phrases, setPhrases] = useState<PhraseEntry[]>([]);
  const [saveToast, setSaveToast] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>('disabled');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [modelingActive, setModelingActive] = useState(false);
  const [modelingSession, setModelingSession] = useState<ModelingSession | null>(null);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
  const [ttsRate, setTtsRate] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [syncPhotos, setSyncPhotosState] = useState(false);

  const ttsRef = useRef<TtsLike | null>(null);
  const symbolRepoRef = useRef<SymbolRepo>(createSymbolRepo());
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
    void pruneAudioCache(500);

    let alive = true;
    void (async () => {
      await ensureSeeded();
      const settingsRepo = createSettingsRepo();
      storedPinRef.current = (await settingsRepo.getCaregiverPin()) ?? '';
      const access = await settingsRepo.getAccessSettings();
      const voiceURI = await settingsRepo.getSelectedVoiceURI();
      const rate = await settingsRepo.getTtsRate();
      const pitch = await settingsRepo.getTtsPitch();
      const photosEnabled = await getSyncPhotos();
      const loaded = await loadActiveContext();
      if (alive) {
        setAccessSettings(access);
        setSelectedVoiceURI(voiceURI);
        setTtsRate(rate);
        setTtsPitch(pitch);
        setSyncPhotosState(photosEnabled);
        setCtx(loaded);
        setNavStack(createNavStack(loaded.activeProfile.homeBoardId));
      }
    })();

    const tts = createBrowserTts();
    void (async () => {
      const apiKey = await getTtsApiKey();
      const provider = apiKey ? new GoogleTtsProvider(apiKey) : null;
      ttsRef.current = tts ? createHybridTts(tts, provider) : null;
    })();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const onVoiceURIChange = (uri: string | null): void => {
    setSelectedVoiceURI(uri);
    void createSettingsRepo().setSelectedVoiceURI(uri);
  };

  const onTtsRateChange = (n: number): void => {
    setTtsRate(n);
    void createSettingsRepo().setTtsRate(n);
  };

  const onTtsPitchChange = (n: number): void => {
    setTtsPitch(n);
    void createSettingsRepo().setTtsPitch(n);
  };

  const onSyncPhotosChange = (enabled: boolean): void => {
    setSyncPhotosState(enabled);
    void setSyncPhotos(enabled);
  };

  const onDeletePhotosFromCloud = async (): Promise<void> => {
    if (!ctx || !authUser) return;
    const repo = createMediaRepo();
    const entries = await repo.listByProfile(ctx.activeProfile.id);
    const storageProvider = new FirebaseStorageProvider();
    await Promise.allSettled(
      entries
        .filter((e) => e.downloadUrl)
        .map((e) => deleteMediaFromStorage(e.profileId, e.id, storageProvider)),
    );
  };

  const speakOpts = (): SpeakOptions => ({
    voiceURI: selectedVoiceURI,
    rate: ttsRate,
    pitch: ttsPitch,
  });

  const speak = (text: string): void => {
    void ttsRef.current?.speak(text, speakOpts());
  };

  const currentBoard = useMemo(() => {
    if (!ctx) return null;
    if (!navStack) return ctx.board;
    return ctx.allBoards[navCurrent(navStack)] ?? ctx.board;
  }, [navStack, ctx]);

  const onToggleModeling = (): void => {
    setModelingActive((prev) => {
      const next = !prev;
      setModelingSession(next ? createModelingSession() : null);
      return next;
    });
  };

  const onCell = (cell: Cell): void => {
    if (modelingActive && mode === 'adult') {
      setModelingSession((prev) =>
        prev
          ? toggleHighlight(prev, cell.id)
          : toggleHighlight(createModelingSession(), cell.id),
      );
      return;
    }

    const action = cell.action;

    if (action.type === 'speak') {
      setSentence((s) => [...s, cell]);
      void speakCell(cell, symbolRepoRef.current, ttsRef.current, speakOpts());
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

  const onOpenPhraseBank = (): void => {
    if (!ctx) return;
    void listPhrases(ctx.activeProfile.id).then((list) => {
      setPhrases(list);
      setPhraseBankOpen(true);
    });
  };

  const onSaveSentence = (): void => {
    if (!ctx || sentence.length === 0) return;
    const entry = createPhrase(ctx.activeProfile.id, sentence);
    void savePhrase(entry).then(() => {
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 1500);
    });
  };

  const onDeletePhrase = (id: string): void => {
    void deletePhrase(id).then(() => {
      setPhrases((prev) => prev.filter((p) => p.id !== id));
    });
  };

  const onLoadPhrase = (cells: typeof sentence): void => {
    setSentence(cells);
    setPhraseBankOpen(false);
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
              onOpenPhraseBank={onOpenPhraseBank}
              onOpenWordFinder={() => setWordFinderOpen(true)}
              onSignOut={authUser ? onSignOut : undefined}
              modelingActive={modelingActive}
              onToggleModeling={onToggleModeling}
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
        onSave={adult ? onSaveSentence : undefined}
      />
      {saveToast && (
        <div className="app__toast" role="status" aria-live="polite">
          נשמר!
        </div>
      )}

      <NavBar
        canGoBack={canBack}
        onBack={() => setNavStack((prev) => (prev ? navPop(prev) : prev))}
        onHome={() => {
          if (ctx) setNavStack(navHome(ctx.activeProfile.homeBoardId));
        }}
        onCategories={ctx ? () => setCategoryMenuOpen(true) : undefined}
      />

      {categoryMenuOpen && ctx && (
        <CategoryMenu
          boards={Object.values(ctx.allBoards)}
          homeId={ctx.activeProfile.homeBoardId}
          onSelect={(boardId) => {
            setNavStack((prev) => (prev ? navPush(prev, boardId) : prev));
            setCategoryMenuOpen(false);
          }}
          onClose={() => setCategoryMenuOpen(false)}
        />
      )}

      {builderMode && ctx && currentBoard ? (
        <BuilderView
          board={currentBoard}
          mediaSyncConfig={ctx ? {
            profileId: ctx.activeProfile.id,
            syncPhotos,
            authUserId: authUser?.uid,
            useFirebase: syncEnabled && !!authUser,
          } : undefined}
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
        <BoardView
          board={currentBoard}
          onCell={onCell}
          accessSettings={accessSettings}
          modelingHighlights={modelingSession?.activeHighlights}
        />
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
          voiceURI={selectedVoiceURI}
          onVoiceURIChange={onVoiceURIChange}
          ttsRate={ttsRate}
          onTtsRateChange={onTtsRateChange}
          ttsPitch={ttsPitch}
          onTtsPitchChange={onTtsPitchChange}
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

      {settingsOpen && (
        <MediaPrivacyPanel
          syncPhotos={syncPhotos}
          onSyncPhotosChange={onSyncPhotosChange}
          isAuthenticated={!!authUser}
          onDeleteFromCloud={authUser ? onDeletePhotosFromCloud : undefined}
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

      {backupOpen && (
        <BackupPanel
          onClose={() => setBackupOpen(false)}
          currentBoard={currentBoard}
          onBoardImported={(board) => {
            setCtx((prev) =>
              prev
                ? { ...prev, allBoards: { ...prev.allBoards, [board.id]: board } }
                : prev,
            );
          }}
        />
      )}

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

      {phraseBankOpen && (
        <PhraseBankPanel
          phrases={phrases}
          onLoad={onLoadPhrase}
          onDelete={onDeletePhrase}
          onClose={() => setPhraseBankOpen(false)}
        />
      )}

      {wordFinderOpen && ctx && (
        <WordFinderPanel
          boards={ctx.allBoards}
          homeId={ctx.activeProfile.homeBoardId}
          onClose={() => setWordFinderOpen(false)}
        />
      )}
    </div>
  );
}
