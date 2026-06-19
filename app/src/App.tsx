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
import { BoardView } from './presentation/components/BoardView';
import { SentenceBar } from './presentation/components/SentenceBar';
import { AdultBar } from './presentation/components/AdultBar';
import { PinGate } from './presentation/components/PinGate';
import { NavBar } from './presentation/components/NavBar';
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
  // מחסנית הניווט — null עד שהקוד נטען (PRD §4.4)
  const [navStack, setNavStack] = useState<NavStack | null>(null);

  const ttsRef = useRef<HebrewTts | null>(null);
  const storedPinRef = useRef<string>('');
  const nikudRef = useRef<NikudService | null>(null);

  // אתחול: seed, PIN, קונטקסט פעיל, TTS, NikudService
  useEffect(() => {
    let alive = true;
    void (async () => {
      await ensureSeeded();
      storedPinRef.current = (await createSettingsRepo().getCaregiverPin()) ?? '';
      const loaded = await loadActiveContext();
      if (alive) {
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

    return () => {
      alive = false;
    };
  }, []);

  // איפוס מחסנית ניווט כשמחליפים פרופיל
  useEffect(() => {
    if (!ctx) return;
    setNavStack(createNavStack(ctx.activeProfile.homeBoardId));
    setSentence([]);
  }, [ctx?.activeProfile.id]);

  const speak = (text: string): void => {
    void ttsRef.current?.speak(text);
  };

  // הלוח הנוכחי לפי מחסנית הניווט
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
      // ניקוד חי ברקע (FR-009): אם אין ניקוד ידני/cache — שלח לרשת ושמור.
      // לא חוסם TTS: הקראה מיידית עם מה שיש; ניקוד מתעדכן ב-cache ל-next time.
      if (!cell.nikud && nikudRef.current) {
        void nikudRef.current.getNikud(cell.label);
      }
    } else if (action.type === 'navigate') {
      setNavStack((prev) =>
        prev ? navPush(prev, action.targetBoardId) : prev,
      );
    } else if (action.type === 'back') {
      // לא מוסיף לשורת המשפט — מניעת באג TouchChat (HANDOFF §4)
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

  const adult = canManageProfiles(mode);
  const canBack = navStack ? navCanGoBack(navStack) : false;

  return (
    <div className="app" dir="rtl">
      <header className="app__header">
        <h1 className="app__title">לוח תקשורת</h1>
        {ctx && (
          <span className="app__profile" aria-label="פרופיל פעיל">
            {ctx.activeProfile.name}
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
              onLock={lock}
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

      {/* סרגל ניווט קבוע — PRD §4.4 */}
      <NavBar
        canGoBack={canBack}
        onBack={() => setNavStack((prev) => (prev ? navPop(prev) : prev))}
        onHome={() => {
          if (ctx) setNavStack(navHome(ctx.activeProfile.homeBoardId));
        }}
      />

      {ctx && currentBoard ? (
        <BoardView board={currentBoard} onCell={onCell} />
      ) : (
        <div className="app__loading" role="status">
          טוען…
        </div>
      )}
    </div>
  );
}
