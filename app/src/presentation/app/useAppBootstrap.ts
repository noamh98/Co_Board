// presentation/app/useAppBootstrap.ts — אתחול האפליקציה (R5 ב-REFACTOR-PLAN).
// חולץ מ-App.tsx כלשונו: seed, PIN, קונטקסט פעיל, TTS, NikudService, auth listeners,
// prune-ים ו-hydration של הגדרות. סמנטיקת דגל ה-alive נשמרת אחד-לאחד.

import { useEffect, useRef, useState } from 'react';
import {
  type ActiveContext,
  ensureSeeded,
  loadActiveContext,
} from '../../data/bootstrap';
import { createSettingsRepo, getSyncPhotos, getDarkMode } from '../../data/settingsRepo';
import {
  type AccessSettings,
  DEFAULT_ACCESS_SETTINGS,
} from '../../domain/accessSettings';
import { clearEvents } from '../../data/usageRepo';
import { pruneCache } from '../../data/symbolCache';
import { pruneArchivedMedia } from '../../data/mediaRepo';
import { pruneAudioCache } from '../../data/audioCache';
import { primeDeviceId } from '../../data/deviceId';
import { createSymbolRepo, type SymbolRepo } from '../../data/symbolRepo';
import {
  createBrowserTts,
  createHybridTts,
  waitForVoices,
  type HebrewTts,
  type TtsLike,
} from '../../services/tts/ttsService';
import { createTtsProvider } from '../../services/tts/ttsWiring';
import { NikudService } from '../../services/nikud/nikudService';
import { createIdbNikudCache } from '../../services/nikud/nikudCache';
import { createNakdanFetcher } from '../../services/nikud/nakdanClient';
import { authService, type AuthUser } from '../../services/sync/authService';
import {
  getUserStatus,
  getAdminClaim,
  onFirebaseAuthChange,
} from '../../services/sync/firebaseAuth';
import { getMigrationFailure, clearMigrationFailure } from '../../data/migrationFlag';
import { notifyError } from '../../services/notify/notifyService';

interface BootstrapParams {
  ttsRef: React.MutableRefObject<TtsLike | null>;
  fallbackTtsRef: React.MutableRefObject<HebrewTts | null>;
  setHasHeVoice: (v: boolean | null) => void;
  /** הידרציית הגדרות קול (useTtsSettings.hydrate). */
  hydrateTts: (voiceURI: string | null, rate: number, pitch: number) => void;
  /** הידרציית מצב כהה (useThemeClasses.hydrate). */
  hydrateDarkMode: (enabled: boolean) => void;
  /** אתחול מחסנית הניווט ללוח הבית של הפרופיל הנטען (useBoardNavigation). */
  initNavStack: (homeBoardId: string) => void;
}

export function useAppBootstrap({
  ttsRef,
  fallbackTtsRef,
  setHasHeVoice,
  hydrateTts,
  hydrateDarkMode,
  initNavStack,
}: BootstrapParams) {
  const [ctx, setCtx] = useState<ActiveContext | null>(null);
  const [accessSettings, setAccessSettings] = useState<AccessSettings>(
    DEFAULT_ACCESS_SETTINGS,
  );
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(!import.meta.env.VITE_FIREBASE_API_KEY);
  const [syncPhotos, setSyncPhotosState] = useState(false);

  const symbolRepoRef = useRef<SymbolRepo>(createSymbolRepo());
  /** קוד מטפל שמור — נטען מראש ל-opt-in PIN מתקדם (כרגע השחרור בלחיצה-ארוכה בלבד). */
  const storedPinRef = useRef<string>('');
  const nikudRef = useRef<NikudService | null>(null);
  /** sessionId חי כל הפעלה — לא נשמר, לא מקושר ל-uid. אתחול עצל (D3: לא randomUUID בכל render). */
  const sessionIdRef = useRef<string>('');
  if (!sessionIdRef.current) sessionIdRef.current = crypto.randomUUID();

  // callbacks עדכניים דרך ref — האפקט רץ פעם אחת אך תמיד קורא לגרסה הנוכחית.
  const cbRef = useRef({ hydrateTts, hydrateDarkMode, initNavStack, setHasHeVoice });
  cbRef.current = { hydrateTts, hydrateDarkMode, initNavStack, setHasHeVoice };

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
      // 3.5 (CR-5): שדרוג IDB v8 שנכשל (למשל abort שקט בספארי) מרים דגל מתמשך —
      // ensureSeeded פותח את ה-DB ולכן מריץ upgrade() אם צריך; נבדק מיד אחריו כדי
      // לתפוס גם כשלים מהסשן הנוכחי. מוצג פעם אחת כ-toast שגיאה ואז מנוקה.
      if (alive && getMigrationFailure()) {
        notifyError('שדרוג נתוני האפליקציה נכשל חלקית — מומלץ לגבות ולפנות לתמיכה');
        clearMigrationFailure();
      }
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
        cbRef.current.hydrateTts(voiceURI, rate, pitch);
        setSyncPhotosState(photosEnabled);
        cbRef.current.hydrateDarkMode(dark);
        setCtx(loaded);
        cbRef.current.initNavStack(loaded.activeProfile.homeBoardId);
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
      cbRef.current.setHasHeVoice(false);
    } else {
      void waitForVoices().then(() => {
        if (alive) cbRef.current.setHasHeVoice(tts.hasHebrewVoice());
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ctx,
    setCtx,
    accessSettings,
    setAccessSettings,
    authUser,
    authChecked,
    syncPhotos,
    setSyncPhotosState,
    symbolRepoRef,
    storedPinRef,
    nikudRef,
    sessionIdRef,
  };
}
