import type { Fitzgerald } from './models';

/**
 * מפתח פיצג'רלד המשודרג (Modified Fitzgerald) — PRD §6.3.
 * הצבעים *רכים ומעומעמים* בכוונה (PRD §6.1): הפחתת עומס חושי לילדים על הרצף.
 * הצמד `text` מבטיח ניגודיות מספקת (WCAG 2.1 AA) מול רקע הצבע.
 */
export const FITZGERALD: Record<
  Fitzgerald,
  { bg: string; text: string; label: string }
> = {
  pronoun: { bg: '#f6e7a3', text: '#3a3320', label: 'אנשים / כינויי גוף' },
  verb: { bg: '#b7e0b7', text: '#1f3a1f', label: 'פעלים' },
  noun: { bg: '#f8d2a6', text: '#3d2a14', label: 'שמות עצם' },
  adjective: { bg: '#aecbe8', text: '#1b2f44', label: 'תארים' },
  preposition: { bg: '#e6c2dd', text: '#3a2336', label: 'מילות יחס / מיקום' },
  question: { bg: '#cdb6e6', text: '#2c1f3d', label: 'מילות שאלה' },
  negation: { bg: '#eaa39c', text: '#451b16', label: 'שלילה / חירום' },
  social: { bg: '#f0b9cf', text: '#42202f', label: 'מילים חברתיות' },
};

const NEUTRAL = { bg: '#ffffff', text: '#1f2937', label: '' };

export function fitzgeraldStyle(category?: Fitzgerald): {
  bg: string;
  text: string;
  label: string;
} {
  return category ? FITZGERALD[category] : NEUTRAL;
}
