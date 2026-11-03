#!/usr/bin/env node
// The example runs under examples/.
//
//   node scripts/examples.mjs roll     [name]   re-roll: rewrite roll.json, ROLL.md and briefs/ (current algorithm)
//   node scripts/examples.mjs compare  [name]   rebuild compare.html from roll.json and previews/
//   node scripts/examples.mjs critique [name]   critique every preview against its brief; exit 1 below 90
//   node scripts/examples.mjs index             rewrite examples/index.html (the Pages index) from every roll.json
//   node scripts/examples.mjs list              print the examples
//
// Run `npm run build` first. Without a name the command runs for every example. The seed of each example is its
// folder name; it is fixed only so the example reproduces (real rolls never pass a seed).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const EXAMPLES = [
  {
    dir: 'fourth-lane-bakery',
    name: 'Fourth Lane Bakery',
    zh: '第四巷面包店',
    about: 'A neighbourhood sourdough bakery',
    subject: '第四巷面包店',
    seed: 'fourth-lane-bakery',
  },
  {
    dir: 'sluice',
    name: 'Sluice',
    about: 'A self-hosted webhook inbox (developer tool)',
    subject: 'Sluice — self-hosted webhook inbox',
    seed: 'sluice',
  },
  {
    dir: 'bridge-two-bikes',
    name: 'Bridge No.2 Cycle Works',
    zh: '二号桥单车铺',
    about: 'A bicycle repair shop under a bridge',
    subject: '二号桥单车铺',
    seed: 'bridge-two-bikes',
  },
  {
    dir: 'causeway-festival',
    name: 'Causeway',
    about: 'A one-day music festival on a tidal island',
    subject: 'Causeway — a music festival on Skerrow Island',
    seed: 'causeway-festival',
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

const REPO = 'https://github.com/qybaihe/hash-design';
const esc = (v) =>
  String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The Pages index: every example's compare page, its previews and briefs, from roll.json. */
function indexHtml() {
  const sections = EXAMPLES.map((e, i) => {
    const roll = JSON.parse(readFileSync(`examples/${e.dir}/roll.json`, 'utf8'));
    const lang = roll.content.language === 'zh' ? 'Chinese page' : 'English page';
    const rows = roll.designs
      .map((d) => {
        const c = d.palette;
        const swatches = [c.colors.paper, c.colors.ink, c.colors.accent, c.colors.accent2]
          .map((hex) => `<i style="background:${esc(hex)}"></i>`)
          .join('');
        return `      <tr><td>${String(d.number).padStart(2, '0')}</td><td><a href="${e.dir}/previews/${d.slug}.html">${esc(d.type.display.family)} / ${esc(d.type.body.family)}</a></td><td class="mono"><span class="sw">${swatches}</span>${esc(c.polarity)} · ${Math.round(c.hue)}° · ${d.layout.columns} col · <code>${esc(d.short)}</code></td><td class="mono"><a href="${REPO}/blob/main/examples/${e.dir}/briefs/${d.slug}.md">brief</a></td></tr>`;
      })
      .join('\n');
    const zh = e.zh ? ` <span lang="zh-CN">${esc(e.zh)}</span>` : '';
    return `  <section id="${e.dir}">
    <h2><span class="n">${String(i + 1).padStart(2, '0')}</span> ${esc(e.name)}${zh}</h2>
    <p class="mono">${esc(e.about)} · ${lang} · seed <code>${esc(e.seed)}</code> · ${esc(roll.algorithm)} · <a href="${REPO}/tree/main/examples/${e.dir}">facts, briefs, process</a></p>
    <a class="shot" href="${e.dir}/compare.html"><img src="${e.dir}/screenshots/compare.png" width="1800" height="660" loading="${i ? 'lazy' : 'eager'}" alt="${esc(e.name)}: five previews side by side"></a>
    <a class="big" href="${e.dir}/compare.html">Open the compare page →</a>
    <table>
${rows}
    </table>
  </section>`;
  }).join('\n\n');
  const nav = EXAMPLES.map(
    (e, i) => `<a href="#${e.dir}">${String(i + 1).padStart(2, '0')} ${esc(e.name)}</a>`,
  ).join(' ');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>hash-design · examples</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans+Condensed:wght@400;600&family=Noto+Sans+SC:wght@400;700&display=swap">
<style>
  :root { --table: #d8d5ce; --ink: #151412; --muted: #55524b; --mark: #e2401c; }
  body { margin: 0; background: var(--table); color: var(--ink); font: 16px/1.5 "IBM Plex Sans Condensed", "Noto Sans SC", "Arial Narrow", sans-serif; }
  main { max-width: 960px; padding: 48px 24px 64px; }
  h1 { font: 600 44px/1.05 "IBM Plex Sans Condensed", "Noto Sans SC", sans-serif; margin: 0 0 12px; letter-spacing: -0.01em; }
  h2 { font: 600 30px/1.1 "IBM Plex Sans Condensed", "Noto Sans SC", sans-serif; margin: 0 0 6px; }
  h2 .n { font-family: "IBM Plex Mono", monospace; color: var(--mark); margin-right: 4px; }
  section { margin-top: 56px; padding-top: 20px; border-top: 4px solid var(--ink); }
  p { max-width: 64ch; }
  .mono { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 13px; color: var(--muted); }
  code { font-family: "IBM Plex Mono", ui-monospace, monospace; }
  nav a { margin-right: 14px; }
  .shot { display: block; margin-top: 16px; border: 2px solid var(--ink); background: var(--ink); }
  .shot img { display: block; width: 100%; height: auto; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; border-top: 2px solid var(--ink); }
  td { padding: 9px 10px 9px 0; border-bottom: 1px solid var(--ink); vertical-align: baseline; }
  td:first-child { font: 600 20px/1 "IBM Plex Mono", monospace; width: 44px; }
  td:last-child { text-align: right; padding-right: 0; }
  .sw { display: inline-flex; margin-right: 8px; vertical-align: -1px; }
  .sw i { width: 11px; height: 11px; border: 1px solid rgba(21, 20, 18, 0.4); margin-right: -1px; }
  a { color: var(--ink); text-underline-offset: 3px; }
  a:hover { color: var(--mark); }
  .big { display: inline-block; margin-top: 16px; font: 600 17px "IBM Plex Mono", monospace; border: 2px solid var(--ink); padding: 8px 14px; text-decoration: none; }
  @media (max-width: 640px) {
    h1 { font-size: 34px; } h2 { font-size: 24px; }
    td:nth-child(3) { display: none; }
  }
</style>
</head>
<body>
<main>
  <p class="mono">hash-design / examples</p>
  <h1>Four fact sheets, twenty random directions</h1>
  <p>Each example is one fact sheet put through <code>roll_designs</code> with a fixed seed: five SHA-256 hashes, five frozen briefs, five previews. Under hash-design/v2 each hash is the direction: its bytes set the palette, faces, grid, anchor, motif, motion, voice and twist. Every preview was rendered by a separate agent that saw only its own brief. No direction was picked by a model.</p>
  <p lang="zh-CN">每个示例都是一份事实清单经 <code>roll_designs</code>（固定 seed）掷出 5 个 SHA-256 哈希、5 份冻结 brief，再由 5 个互不可见的 Agent 各自渲染。在 hash-design/v2 里哈希本身就是方向：它的字节决定配色、字体、栅格、首屏锚点、母题、动效、语气和变数。没有任何一个方向是模型自己挑的。</p>
  <nav class="mono">${nav}</nav>

${sections}

  <p class="mono" style="margin-top:48px">Source, docs and the MCP server: <a href="${REPO}">github.com/qybaihe/hash-design</a></p>
</main>
</body>
</html>
`;
}

const commands = {
  roll(examples) {
    for (const e of examples) {
      const dir = `examples/${e.dir}`;
      const args = ['roll', '--subject', e.subject, '--facts-file', `${dir}/facts.md`, '--seed', e.seed];
      process.stdout.write(cli([...args, '--out', dir, '--format', 'summary']));
    }
  },
  compare(examples) {
    for (const e of examples) process.stdout.write(cli(['compare', '--roll', `examples/${e.dir}/roll.json`]));
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
        const brief = ['--roll', `${dir}/roll.json`, '--pick', pick];
        const r = JSON.parse(cli(['critique', page, ...brief, '--facts-file', `${dir}/facts.md`, '--json']));
        const ok = r.score >= MIN_SCORE && r.counts.critical === 0 && r.counts.major === 0;
        if (!ok) failed++;
        const minors = r.findings.map((f) => f.rule).join(', ') || '—';
        console.log(
          `  ${ok ? 'ok  ' : 'FAIL'} #${d.number} ${d.slug.padEnd(26)} score ${r.score}  adherence ${r.adherence}  ${minors}`,
        );
      }
    }
    if (failed) {
      console.error(`\n${failed} preview(s) below ${MIN_SCORE} or with critical/major findings`);
      process.exitCode = 1;
    }
  },
  index() {
    writeFileSync('examples/index.html', indexHtml());
    console.log('examples/index.html');
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
