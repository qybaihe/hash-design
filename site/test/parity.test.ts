/**
 * The site's claim: a direction rolled in the browser opens the same brief, byte for byte, that the CLI prints
 * for its ref. This test bundles site/src/rebuild.ts for the browser (the code the page runs) and compares its
 * `briefText()` with the real CLI's stdout for the arguments the page shows, across refs, every scenario,
 * subjects and constraints. The shown command is also run through a POSIX shell, quoting and all.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SCENARIOS } from '../../packages/core/src/index.js';
import { main } from '../../packages/core/src/cli.js';
import type * as RebuildModule from '../src/rebuild.js';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const bin = join(repo, 'packages/core/dist/bin.js');

type Rebuild = typeof RebuildModule;
type BriefInput = RebuildModule.BriefInput;

let site: Rebuild;
let bundle = '';

beforeAll(async () => {
  const out = await build({
    configFile: false,
    logLevel: 'silent',
    root: repo,
    resolve: { alias: { 'hash-design/browser': join(repo, 'packages/core/src/browser.ts') } },
    build: {
      lib: { entry: 'site/src/rebuild.ts', formats: ['es'], fileName: 'rebuild' },
      write: false,
      minify: false,
      target: 'es2022',
    },
  });
  const outputs = Array.isArray(out) ? out : [out];
  const chunk = outputs.flatMap((o) => ('output' in o ? o.output : [])).find((c) => c.type === 'chunk');
  if (!chunk || chunk.type !== 'chunk') throw new Error('vite build produced no chunk');
  bundle = chunk.code;
  const file = join(await mkdtemp(join(tmpdir(), 'hd-site-')), 'rebuild.mjs');
  await writeFile(file, bundle);
  site = (await import(pathToFileURL(file).href)) as Rebuild;
}, 60_000);

let out = '';
beforeEach(() => {
  out = '';
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    out += String(chunk);
    return true;
  });
});
afterEach(() => vi.restoreAllMocks());

async function cli(args: string[]): Promise<string> {
  out = '';
  await main(args);
  return out;
}

/** Fixed, well-spread refs (SHA-256 of a label), plus the worked example of docs/mapping.md. */
const refs = [
  ...Array.from({ length: 10 }, (_, i) => createHash('sha256').update(`site-parity:${i}`).digest('hex')),
  '6ebe9acd06cbf4810ad2989965b22bc39bd527084bdda2964f9f0d49eb25562d',
];
const subjects = [
  '',
  'Fourth Lane Bakery',
  '第四巷面包店',
  `Joe's "Bar" & Grill — $HOME \`x\` ; *`,
  '  padded  ',
];
const constraints: Omit<BriefInput, 'ref'>[] = [
  {},
  { lightOnly: true },
  { darkOnly: true },
  { reducedMotion: true },
  { brand: ['#e2401c'] },
  { brand: ['#1d4ed8', '#f59e0b'], reducedMotion: true },
];

function inputs(): BriefInput[] {
  const list: BriefInput[] = [];
  refs.forEach((ref, i) => {
    for (const s of SCENARIOS)
      list.push({
        ref,
        scenario: s.id,
        subject: subjects[i % subjects.length],
        ...constraints[(i + list.length) % constraints.length],
      });
  });
  // The ref box accepts surrounding whitespace and upper case, as the CLI does.
  list.push({ ref: `  ${refs[0]?.toUpperCase()}  `, subject: 'Sluice' });
  return list;
}

describe('site demo ↔ CLI parity', () => {
  it('the bundle is browser code: no Node imports', () => {
    expect(bundle).not.toMatch(/from\s*["']node:|import\(\s*["']node:|\brequire\(|__vite-browser-external/);
  });

  it('briefText() equals `hash-design brief` stdout for every scenario, subject and constraint', async () => {
    const all = inputs();
    expect(all.length).toBeGreaterThan(60);
    for (const input of all) {
      const text = site.briefText(input);
      expect(text.endsWith('\n')).toBe(true);
      expect(await cli(site.briefArgs(input)), JSON.stringify(input)).toBe(text);
    }
  });

  it('every scenario and constraint actually changes the brief (the comparison is not vacuous)', () => {
    const ref = refs[1] as string;
    const briefs = new Set(SCENARIOS.map((s) => site.briefText({ ref, scenario: s.id })));
    expect(briefs.size).toBe(SCENARIOS.length);
    const variants = new Set(constraints.map((c) => site.briefText({ ref, ...c })));
    expect(variants.size).toBe(constraints.length);
  });

  it('the command the page shows prints the same brief when pasted into a shell', () => {
    if (!existsSync(bin)) {
      // CI builds before testing; locally, `npm run build` first.
      expect(process.env.CI, `${bin} is missing — run npm run build`).toBeFalsy();
      return;
    }
    const cases = inputs().filter((_, i) => i % 7 === 0);
    cases.push({ ref: refs[2] as string, subject: subjects[3], scenario: 'poster', brand: ['#e2401c'] });
    for (const input of cases) {
      const command = site.briefCommand(input);
      expect(command.startsWith('npx -y hash-design brief ')).toBe(true);
      const local = command.replace(
        /^npx -y hash-design /,
        `${site.shellQuote(process.execPath)} ${site.shellQuote(bin)} `,
      );
      const stdout = execFileSync('/bin/sh', ['-c', local], { encoding: 'utf8' });
      expect(stdout, command).toBe(site.briefText(input));
    }
  });

  it('shellQuote round-trips awkward arguments through /bin/sh', () => {
    const args = [
      'plain',
      '#e2401c',
      'two words',
      "it's",
      '"double"',
      '$HOME',
      '`id`',
      'a;b|c&d',
      '*',
      '第四巷面包店',
      '',
      '-x',
    ];
    const script = `printf '%s\\n' ${args.map(site.shellQuote).join(' ')}`;
    expect(execFileSync('/bin/sh', ['-c', script], { encoding: 'utf8' })).toBe(
      args.map((a) => `${a}\n`).join(''),
    );
  });

  it('rejects what the CLI rejects', async () => {
    expect(() => site.briefText({ ref: 'abc' })).toThrow();
    await expect(main(['brief', 'abc'])).rejects.toThrow();
  });
});
