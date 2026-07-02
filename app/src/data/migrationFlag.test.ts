import { describe, it, expect, afterEach } from 'vitest';
import { setMigrationFailed, getMigrationFailure, clearMigrationFailure } from './migrationFlag';

afterEach(() => clearMigrationFailure());

describe('migrationFlag (3.5, CR-5 — דגל כשל-מיגרציה מתמשך)', () => {
  it('null כברירת מחדל, ללא דגל', () => {
    expect(getMigrationFailure()).toBeNull();
  });

  it('setMigrationFailed שומר את הסיבה ל-getMigrationFailure', () => {
    setMigrationFailed('v8 upgrade failed: quota exceeded');
    expect(getMigrationFailure()).toBe('v8 upgrade failed: quota exceeded');
  });

  it('reason ריק נופל ל-"1" (עדיין דגל אמת)', () => {
    setMigrationFailed('');
    expect(getMigrationFailure()).toBe('1');
  });

  it('clearMigrationFailure מנקה את הדגל', () => {
    setMigrationFailed('boom');
    clearMigrationFailure();
    expect(getMigrationFailure()).toBeNull();
  });
});
