/**
 * Build-time content for site/index.html. Every number and label on the page that comes from the project is
 * computed here from the code and the example runs, so the page cannot drift from them:
 *   %%TOKENS%%      version, counts, fingerprint, font pool sizes
 *   <!--#scenarios-->  the six scenarios, their formats and canvases (data/scenarios.ts)
 *   <!--#bytes-->      the byte map of the worked example (BYTE_MAP + the design's trace)
 *   <!--#showcase-->   the four example runs: seed, refs, faces, critique and adherence of every preview
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ALGORITHM,
  BODY_FONTS,
  DEFAULT_COUNT,
  DISPLAY_FONTS,
  MAX_COUNT,
  SCENARIOS,
  critiquePage,
  libraryFingerprint,
  parseRef,
  reproduce,
  type ScenarioFormat,
} from '../../packages/core/src/index.js';
import { parseFactsText } from '../../packages/core/src/cli.js';
import { WORKED_EXAMPLE, byteMapState, esc, legendHtml } from '../src/bytes.js';

export const SITE_URL = 'https://hash-design.pages.dev';
export const EXAMPLES_URL = 'https://qybaihe.github.io/hash-design';
export const REPO_URL = 'https://github.com/qybaihe/hash-design';

/** The four example runs: the hero run (HERO_EXAMPLE, the run the hero animation is recorded from) first, then the README order. */
export const SHOWCASE = [
  { dir: 'causeway-festival', name: 'Causeway', about: 'A one-day music festival on a tidal island' },
  {
    dir: 'fourth-lane-bakery',
    name: 'Fourth Lane Bakery',
    zh: '第四巷面包店',
    about: 'A neighbourhood sourdough bakery',
  },
  { dir: 'sluice', name: 'Sluice', about: 'A self-hosted webhook inbox' },
  {
    dir: 'bridge-two-bikes',
    name: 'Bridge No.2 Cycle Works',
    zh: '二号桥单车铺',
    about: 'A bicycle repair shop under a bridge',
  },
];
export const HERO_EXAMPLE = 'causeway-festival';

/** Real repository files the page uses, served at /media/<name> in dev and emitted there by the build. */
export const MEDIA: Record<string, string> = {
  'hero.mp4': 'docs/assets/hero.mp4',
  'hero.png': 'docs/assets/hero.png',
  'social-preview.png': 'docs/assets/social-preview.png',
  ...Object.fromEntries(SHOWCASE.map((e) => [`showcase/${e.dir}.png`, `docs/assets/showcase/${e.dir}.png`])),
};

interface SavedRoll {
  algorithm: string;
  source: string;
  constraints: Record<string, unknown>;
  content: { language: string; facts: string[] };
  designs: {
    number: number;
    slug: string;
    ref: string;
    short: string;
    type: { display: { family: string }; body: { family: string } };
  }[];
}

function range(values: number[]): string {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return lo === hi ? String(lo) : `${lo}–${hi}`;
}

export function exampleStats(repo: string, dir: string) {
  const base = join(repo, 'examples', dir);
  const roll = JSON.parse(readFileSync(join(base, 'roll.json'), 'utf8')) as SavedRoll;
  const facts = parseFactsText(readFileSync(join(base, 'facts.md'), 'utf8'));
  const results = roll.designs.map((d) => {
    const html = readFileSync(join(base, 'previews', `${d.slug}.html`), 'utf8');
    const design = reproduce(parseRef(d.ref), roll.constraints);
    return critiquePage({ html, facts, design });
  });
  return {
    roll,
    seed: roll.source.replace(/^seed:/, ''),
    score: range(results.map((r) => r.score)),
    adherence: range(results.map((r) => r.adherence ?? 0)),
  };
}

function showcaseHtml(repo: string): string {
  return SHOWCASE.map((e) => {
    const s = exampleStats(repo, e.dir);
    const lang = s.roll.content.language === 'zh' ? 'Chinese page' : 'English page';
    const faces = s.roll.designs.map((d) => `${d.type.display.family} / ${d.type.body.family}`).join('; ');
    const refs = s.roll.designs.map((d) => `<code>${esc(d.short)}</code>`).join(' ');
    return `<figure class="plate">
  <a class="plate-img" href="${EXAMPLES_URL}/${e.dir}/compare.html"><img src="/media/showcase/${e.dir}.png" width="1920" height="990" loading="lazy" decoding="async" alt="${esc(e.name)}: five rolled directions side by side — ${esc(faces)}"></a>
  <figcaption>
    <p class="plate-title"><strong>${esc(e.name)}</strong>${e.zh ? ` <span class="zh" lang="zh-CN">${esc(e.zh)}</span>` : ''}</p>
    <p class="plate-about">${esc(e.about)} · ${lang}</p>
    <dl class="plate-meta"><div><dt>seed</dt><dd><code>${esc(s.seed)}</code></dd></div><div><dt>critique</dt><dd>${s.score}</dd></div><div><dt>adherence</dt><dd>${s.adherence}</dd></div></dl>
    <p class="plate-refs">${refs}</p>
    <p class="plate-links"><a href="${EXAMPLES_URL}/${e.dir}/compare.html">Compare page</a><a href="${REPO_URL}/tree/main/examples/${e.dir}">Facts, briefs, previews</a></p>
  </figcaption>
</figure>`;
  }).join('\n');
}

/** Canvas outlines for one scenario, scaled into a 120 × 84 box. */
function canvasSvg(formats: { width: number; height: number }[]): string {
  const W = 120;
  const H = 84;
  const gap = 6;
  const max = Math.max(...formats.map((f) => f.height));
  const scale = Math.min(
    H / max,
    (W - gap * (formats.length - 1)) / formats.reduce((a, f) => a + f.width, 0),
  );
  let x = 0;
  const rects = formats.map((f) => {
    const w = f.width * scale;
    const h = f.height * scale;
    const r = `<rect x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="1.5"/>`;
    x += w + gap;
    return r;
  });
  return `<svg class="canvas" viewBox="0 0 ${Math.max(W, x - gap).toFixed(0)} ${H}" aria-hidden="true">${rects.join('')}</svg>`;
}

function uniqueSizes(formats: ScenarioFormat[]): ScenarioFormat[] {
  const seen = new Set<string>();
  return formats.filter((f) => {
    const k = `${f.width}×${f.height}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function scenariosHtml(): string {
  return SCENARIOS.map((s) => {
    const sizes = uniqueSizes(s.formats);
    const canvas =
      s.id === 'web'
        ? canvasSvg([
            { width: 1440, height: 900 },
            { width: 390, height: 844 },
          ])
        : canvasSvg(sizes);
    const formats = s.formats.length
      ? s.formats.map((f) => esc(f.name.en)).join(' · ')
      : 'responsive, from phone to desktop';
    const size =
      s.id === 'web'
        ? '390 px and up'
        : s.id === 'email'
          ? `${[...new Set(s.formats.map((f) => f.width))].join(' or ')} px column`
          : sizes.map((f) => `${f.width}×${f.height}`).join(', ');
    return `<li class="scn">
  ${canvas}
  <h3>${esc(s.name.en)} <code>${s.id === 'web' ? 'default' : `--scenario ${s.id}`}</code></h3>
  <p>${esc(s.summary.en)}</p>
  <p class="scn-meta"><span>${formats}</span><span>${size}</span></p>
</li>`;
  }).join('\n');
}

export function tokens(repo: string): Record<string, string> {
  const pkg = JSON.parse(readFileSync(join(repo, 'packages/core/package.json'), 'utf8')) as {
    version: string;
  };
  const hero = exampleStats(repo, HERO_EXAMPLE);
  return {
    VERSION: pkg.version,
    ALGORITHM,
    FINGERPRINT: libraryFingerprint(),
    DEFAULT_COUNT: String(DEFAULT_COUNT),
    MAX_COUNT: String(MAX_COUNT),
    DISPLAY_FONTS: String(DISPLAY_FONTS.length),
    BODY_FONTS: String(BODY_FONTS.length),
    SCENARIO_COUNT: String(SCENARIOS.length),
    SITE_URL,
    EXAMPLES_URL,
    REPO_URL,
    WORKED_EXAMPLE,
    HERO_EXAMPLE,
    HERO_SEED: hero.seed,
    HERO_NAME: SHOWCASE.find((e) => e.dir === HERO_EXAMPLE)?.name ?? HERO_EXAMPLE,
  };
}

export function partials(repo: string): Record<string, string> {
  const map = byteMapState(WORKED_EXAMPLE);
  return {
    scenarios: scenariosHtml(),
    'bytes-cells': map.cells,
    'bytes-detail': map.detail,
    'bytes-legend': legendHtml(),
    showcase: showcaseHtml(repo),
  };
}

/** Fill site/index.html: <!--#name--> markers and %%TOKEN%% placeholders. Unknown names fail the build. */
export function fillHtml(html: string, repo: string): string {
  const t = tokens(repo);
  const p = partials(repo);
  const out = html
    .replace(/<!--#([\w-]+)-->/g, (_, name: string) => {
      if (!(name in p)) throw new Error(`site/index.html: unknown partial <!--#${name}-->`);
      return p[name] as string;
    })
    .replace(/%%([A-Z_]+)%%/g, (_, name: string) => {
      if (!(name in t)) throw new Error(`site/index.html: unknown token %%${name}%%`);
      return esc(t[name]);
    });
  return out;
}
