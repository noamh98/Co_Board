import { useEffect, useRef, useState } from 'react';
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
import {
  createBrowserTts,
  waitForVoices,
  type HebrewTts,
} from './services/tts/ttsService';

/** מה שמוקרא: ניקוד אם קיים, אחרת הטקסט הגלוי. (התצוגה מראה label.) */
function vocalize(c: Cell): string {
  return c.vocalization ?? c.nikud ?? c.label;
}

export function App() {
  const [ctx, setCtx] = useState<ActiveContext | null>(null);
  const [mode, setMode] = useState<AppMode>('locked'); // נעול כברירת מחדל (אינווריאנט)
  const [pinPrompt, setPinPrompt] = useState(false);
  const [sentence, setSentence] = useState<Cell[]>([]);
  const [hasHeVoice, setHasHeVoice] = useState<boolean | null>(null);
  const ttsRef = useRef<HebrewTts | null>(null);
  const storedPinRef = useRef<string>('');

  // אתחול: seed (אם נקי), טעינת קוד מטפל, וטעינת ההקשר הפעיל מה-DB.
  useEffect(() => {
    let alive = true;
    void (async () => {
      await ensureSeeded();
      storedPinRef.current = (await createSettingsRepo().getCaregiverPin()) ?? '';
      const loaded = await loadActiveContext();
      if (alive) setCtx(loaded);
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
    return () => {
      alive = false;
    };
  }, []);

  const speak = (text: string): void => {
    void ttsRef.current?.speak(text);
  };

  const onCell = (cell: Cell): void => {
    if (cell.action.type === 'speak') {
      setSentence((s) => [...s, cell]);
      speak(vocalize(cell));
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
      setSentence([]);
    });
  };

  const onCreate = (name: string): void => {
    void (async () => {
      const profile = await createProfile(name);
      const next = await switchActiveProfile(profile.id);
      setCtx(next);
      setSentence([]);
    })();
  };

  const adult = canManageProfiles(mode);

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

      {ctx ? (
        <BoardView board={ctx.board} onCell={onCell} />
      ) : (
        <div className="app__loading" role="status">
          טוען…
        </div>
      )}
    </div>
  );
}
