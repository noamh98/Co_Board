import { Suspense, lazy, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Board, Cell } from './domain/models';
import { canManageProfiles } from './domain/access';
import { createProfile, switchActiveProfile } from './data/bootstrap';
import { createSettingsRepo, setSyncPhotos } from './data/settingsRepo';
import { BoardView } from './presentation/components/BoardView';
import { BoardToolbar } from './presentation/components/BoardToolbar';
import { BoardPrintView } from './presentation/print/BoardPrintView';
import { BoardLibrary } from './presentation/components/BoardLibrary';
import { NavBar } from './presentation/components/NavBar';
import { BrandBar } from './presentation/components/BrandBar';
import { CategoryMenu } from './presentation/components/CategoryMenu';
import { SyncStatus } from './presentation/components/SyncStatus';
import { createMediaRepo } from './data/mediaRepo';
import { createBoardRepo } from './data/boardRepo';
import { deleteMediaFromStorage } from './services/sync/mediaSync';
import { FirebaseStorageProvider } from './services/sync/storageProvider';
import {
  type NavStack,
  createNavStack,
  navPush,
  navPop,
  navHome,
  navCanGoBack,
} from './domain/navigationStack';
import { LocalStubProvider } from './services/sync/syncProvider';
import { FirebaseProvider } from './services/sync/firebaseProvider';
import { authService } from './services/sync/authService';
import {
  signInWithGoogle,
  sendVerificationEmail,
  getUserStatus,
  createUserRecord,
  getAdminClaim,
  signOutFirebase,
} from './services/sync/firebaseAuth';
import {
  type ModelingSession,
  createModelingSession,
} from './domain/modelingSession';
// ── פאזה I ──
import { PredictionBar } from './presentation/components/PredictionBar';
import { SceneView } from './presentation/components/SceneView';
import { useScanning } from './services/access/useScanning';
import { notifyError, onNotifyError } from './services/notify/notifyService';
import { AuthGate } from './presentation/app/AuthGate';
import { AppModals } from './presentation/app/AppModals';
import type { PanelId } from './presentation/state/panelState';
import { useTtsSettings } from './presentation/app/useTtsSettings';
import { useThemeClasses } from './presentation/app/useThemeClasses';
import { useAppBootstrap } from './presentation/app/useAppBootstrap';
import { useBoardNavigation } from './presentation/app/useBoardNavigation';
import { useSyncEngine } from './presentation/app/useSyncEngine';
import { useSentence } from './presentation/app/useSentence';
import { usePrediction } from './presentation/app/usePrediction';
import { useCellDispatcher } from './presentation/app/useCellDispatcher';
import { useLockMode } from './presentation/app/useLockMode';

// E3: פאנלי מבוגר כבדים נטענים lazily (code-splitting) — לא בבנדל הראשוני של מסך הילד.
const BuilderView = lazy(() =>
  import('./presentation/builder/BuilderView').then((m) => ({ default: m.BuilderView })),
);

/** מה שמוקרא: ניקוד אם קיים, אחרת הטקסט הגלוי. */
function vocalize(c: Cell): string {
  return c.vocalization ?? c.nikud ?? c.label;
}

export function App() {
  const tts = useTtsSettings();

  // ref-trampoline: useAppBootstrap צריך hydrateDarkMode/initNavStack מ-hooks
  // שנקראים אחריו (theme תלוי ב-accessSettings, boardNav תלוי ב-ctx — שניהם פרי
  // bootstrap עצמו). ה-wrapper היציב (useCallback, תלויות ריקות) מוענק ל-bootstrap
  // פעם אחת; ה-ref מתעדכן בכל רינדור לאחר שהיעד האמיתי נוצר.
  const hydrateDarkModeRef = useRef<(enabled: boolean) => void>(() => {});
  const hydrateDarkMode = useCallback(
    (enabled: boolean) => hydrateDarkModeRef.current(enabled),
    [],
  );
  const initNavStackRef = useRef<(homeBoardId: string) => void>(() => {});
  const initNavStack = useCallback(
    (homeBoardId: string) => initNavStackRef.current(homeBoardId),
    [],
  );

  const bootstrap = useAppBootstrap({
    ttsRef: tts.ttsRef,
    fallbackTtsRef: tts.fallbackTtsRef,
    setHasHeVoice: tts.setHasHeVoice,
    hydrateTts: tts.hydrate,
    hydrateDarkMode,
    initNavStack,
  });

  const theme = useThemeClasses(bootstrap.accessSettings.highContrast ?? false);
  hydrateDarkModeRef.current = theme.hydrate;

  const sentenceState = useSentence();

  const boardNav = useBoardNavigation(bootstrap.ctx, () => sentenceState.setSentence([]));
  initNavStackRef.current = (homeBoardId: string) =>
    boardNav.setNavStack(createNavStack(homeBoardId));

  const [builderMode, setBuilderMode] = useState(false);
  // כשנכנסים ל-builder דרך "+ לוח חדש" מהספרייה — לפתוח מיד את NewBoardChooser.
  const [newBoardFromLibrary, setNewBoardFromLibrary] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [modelingActive, setModelingActive] = useState(false);
  const [modelingSession, setModelingSession] = useState<ModelingSession | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  /** טיימר toast השגיאה — נשמר לניקוי במצב unmount (D3). */
  const errorToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // lock: חזרה למצב ילד — מאפס builder + ניווט ללוח הבית של הפרופיל (הילד לא נשאר
  // בלוח שהמבוגר פתח).
  const lockMode = useLockMode(() => {
    setBuilderMode(false);
    if (bootstrap.ctx) boardNav.setNavStack(navHome(bootstrap.ctx.activeProfile.homeBoardId));
  });

  const syncEngine = useSyncEngine(bootstrap.authUser);

  // F7: ערך עדכני של מניעת-כפילויות (ref — בלי stale closure ב-onCell/addPredictedWord).
  const preventDupRef = useRef(false);
  preventDupRef.current = bootstrap.accessSettings.preventSequentialDuplicates ?? false;

  const prediction = usePrediction({
    enabled: bootstrap.accessSettings.predictionEnabled ?? false,
    sentence: sentenceState.sentence,
    setSentence: sentenceState.setSentence,
    visibleCells: boardNav.visibleCells,
    speak: tts.speak,
    preventDupRef,
  });

  // D3: ניקוי טיימר ה-toast ב-unmount.
  useEffect(
    () => () => {
      if (errorToastTimerRef.current) clearTimeout(errorToastTimerRef.current);
    },
    [],
  );

  // Phase 1.7 (U-1): הרשמה לערוץ שגיאות-משתמש — כשל בפעולה מציג toast במקום להיבלע.
  useEffect(
    () =>
      onNotifyError((message) => {
        setErrorToast(message);
        if (errorToastTimerRef.current) clearTimeout(errorToastTimerRef.current);
        errorToastTimerRef.current = setTimeout(() => setErrorToast(null), 4000);
      }),
    [],
  );

  const onChangeAccess = (next: typeof bootstrap.accessSettings): void => {
    bootstrap.setAccessSettings(next);
    void createSettingsRepo().saveAccessSettings(next);
  };

  const onSyncPhotosChange = (enabled: boolean): void => {
    bootstrap.setSyncPhotosState(enabled);
    void setSyncPhotos(enabled);
  };

  const onDeletePhotosFromCloud = async (): Promise<void> => {
    if (!bootstrap.ctx || !bootstrap.authUser) return;
    const repo = createMediaRepo();
    const entries = await repo.listByProfile(bootstrap.ctx.activeProfile.id);
    const storageProvider = new FirebaseStorageProvider();
    await Promise.allSettled(
      entries
        .filter((e) => e.downloadUrl)
        .map((e) => deleteMediaFromStorage(e.profileId, e.id, storageProvider)),
    );
  };

  const onToggleModeling = (): void => {
    setModelingActive((prev) => {
      const next = !prev;
      setModelingSession(next ? createModelingSession() : null);
      return next;
    });
  };

  const onCell = useCellDispatcher({
    modelingActive,
    mode: lockMode.mode,
    ctx: bootstrap.ctx,
    currentBoard: boardNav.currentBoard,
    setModelingSession,
    setSentence: sentenceState.setSentence,
    setNavStack: boardNav.setNavStack,
    speakOpts: tts.speakOpts,
    ttsRef: tts.ttsRef,
    symbolRepoRef: bootstrap.symbolRepoRef,
    sessionIdRef: bootstrap.sessionIdRef,
    preventDupRef,
    predictionsRef: prediction.predictionsRef,
    addPredictedWord: prediction.addPredictedWord,
  });

  const speakSentence = (): void => {
    if (sentenceState.sentence.length === 0) return;
    tts.speak(sentenceState.sentence.map(vocalize).join(' '));
    // I2 — למידה מקומית מהאמירה שנאמרה (n-gram פרטי).
    prediction.learnFromSentence(sentenceState.sentence.map((c) => c.label));
  };

  // I3 — סריקת מתגים מעל התאים הגלויים (בתצוגת ילד בלבד).
  const scanningActive =
    !!bootstrap.accessSettings.scanningEnabled &&
    !builderMode &&
    openPanel !== 'settings' &&
    !!boardNav.currentBoard;
  const { highlightedIndices: scanIndices } = useScanning({
    enabled: scanningActive,
    itemCount: boardNav.visibleCells.length,
    speedMs: bootstrap.accessSettings.scanSpeedMs ?? 1200,
    auditory: !!bootstrap.accessSettings.scanAuditory,
    mode: bootstrap.accessSettings.scanMode ?? 'linear',
    gridCols: boardNav.currentBoard?.grid?.cols ?? 1,
    onSelect: (i) => {
      const c = boardNav.visibleCells[i];
      if (c) onCell(c);
    },
    onHighlight: (i) => {
      const c = boardNav.visibleCells[i];
      if (c) tts.speak(c.nikud ?? c.label);
    },
  });

  // פתיחת לוח מהספרייה: שורש מחסנית ניווט חדשה בלוח שנבחר, מעבר לתצוגת לוח.
  const onOpenBoardFromLibrary = (boardId: string): void => {
    boardNav.setNavStack(createNavStack(boardId));
    sentenceState.setSentence([]);
    lockMode.setView('board');
  };

  // "+ לוח חדש" מהספרייה → נכנס ל-builder ופותח את NewBoardChooser הקיים (בלי שכפול).
  const onNewBoardFromLibrary = (): void => {
    lockMode.setView('board');
    setNewBoardFromLibrary(true);
    setBuilderMode(true);
  };

  // ארכוב לוח מהספרייה (מחיקה רכה, הפיכה) — עם אישור, ועדכון מיידי של allBoards.
  const onArchiveBoard = (boardId: string): void => {
    const target = bootstrap.ctx?.allBoards[boardId];
    const label = target?.name ?? 'הלוח';
    if (!window.confirm(`להעביר את "${label}" לארכיון? אפשר לשחזר מגיבוי.`)) return;
    void createBoardRepo()
      .archive(boardId)
      .then(() => {
        bootstrap.setCtx((prev) => {
          if (!prev) return prev;
          const next = { ...prev.allBoards };
          delete next[boardId];
          return { ...prev, allBoards: next };
        });
      })
      .catch(() => notifyError('העברת הלוח לארכיון נכשלה — נסו שוב'));
  };

  const onSwitch = (id: string): void => {
    void switchActiveProfile(id).then((next) => bootstrap.setCtx(next));
  };

  const onCreate = (name: string): void => {
    void (async () => {
      const profile = await createProfile(name);
      const next = await switchActiveProfile(profile.id);
      bootstrap.setCtx(next);
    })();
  };

  // Wizard נפתח מתוך ההגדרות ומחזיר אליהן (בדומה למקור, בו settingsOpen לא נסגר
  // בזמן שה-wizard פתוח מעליו) — גם בהשלמה וגם בביטול.
  const onWizardComplete = (profileId: string): void => {
    setOpenPanel('settings');
    void switchActiveProfile(profileId).then((next) => bootstrap.setCtx(next));
  };

  const onOpenPhraseBank = (): void => {
    if (!bootstrap.ctx) return;
    void sentenceState.fetchPhrases(bootstrap.ctx.activeProfile.id).then(() => {
      setOpenPanel('phraseBank');
    });
  };

  const onBoardImported = (board: Board): void => {
    bootstrap.setCtx((prev) =>
      prev ? { ...prev, allBoards: { ...prev.allBoards, [board.id]: board } } : prev,
    );
  };

  const onLoadPhrase = (cells: Cell[]): void => {
    sentenceState.setSentence(cells);
    setOpenPanel(null);
  };

  const onSignOut = (): void => {
    if (import.meta.env.VITE_FIREBASE_API_KEY) {
      void signOutFirebase().catch(() => notifyError('היציאה מהחשבון נכשלה — נסו שוב'));
    }
    const provider = syncEngine.syncEnabled ? new FirebaseProvider() : new LocalStubProvider();
    void authService.signOut(provider);
  };

  const onGoogleSignIn = async (): Promise<void> => {
    const result = await signInWithGoogle();
    if (!result.uid) return; // redirect mode — reload handles it
    const status = await getUserStatus(result.uid);
    if (!status) {
      await createUserRecord(result.uid, result.displayName ?? '', result.email);
    }
    const isAdmin = await getAdminClaim();
    authService.setAuthUser({
      uid: result.uid,
      email: result.email,
      displayName: result.displayName,
      emailVerified: true,
      status: status ?? 'pending',
      claims: isAdmin ? { admin: true } : undefined,
    });
  };

  const onRegister = async (
    email: string,
    password: string,
    displayName: string,
  ): Promise<void> => {
    const provider = new FirebaseProvider();
    const user = await authService.signUp(provider, email, password);
    await sendVerificationEmail();
    await createUserRecord(user.uid, displayName, email);
    authService.mergeAuthFields({
      displayName,
      emailVerified: false,
      status: 'pending',
    });
  };

  const adult = canManageProfiles(lockMode.mode);
  const canBack = boardNav.navStack ? navCanGoBack(boardNav.navStack) : false;
  // ספרייה כ"בית" של המבוגר: רק במצב מבוגר, מחוץ ל-builder, כשבחרנו תצוגת ספרייה.
  const inLibrary = adult && !builderMode && lockMode.view === 'library';

  // מחוון uid קצר לתצוגה ב-header
  const uidBadge = bootstrap.authUser ? bootstrap.authUser.email.split('@')[0] : null;

  const statusNode = (
    <>
      {adult && <SyncStatus status={syncEngine.syncStatus} />}
      {adult && uidBadge && (
        <span className="app__badge app__badge--user" aria-label="משתמש מחובר">
          {uidBadge}
        </span>
      )}
      <span className={tts.hasHeVoice === false ? 'app__badge app__badge--warn' : 'app__badge'}>
        {tts.hasHeVoice === null
          ? 'טוען קול…'
          : tts.hasHeVoice
            ? 'קול עברי זמין'
            : 'אין קול עברי — הקראה בסיסית'}
      </span>
    </>
  );

  return (
    <AuthGate
      authChecked={bootstrap.authChecked}
      authUser={bootstrap.authUser}
      onSignIn={async (email, password) => {
        const provider = new FirebaseProvider();
        await authService.signIn(provider, email, password);
      }}
      onGoogleSignIn={onGoogleSignIn}
      onRegister={onRegister}
      onSignOut={onSignOut}
    >
      <div
        className="app"
        dir="rtl"
        // I9 — גודל תא מינימלי מתוך ההגדרות (ברירת מחדל 92px, ≥44 לנגישות).
        style={{ ['--cell-min']: `${bootstrap.accessSettings.cellMinPx ?? 92}px` } as CSSProperties}
      >
        <BrandBar
          isAdult={adult}
          onUnlock={lockMode.unlock}
          onLock={lockMode.lock}
          onOpenSettings={adult ? () => setOpenPanel('settings') : undefined}
          onOpenLibrary={
            adult && !inLibrary
              ? () => {
                  setBuilderMode(false);
                  setNewBoardFromLibrary(false);
                  lockMode.setView('library');
                }
              : undefined
          }
          status={statusNode}
        />

        <main className="app__main">
          {inLibrary ? (
            bootstrap.ctx ? (
              <BoardLibrary
                boards={Object.values(bootstrap.ctx.allBoards)}
                homeId={bootstrap.ctx.activeProfile.homeBoardId}
                editMode
                onOpen={onOpenBoardFromLibrary}
                onNew={onNewBoardFromLibrary}
                onArchive={onArchiveBoard}
              />
            ) : (
              <div className="app__loading" role="status">טוען…</div>
            )
          ) : (
            <>
              <BoardToolbar
                words={sentenceState.sentence.map((c) => c.label)}
                onPrint={() => window.print()}
                onSpeak={speakSentence}
                onDeleteWord={() => sentenceState.setSentence((s) => s.slice(0, -1))}
                onClear={() => sentenceState.setSentence([])}
                onHome={() => {
                  if (bootstrap.ctx) boardNav.setNavStack(navHome(bootstrap.ctx.activeProfile.homeBoardId));
                }}
                canGoHome={!!bootstrap.ctx}
                buttonScale={bootstrap.accessSettings.sentenceButtonScale}
              />
              {adult && (
                <button
                  type="button"
                  className="app__save-phrase"
                  onClick={() => sentenceState.saveSentence(bootstrap.ctx?.activeProfile.id)}
                  aria-label="שמירת ביטוי לבנק"
                >
                  💾
                </button>
              )}
              {/* I2 — שורת ניבוי מילה הבאה (כשהניבוי מופעל). */}
              {bootstrap.accessSettings.predictionEnabled && !builderMode && (
                <PredictionBar words={prediction.predictions} onPick={prediction.addPredictedWord} />
              )}
              {sentenceState.saveToast && (
                <div className="app__toast" role="status" aria-live="polite">
                  נשמר!
                </div>
              )}

              {/* I4 — בקרת רמת אוצר מילים (מוצגת רק בלוחות עם רמות). */}
              {!builderMode && boardNav.boardMaxLevel > 0 && (
                <div className="level-bar" role="group" aria-label="רמת אוצר מילים">
                  <button
                    type="button"
                    className="level-bar__btn"
                    onClick={() => boardNav.setCurrentLevel((l) => Math.max(0, l - 1))}
                    disabled={boardNav.currentLevel <= 0}
                    aria-label="הסתר רמה"
                  >
                    −
                  </button>
                  <span className="level-bar__label">
                    רמה {boardNav.currentLevel}/{boardNav.boardMaxLevel}
                  </span>
                  <button
                    type="button"
                    className="level-bar__btn"
                    onClick={() =>
                      boardNav.setCurrentLevel((l) => Math.min(boardNav.boardMaxLevel, l + 1))
                    }
                    disabled={boardNav.currentLevel >= boardNav.boardMaxLevel}
                    aria-label="חשוף רמה"
                  >
                    +
                  </button>
                </div>
              )}

              <NavBar
                canGoBack={canBack}
                onBack={() => boardNav.setNavStack((prev: NavStack | null) => (prev ? navPop(prev) : prev))}
                onHome={() => {
                  if (bootstrap.ctx) boardNav.setNavStack(navHome(bootstrap.ctx.activeProfile.homeBoardId));
                }}
                onCategories={bootstrap.ctx ? () => setCategoryMenuOpen(true) : undefined}
              />

              {categoryMenuOpen && bootstrap.ctx && (
                <CategoryMenu
                  boards={Object.values(bootstrap.ctx.allBoards)}
                  homeId={bootstrap.ctx.activeProfile.homeBoardId}
                  onSelect={(boardId) => {
                    boardNav.setNavStack((prev: NavStack | null) => (prev ? navPush(prev, boardId) : prev));
                    setCategoryMenuOpen(false);
                  }}
                  onClose={() => setCategoryMenuOpen(false)}
                />
              )}

              {builderMode && bootstrap.ctx && boardNav.currentBoard ? (
                <Suspense fallback={<div className="app__loading" role="status">טוען…</div>}>
                  <BuilderView
                    board={boardNav.currentBoard}
                    autoOpenNewBoardChooser={newBoardFromLibrary}
                    mediaSyncConfig={
                      bootstrap.ctx
                        ? {
                            profileId: bootstrap.ctx.activeProfile.id,
                            syncPhotos: bootstrap.syncPhotos,
                            authUserId: bootstrap.authUser?.uid,
                            useFirebase: syncEngine.syncEnabled && !!bootstrap.authUser,
                          }
                        : undefined
                    }
                    onBoardChange={(b) => {
                      bootstrap.setCtx((prev) =>
                        prev
                          ? {
                              ...prev,
                              board: prev.board.id === b.id ? b : prev.board,
                              allBoards: { ...prev.allBoards, [b.id]: b },
                            }
                          : prev,
                      );
                      // C1: טריגר סנכרון (debounced) אחרי עריכת לוח — אחרת השינוי יושב לא-מסונכרן.
                      syncEngine.syncEngineRef.current?.scheduleSync();
                    }}
                    onExitBuilder={() => {
                      setBuilderMode(false);
                      setNewBoardFromLibrary(false);
                    }}
                    nikudService={bootstrap.nikudRef.current}
                  />
                </Suspense>
              ) : bootstrap.ctx && boardNav.currentBoard ? (
                boardNav.currentBoard.kind === 'scene' ? (
                  // I7 — לוח סצנה (VSD): לחיצה על אזור בונה תא וירטואלי ומפעילה את ה-action.
                  <SceneView
                    board={boardNav.currentBoard}
                    onRegion={(r) => onCell({ id: r.id, label: r.label, action: r.action })}
                  />
                ) : (
                  <BoardView
                    board={boardNav.currentBoard}
                    onCell={onCell}
                    accessSettings={bootstrap.accessSettings}
                    modelingHighlights={modelingSession?.activeHighlights}
                    level={boardNav.currentLevel}
                    scanIndices={scanningActive ? scanIndices : []}
                  />
                )
              ) : (
                <div className="app__loading" role="status">
                  טוען…
                </div>
              )}
            </>
          )}
        </main>

        {/* I13 — הדפסת הלוח (לואו-טק). מוסתר בהדפסה עצמה ובתצוגת ספרייה. */}
        {adult && !builderMode && !inLibrary && (
          <button
            type="button"
            className="print-fab no-print"
            onClick={() => window.print()}
            aria-label="הדפס לוח"
            title="הדפס לוח"
          >
            🖨
          </button>
        )}

        {/* F3: תצוגת הדפסה/PDF נקייה (A4 RTL) — מוסתרת על המסך, מופיעה בהדפסה. */}
        {boardNav.currentBoard && <BoardPrintView board={boardNav.currentBoard} />}

        <AppModals
          openPanel={openPanel}
          setOpenPanel={setOpenPanel}
          ctx={bootstrap.ctx}
          currentBoard={boardNav.currentBoard}
          authUser={bootstrap.authUser}
          accessSettings={bootstrap.accessSettings}
          onChangeAccess={onChangeAccess}
          selectedVoiceURI={tts.selectedVoiceURI}
          onVoiceURIChange={tts.onVoiceURIChange}
          ttsRate={tts.ttsRate}
          onTtsRateChange={tts.onTtsRateChange}
          ttsPitch={tts.ttsPitch}
          onTtsPitchChange={tts.onTtsPitchChange}
          darkMode={theme.darkMode}
          onDarkModeChange={theme.onDarkModeChange}
          syncEnabled={syncEngine.syncEnabled}
          onSyncEnabledChange={syncEngine.setSyncEnabled}
          syncPhotos={bootstrap.syncPhotos}
          onSyncPhotosChange={onSyncPhotosChange}
          onDeleteFromCloud={onDeletePhotosFromCloud}
          onSwitchProfile={onSwitch}
          onCreateProfile={onCreate}
          onEditBoard={() => setBuilderMode(true)}
          onNewBoardFromLibrary={onNewBoardFromLibrary}
          onOpenPhraseBank={onOpenPhraseBank}
          modelingActive={modelingActive}
          onToggleModeling={onToggleModeling}
          onSignOut={onSignOut}
          onBoardImported={onBoardImported}
          onWizardComplete={onWizardComplete}
          phrases={sentenceState.phrases}
          onLoadPhrase={onLoadPhrase}
          onDeletePhrase={sentenceState.deletePhraseById}
        />

        {/* Phase 1.7 (U-1): toast שגיאה גלובלי — מוצג בכל תצוגה, כולל ספרייה ומודאלים. */}
        {errorToast && (
          <div className="app__toast app__toast--error" role="alert">
            {errorToast}
          </div>
        )}
      </div>
    </AuthGate>
  );
}
