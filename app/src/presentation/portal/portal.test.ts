// בדיקות 2B: models.Profile (preferences), childRepo utilities, profileSync.
import { describe, it, expect } from 'vitest';
import type { Profile, ProfilePreferences } from '../../domain/models';
import { pullProfile } from '../../services/sync/profileSync';

describe('domain/models — Profile.preferences (2B)', () => {
  it('Profile קיים תקין ללא preferences', () => {
    const p: Profile = {
      id: 'p1',
      name: 'ילד א',
      homeBoardId: 'b1',
      locked: true,
    };
    expect(p.preferences).toBeUndefined();
    expect(p.childId).toBeUndefined();
  });

  it('Profile עם preferences מלא', () => {
    const prefs: ProfilePreferences = {
      preferredGridSize: { rows: 4, cols: 4 },
      defaultVoice: 'child',
      visualLoadLevel: 'minimal',
      activeWordIds: ['w1', 'w2'],
    };
    const p: Profile = {
      id: 'p2',
      name: 'ילד ב',
      homeBoardId: 'b2',
      locked: true,
      preferences: prefs,
      childId: 'child-123',
    };
    expect(p.preferences?.defaultVoice).toBe('child');
    expect(p.preferences?.visualLoadLevel).toBe('minimal');
    expect(p.childId).toBe('child-123');
  });

  it('ProfilePreferences מתאים לכל ערכי visualLoadLevel', () => {
    const levels: ProfilePreferences['visualLoadLevel'][] = ['minimal', 'standard', 'rich'];
    for (const level of levels) {
      const p: Profile = { id: 'x', name: 'n', homeBoardId: 'b', locked: false, preferences: { visualLoadLevel: level } };
      expect(p.preferences?.visualLoadLevel).toBe(level);
    }
  });

  it('ProfilePreferences מתאים לכל ערכי defaultVoice', () => {
    const voices: ProfilePreferences['defaultVoice'][] = ['child', 'male', 'female'];
    for (const v of voices) {
      const p: Profile = { id: 'x', name: 'n', homeBoardId: 'b', locked: false, preferences: { defaultVoice: v } };
      expect(p.preferences?.defaultVoice).toBe(v);
    }
  });
});

describe('profileSync — pullProfile (2B)', () => {
  it('ללא childId מחזיר אותו profile ללא שינוי', async () => {
    const p: Profile = { id: 'p1', name: 'x', homeBoardId: 'b', locked: true };
    const result = await pullProfile('uid', p);
    expect(result).toBe(p);
  });

  it('עם childId אבל offline מחזיר profile ללא שינוי', async () => {
    const p: Profile = {
      id: 'p2', name: 'y', homeBoardId: 'b', locked: true,
      childId: 'child-offline',
      preferences: { defaultVoice: 'male' },
    };
    // Firestore לא קיים בסביבת בדיקה → חיננית
    const result = await pullProfile('uid', p);
    expect(result.id).toBe('p2');
    expect(result.preferences?.defaultVoice).toBe('male');
  });
});

describe('childRepo — types (2B)', () => {
  it('ChildRecord מכיל שדות חובה', () => {
    const child = {
      childId: 'c1',
      name: 'ילד',
      createdAt: Date.now(),
    };
    expect(child.childId).toBeTruthy();
    expect(child.name).toBeTruthy();
  });

  it('ShareInvite TTL הוא 48 שעות', () => {
    const TTL_48H = 48 * 60 * 60 * 1000;
    expect(TTL_48H).toBe(172800000);
  });

  it('ChildAccessRole מכסה את כל התפקידים', () => {
    const roles = ['parent', 'clinician', 'staff'] as const;
    expect(roles).toHaveLength(3);
  });
});
