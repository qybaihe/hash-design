#!/usr/bin/env node
// Renders one showcase plate per example run for the READMEs: the five rolled directions of that roll side by
// side, in the light style of docs/assets/hero.png, each labelled with its number, branch, branch id, palette and
// ref from roll.json.
//
// The examples are hash-design/v1 records, so their roll.json designs still carry a v1 branch; the labels come from it.
//
//   node scripts/showcase.mjs [example…]   default: every example under examples/ with a roll.json
//
// Writes docs/assets/showcase/<example>.png (1280×660 at 1.5× = 1920×990). Cards are cut from the full-page
// desktop screenshots; a page that scrolls sideways (its full-page shot is wider than tall) uses its phone
// screenshot instead, and its label says so. Needs `npx playwright install chromium`, the examples' screenshots
// (npm run screenshots) and network access for Google Fonts (IBM Plex, as in the hero).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { EXAMPLES } from './examples.mjs';

const W = 1280;
const H = 660;
const SCALE = 1.5;
const examplesDir = resolve('examples');
const outDir = resolve('docs/assets/showcase');

const all = readdirSync(examplesDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(examplesDir, e.name, 'roll.json')))
  .map((e) => e.name)
  .sort();
const wanted = process.argv.slice(2);
for (const name of wanted) if (!all.includes(name)) throw new Error(`No examples/${name}/roll.json`);
const names = wanted.length ? wanted : all;

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** PNG width/height from the IHDR chunk, without an image library. */
function pngSize(file) {
  const b = readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

/** Full-page desktop shot, or the phone shot for pages that scroll sideways. */
function cardShot(dir, slug) {
  const full = join(dir, 'screenshots', `${slug}-full.png`);
  const mobile = join(dir, 'screenshots', `${slug}-mobile.png`);
  if (existsSync(full)) {
    const { width, height } = pngSize(full);
    if (height >= width * 1.2 || !existsSync(mobile)) return { src: pathToFileURL(full).href, phone: false };
  }
  if (existsSync(mobile)) return { src: pathToFileURL(mobile).href, phone: true };
  throw new Error(`No screenshot for ${slug}; run npm run screenshots`);
}

function plate(name) {
  const dir = join(examplesDir, name);
  const roll = JSON.parse(readFileSync(join(dir, 'roll.json'), 'utf8'));
  const entry = EXAMPLES.find((e) => e.dir === name);
  const subject = roll.content.subject;
  // English display name as the title; the rolled subject (or the part after "<name> — ") as the subtitle.
  const title = entry?.name ?? subject;
  const alt =
    subject === title ? '' : subject.startsWith(`${title} — `) ? subject.slice(title.length + 3) : subject;
  const lang = roll.content.language === 'zh' ? 'Chinese page' : 'English page';
  const seed = String(roll.source).replace(/^seed:/, '');
  const cards = roll.designs
    .map((d) => {
      const shot = cardShot(dir, d.slug);
      const ref = `${esc(d.short)}${d.probe ? `<i>+${d.probe}</i>` : ''}`;
      const c = d.palette.colors;
      const chips = [c.paper, c.ink, c.accent, c.accent2]
        .map((hex) => `<i style="background:${esc(hex)}"></i>`)
        .join('');
      return `
      <figure class="card">
        <span class="ref" data-ref>${ref}</span>
        <div class="page${shot.phone ? ' phone' : ''}"><img src="${shot.src}" alt=""></div>
        <figcaption>
          <div class="name"><span class="n">${String(d.number).padStart(2, '0')}</span>${esc(d.branch.name.en)}</div>
          <div class="slug"><span class="chips">${chips}</span>${esc(d.branch.id)}${shot.phone ? '<em>phone view</em>' : ''}</div>
        </figcaption>
      </figure>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Condensed:wght@500;600&family=Noto+Sans+SC:wght@500&display=block">
<style>
  :root {
    --paper: #f6f4ef; --ink: #151412; --muted: #66625a; --hair: #dcd8cf; --mark: #e2401c;
    --mono: "IBM Plex Mono", ui-monospace, monospace;
    --cond: "IBM Plex Sans Condensed", "Noto Sans SC", "Arial Narrow", sans-serif;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    width: ${W}px; height: ${H}px; overflow: hidden; position: relative; color: var(--ink); font: 15px/1.4 var(--cond);
    background: radial-gradient(circle at 1px 1px, rgba(21, 20, 18, 0.1) 1px, transparent 1.4px) 0 0 / 24px 24px, var(--paper);
    display: grid; grid-template-rows: auto auto 1fr auto; padding: 30px 44px 22px;
  }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
  .brand { font: 600 13px/1 var(--mono); display: flex; align-items: center; gap: 8px; }
  .brand::before { content: ""; width: 10px; height: 10px; background: var(--mark); }
  .brand span { color: var(--muted); font-weight: 500; }
  h1 { margin: 12px 0 0; font: 600 36px/1.05 var(--cond); letter-spacing: -0.01em; }
  h1 small { font: 500 22px/1 var(--cond); color: var(--muted); margin-left: 10px; letter-spacing: 0; }
  .meta { margin: 8px 0 0; font: 12px/1.4 var(--mono); color: var(--muted); }
  .meta b { color: var(--ink); font-weight: 500; }
  .where { text-align: right; font: 500 11px/1.6 var(--mono); color: var(--muted); letter-spacing: 0.04em; }
  .where b { display: block; color: var(--ink); font-weight: 600; letter-spacing: 0; font-size: 12px; }
  .pill { justify-self: center; margin-top: 4px; font: 500 12.5px/1 var(--mono); color: #fff; background: var(--ink); padding: 7px 12px; position: relative; z-index: 2; }
  .pill b { color: #ffb39f; font-weight: 600; }
  .row { min-height: 0; display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-top: 40px; }
  .card { margin: 0; display: flex; flex-direction: column; min-height: 0; position: relative; }
  .ref { position: absolute; top: 0; left: 50%; transform: translate(-50%, -55%); z-index: 2; font: 500 12px/1 var(--mono); background: #fff; border: 1.5px solid var(--ink); padding: 5px 8px 4px; }
  .ref i { font-style: normal; color: var(--muted); }
  .page { flex: 1; min-height: 0; border: 1.5px solid var(--ink); background: #fff; overflow: hidden; box-shadow: 5px 5px 0 var(--hair); }
  .page img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top center; }
  figcaption { padding-top: 10px; }
  .name { font: 600 16.5px/1.1 var(--cond); display: flex; gap: 7px; align-items: baseline; white-space: nowrap; }
  .name .n { font: 600 12px/1 var(--mono); color: var(--mark); }
  .slug { margin-top: 5px; height: 12px; font: 11px/1 var(--mono); color: var(--muted); display: flex; align-items: center; gap: 8px; white-space: nowrap; }
  .slug em { font: 10px/1 var(--mono); font-style: normal; margin-left: auto; border: 1px solid var(--hair); padding: 1px 4px; }
  .chips { display: inline-flex; }
  .chips i { width: 10px; height: 10px; border: 1px solid rgba(21, 20, 18, 0.35); margin-right: -1px; }
  footer { display: flex; justify-content: space-between; gap: 24px; padding-top: 14px; font: 10.5px/1.3 var(--mono); color: var(--muted); }
  footer b { color: var(--ink); font-weight: 500; }
  svg.wires { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; }
  svg.wires path { fill: none; stroke: var(--ink); stroke-width: 1.25; }
  svg.wires circle { fill: var(--ink); }
</style>
</head>
<body>
  <header class="top">
    <div>
      <div class="brand">hash-design <span>· showcase</span></div>
      <h1>${esc(title)}${alt ? `<small>${esc(alt)}</small>` : ''}</h1>
      <p class="meta">Five directions rolled from one fact sheet · ${lang} · seed <b>${esc(seed)}</b>, fixed only so the example reproduces</p>
    </div>
    <div class="where"><b>examples/${esc(name)}</b>library ${esc(roll.library)} · ${esc(roll.algorithm)}</div>
  </header>
  <div class="pill" id="pill">roll → <b>${roll.designs.length}</b> × SHA-256</div>
  <section class="row">${cards}</section>
  <footer>
    <span>Every preview was rendered by its own sub-agent from one frozen brief · real screenshots, not mock-ups</span>
    <span><b>qybaihe.github.io/hash-design</b></span>
  </footer>
  <svg class="wires" id="wires"></svg>
  <script>
    function drawWires() {
      const box = (el) => el.getBoundingClientRect();
      const p = box(document.getElementById('pill'));
      const tabs = [...document.querySelectorAll('[data-ref]')].map(box);
      const cx = p.left + p.width / 2, y0 = p.bottom, y1 = tabs[0].top, bus = y0 + (y1 - y0) * 0.45, r = 6;
      let d = 'M' + cx + ' ' + y0 + 'V' + bus;
      const xs = tabs.map((t) => t.left + t.width / 2);
      const x0 = xs[0], xn = xs[xs.length - 1];
      d += 'M' + (x0 + r) + ' ' + bus + 'H' + (xn - r);
      let dots = '<circle cx="' + cx + '" cy="' + bus + '" r="2.5"/>';
      xs.forEach((x, i) => {
        if (i === 0) d += 'M' + (x + r) + ' ' + bus + 'Q' + x + ' ' + bus + ' ' + x + ' ' + (bus + r) + 'V' + y1;
        else if (i === xs.length - 1) d += 'M' + (x - r) + ' ' + bus + 'Q' + x + ' ' + bus + ' ' + x + ' ' + (bus + r) + 'V' + y1;
        else d += 'M' + x + ' ' + bus + 'V' + y1;
        dots += '<circle cx="' + x + '" cy="' + y1 + '" r="2.5"/>';
      });
      document.getElementById('wires').innerHTML = '<path d="' + d + '"/>' + dots;
    }
  </script>
</body>
</html>`;
}

const tmp = await mkdtemp(join(tmpdir(), 'hash-design-showcase-'));
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
try {
  for (const name of names) {
    const page = join(tmp, `${name}.html`);
    await writeFile(page, plate(name));
    const tab = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
    await tab.goto(pathToFileURL(page).href, { waitUntil: 'networkidle' });
    await tab.evaluate(() => document.fonts.ready);
    await tab.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
    const missing = await tab.evaluate(() =>
      ['600 36px "IBM Plex Sans Condensed"', '500 12px "IBM Plex Mono"'].filter(
        (font) => !document.fonts.check(font),
      ),
    );
    if (missing.length) throw new Error(`Fonts did not load (offline?): ${missing.join(', ')}`);
    await tab.evaluate('drawWires()');
    await tab.screenshot({ path: join(outDir, `${name}.png`) });
    await tab.close();
    console.log(`docs/assets/showcase/${name}.png  ${W * SCALE}×${H * SCALE}`);
  }
} finally {
  await browser.close();
  await rm(tmp, { recursive: true, force: true });
}
