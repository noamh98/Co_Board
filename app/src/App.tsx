import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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
import { BoardToolbar } from './presentation/components/BoardToolbar';
import { BoardPrintView } from './presentation/print/BoardPrintView';
import { AdultBar } from './presentation/components/AdultBar';
import { PinGate } from './presentation/components/PinGate';
import { NavBar } from './presentation/components/NavBar';
import { BrandBar } from './presentation/components/BrandBar';
import { CategoryMenu } from './presentation/components/CategoryMenu';
import { AccessSettingsPanel } from './presentation/settings/AccessSettingsPanel';
import { BackupPanel } from './presentation/settings/BackupPanel';
import { SyncStatus } from './presentation/components/SyncStatus';
import { AuthGatePage } from './presentation/auth/AuthGatePage';
import { PendingApprovalScreen } from './presentation/auth/PendingApprovalScreen';
import { RejectedScreen } from './presentation/auth/RejectedScreen';
import { analyticsService } from './services/analytics/analyticsService';
import { clearEvents } from './data/usageRepo';
import { pruneCache } from './data/symbolCache';
import { getSyncPhotos, setSyncPhotos, getDarkMode, setDarkMode as persistDarkMode } from './data/settingsRepo';
import { createMediaRepo, pruneArchivedMedia } from './data/mediaRepo';
import { deleteMediaFromStorage } from './services/sync/mediaSync';
import { FirebaseStorageProvider } from './services/sync/storageProvider';
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
  type HebrewTts,
} from './services/tts/ttsService';
import { createTtsProvider } from './services/tts/ttsWiring';
import { primeDeviceId } from './data/deviceId';
import { pruneAudioCache } from './data/audioCache';
import { appendWord } from './domain/sentence';
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
  signInWithGoogle,
  sendVerificationEmail,
  getUserStatus,
  createUserRecord,
  getAdminClaim,
  onFirebaseAuthChange,
  signOutFirebase,
} from './services/sync/firebaseAuth';
import {
  type ModelingSession,
  createModelingSession,
  toggleHighlight,
} from './domain/modelingSession';
// ── פאזה I ──
import { PredictionBar } from './presentation/components/PredictionBar';
import { SceneView } from './presentation/components/SceneView';
import { useScanning } from './services/access/useScanning';
import { predictNext, type NgramModel, emptyModel } from './domain/prediction/predictor';
import { getPredictionModel, recordSequence } from './data/predictionRepo';
import { maxLevel, isFrozenCore } from './domain/growingVocab';
import {
  pluralizeNoun,
  addDefiniteArticle,
  conjugatePresent,
} from './domain/morphology/hebrewMorphology';

// E3: פאנלי מבוגר כבדים נטענים lazily (code-splitting) — לא בבנדל הראשוני של מסך הילד.
const BuilderView = lazy(() =>
  import('./presentation/builder/BuilderView').then((m) => ({ default: m.BuilderView })),
);
const UsageDashboard = lazy(() =>
  import('./presentation/analytics/UsageDashboard').then((m) => ({ default: m.UsageDashboard })),
);
const AdminApprovalPanel = lazy(() =>
  import('./presentation/auth/AdminApprovalPanel').then((m) => ({ default: m.AdminApprovalPanel })),
);
const QuickStartWizard = lazy(() =>
  import('./presentation/wizard/QuickStartWizard').then((m) => ({ default: m.QuickStartWizard })),
);
const ChildrenDashboard = lazy(() =>
  import('./presentation/portal/ChildrenDashboard').then((m) => ({ default: m.ChildrenDashboard })),
);

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
  const [authChecked, setAuthChecked] = useState(!import.meta.env.VITE_FIREBASE_API_KEY);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [darkMode, setDarkModeState] = useState(false);
  // ── פאזה I ──
  const [currentLevel, setCurrentLevel] = useState(0); // I4
  const [predictions, setPredictions] = useState<string[]>([]); // I2
  const predictionModelRef = useRef<NgramModel>(emptyModel());

  const ttsRef = useRef<TtsLike | null>(null);
  const fallbackTtsRef = useRef<HebrewTts | null>(null);
  const symbolRepoRef = useRef<SymbolRepo>(createSymbolRepo());
  const storedPinRef = useRef<string>('');
  const nikudRef = useRef<NikudService | null>(null);
  const syncEngineRef = useRef<SyncEngine | null>(null);
  /** sessionId חי כל הפעלה — לא נשמר, לא מקושר ל-uid. אתחול עצל (D3: לא randomUUID בכל render). */
  const sessionIdRef = useRef<string>('');
  if (!sessionIdRef.current) sessionIdRef.current = crypto.randomUUID();
  /** טיימר ה-toast "נשמר!" — נשמר לניקוי במצב unmount (D3). */
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ref מסנכרן עם syncEnabled state כדי שקרוב syncEngine תמיד יראה ערך נוכחי
  const syncEnabledRef = useRef(false);
  // הפרופיל שאיפסנו עבורו לאחרונה — מבדיל טעינה ראשונית מהחלפת פרופיל אמיתית.
  const resetProfileIdRef = useRef<string | null>(null);

  // עדכן ref כשה-state משתנה
  useEffect(() => {
    syncEnabledRef.current = syncEnabled;
  }, [syncEnabled]);

  // D3: ניקוי טיימר ה-toast ב-unmount.
  useEffect(
    () => () => {
      if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    },
    [],
  );

  // אתחול: seed, PIN, קונטקסט פעיל, TTS, NikudService, auth listener
  useEffect(() => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    // D3: .catch לכל prune — מונע unhandled rejection אם IDB לא זמין.
    void clearEvents(Date.now() - 90 * DAY_MS).catch(() => {});
    void pruneCache(30).catch(() => {});
    void pruneAudioCache(500).catch(() => {});
    void pruneArchivedMedia(50).catch(() => {});

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
      const dark = await getDarkMode();
      const loaded = await loadActiveContext();
      if (alive) {
        setAccessSettings(access);
        setSelectedVoiceURI(voiceURI);
        setTtsRate(rate);
        setTtsPitch(pitch);
        setSyncPhotosState(photosEnabled);
        setDarkModeState(dark);
        setCtx(loaded);
        setNavStack(createNavStack(loaded.activeProfile.homeBoardId));
      }
    })();

    const tts = createBrowserTts();
    fallbackTtsRef.current = tts;
    // A3: אתחול סינכרוני מיידי — לחיצה ראשונה תמיד מדברת, גם לפני שטוען apiKey.
    ttsRef.current = tts;
    // Phase 0 (H-KEY): ספק TTS דרך proxy בשרת — אין מפתח בלקוח. fallback ל-browser נשמר.
    if (alive && tts) ttsRef.current = createHybridTts(tts, createTtsProvider());
    void primeDeviceId(); // CR-6: אתחול deviceId מ-IDB מוקדם.
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

    // Firebase auth listener: מרענן emailVerified + status + admin claim
    let unsubFirebase: (() => void) | undefined;
    if (import.meta.env.VITE_FIREBASE_API_KEY) {
      unsubFirebase = onFirebaseAuthChange((firebaseUser) => {
        if (!alive) return;
        setAuthChecked(true);
        if (!firebaseUser) {
          authService.setAuthUser(null);
          return;
        }
        // בנה AuthUser מורחב
        const base: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          emailVerified: firebaseUser.emailVerified,
          displayName: firebaseUser.displayName ?? undefined,
        };
        authService.setAuthUser(base);
        // טען status + admin claim async
        void (async () => {
          const [status, isAdmin] = await Promise.all([
            getUserStatus(firebaseUser.uid),
            getAdminClaim(),
          ]);
          if (!alive) return;
          authService.mergeAuthFields({
            status: status ?? undefined,
            claims: isAdmin ? { admin: true } : undefined,
          });
        })();
      });
    }

    return () => {
      alive = false;
      unsubAuth();
      unsubFirebase?.();
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

    // C1: חזרת רשת → סנכרון אוטומטי (עריכות אופליין מפסיקות להישאר תקועות עד reload).
    const onOnline = (): void => {
      void engine.runSync();
    };
    window.addEventListener('online', onOnline);

    if (syncEnabled && authUser) {
      void engine.runSync();
    } else {
      setSyncStatus('disabled');
    }

    return () => {
      unsub();
      window.removeEventListener('online', onOnline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncEnabled, authUser?.uid]);

  // איפוס מחסנית ניווט כשמחליפים פרופיל.
  // טעינה ראשונית כבר מאתחלת navStack ב-bootstrap; כאן מאפסים רק בהחלפת פרופיל
  // אמיתית. בלי הבחנה זו, אפקט ה-passive מנקה את sentence אחרי הרינדור הראשון —
  // ויכול למחוק לחיצה ראשונה שקרתה לפניו (race שהפיל את App.test.tsx ב-CI).
  useEffect(() => {
    if (!ctx) return;
    const id = ctx.activeProfile.id;
    if (resetProfileIdRef.current === id) return;
    const firstLoad = resetProfileIdRef.current === null;
    resetProfileIdRef.current = id;
    if (firstLoad) return;
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

  const onDarkModeChange = (enabled: boolean): void => {
    setDarkModeState(enabled);
    void persistDarkMode(enabled);
  };

  // מחיל/מסיר class dark-mode על <html> כך שכל CSS tokens מתעדכנים
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // F4: ערכת ניגודיות גבוהה — class על <html> (כמו dark-mode), נשלט מהגדרות הגישה.
  useEffect(() => {
    if (accessSettings.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [accessSettings.highContrast]);

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

  // I4: רשימת התאים הגלויים בלוח הנוכחי (סדר רינדור זהה ל-BoardView) — לסריקה I3 וניבוי I2.
  const visibleCells = useMemo(() => {
    if (!currentBoard) return [] as Cell[];
    const out: Cell[] = [];
    for (const p of currentBoard.placements) {
      const c = currentBoard.cells[p.cellId];
      if (!c || c.hidden) continue;
      if (!isFrozenCore(c) && (c.level ?? 0) > currentLevel) continue;
      out.push(c);
    }
    return out;
  }, [currentBoard, currentLevel]);

  const boardMaxLevel = useMemo(() => (currentBoard ? maxLevel(currentBoard) : 0), [currentBoard]);

  // I2: מוסיף מילת ניבוי למשפט ומקריא אותה.
  const addPredictedWord = useCallback(
    (word: string): void => {
      const cell: Cell = { id: `pred-${word}`, label: word, action: { type: 'speak' } };
      setSentence((s) => appendWord(s, cell, preventDupRef.current));
      void ttsRef.current?.speak(word, {
        voiceURI: selectedVoiceURI,
        rate: ttsRate,
        pitch: ttsPitch,
      });
    },
    [selectedVoiceURI, ttsRate, ttsPitch],
  );

  const predictionsRef = useRef<string[]>([]);
  predictionsRef.current = predictions;
  // F7: ערך עדכני של מניעת-כפילויות (ref — בלי stale closure ב-onCell/addPredictedWord).
  const preventDupRef = useRef(false);
  preventDupRef.current = accessSettings.preventSequentialDuplicates ?? false;

  // I4 — איפוס רמת החשיפה במעבר בין לוחות.
  useEffect(() => {
    setCurrentLevel(0);
  }, [currentBoard?.id]);

  const onToggleModeling = (): void => {
    setModelingActive((prev) => {
      const next = !prev;
      setModelingSession(next ? createModelingSession() : null);
      return next;
    });
  };

  // E1: onCell יציב (useCallback) — לחיצה לא מרנדרת מחדש את כל הלוח (memo).
  const onCell = useCallback(
    (cell: Cell): void => {
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
        setSentence((s) => appendWord(s, cell, preventDupRef.current));
        void speakCell(cell, symbolRepoRef.current, ttsRef.current, {
          voiceURI: selectedVoiceURI,
          rate: ttsRate,
          pitch: ttsPitch,
        });
        if (ctx && currentBoard) {
          analyticsService.trackCellPress(
            ctx.activeProfile.id,
            currentBoard.id,
            cell,
            sessionIdRef.current,
          );
        }
        // E2: ה-prefetch של הניקוד הוסר — BoardView מחשב ניקוד מרוכז ברמת הלוח.
      } else if (action.type === 'navigate') {
        setNavStack((prev) => (prev ? navPush(prev, action.targetBoardId) : prev));
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
      } else if (action.type === 'modifyWord') {
        // I1/I5 — תא הטיה: מטה את המילה האחרונה במשפט.
        const op = action.op;
        setSentence((s) => {
          if (s.length === 0) return s;
          const last = s[s.length - 1];
          let label = last.label;
          if (op === 'pluralize') label = pluralizeNoun(label, last.morphology?.gender ?? 'm');
          else if (op === 'definite') label = addDefiniteArticle(label);
          else if (op === 'feminine') {
            const n = last.morphology?.number;
            label = conjugatePresent(label, { gender: 'f', number: n === 'dual' ? 'plural' : n });
          } else if (op === 'masculine') {
            const n = last.morphology?.number;
            label = conjugatePresent(label, { gender: 'm', number: n === 'dual' ? 'plural' : n });
          }
          const updated: Cell = { ...last, label, nikud: undefined, vocalization: undefined };
          return [...s.slice(0, -1), updated];
        });
      } else if (action.type === 'insertPrediction') {
        // I2/I5 — מוסיף את ההצעה הראשונה הזמינה.
        const first = predictionsRef.current[0];
        if (first) addPredictedWord(first);
      } else if (action.type === 'playAudio') {
        void speakCell(cell, symbolRepoRef.current, ttsRef.current, {
          voiceURI: selectedVoiceURI,
          rate: ttsRate,
          pitch: ttsPitch,
        });
      } else if (action.type === 'playVideo' || action.type === 'openLink') {
        // I5 — פתיחת מדיה/קישור חיצוני.
        try {
          window.open(action.url, '_blank', 'noopener');
        } catch {
          /* no-op */
        }
      }
      // setVolume — שמור לעתיד (אין בקרת ווליום גלובלית כרגע).
    },
    [
      modelingActive,
      mode,
      ctx,
      currentBoard,
      selectedVoiceURI,
      ttsRate,
      ttsPitch,
      addPredictedWord,
    ],
  );

  const speakSentence = (): void => {
    if (sentence.length === 0) return;
    speak(sentence.map(vocalize).join(' '));
    // I2 — למידה מקומית מהאמירה שנאמרה (n-gram פרטי).
    void recordSequence(sentence.map((c) => c.label))
      .then(() => getPredictionModel())
      .then((m) => {
        predictionModelRef.current = m;
      })
      .catch(() => {});
  };

  // I2 — טעינת מודל הניבוי המקומי פעם אחת.
  useEffect(() => {
    void getPredictionModel()
      .then((m) => {
        predictionModelRef.current = m;
      })
      .catch(() => {});
  }, []);

  // I2 — חישוב הצעות כשהמשפט/הלוח משתנים (רק כשהניבוי מופעל).
  useEffect(() => {
    if (!accessSettings.predictionEnabled) {
      setPredictions([]);
      return;
    }
    const candidates = visibleCells.map((c) => c.label);
    const context = sentence.map((c) => c.label);
    const preds = predictNext(predictionModelRef.current, context, { candidates, topN: 5 }).map(
      (p) => p.word,
    );
    // Fallback: model empty for new users → show first N visible board cells as suggestions.
    setPredictions(preds.length > 0 ? preds : candidates.slice(0, 5));
  }, [sentence, visibleCells, accessSettings.predictionEnabled]);

  // I3 — סריקת מתגים מעל התאים הגלויים (בתצוגת ילד בלבד).
  const scanningActive =
    !!accessSettings.scanningEnabled && !builderMode && !settingsOpen && !!currentBoard;
  const { highlightedIndices: scanIndices } = useScanning({
    enabled: scanningActive,
    itemCount: visibleCells.length,
    speedMs: accessSettings.scanSpeedMs ?? 1200,
    auditory: !!accessSettings.scanAuditory,
    mode: accessSettings.scanMode ?? 'linear',
    gridCols: currentBoard?.grid?.cols ?? 1,
    onSelect: (i) => {
      const c = visibleCells[i];
      if (c) onCell(c);
    },
    onHighlight: (i) => {
      const c = visibleCells[i];
      if (c) speak(c.nikud ?? c.label);
    },
  });

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
    void savePhrase(entry)
      .then(() => {
        setSaveToast(true);
        // D3: שמור את ה-timer לניקוי ב-unmount (מונע setState אחרי הסרה).
        if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
        saveToastTimerRef.current = setTimeout(() => setSaveToast(false), 1500);
      })
      .catch(() => {});
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
    if (import.meta.env.VITE_FIREBASE_API_KEY) {
      void signOutFirebase().catch(() => {});
    }
    const provider = syncEnabled ? new FirebaseProvider() : new LocalStubProvider();
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

  const adult = canManageProfiles(mode);
  const canBack = navStack ? navCanGoBack(navStack) : false;

  // מחוון uid קצר לתצוגה ב-header
  const uidBadge = authUser ? authUser.email.split('@')[0] : null;

  // ── Auth Gate ──────────────────────────────────────────────────────────
  if (import.meta.env.VITE_FIREBASE_API_KEY) {
    if (!authChecked) {
      return (
        <div className="app app--loading" dir="rtl" role="status" aria-label="טוען…">
          <div className="app__loading">טוען…</div>
        </div>
      );
    }
    if (!authUser) {
      return (
        <AuthGatePage
          onSignIn={async (email, password) => {
            const provider = new FirebaseProvider();
            await authService.signIn(provider, email, password);
          }}
          onGoogleSignIn={onGoogleSignIn}
          onRegister={onRegister}
        />
      );
    }
    if (authUser.status === 'pending') {
      return (
        <PendingApprovalScreen
          email={authUser.email}
          displayName={authUser.displayName}
          emailVerified={authUser.emailVerified}
          onSignOut={onSignOut}
          onResendVerification={sendVerificationEmail}
        />
      );
    }
    if (authUser.status === 'rejected') {
      return (
        <RejectedScreen email={authUser.email} onSignOut={onSignOut} />
      );
    }
  }

  return (
    <div
      className="app"
      dir="rtl"
      // I9 — גודל תא מינימלי מתוך ההגדרות (ברירת מחדל 92px, ≥44 לנגישות).
      style={{ ['--cell-min']: `${accessSettings.cellMinPx ?? 92}px` } as CSSProperties}
    >
      <BrandBar
        profileName={ctx?.activeProfile.name}
        onOpenAdult={adult ? () => setSettingsOpen(true) : () => setPinPrompt(true)}
        onSignOut={adult && authUser ? onSignOut : undefined}
        isAdult={adult}
        profiles={adult && ctx ? ctx.profiles : undefined}
        activeProfileId={ctx?.activeProfile.id}
        onSwitch={adult ? onSwitch : undefined}
        onOpenWizard={adult ? () => setWizardOpen(true) : undefined}
        authEmail={authUser?.email}
        authDisplayName={authUser?.displayName}
        status={
          <>
            {adult && <SyncStatus status={syncStatus} />}
            {adult && uidBadge && (
              <span
                className="app__badge app__badge--user"
                aria-label="משתמש מחובר"
              >
                {uidBadge}
              </span>
            )}
            <span
              className={
                hasHeVoice === false
                  ? 'app__badge app__badge--warn'
                  : 'app__badge'
              }
            >
              {hasHeVoice === null
                ? 'טוען קול…'
                : hasHeVoice
                  ? 'קול עברי זמין'
                  : 'אין קול עברי — הקראה בסיסית'}
            </span>
          </>
        }
      />

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
              onOpenBackup={() => setBackupOpen(true)}
              onOpenAnalytics={() => setAnalyticsOpen(true)}
              onOpenPhraseBank={onOpenPhraseBank}
              onOpenWordFinder={() => setWordFinderOpen(true)}
              onSignOut={authUser ? onSignOut : undefined}
              onOpenPortal={authUser ? () => setPortalOpen(true) : undefined}
              onOpenAdmin={authUser?.claims?.admin ? () => setAdminPanelOpen(true) : undefined}
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

      <main className="app__main">
      <BoardToolbar
        words={sentence.map((c) => c.label)}
        onPrint={() => window.print()}
        onSpeak={speakSentence}
        onDeleteWord={() => setSentence((s) => s.slice(0, -1))}
        onClear={() => setSentence([])}
        onHome={() => {
          if (ctx) setNavStack(navHome(ctx.activeProfile.homeBoardId));
        }}
        canGoHome={!!ctx}
        buttonScale={accessSettings.sentenceButtonScale}
      />
      {adult && (
        <button type="button" className="app__save-phrase" onClick={onSaveSentence} aria-label="שמירת ביטוי לבנק">
          💾
        </button>
      )}
      {/* I2 — שורת ניבוי מילה הבאה (כשהניבוי מופעל). */}
      {accessSettings.predictionEnabled && !builderMode && (
        <PredictionBar words={predictions} onPick={addPredictedWord} />
      )}
      {saveToast && (
        <div className="app__toast" role="status" aria-live="polite">
          נשמר!
        </div>
      )}

      {/* I4 — בקרת רמת אוצר מילים (מוצגת רק בלוחות עם רמות). */}
      {!builderMode && boardMaxLevel > 0 && (
        <div className="level-bar" role="group" aria-label="רמת אוצר מילים">
          <button
            type="button"
            className="level-bar__btn"
            onClick={() => setCurrentLevel((l) => Math.max(0, l - 1))}
            disabled={currentLevel <= 0}
            aria-label="הסתר רמה"
          >
            −
          </button>
          <span className="level-bar__label">רמה {currentLevel}/{boardMaxLevel}</span>
          <button
            type="button"
            className="level-bar__btn"
            onClick={() => setCurrentLevel((l) => Math.min(boardMaxLevel, l + 1))}
            disabled={currentLevel >= boardMaxLevel}
            aria-label="חשוף רמה"
          >
            +
          </button>
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
        <Suspense fallback={<div className="app__loading" role="status">טוען…</div>}>
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
            // C1: טריגר סנכרון (debounced) אחרי עריכת לוח — אחרת השינוי יושב לא-מסונכרן.
            syncEngineRef.current?.scheduleSync();
          }}
          onExitBuilder={() => setBuilderMode(false)}
          nikudService={nikudRef.current}
        />
        </Suspense>
      ) : ctx && currentBoard ? (
        currentBoard.kind === 'scene' ? (
          // I7 — לוח סצנה (VSD): לחיצה על אזור בונה תא וירטואלי ומפעילה את ה-action.
          <SceneView
            board={currentBoard}
            onRegion={(r) => onCell({ id: r.id, label: r.label, action: r.action })}
          />
        ) : (
          <BoardView
            board={currentBoard}
            onCell={onCell}
            accessSettings={accessSettings}
            modelingHighlights={modelingSession?.activeHighlights}
            level={currentLevel}
            scanIndices={scanningActive ? scanIndices : []}
          />
        )
      ) : (
        <div className="app__loading" role="status">
          טוען…
        </div>
      )}
      </main>

      {/* I13 — הדפסת הלוח (לואו-טק). מוסתר בהדפסה עצמה. */}
      {adult && !builderMode && (
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
      {currentBoard && <BoardPrintView board={currentBoard} />}

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
          darkMode={darkMode}
          onDarkModeChange={onDarkModeChange}
          syncEnabled={syncEnabled}
          onSyncEnabledChange={setSyncEnabled}
          syncPhotos={syncPhotos}
          onSyncPhotosChange={onSyncPhotosChange}
          isAuthenticated={!!authUser}
          onDeleteFromCloud={authUser ? onDeletePhotosFromCloud : undefined}
        />
      )}



      {/* פאנל אדמין */}
      {adminPanelOpen && (
        <Suspense fallback={null}>
          <AdminApprovalPanel onClose={() => setAdminPanelOpen(false)} />
        </Suspense>
      )}

      {/* פורטל ילדים — רק כשמאושר + מחובר */}
      {portalOpen && authUser?.uid && (
        <Suspense fallback={null}>
          <ChildrenDashboard
            uid={authUser.uid}
            onClose={() => setPortalOpen(false)}
          />
        </Suspense>
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
        <Suspense fallback={null}>
          <UsageDashboard
            profileId={ctx.activeProfile.id}
            onClose={() => setAnalyticsOpen(false)}
          />
        </Suspense>
      )}

      {wizardOpen && (
        <Suspense fallback={null}>
          <QuickStartWizard
            onComplete={onWizardComplete}
            onClose={() => setWizardOpen(false)}
          />
        </Suspense>
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
