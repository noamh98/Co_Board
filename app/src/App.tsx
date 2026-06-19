import { useEffect, useRef, useState } from 'react';
import { SAMPLE_CORE_BOARD } from './domain/sampleBoard';
import type { Cell } from './domain/models';
import { BoardView } from './presentation/components/BoardView';
import { SentenceBar } from './presentation/components/SentenceBar';
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
  const [sentence, setSentence] = useState<Cell[]>([]);
  const [hasHeVoice, setHasHeVoice] = useState<boolean | null>(null);
  const ttsRef = useRef<HebrewTts | null>(null);

  useEffect(() => {
    const tts = createBrowserTts();
    ttsRef.current = tts;
    if (!tts) {
      setHasHeVoice(false);
      return;
    }
    void waitForVoices().then(() => setHasHeVoice(tts.hasHebrewVoice()));
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

  return (
    <div className="app" dir="rtl">
      <header className="app__header">
        <h1 className="app__title">לוח תקשורת</h1>
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

      <SentenceBar
        words={sentence.map((c) => c.label)}
        onSpeak={speakSentence}
        onDelete={() => setSentence((s) => s.slice(0, -1))}
        onClear={() => setSentence([])}
      />

      <BoardView board={SAMPLE_CORE_BOARD} onCell={onCell} />
    </div>
  );
}
