/**
 * The page's facts come from the project: the byte groups match BYTE_MAP, the install commands are the
 * README's, the media are real repository files, and the filled page has no placeholders left.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BYTE_MAP, MAX_COUNT, SCENARIOS, reproduce } from '../../packages/core/src/index.js';
import { BYTE_GROUPS, WORKED_EXAMPLE, byteDetail } from '../src/bytes.js';
import { EXAMPLES_URL, HERO_EXAMPLE, MEDIA, SHOWCASE, SITE_URL, fillHtml, tokens } from '../build/content.js';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const read = (p: string) => readFileSync(join(repo, p), 'utf8');
const html = fillHtml(read('site/index.html'), repo);
const readme = read('README.md');

const INSTALL = [
  'npx -y hash-design skill install --dir .',
  'claude mcp add hash-design -- npx -y hash-design mcp',
  'codex mcp add hash-design -- npx -y hash-design mcp',
];

describe('site content', () => {
  it('byte groups cover bytes 0–31 once each and match BYTE_MAP', () => {
    const all = BYTE_GROUPS.flatMap((g) => g.bytes).sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: 32 }, (_, i) => i));
    const mapped = new Set(BYTE_MAP.flatMap((m) => m.bytes));
    const unused = BYTE_GROUPS.find((g) => g.id === 'unused')?.bytes ?? [];
    for (let i = 0; i < 32; i++) expect(mapped.has(i), `byte ${i}`).toBe(!unused.includes(i));
    // No BYTE_MAP entry straddles two groups.
    for (const m of BYTE_MAP) {
      const groups = new Set(m.bytes.map((b) => BYTE_GROUPS.find((g) => g.bytes.includes(b))?.id));
      expect(groups.size, m.dimension).toBe(1);
    }
  });

  it('the byte detail reads the design trace, so every mapped byte shows a rule and a result', () => {
    const design = reproduce({ hash: WORKED_EXAMPLE });
    for (let i = 0; i < 31; i++) {
      const d = byteDetail(design, i);
      expect(d.rule, `byte ${i}`).toBeTruthy();
      expect(d.result, `byte ${i}`).toBeTruthy();
    }
    expect(read('docs/mapping.md')).toContain(WORKED_EXAMPLE);
  });

  it('fills every placeholder and fails on unknown ones', () => {
    expect(html).not.toMatch(/%%[A-Z_]+%%|<!--#[\w-]+-->/);
    expect(() => fillHtml('<p>%%NOPE%%</p>', repo)).toThrow(/NOPE/);
    expect(() => fillHtml('<!--#nope-->', repo)).toThrow(/nope/);
    const t = tokens(repo);
    expect(t.VERSION).toBe(JSON.parse(read('packages/core/package.json')).version);
    expect(t.MAX_COUNT).toBe(String(MAX_COUNT));
  });

  it('shows the README install commands, each with a copy button', () => {
    for (const cmd of INSTALL) {
      expect(readme, cmd).toContain(cmd);
      expect(html, cmd).toContain(`<code>${cmd}</code>`);
      expect(html, cmd).toContain(`data-copy="${cmd}"`);
    }
  });

  it('the "tell your agent" text is the README text', () => {
    const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
    const fromReadme = /### Tell your agent[\s\S]*?```text\n([\s\S]*?)```/.exec(readme)?.[1] ?? '';
    const fromSite = /<p class="tell-text" data-tell>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? '';
    expect(fromReadme).not.toBe('');
    expect(squash(fromSite)).toBe(squash(fromReadme));
  });

  it('has absolute social meta, a canonical URL and a favicon', () => {
    expect(html).toContain(`<link rel="canonical" href="${SITE_URL}/" />`);
    for (const prop of ['og:image', 'twitter:image'])
      expect(html).toMatch(
        new RegExp(`(property|name)="${prop}" content="${SITE_URL}/media/social-preview\\.png"`),
      );
    expect(html).toMatch(/property="og:title"/);
    expect(html).toMatch(/name="twitter:card" content="summary_large_image"/);
    expect(existsSync(join(repo, 'site/public/favicon.svg'))).toBe(true);
  });

  it('uses only real repository media', () => {
    for (const [name, src] of Object.entries(MEDIA))
      expect(existsSync(join(repo, src)), `${name} ← ${src}`).toBe(true);
    for (const m of html.matchAll(/(?:src|poster|href)="\/media\/([^"]+)"/g))
      expect(MEDIA, m[1]).toHaveProperty(m[1] as string);
  });

  it('shows all four example runs, linking to the examples site and the repo', () => {
    expect(SHOWCASE.map((e) => e.dir).sort()).toEqual(
      ['bridge-two-bikes', 'causeway-festival', 'fourth-lane-bakery', 'sluice'].sort(),
    );
    expect(SHOWCASE.some((e) => e.dir === HERO_EXAMPLE)).toBe(true);
    for (const e of SHOWCASE) {
      expect(html).toContain(`${EXAMPLES_URL}/${e.dir}/compare.html`);
      expect(html).toContain(`/media/showcase/${e.dir}.png`);
      const roll = JSON.parse(read(`examples/${e.dir}/roll.json`)) as { designs: { short: string }[] };
      for (const d of roll.designs) expect(html, `${e.dir} ${d.short}`).toContain(d.short);
    }
  });

  it('lists every scenario with its flag', () => {
    for (const s of SCENARIOS) {
      expect(html).toContain(s.name.en);
      if (s.id !== 'web') expect(html).toContain(`--scenario ${s.id}`);
    }
  });
});
