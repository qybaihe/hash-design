#!/usr/bin/env node
// The example runs under examples/.
//
//   node scripts/examples.mjs roll     [name]   re-roll: rewrite roll.json, ROLL.md and briefs/ (current algorithm)
//   node scripts/examples.mjs compare  [name]   rebuild compare.html from roll.json and previews/
//   node scripts/examples.mjs critique [name]   critique every preview (against its brief when it reproduces); exit 1 below 90
//   node scripts/examples.mjs list              print the examples
//
// Run `npm run build` first. Without a name the command runs for every example.
// The four runs below were rolled with hash-design/v1 (the 40-branch library, removed in v2) and are kept as
// records: v2 cannot reproduce their refs or rebuild their compare pages, so `roll` and `compare` refuse to
// touch them (re-rolling would leave the rendered previews describing briefs that no longer exist), and
// `critique` checks their previews against the global bans only.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const EXAMPLES = [
  {
    dir: 'fourth-lane-bakery',
    name: 'Fourth Lane Bakery',
    subject: '第四巷面包店',
    seed: 'fourth-lane-bakery',
  },
  { dir: 'sluice', name: 'Sluice', subject: 'Sluice — self-hosted webhook inbox', seed: 'sluice' },
  {
    dir: 'bridge-two-bikes',
    name: 'Bridge No.2 Cycle Works',
    subject: '二号桥单车铺',
    seed: 'bridge-two-bikes-5',
  },
  {
    dir: 'causeway-festival',
    name: 'Causeway',
    subject: 'Causeway — a music festival on Skerrow Island',
    seed: 'causeway-festival-6',
  },
];

export const MIN_SCORE = 90;

const bin = fileURLToPath(new URL('../packages/core/dist/bin.js', import.meta.url));
const cli = (args, opts = {}) =>
  execFileSync(process.execPath, [bin, ...args], { encoding: 'utf8', ...opts });

function select(name) {
  if (!name) return EXAMPLES;
  const found = EXAMPLES.filter((e) => e.dir === name);
  if (!found.length)
    throw new Error(`Unknown example "${name}". Known: ${EXAMPLES.map((e) => e.dir).join(', ')}`);
  return found;
}

/** v1 records stay as they are; see the header. */
const isV1 = (e) =>
  JSON.parse(readFileSync(`examples/${e.dir}/roll.json`, 'utf8')).algorithm === 'hash-design/v1';

function refuseV1(examples, what) {
  const v1 = examples.filter(isV1);
  for (const e of v1)
    console.error(`examples/${e.dir} is a hash-design/v1 record; ${what} would replace it. Skipped.`);
  return examples.filter((e) => !isV1(e));
}

const commands = {
  roll(examples) {
    for (const e of refuseV1(examples, 're-rolling it under the current algorithm')) {
      const dir = `examples/${e.dir}`;
      const args = ['roll', '--subject', e.subject, '--facts-file', `${dir}/facts.md`, '--seed', e.seed];
      process.stdout.write(cli([...args, '--out', dir, '--format', 'summary']));
    }
  },
  compare(examples) {
    for (const e of refuseV1(examples, 'rebuilding its compare page'))
      process.stdout.write(cli(['compare', '--roll', `examples/${e.dir}/roll.json`]));
  },
  critique(examples) {
    let failed = 0;
    for (const e of examples) {
      const dir = `examples/${e.dir}`;
      const roll = JSON.parse(readFileSync(`${dir}/roll.json`, 'utf8'));
      console.log(`\n${e.dir}`);
      for (const d of roll.designs) {
        const page = `${dir}/previews/${d.slug}.html`;
        const pick = String(d.number);
        const brief =
          roll.algorithm === 'hash-design/v1' ? [] : ['--roll', `${dir}/roll.json`, '--pick', pick];
        const r = JSON.parse(cli(['critique', page, ...brief, '--facts-file', `${dir}/facts.md`, '--json']));
        const ok = r.score >= MIN_SCORE && r.counts.critical === 0 && r.counts.major === 0;
        if (!ok) failed++;
        const minors = r.findings.map((f) => f.rule).join(', ') || '—';
        console.log(
          `  ${ok ? 'ok  ' : 'FAIL'} #${d.number} ${d.slug.padEnd(26)} score ${r.score}  adherence ${r.adherence ?? '— (v1 record)'}  ${minors}`,
        );
      }
    }
    if (failed) {
      console.error(`\n${failed} preview(s) below ${MIN_SCORE} or with critical/major findings`);
      process.exitCode = 1;
    }
  },
  list(examples) {
    for (const e of examples) console.log(`${e.dir.padEnd(20)} seed ${e.seed.padEnd(22)} ${e.subject}`);
  },
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [cmd, name] = process.argv.slice(2);
  const run = commands[cmd];
  if (!run) {
    console.error(`Usage: node scripts/examples.mjs <${Object.keys(commands).join('|')}> [name]`);
    process.exit(2);
  }
  try {
    run(select(name));
  } catch (err) {
    console.error(`examples: ${err.message}`);
    process.exit(1);
  }
}
