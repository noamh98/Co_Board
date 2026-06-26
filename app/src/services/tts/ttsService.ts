// שירות TTS עברי — עוטף Web Speech API. מקור-האמת: PRD §4.3, §9.3 (הסיכון הטכני המרכזי).
// Offline-first: מעדיף קולות מקומיים (localService=true) שעובדים ללא רשת (HANDOFF §4).
// ניתן-לבדיקה: התלויות (synth + יצירת utterance) מוזרקות — לא נגיעה ישירה ב-window.

import type { Cell } from '../../domain/models';
import type { SymbolRepo } from '../../data/symbolRepo';
import { HybridTtsService } from './hybridTtsService';
import type { TTSProvider } from './ttsProvider';

export interface TtsLike {
  speak(text: string, opts?: SpeakOptions): Promise<SpeakResult>;
  cancel(): void;
}

export interface VoiceLike {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
  voiceURI?: string;
}

export interface SpeechUtteranceLike {
  text: string;
  lang: string;
  voice: VoiceLike | null;
  rate: number;
  pitch: number;
  volume: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: unknown) => void) | null;
}

export interface SynthLike {
  speak(u: SpeechUtteranceLike): void;
  cancel(): void;
  getVoices(): VoiceLike[];
}

export type UtteranceFactory = (text: string) => SpeechUtteranceLike;
export type VoicePreference = 'child' | 'male' | 'female';

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  voicePref?: VoicePreference;
  /** מעדיף קול מקומי (אופליין). ברירת מחדל: true. */
  preferOffline?: boolean;
  /** URI של קול שנבחר ע"י המטפל (FR-010). null = ברירת מחדל; undefined = בחירה אוטומטית. */
  voiceURI?: string | null;
}

export interface SpeakResult {
  spoken: boolean;
  /** זמן עד תחילת ההקראה (יעד PRD §8.1: < 300–500ms). */
  latencyMs?: number;
  usedVoice?: string;
  /** האם הקול שנבחר מקומי (עובד אופליין). */
  offline?: boolean;
  /** לא נמצא קול עברי — נפילה חיננית לקול ברירת המחדל. */
  fellBack?: boolean;
  reason?: string;
}

const isHe = (lang: string): boolean => !!lang && lang.toLowerCase().startsWith('he');

export class HebrewTts {
  constructor(
    private synth: SynthLike,
    private makeUtterance: UtteranceFactory,
    private now: () => number = () =>
      typeof performance !== 'undefined' ? performance.now() : Date.now(),
  ) {}

  listHebrewVoices(): VoiceLike[] {
    return this.synth.getVoices().filter((v) => isHe(v.lang));
  }

  hasHebrewVoice(): boolean {
    return this.listHebrewVoices().length > 0;
  }

  /** בחירת קול עברי; מעדיף מקומי (אופליין), ואז ברירת-מחדל. null אם אין עברי. */
  pickVoice(opts: SpeakOptions = {}): VoiceLike | null {
    if ('voiceURI' in opts) {
      if (!opts.voiceURI) return null;
      return this.synth.getVoices().find((v) => v.voiceURI === opts.voiceURI) ?? null;
    }
    const preferOffline = opts.preferOffline ?? true;
    const hebrew = this.listHebrewVoices();
    if (hebrew.length === 0) return null;
    return [...hebrew].sort((a, b) => {
      if (preferOffline && a.localService !== b.localService) {
        return a.localService ? -1 : 1;
      }
      if (a.default !== b.default) return a.default ? -1 : 1;
      return 0;
    })[0];
  }

  speak(text: string, opts: SpeakOptions = {}): Promise<SpeakResult> {
    return new Promise((resolve) => {
      const trimmed = text.trim();
      if (!trimmed) return resolve({ spoken: false, reason: 'empty' });

      const t0 = this.now();
      let settled = false;
      let watchdog: ReturnType<typeof setTimeout> | undefined;
      const settle = (r: SpeakResult): void => {
        if (settled) return;
        settled = true;
        if (watchdog) clearTimeout(watchdog);
        resolve(r);
      };

      const queueUtterance = (): void => {
        const voice = this.pickVoice(opts);
        const u = this.makeUtterance(trimmed);
        u.lang = 'he-IL';
        u.rate = opts.rate ?? 1;
        u.pitch = opts.pitch ?? 1;
        u.volume = 1;
        u.voice = voice;

        // Watchdog: אם onstart לא נורה (קול חסר/תקלת מנוע) — לא להשאיר Promise תלוי.
        watchdog = setTimeout(
          () => settle({ spoken: false, reason: 'timeout', fellBack: voice === null }),
          3000,
        );

        u.onstart = () =>
          settle({
            spoken: true,
            latencyMs: this.now() - t0,
            usedVoice: voice?.name,
            offline: voice?.localService ?? false,
            fellBack: voice === null,
          });
        u.onerror = (ev) =>
          settle({ spoken: false, fellBack: voice === null, reason: String(ev) });

        try {
          this.synth.speak(u);
        } catch (e) {
          settle({ spoken: false, reason: String(e) });
        }
      };

      // Prevent utterance queue buildup: cancel any in-flight utterance first.
      // IMPORTANT: cancel() and speak() must NOT be called in the same tick —
      // Chrome's speech engine can get stuck in `speaking=true` indefinitely
      // if a new utterance is queued before the cancel() has settled, which
      // outwardly looks like speak() being re-invoked in a slow infinite loop.
      // Deferring the new speak() to the next tick gives the engine time to
      // unwind the cancellation first.
      this.synth.cancel();
      setTimeout(queueUtterance, 0);
    });
  }

  cancel(): void {
    this.synth.cancel();
  }
}

/** מחבר ל-Web Speech API של הדפדפן אם זמין; אחרת מחזיר null. */
export function createBrowserTts(): HebrewTts | null {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window) ||
    typeof SpeechSynthesisUtterance === 'undefined'
  ) {
    return null;
  }
  const synth: SynthLike = {
    speak: (u) =>
      window.speechSynthesis.speak(u as unknown as SpeechSynthesisUtterance),
    cancel: () => window.speechSynthesis.cancel(),
    getVoices: () => window.speechSynthesis.getVoices() as unknown as VoiceLike[],
  };
  const makeUtterance: UtteranceFactory = (text) =>
    new SpeechSynthesisUtterance(text) as unknown as SpeechUtteranceLike;
  return new HebrewTts(synth, makeUtterance);
}

/** ממתין לטעינת קולות (getVoices לרוב ריק עד אירוע voiceschanged). */
export function waitForVoices(timeoutMs = 1500): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return resolve();
    }
    if (window.speechSynthesis.getVoices().length > 0) return resolve();
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      resolve();
    };
    window.speechSynthesis.addEventListener?.('voiceschanged', finish, {
      once: true,
    });
    setTimeout(finish, timeoutMs);
  });
}

/** השמעת הקלטה נוכחית — נשמר כדי לעצור אותה לפני ההקלטה/הדיבור הבא (A6). */
let currentCellAudio: HTMLAudioElement | null = null;
function stopCurrentCellAudio(): void {
  if (currentCellAudio) {
    currentCellAudio.pause();
    currentCellAudio.src = '';
    currentCellAudio = null;
  }
}

export async function speakCell(
  cell: Cell,
  symbolRepo: SymbolRepo,
  tts: TtsLike | null,
  opts: SpeakOptions = {},
): Promise<void> {
  // A6: עצור השמעה קודמת (הקלטה + דיבור) לפני הבאה — מונע חפיפת אודיו בלחיצות מהירות.
  stopCurrentCellAudio();
  tts?.cancel();
  // A4: הקלטה מאוחסנת ב-audioId; תאימות לאחור — תאים ישנים אחסנו אותה ב-symbolId.
  const recordingId = cell.audioId ?? cell.symbolId;
  if (recordingId) {
    const entry = await symbolRepo.get(recordingId);
    if (entry?.source === 'recording') {
      const audio = new Audio(entry.uri);
      currentCellAudio = audio;
      try {
        await audio.play();
        return;
      } catch {
        // fallback to web speech below
      }
    }
  }
  if (tts) {
    const text = cell.vocalization ?? cell.nikud ?? cell.label;
    if (text) await tts.speak(text, opts);
  }
}

export function createHybridTts(fallback: HebrewTts, provider: TTSProvider | null): HybridTtsService {
  return new HybridTtsService(fallback, provider);
}

export { HybridTtsService } from './hybridTtsService';
export type { TTSProvider, VoiceConfig } from './ttsProvider';
