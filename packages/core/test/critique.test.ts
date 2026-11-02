import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { critiquePage, renderCritique } from '../src/critique.js';
import { BANS } from '../src/data/bans.js';
import { googleFontsUrl, tokensCss } from '../src/derive.js';
import { seededHash } from '../src/hash.js';
import { type Design, mapDesign } from '../src/mapping.js';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

/** A minimal page built from a design's own tokens.css and font link. */
const pageFor = (d: Design) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${googleFontsUrl(d.type, 'en')}">
<style>${tokensCss(d, 'en')}
h1 { font-family: var(--font-display); color: var(--accent); }</style></head>
<body><h1>Fourth Lane</h1><p>Open Tuesday to Sunday.</p></body></html>`;

describe('critique_page on an AI-template page', () => {
  const r = critiquePage({ html: fixture('slop.html') });
  const rules = new Set(r.findings.map((f) => f.rule));

  it('detects every detectable global ban', () => {
    for (const ban of BANS.filter((b) => b.detectable)) {
      expect(rules.has(ban.id), `expected rule ${ban.id} to fire`).toBe(true);
    }
  });

  it('scores it as a failure', () => {
    expect(r.score).toBeLessThan(40);
    expect(r.grade).toBe('F');
    expect(r.counts.critical).toBeGreaterThanOrEqual(3);
  });

  it('renders a readable report', () => {
    const md = renderCritique(r);
    expect(md).toContain('generic-sans');
    expect(md).toContain('fix:');
  });
});

describe('critique_page on a page that follows a brief', () => {
  it('has no critical or major findings', () => {
    const r = critiquePage({ html: fixture('good.html') });
    const serious = r.findings.filter((f) => f.severity !== 'minor');
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  it('reports high adherence to the matching brief', () => {
    const d = mapDesign(seededHash('critique', 0));
    const r = critiquePage({ html: pageFor(d), design: d });
    expect(r.adherence).toBeGreaterThanOrEqual(80);
  });

  it('reports low adherence to an unrelated brief', () => {
    const d = mapDesign(seededHash('critique', 0));
    const other = mapDesign(seededHash('critique', 1));
    expect(other.type.display.family).not.toBe(d.type.display.family);
    const r = critiquePage({ html: pageFor(d), design: other });
    expect(r.adherence!).toBeLessThan(80);
    expect(r.findings.some((f) => f.rule === 'brief-fonts' || f.rule === 'brief-palette')).toBe(true);
  });

  it('flags numbers that are not in the facts', () => {
    const r = critiquePage({ html: fixture('good.html'), facts: ['乡村面包 ¥38'] });
    const f = r.findings.find((x) => x.rule === 'invented-facts');
    expect(f?.message).toMatch(/16|18/);
  });
});

describe('critique edge cases', () => {
  it('does not treat typographic dingbats as emoji', () => {
    const r = critiquePage({
      html: '<html lang="en"><meta name="viewport" content="x"><style>body{font-family:"Anton"}</style><p>✂ cut here → ✓</p></html>',
    });
    expect(r.findings.some((f) => f.rule === 'emoji-icons')).toBe(false);
  });

  it('flags a page with only system fonts', () => {
    const r = critiquePage({
      html: '<html lang="en"><style>body{font-family:system-ui,sans-serif}</style><h1>x</h1></html>',
    });
    expect(r.findings.find((f) => f.rule === 'generic-sans')?.severity).toBe('major');
  });

  it('resolves CSS variables when checking gradients', () => {
    const r = critiquePage({
      html: '<style>:root{--a:#7c3aed;--b:#2563eb}.x{background:linear-gradient(var(--a),var(--b))}</style>',
    });
    expect(r.findings.some((f) => f.rule === 'purple-blue-gradient')).toBe(true);
  });

  it('does not flag warm print gradients', () => {
    const r = critiquePage({ html: '<style>.x{background:linear-gradient(#f4f0e4,#e9dcc0)}</style>' });
    expect(r.findings.some((f) => f.rule === 'purple-blue-gradient')).toBe(false);
  });
});
