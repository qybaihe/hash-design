import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (f: string) => readFileSync(new URL(`../../../${f}`, import.meta.url), 'utf8');
const FILES = ['README.md', 'README.zh-CN.md', 'README.ja.md', 'README.ko.md', 'README.es.md'];
const SHORT = FILES.slice(1);
const COMMANDS = [
  'npx -y hash-design skill install --dir .',
  'claude mcp add hash-design -- npx -y hash-design mcp',
  'codex mcp add hash-design -- npx -y hash-design mcp',
];
/** The outline of a README: heading levels and fenced blocks, in order, with the text left out. */
const outline = (md: string) =>
  md
    .split('\n')
    .filter((l) => /^#{1,6} |^```|^> \[!/.test(l))
    .map((l) => (l.startsWith('#') ? (l.match(/^#+/)?.[0] ?? '') : l.startsWith('```') ? '```' : l.trim()));

describe('READMEs', () => {
  it('README.md is the complete one; the four translations are short versions with one shared outline', () => {
    const full = read('README.md');
    expect(full.split('\n').length).toBeGreaterThan(300);
    const outlines = SHORT.map((f) => outline(read(f)));
    for (const [i, o] of outlines.entries()) expect(o, SHORT[i]).toEqual(outlines[0]);
    for (const f of SHORT) expect(read(f).split('\n').length, f).toBeLessThan(80);
  });

  it('every README has the language switcher, the hero, the install commands and the website deploy doc', () => {
    for (const f of FILES) {
      const md = read(f);
      for (const other of FILES) if (other !== f) expect(md, `${f} → ${other}`).toContain(`](${other})`);
      expect(md, f).toContain('docs/assets/hero.gif');
      for (const cmd of COMMANDS) expect(md, `${f}: ${cmd}`).toContain(cmd);
      expect(md, `${f}: website deploy doc`).toContain('](docs/deploy-cloudflare-pages.md)');
    }
  });

  it('each short README points to the full English README', () => {
    for (const f of SHORT) {
      const md = read(f);
      expect(md, f).toMatch(/> \[!IMPORTANT\]\n> .*\(README\.md\)/);
      expect(md.match(/\]\(README\.md(#[^)]*)?\)/g)?.length ?? 0, f).toBeGreaterThanOrEqual(3);
    }
  });
});
