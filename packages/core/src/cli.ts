import { existsSync, readFileSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  type Constraints,
  type RollJson,
  BRANCHES,
  briefJson,
  buildComparePage,
  compareEntriesFromRoll,
  critiquePage,
  getBranch,
  parseRef,
  renderBranch,
  renderBranchList,
  renderBrief,
  renderCritique,
  renderRoll,
  renderRollSummary,
  reproduce,
  roll,
  rollJson,
  skillPath,
  writeRoll,
} from './index.js';
import type { BranchFamily } from './types.js';

const here = dirname(fileURLToPath(import.meta.url));
const VERSION = (JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')) as { version: string })
  .version;

const HELP = `hash-design ${VERSION} — roll random design directions that break the default AI look

Usage
  hash-design roll      [--subject <s>] [--fact <f>]… [--facts-file <path>] [--count 5] [--seed <s>]
                        [constraints] [--out <dir>] [--format md|json|summary] [--no-trace]
  hash-design brief     <hash[+probe]> [constraints] [--subject <s>] [--fact <f>]… [--format md|json]
  hash-design branches  [--family print|document|signage|screen|craft|modernist] [--json]
  hash-design branch    <id> [--json]
  hash-design critique  <page.html> [--css <file>] [--brief <ref> | --roll <roll.json> --pick <n>]
                        [--facts-file <path>] [--json] [--fail-under <score>]
  hash-design compare   [--roll <roll.json>] [--out <compare.html>] [--previews <dir>] [--briefs <dir>] [--title <t>]
  hash-design skill     install [--target claude|cursor|both] [--global] [--dir <project>]
  hash-design skill     print | path

Constraints (roll / brief)
  --light-only  --dark-only  --reduced-motion  --brand <#hex> (×2 max)
  --family <family>…  --include <branch-id>…  --exclude <branch-id>…

Without --seed every roll uses crypto.randomBytes(32) → SHA-256. --seed is for reproducible examples only.
`;

const constraintOptions = {
  'light-only': { type: 'boolean' },
  'dark-only': { type: 'boolean' },
  'reduced-motion': { type: 'boolean' },
  brand: { type: 'string', multiple: true },
  family: { type: 'string', multiple: true },
  include: { type: 'string', multiple: true },
  exclude: { type: 'string', multiple: true },
} as const;

const contentOptions = {
  subject: { type: 'string' },
  fact: { type: 'string', multiple: true },
  'facts-file': { type: 'string' },
} as const;

type Values = Record<string, string | boolean | string[] | undefined>;

function constraintsFrom(v: Values): Constraints {
  return {
    lightOnly: Boolean(v['light-only']),
    darkOnly: Boolean(v['dark-only']),
    reducedMotion: Boolean(v['reduced-motion']),
    brandColors: (v.brand as string[] | undefined) ?? [],
    families: ((v.family as string[] | undefined) ?? []) as BranchFamily[],
    include: (v.include as string[] | undefined) ?? [],
    exclude: (v.exclude as string[] | undefined) ?? [],
  };
}

export function parseFactsText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.replace(/^[-*•]\s+|^\d+[.)]\s+/, '').trim())
    .filter(Boolean);
}

function factsFrom(v: Values): string[] {
  const facts = [...((v.fact as string[] | undefined) ?? [])];
  const file = v['facts-file'] as string | undefined;
  if (file) facts.push(...parseFactsText(readFileSync(file, 'utf8')));
  return facts;
}

function print(s: string): void {
  process.stdout.write(s.endsWith('\n') ? s : `${s}\n`);
}

async function cmdRoll(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      ...constraintOptions,
      ...contentOptions,
      count: { type: 'string', short: 'n' },
      seed: { type: 'string' },
      out: { type: 'string', short: 'o' },
      format: { type: 'string', short: 'f' },
      'no-trace': { type: 'boolean' },
    },
  });
  const r = roll({
    count: values.count ? Number(values.count) : 5,
    ...(values.seed !== undefined ? { seed: values.seed } : {}),
    constraints: constraintsFrom(values),
    content: { subject: values.subject ?? '', facts: factsFrom(values) },
  });
  if (values.out) {
    const written = await writeRoll(r, values.out);
    print(renderRollSummary(r));
    print(`Wrote ${written.files.length} files to ${relative(process.cwd(), written.dir) || '.'}:`);
    for (const f of written.files) print(`  ${f}`);
    return;
  }
  const format = values.format ?? 'md';
  if (format === 'json') print(JSON.stringify(rollJson(r), null, 2));
  else if (format === 'summary') print(renderRollSummary(r));
  else print(renderRoll(r, { trace: !values['no-trace'] }));
}

async function cmdBrief(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { ...constraintOptions, ...contentOptions, format: { type: 'string', short: 'f' } },
  });
  const ref = positionals[0];
  if (!ref) throw new Error('Usage: hash-design brief <hash[+probe]>');
  const design = reproduce(parseRef(ref), constraintsFrom(values));
  const content = { subject: values.subject ?? '', facts: factsFrom(values) };
  print(
    values.format === 'json'
      ? JSON.stringify(briefJson(design, content), null, 2)
      : renderBrief(design, content),
  );
}

async function cmdBranches(args: string[]): Promise<void> {
  const { values } = parseArgs({ args, options: { family: { type: 'string' }, json: { type: 'boolean' } } });
  const family = values.family as BranchFamily | undefined;
  if (values.json) {
    const list = BRANCHES.filter((b) => !family || b.family === family).map((b) => ({
      id: b.id,
      name: b.name,
      family: b.family,
      keywords: b.keywords,
    }));
    print(JSON.stringify(list, null, 2));
  } else print(renderBranchList(family ? { family } : {}));
}

async function cmdBranch(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: { json: { type: 'boolean' } },
  });
  const id = positionals[0];
  const b = id ? getBranch(id) : undefined;
  if (!b) throw new Error(`Unknown branch "${id ?? ''}". Run "hash-design branches" to list ids.`);
  print(values.json ? JSON.stringify(b, null, 2) : renderBranch(b));
}

async function cmdCritique(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      ...constraintOptions,
      css: { type: 'string' },
      brief: { type: 'string' },
      roll: { type: 'string' },
      pick: { type: 'string' },
      'facts-file': { type: 'string' },
      json: { type: 'boolean' },
      'fail-under': { type: 'string' },
    },
  });
  const file = positionals[0];
  if (!file) throw new Error('Usage: hash-design critique <page.html>');
  const html = await readFile(file, 'utf8');
  const css = values.css ? await readFile(values.css, 'utf8') : undefined;
  let design;
  let facts: string[] | undefined = values['facts-file']
    ? parseFactsText(readFileSync(values['facts-file'], 'utf8'))
    : undefined;
  if (values.roll) {
    const r = JSON.parse(await readFile(values.roll, 'utf8')) as RollJson;
    const n = Number(values.pick ?? '0');
    const entry = r.designs.find((d) => d.number === n);
    if (!entry) throw new Error(`--pick must be one of ${r.designs.map((d) => d.number).join(', ')}`);
    design = reproduce(parseRef(entry.ref), r.constraints);
    facts ??= r.content.facts;
  } else if (values.brief) {
    design = reproduce(parseRef(values.brief), constraintsFrom(values));
  }
  const result = critiquePage({
    html,
    ...(css ? { css } : {}),
    ...(design ? { design } : {}),
    ...(facts?.length ? { facts } : {}),
  });
  print(values.json ? JSON.stringify(result, null, 2) : renderCritique(result));
  const failUnder = values['fail-under'] ? Number(values['fail-under']) : undefined;
  if (failUnder !== undefined && result.score < failUnder) process.exitCode = 1;
}

async function cmdCompare(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      roll: { type: 'string' },
      out: { type: 'string', short: 'o' },
      previews: { type: 'string' },
      briefs: { type: 'string' },
      title: { type: 'string' },
    },
  });
  const rollPath = resolve(values.roll ?? 'roll.json');
  const r = JSON.parse(await readFile(rollPath, 'utf8')) as RollJson;
  const out = resolve(values.out ?? join(dirname(rollPath), 'compare.html'));
  const base = dirname(out);
  const previewDir = relative(base, resolve(dirname(rollPath), values.previews ?? 'previews')) || '.';
  const briefDir = relative(base, resolve(dirname(rollPath), values.briefs ?? 'briefs')) || '.';
  const entries = compareEntriesFromRoll(r, { previewDir, briefDir });
  const missing = entries.filter((e) => !existsSync(resolve(base, e.preview))).map((e) => e.preview);
  const html = buildComparePage({
    title: values.title ?? r.content.subject,
    subtitle: `${entries.length} 个方向 · ${r.source} · ${r.algorithm} · library ${r.library}`,
    entries,
    generatedAt: new Date().toISOString().slice(0, 10),
  });
  await writeFile(out, html, 'utf8');
  print(`Wrote ${relative(process.cwd(), out)}`);
  if (missing.length)
    print(`Warning: missing previews (render them before opening):\n  ${missing.join('\n  ')}`);
}

async function cmdSkill(args: string[]): Promise<void> {
  const [sub, ...rest] = args;
  if (sub === 'path') return print(skillPath());
  if (sub === 'print') return print(readFileSync(skillPath(), 'utf8'));
  if (sub !== 'install') throw new Error('Usage: hash-design skill install|print|path');
  const { values } = parseArgs({
    args: rest,
    options: { target: { type: 'string' }, global: { type: 'boolean' }, dir: { type: 'string' } },
  });
  const target = values.target ?? 'both';
  const root = values.global ? homedir() : resolve(values.dir ?? '.');
  const dirs: string[] = [];
  if (target === 'claude' || target === 'both') dirs.push(join(root, '.claude', 'skills', 'hash-design'));
  if (target === 'cursor' || target === 'both') dirs.push(join(root, '.cursor', 'skills', 'hash-design'));
  if (!dirs.length) throw new Error('--target must be claude, cursor or both');
  for (const d of dirs) {
    await mkdir(d, { recursive: true });
    await copyFile(skillPath(), join(d, 'SKILL.md'));
    print(`Installed ${join(d, 'SKILL.md')}`);
  }
}

export async function main(argv: string[]): Promise<void> {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case 'roll':
      return cmdRoll(rest);
    case 'brief':
      return cmdBrief(rest);
    case 'branches':
      return cmdBranches(rest);
    case 'branch':
      return cmdBranch(rest);
    case 'critique':
      return cmdCritique(rest);
    case 'compare':
      return cmdCompare(rest);
    case 'skill':
      return cmdSkill(rest);
    case '-v':
    case '--version':
    case 'version':
      return print(VERSION);
    case undefined:
    case '-h':
    case '--help':
    case 'help':
      return print(HELP);
    default:
      throw new Error(`Unknown command "${cmd}".\n\n${HELP}`);
  }
}
