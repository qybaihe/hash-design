import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
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

  it('the release workflow publishes only from a published GitHub Release, via npm Trusted Publishing (no token)', () => {
    const wf = readFileSync(repo('.github/workflows/release.yml'), 'utf8');
    const on = wf.slice(wf.indexOf('\non:'), wf.indexOf('\npermissions:'));
    expect(on).toContain('release:');
    expect(on).toContain('types: [published]');
    expect(on).not.toMatch(/\bpush:/);
    const perms = wf.slice(wf.indexOf('\npermissions:'), wf.indexOf('\nconcurrency:'));
    expect(perms).toMatch(/^\s+contents: read\b/m);
    expect(perms).toMatch(/^\s+id-token: write\b/m);
    expect(perms.match(/^\s+[a-z-]+: /gm)).toHaveLength(2);
    // OIDC only: no npm token, no secrets at all, no package-manager cache in the publishing job.
    expect(wf).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN|secrets\./);
    expect(wf).not.toMatch(/^\s+cache:/m);
    expect(wf).not.toMatch(/npm_[A-Za-z0-9]{20,}/);
    expect(wf).toContain('node-version: 24');
    expect(wf).toContain('registry-url: https://registry.npmjs.org');
    expect(wf).toContain('needs >= 11.5.1');
    const publish = wf.slice(wf.indexOf('- name: Publish to npm'));
    expect(publish).toContain("if: github.event_name == 'release'");
    expect(publish).toContain('--provenance --access public');
    expect(publish).toContain('docs/publishing.md#first-publish-one-time-manual');
    expect(wf).toContain('node scripts/release-check.mjs --tag "$TAG"');
  });

  it('docs/publishing.md gives the Trusted Publisher fields for this workflow', () => {
    const files = readdirSync(repo('.github/workflows'));
    expect(files).toContain('release.yml');
    for (const doc of ['docs/publishing.md', 'docs/publishing.zh-CN.md']) {
      const text = readFileSync(repo(doc), 'utf8');
      for (const field of ['`qybaihe`', '`hash-design`', '`release.yml`', 'Trusted Publisher'])
        expect(text, `${doc} ${field}`).toContain(field);
      expect(text, doc).not.toMatch(/secrets\.NPM_TOKEN|New repository secret/);
    }
  });
});
