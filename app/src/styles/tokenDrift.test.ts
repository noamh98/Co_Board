import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/**
 * C-01 guard: assert the CSS-var drift checker passes on the current tree.
 * This mirrors the CI `lint:tokens` step so a drift regression fails locally
 * (npm test) as well as in CI. See scripts/check-token-drift.mjs.
 */
describe('design-token drift (C-01)', () => {
  it('defines --cl-* chrome tokens only in the authority file', () => {
    const script = join(
      fileURLToPath(new URL('../../', import.meta.url)),
      'scripts',
      'check-token-drift.mjs',
    );
    let ok = true;
    let output = '';
    try {
      output = execFileSync(process.execPath, [script], { encoding: 'utf8' });
    } catch (err: unknown) {
      ok = false;
      const e = err as { stdout?: string; stderr?: string };
      output = (e.stdout ?? '') + (e.stderr ?? '');
    }
    expect(ok, output).toBe(true);
    expect(output).toContain('Token drift check passed');
  });
});
