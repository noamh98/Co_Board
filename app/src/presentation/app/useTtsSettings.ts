// presentation/app/useTtsSettings.ts — הגדרות קול והקראה (R1 ב-REFACTOR-PLAN).
// חולץ מ-App.tsx כלשונו; שיפור יציבות מותר יחיד: speak/speakOpts קוראים דרך ref
// (בלי stale closure), כך ש-callbacks התלויים בהם לא נוצרים מחדש בכל שינוי slider.

import { useCallback, useRef, useState } from 'react';
import { createSettingsRepo } from '../../data/settingsRepo';
import type { HebrewTts, SpeakOptions, TtsLike } from '../../services/tts/ttsService';

export function useTtsSettings() {
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
  const [ttsRate, setTtsRate] = useState(1.0);
  const [ttsPitch, setTtsPitch] = useState(1.0);
  const [hasHeVoice, setHasHeVoice] = useState<boolean | null>(null);

  const ttsRef = useRef<TtsLike | null>(null);
  const fallbackTtsRef = useRef<HebrewTts | null>(null);

  // ref מסונכרן — speak תמיד רואה את הערכים הנוכחיים בלי להיות תלוי בהם (F7 pattern).
  const optsRef = useRef<SpeakOptions>({ voiceURI: null, rate: 1.0, pitch: 1.0 });
  optsRef.current = { voiceURI: selectedVoiceURI, rate: ttsRate, pitch: ttsPitch };

  const speakOpts = useCallback((): SpeakOptions => ({ ...optsRef.current }), []);

  const speak = useCallback((text: string): void => {
    void ttsRef.current?.speak(text, { ...optsRef.current });
  }, []);

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

  /** הידרציה מהאחסון בעת bootstrap — מעדכן state בלי persist חוזר. */
  const hydrate = useCallback((voiceURI: string | null, rate: number, pitch: number): void => {
    setSelectedVoiceURI(voiceURI);
    setTtsRate(rate);
    setTtsPitch(pitch);
  }, []);

  return {
    selectedVoiceURI,
    ttsRate,
    ttsPitch,
    hasHeVoice,
    setHasHeVoice,
    ttsRef,
    fallbackTtsRef,
    speak,
    speakOpts,
    onVoiceURIChange,
    onTtsRateChange,
    onTtsPitchChange,
    hydrate,
  };
}
