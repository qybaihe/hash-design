import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repo = (p: string) => fileURLToPath(new URL(`../../../${p}`, import.meta.url));
const version = (JSON.parse(readFileSync(repo('packages/core/package.json'), 'utf8')) as { version: string })
  .version;

function check(...args: string[]) {
  const r = spawnSync(process.execPath, [repo('scripts/release-check.mjs'), ...args], { encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

describe('release readiness', () => {
  it('manifests are publish-ready and versions move in lockstep', () => {
    const r = check();
    expect(r.out).toContain(`hash-design@${version} and hash-design-mcp@${version}`);
    expect(r.status).toBe(0);
  });

  it('accepts only the tag v<version>, whose version has a CHANGELOG section', () => {
    expect(readFileSync(repo('CHANGELOG.md'), 'utf8')).toContain(`## [${version}]`);
    expect(check('--tag', `v${version}`).status).toBe(0);
    for (const tag of ['v999.0.0', version, `release-${version}`]) {
      const wrong = check('--tag', tag);
      expect(wrong.status, tag).toBe(1);
      expect(wrong.out).toContain(`expected v${version}`);
    }
  });
});
