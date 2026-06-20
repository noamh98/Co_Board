import { describe, it, expect } from 'vitest';
import {
  mergeLastWriteWins,
  isRemoteNewer,
  toVersioned,
  bumpVersion,
  type Versioned,
} from './sync';

function versioned<T>(data: T, updatedAt: number, deviceId = 'dev-a'): Versioned<T> {
  return { data, version: 1, updatedAt, deviceId };
}

describe('mergeLastWriteWins', () => {
  it('local newer → local מנצח', () => {
    const local = versioned({ name: 'local' }, 200);
    const remote = versioned({ name: 'remote' }, 100);
    const result = mergeLastWriteWins(local, remote);
    expect(result.winner).toBe(local);
    expect(result.loser).toBe(remote);
  });

  it('remote newer → remote מנצח', () => {
    const local = versioned({ name: 'local' }, 100);
    const remote = versioned({ name: 'remote' }, 200);
    const result = mergeLastWriteWins(local, remote);
    expect(result.winner).toBe(remote);
    expect(result.loser).toBe(local);
  });

  it('שוויון updatedAt — tie-break לפי deviceId lexicographic', () => {
    const local = versioned({ name: 'local' }, 100, 'dev-z');
    const remote = versioned({ name: 'remote' }, 100, 'dev-a');
    const result = mergeLastWriteWins(local, remote);
    expect(result.winner).toBe(local); // 'dev-z' >= 'dev-a'
  });

  it('שוויון updatedAt ו-deviceId שווים — local מנצח (edge case)', () => {
    const local = versioned({ name: 'local' }, 100, 'dev-a');
    const remote = versioned({ name: 'remote' }, 100, 'dev-a');
    const result = mergeLastWriteWins(local, remote);
    expect(result.winner).toBe(local);
  });

  it('תוצאה דטרמיניסטית — קריאה כפולה מחזירה אותו winner', () => {
    const local = versioned({ v: 1 }, 50, 'dev-b');
    const remote = versioned({ v: 2 }, 50, 'dev-a');
    expect(mergeLastWriteWins(local, remote).winner).toBe(
      mergeLastWriteWins(local, remote).winner,
    );
  });
});

describe('isRemoteNewer', () => {
  it('remote newer updatedAt → true', () => {
    expect(isRemoteNewer(versioned(1, 100), versioned(1, 200))).toBe(true);
  });

  it('local newer updatedAt → false', () => {
    expect(isRemoteNewer(versioned(1, 200), versioned(1, 100))).toBe(false);
  });

  it('שוויון — tie-break deviceId', () => {
    expect(isRemoteNewer(versioned(1, 100, 'dev-a'), versioned(1, 100, 'dev-b'))).toBe(true);
    expect(isRemoteNewer(versioned(1, 100, 'dev-b'), versioned(1, 100, 'dev-a'))).toBe(false);
  });
});

describe('toVersioned / bumpVersion', () => {
  it('toVersioned — version=1, updatedAt נכון', () => {
    const v = toVersioned({ x: 1 }, 'dev-a', 12345);
    expect(v.version).toBe(1);
    expect(v.updatedAt).toBe(12345);
    expect(v.deviceId).toBe('dev-a');
  });

  it('bumpVersion — version עולה, data מתעדכן', () => {
    const v = toVersioned({ x: 1 }, 'dev-a', 100);
    const bumped = bumpVersion(v, { x: 2 }, 'dev-a', 200);
    expect(bumped.version).toBe(2);
    expect(bumped.data).toEqual({ x: 2 });
    expect(bumped.updatedAt).toBe(200);
  });
});
