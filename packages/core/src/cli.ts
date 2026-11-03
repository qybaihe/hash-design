import { existsSync, readFileSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  type Constraints,
  type RollJson,
  briefJson,
  buildComparePage,
  compareEntriesFromRoll,
  compareSubtitle,
  critiquePage,
  parseRef,
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
import type { ScenarioId } from './types.js';

const here = dirname(fileURLToPath(import.meta.url));
const VERSION = (JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')) as { version: string })
  .version;

const HELP = `hash-design ${VERSION} — roll random design directions that break the default AI look

Usage
  hash-design roll      [--subject <s>] [--fact <f>]… [--facts-file <path>] [--count 5] [--seed <s>]
                        [constraints] [--out <dir>] [--format md|json|summary] [--no-trace]
  hash-design brief     <hash> [constraints] [--subject <s>] [--fact <f>]… [--format md|json]
  hash-design critique  <page.html> [--css <file>] [--brief <ref> | --roll <roll.json> --pick <n>]
                        [--facts-file <path>] [--json] [--fail-under <score>]
  hash-design compare   [--roll <roll.json>] [--out <compare.html>] [--previews <dir>] [--briefs <dir>] [--title <t>]
  hash-design skill     install [--target claude|cursor|both] [--global] [--dir <project>]
  hash-design skill     print | path
  hash-design mcp       Run the MCP server on stdio (for your agent's MCP config)

Constraints (roll / brief / critique --brief)
  --light-only  --dark-only  --reduced-motion  --brand <#hex> (×2 max)
  --scenario web|deck|app|dashboard|poster|email

Run "hash-design <command> --help" (or "hash-design help <command>") for one command's options.
Without --seed every roll uses crypto.randomBytes(32) → SHA-256. --seed is for reproducible examples only.
Each hash is one direction (hash-design/v2): its bytes set the palette, faces, grid, anchor, motif, surface,
motion, voice and twist directly. There is no library of styles.
`;

const constraintOptions = {
  'light-only': { type: 'boolean' },
  'dark-only': { type: 'boolean' },
  'reduced-motion': { type: 'boolean' },
  brand: { type: 'string', multiple: true },
  scenario: { type: 'string' },
} as const;

const contentOptions = {
  subject: { type: 'string' },
  fact: { type: 'string', multiple: true },
  'facts-file': { type: 'string' },
} as const;

const rollOptions = {
  ...constraintOptions,
  ...contentOptions,
  count: { type: 'string', short: 'n' },
  seed: { type: 'string' },
  out: { type: 'string', short: 'o' },
  format: { type: 'string', short: 'f' },
  'no-trace': { type: 'boolean' },
} as const;

const briefOptions = {
  ...constraintOptions,
  ...contentOptions,
  format: { type: 'string', short: 'f' },
} as const;

const critiqueOptions = {
  ...constraintOptions,
  css: { type: 'string' },
  brief: { type: 'string' },
  roll: { type: 'string' },
  pick: { type: 'string' },
  'facts-file': { type: 'string' },
  json: { type: 'boolean' },
  'fail-under': { type: 'string' },
} as const;

const compareOptions = {
  roll: { type: 'string' },
  out: { type: 'string', short: 'o' },
  previews: { type: 'string' },
  briefs: { type: 'string' },
  title: { type: 'string' },
} as const;

const mcpOptions = {} as const;

const skillInstallOptions = {
  target: { type: 'string' },
  global: { type: 'boolean' },
  dir: { type: 'string' },
} as const;

type OptionSpec = {
  readonly type: 'string' | 'boolean';
  readonly short?: string;
  readonly multiple?: boolean;
};

/** Options each command's parser accepts (exported so tests can check every one is documented). */
export const COMMAND_OPTIONS: ReadonlyMap<string, Readonly<Record<string, OptionSpec>>> = new Map<
  string,
  Readonly<Record<string, OptionSpec>>
>([
  ['roll', rollOptions],
  ['brief', briefOptions],
  ['critique', critiqueOptions],
  ['compare', compareOptions],
  ['skill', skillInstallOptions],
  ['mcp', mcpOptions],
]);

const constraintsHelp = (title: string) => `${title}
  --light-only           Light paper only (byte 2 then sets only its lightness)
  --dark-only            Dark paper only
  --reduced-motion       No motion (bytes 22–23 unused)
  --brand <#hex>         Brand colour kept as the accent and used as the hue; repeat once for accent2 (max 2)
  --scenario <id>        What is being designed: web (default), deck, app, dashboard, poster, email.
                         Non-web scenarios add a format (byte 28), a canvas and output rules to each brief`;

const CONSTRAINTS_HELP = constraintsHelp(
  'Constraints (applied before any byte is read; pass the same ones to reproduce a design)',
);

const FACTS_FILE_HELP = `  --facts-file <path>    Facts, one per line ("#" lines are skipped; "- " and "1." prefixes are stripped)`;

/** Per-command help, printed by `hash-design <command> --help` and `hash-design help <command>`. */
export const COMMAND_HELP: ReadonlyMap<string, string> = new Map([
  [
    'roll',
    `hash-design roll — roll true-random hashes and map each to a distinct design direction

Usage
  hash-design roll [options] [constraints]

Content
  --subject <s>          What the page is for
  --fact <f>             A fact the page may state (repeatable)
${FACTS_FILE_HELP}

Roll
  -n, --count <n>        Number of directions, 1–12 (default 5)
  --seed <s>             Reproducible roll for examples and tests only; omit it for real use

Output
  -o, --out <dir>        Freeze roll.json, ROLL.md and briefs/NN-<short>.md into <dir> and print a summary
  -f, --format <fmt>     Without --out: md (default, every brief) | json | summary
  --no-trace             Leave the byte-by-byte mapping trace out of Markdown briefs

${CONSTRAINTS_HELP}

Examples
  hash-design roll --subject "Fourth Lane Bakery" --facts-file facts.md --out design/hash-design
  hash-design roll --subject "Fourth Lane Bakery" --light-only --brand "#c8102e" --format json
  hash-design roll --subject "Causeway" --facts-file facts.md --scenario deck --out design/hash-design

Without --seed every roll uses crypto.randomBytes(32) → SHA-256.
`,
  ],
  [
    'brief',
    `hash-design brief — reproduce the brief of one design from its ref

Usage
  hash-design brief <hash> [options] [constraints]

Arguments
  <hash>                 A ref from a roll: the 64-hex hash (hash-design/v2 refs have no "+probe")

Options
  --subject <s>          Subject to write into the brief's content section
  --fact <f>             A fact to write into the brief (repeatable)
${FACTS_FILE_HELP}
  -f, --format <fmt>     md (default) | json

${CONSTRAINTS_HELP}

The same ref + constraints + library fingerprint always gives the same brief.
`,
  ],
  [
    'critique',
    `hash-design critique — static critique of an HTML page for AI-template tells

Usage
  hash-design critique <page.html> [options] [constraints]

Arguments
  <page.html>            The page to check (inline <style> and style="" are read)

Options
  --css <file>           Extra CSS that is not inlined in the HTML (e.g. a linked stylesheet)
  --roll <roll.json>     Also score adherence to a design from this roll (needs --pick)
  --pick <n>             Design number inside --roll
  --brief <ref>          Score adherence to this ref instead (add the roll's constraints)
${FACTS_FILE_HELP}
                         Numbers on the page that are not in the facts are flagged
                         (default with --roll: the roll's facts)
  --json                 Machine-readable result
  --fail-under <score>   Exit with code 1 when the score is below <score> (useful in CI)

${constraintsHelp('Constraints (with --brief: pass the same ones the roll used)')}

Score: 100 minus 25 per critical, 10 per major and 4 per minor finding.
`,
  ],
  [
    'compare',
    `hash-design compare — build the side-by-side compare page for a roll

Usage
  hash-design compare [options]

Options
  --roll <roll.json>     The roll to show (default: ./roll.json)
  -o, --out <file>       Output file (default: compare.html next to roll.json)
  --previews <dir>       Preview directory, relative to roll.json (default: previews)
  --briefs <dir>         Brief directory, relative to roll.json (default: briefs)
  --title <t>            Page title (default: the roll's subject)

Previews are expected at <previews>/NN-<short>.html; missing ones are listed.
`,
  ],
  [
    'skill',
    `hash-design skill — install or inspect the hash-design Agent Skill

Usage
  hash-design skill install [options]
  hash-design skill print
  hash-design skill path

Commands
  install                Copy SKILL.md into .claude/skills/hash-design and/or .cursor/skills/hash-design
  print                  Print SKILL.md
  path                   Print the path SKILL.md is read from

Options (install)
  --target <t>           claude | cursor | both (default: both)
  --global               Install into your home directory (all projects)
  --dir <project>        Project directory (default: the current directory)
`,
  ],
  [
    'mcp',
    `hash-design mcp — run the hash-design MCP server on stdio

Usage
  hash-design mcp

Your agent starts this command and talks MCP over stdin/stdout; you do not run it by hand.
It serves the tools roll_designs, get_brief, critique_page and build_compare_page.
Relative paths (out_dir, roll_path, …) resolve against the directory the agent starts it in.

Register it
  claude mcp add hash-design -- npx -y hash-design mcp
  { "mcpServers": { "hash-design": { "command": "npx", "args": ["-y", "hash-design", "mcp"] } } }
`,
  ],
]);

/** True when `--help` / `-h` appears before any `--` terminator. */
function wantsHelp(args: readonly string[]): boolean {
  for (const a of args) {
    if (a === '--') return false;
    if (a === '--help' || a === '-h') return true;
  }
  return false;
}

type Values = Record<string, string | boolean | string[] | undefined>;

function constraintsFrom(v: Values): Constraints {
  return {
    lightOnly: Boolean(v['light-only']),
    darkOnly: Boolean(v['dark-only']),
    reducedMotion: Boolean(v['reduced-motion']),
    brandColors: (v.brand as string[] | undefined) ?? [],
    ...(v.scenario ? { scenario: v.scenario as ScenarioId } : {}),
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
    options: rollOptions,
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
    options: briefOptions,
  });
  const ref = positionals[0];
  if (!ref) throw new Error('Usage: hash-design brief <hash>');
  const design = reproduce(parseRef(ref), constraintsFrom(values));
  const content = { subject: values.subject ?? '', facts: factsFrom(values) };
  print(
    values.format === 'json'
      ? JSON.stringify(briefJson(design, content), null, 2)
      : renderBrief(design, content),
  );
}

async function cmdCritique(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: critiqueOptions,
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
    options: compareOptions,
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
    subtitle: compareSubtitle(r),
    entries,
    generatedAt: new Date().toISOString().slice(0, 10),
    language: r.content.language,
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
  if (sub !== 'install')
    throw new Error(`Usage: hash-design skill install|print|path\n\n${COMMAND_HELP.get('skill')}`);
  const { values } = parseArgs({
    args: rest,
    options: skillInstallOptions,
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
  const commandHelp = cmd === undefined ? undefined : COMMAND_HELP.get(cmd);
  if (commandHelp && wantsHelp(rest)) return print(commandHelp);
  try {
    return await dispatch(cmd, rest);
  } catch (err) {
    // node:util parseArgs errors (unknown option, missing value…): point at the command's help.
    const code = (err as { code?: unknown } | null)?.code;
    if (
      commandHelp &&
      err instanceof Error &&
      typeof code === 'string' &&
      code.startsWith('ERR_PARSE_ARGS')
    ) {
      throw new Error(`${err.message}\nRun "hash-design ${cmd} --help" to see the options.`, { cause: err });
    }
    throw err;
  }
}

async function cmdMcp(args: string[]): Promise<void> {
  parseArgs({ args, options: mcpOptions });
  // Loaded on demand: the other commands never pay for the MCP SDK.
  const { serveStdio } = await import('./mcp.js');
  await serveStdio();
}

async function dispatch(cmd: string | undefined, rest: string[]): Promise<void> {
  switch (cmd) {
    case 'roll':
      return cmdRoll(rest);
    case 'brief':
      return cmdBrief(rest);
    case 'critique':
      return cmdCritique(rest);
    case 'compare':
      return cmdCompare(rest);
    case 'skill':
      return cmdSkill(rest);
    case 'mcp':
      return cmdMcp(rest);
    case '-v':
    case '--version':
    case 'version':
      return print(VERSION);
    case 'help': {
      const topic = rest[0];
      if (topic === undefined) return print(HELP);
      const help = COMMAND_HELP.get(topic);
      if (!help) throw new Error(`Unknown command "${topic}".\n\n${HELP}`);
      return print(help);
    }
    case undefined:
    case '-h':
    case '--help':
      return print(HELP);
    default:
      throw new Error(`Unknown command "${cmd}".\n\n${HELP}`);
  }
}
