import { describe, expect, it } from 'vitest';
import { briefJson, renderBrief, renderRollSummary, reproduce, roll, rollJson } from '../src/brief.js';
import { critiquePage } from '../src/critique.js';
import { DENSITIES, TWISTS } from '../src/data/pools.js';
import { SCENARIOS, getScenario } from '../src/data/scenarios.js';
import { baseSize, tokensCss, typeScale } from '../src/derive.js';
import { rollHashes } from '../src/hash.js';
import {
  libraryFingerprint,
  mapDesign,
  normalizeConstraints,
  scenarioBaseSize,
  scenarioFingerprint,
} from '../src/mapping.js';
import type { ScenarioId } from '../src/types.js';

const NON_WEB = SCENARIOS.filter((s) => s.id !== 'web').map((s) => s.id) as Exclude<ScenarioId, 'web'>[];
const content = { subject: 'Causeway', facts: ['A one-day music festival'] };

describe('scenario data', () => {
  it('lists web first, then the five non-web scenarios', () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(['web', 'deck', 'app', 'dashboard', 'poster', 'email']);
  });

  it.each(NON_WEB)('%s has formats, bilingual text and filters that leave a pool', (id) => {
    const s = getScenario(id)!;
    expect(s.formats.length).toBeGreaterThanOrEqual(3);
    for (const f of s.formats) {
      expect(f.width).toBeGreaterThan(0);
      expect(f.height).toBeGreaterThan(0);
      expect(f.name.zh && f.name.en && f.description.zh && f.description.en).toBeTruthy();
    }
    expect(new Set(s.formats.map((f) => f.id)).size).toBe(s.formats.length);
    for (const t of [s.summary, s.output, s.count, s.layout, s.anchor, s.motion, ...s.must, ...s.mustNot]) {
      expect(t.zh.length, JSON.stringify(t)).toBeGreaterThan(0);
      expect(t.en.length, JSON.stringify(t)).toBeGreaterThan(0);
    }
    expect(s.must.length).toBeGreaterThanOrEqual(3);
    for (const t of s.dropTwists) expect(TWISTS.map((x) => x.id)).toContain(t);
    for (const d of s.dropDensities) expect(Object.keys(DENSITIES)).toContain(d);
    expect(TWISTS.length - s.dropTwists.length).toBeGreaterThanOrEqual(12);
  });

  it('web adds nothing: no formats, no filters, unscaled type', () => {
    const web = getScenario('web')!;
    expect(web.formats).toEqual([]);
    expect(web.dropDensities).toEqual([]);
    expect(web.dropTwists).toEqual([]);
    expect(web.stillMotion).toBe(false);
    expect(web.baseSize).toEqual({ scale: 1 });
  });
});

describe('default scenario (web) is unchanged', () => {
  it('normalises "web" away so web constraints serialise exactly as before', () => {
    expect(normalizeConstraints({ scenario: 'web' })).toEqual(normalizeConstraints({}));
    expect('scenario' in normalizeConstraints({ scenario: 'web' })).toBe(false);
    expect(normalizeConstraints({ scenario: 'deck' }).scenario).toBe('deck');
  });

  it('gives the same designs, trace and JSON with or without scenario "web"', () => {
    const a = roll({ seed: 'scenario-default', content, now: new Date(0) });
    const b = roll({ seed: 'scenario-default', content, constraints: { scenario: 'web' }, now: new Date(0) });
    expect(JSON.stringify(rollJson(b))).toBe(JSON.stringify(rollJson(a)));
    for (const d of a.designs) {
      expect(d.scenario).toBeUndefined();
      expect(d.trace.map((t) => t.dimension)).not.toContain('format');
      expect(d.unusedBytes).toHaveLength(38); // bytes 13–31
      expect(baseSize(d)).toBe(d.density.baseSize);
    }
  });

  it('keeps the library fingerprint independent of scenario data', () => {
    expect(scenarioFingerprint()).toMatch(/^[0-9a-f]{12}$/);
    expect(scenarioFingerprint()).not.toBe(libraryFingerprint());
    const d = roll({ seed: 'x', constraints: { scenario: 'deck' } }).designs[0]!;
    expect(d.library).toBe(libraryFingerprint());
    expect(d.scenario?.data).toBe(scenarioFingerprint());
  });

  it('rejects unknown scenarios', () => {
    expect(() => normalizeConstraints({ scenario: 'billboard' as ScenarioId })).toThrow(/Unknown scenario/);
  });
});

describe.each(NON_WEB)('scenario %s', (id) => {
  const scenario = getScenario(id)!;
  const web = roll({ seed: `scenario-${id}`, content });
  const r = roll({ seed: `scenario-${id}`, content, constraints: { scenario: id } });

  it('is deterministic and reproducible from ref + constraints', () => {
    const again = roll({ seed: `scenario-${id}`, content, constraints: { scenario: id } });
    expect(again.designs.map((d) => d.ref)).toEqual(r.designs.map((d) => d.ref));
    for (const d of r.designs) {
      const [hash, probe] = d.ref.split('+');
      const rep = reproduce({ hash: hash!, probe: Number(probe ?? 0) }, r.constraints);
      expect(JSON.stringify(rep)).toBe(JSON.stringify(d));
    }
    expect(rollJson(r).constraints).toMatchObject({ scenario: id });
  });

  it('keeps the rolled direction: same branches, voice, layout, type, palette, motif, anchor, surface as web', () => {
    r.designs.forEach((d, i) => {
      const w = web.designs[i]!;
      expect(d.ref).toBe(w.ref);
      for (const k of [
        'branch',
        'voice',
        'layout',
        'type',
        'palette',
        'motif',
        'anchor',
        'scale',
        'surface',
      ] as const)
        expect(d[k].id, k).toBe(w[k].id);
    });
  });

  it('picks its format with byte 13 and records it in the trace', () => {
    for (const d of r.designs) {
      const step = d.trace.find((t) => t.dimension === 'format')!;
      expect(step.bytes).toEqual([13]);
      const b13 = parseInt(d.hash.slice(26, 28), 16);
      expect(d.scenario!.format).toEqual(scenario.formats[b13 % scenario.formats.length]);
      expect(d.unusedBytes).toHaveLength(36); // bytes 14–31
    }
  });

  it('never picks a dropped density or twist, and sizes type for the canvas', () => {
    const hashes = rollHashes(60, `pool-${id}`);
    for (const h of hashes) {
      const d = mapDesign(h, { constraints: { scenario: id } });
      const kept = d.branch.densities.filter((x) => !scenario.dropDensities.includes(x));
      if (kept.length) expect(kept).toContain(d.density.id);
      expect(scenario.dropTwists).not.toContain(d.twist.id);
      expect(d.scenario!.baseSize).toBe(scenarioBaseSize(scenario, d.density));
      expect(typeScale(d).find((s) => s.step === 0)!.px).toBe(d.scenario!.baseSize);
      if (scenario.stillMotion) expect(d.trace.find((t) => t.dimension === 'motion')!.note).toMatch(/static/);
    }
  });

  it('puts the canvas into tokens.css', () => {
    const d = r.designs[0]!;
    const css = tokensCss(d, 'en');
    expect(css).toContain(`--max-width: ${d.scenario!.format.width}px;`);
    if (d.scenario!.format.fixed) expect(css).toContain(`--canvas-height: ${d.scenario!.format.height}px;`);
  });
});

describe('scenario type sizes', () => {
  it('scales or clamps the density base size per scenario', () => {
    const s = (id: ScenarioId) => getScenario(id)!;
    expect(scenarioBaseSize(s('deck'), DENSITIES.regular)).toBe(34);
    expect(scenarioBaseSize(s('poster'), DENSITIES.compact)).toBe(26);
    expect(scenarioBaseSize(s('app'), DENSITIES.airy)).toBe(17);
    expect(scenarioBaseSize(s('app'), DENSITIES.compact)).toBe(16);
    expect(scenarioBaseSize(s('dashboard'), DENSITIES.regular)).toBe(15);
    expect(scenarioBaseSize(s('email'), DENSITIES.compact)).toBe(16);
  });
});

describe('scenario briefs', () => {
  it.each(NON_WEB)('%s brief carries the scenario section in the page language', (id) => {
    const s = getScenario(id)!;
    for (const [lang, c] of [
      ['en', { subject: 'Causeway', facts: ['A one-day music festival on Skerrow Island'] }],
      ['zh', { subject: '第四巷面包店', facts: ['周一休息'] }],
    ] as const) {
      const r = roll({
        seed: `brief-${id}`,
        content: { subject: c.subject, facts: [...c.facts] },
        constraints: { scenario: id },
      });
      const d = r.designs[0]!;
      const f = d.scenario!.format;
      const md = renderBrief(d, r.content, { number: 1 });
      expect(md).toContain(`## 场景 Scenario — ${s.name.zh} / ${s.name.en}`);
      expect(md).toContain(`| scenario | ${s.name.en} — ${f.name.en} (${f.width}×${f.height})`);
      expect(md).toContain(`- **Format — ${f.name[lang]}**`);
      expect(md).toContain(s.output[lang]);
      for (const m of s.must) expect(md).toContain(`- ${m[lang]}`);
      expect(md).toContain(`on a ${d.scenario!.baseSize}px base`);
      expect(md).toMatch(/\| 14–31 \|/);
      expect(md).toContain('- [ ] Every scenario rule holds');
      expect(md).toContain('constraints | scenario=' + id);

      const json = briefJson(d, r.content);
      expect(json.scenario?.id).toBe(id);
      expect(json.scenario?.format).toEqual(f);
      expect(json.scenario?.output).toBe(s.output[lang]);
      expect(renderRollSummary(r)).toContain(`${d.layout.name} · ${f.name.en}`);
    }
  });

  it('web briefs have no scenario section, row or JSON key', () => {
    const r = roll({ seed: 'brief-web', content });
    const md = renderBrief(r.designs[0]!, r.content);
    expect(md).not.toContain('场景 Scenario');
    expect(md).not.toContain('| scenario |');
    expect(md).toMatch(/\| 13–31 \|/);
    expect('scenario' in briefJson(r.designs[0]!, r.content)).toBe(false);
  });
});

describe('critique_page scenario checks', () => {
  const page = (body: string, css = '') =>
    `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width"><style>${css}</style></head><body>${body}</body></html>`;
  const design = (id: Exclude<ScenarioId, 'web'>) =>
    roll({ seed: `critique-${id}`, constraints: { scenario: id } }).designs[0]!;
  const scenarioRules = (id: Exclude<ScenarioId, 'web'>, html: string) =>
    critiquePage({ html, design: design(id) }).findings.filter((f) => f.rule === `scenario-${id}`);

  it('flags a web page passed off as a deck, and accepts real slides', () => {
    expect(scenarioRules('deck', page('<main><h1>Hi</h1></main>')).map((f) => f.severity)).toContain('major');
    const slides = '<section class="slide">1</section>'.repeat(5);
    const ok = page(
      `${slides}<script>addEventListener('keydown',()=>{})</script>`,
      '.slide{width:1920px;height:1080px}',
    );
    expect(scenarioRules('deck', ok)).toEqual([]);
  });

  it('checks the phone frame and screens for app', () => {
    expect(scenarioRules('app', page('<main></main>'))).toHaveLength(2);
    const ok = page(
      '<div class="screen"></div><div class="screen"></div>',
      '.screen{width:390px;height:844px}',
    );
    expect(scenarioRules('app', ok)).toEqual([]);
  });

  it('asks dashboards for tabular numerals', () => {
    expect(scenarioRules('dashboard', page('<main>42</main>'))).toHaveLength(1);
    expect(
      scenarioRules('dashboard', page('<main>42</main>', 'td{font-variant-numeric:tabular-nums}')),
    ).toEqual([]);
  });

  it('checks the poster artboard size', () => {
    const d = design('poster');
    const f = d.scenario!.format;
    expect(critiquePage({ html: page('<main></main>'), design: d }).findings.map((x) => x.rule)).toContain(
      'scenario-poster',
    );
    const ok = page('<main class="art"></main>', `.art{width:${f.width}px;height:${f.height}px}`);
    expect(critiquePage({ html: ok, design: d }).findings.map((x) => x.rule)).not.toContain(
      'scenario-poster',
    );
  });

  it('rejects scripts and CSS-only layout in email', () => {
    const d = design('email');
    const w = d.scenario!.format.width;
    const bad = critiquePage({ html: page('<div>Hi</div><script>1</script>'), design: d });
    expect(bad.findings.filter((f) => f.rule === 'scenario-email' && f.severity === 'major')).toHaveLength(2);
    const ok = critiquePage({
      html: page(`<table role="presentation" width="${w}"><tr><td>Hi</td></tr></table>`),
      design: d,
    });
    expect(ok.findings.filter((f) => f.rule === 'scenario-email')).toEqual([]);
  });

  it('adds no scenario checks for web designs', () => {
    const d = roll({ seed: 'critique-web' }).designs[0]!;
    const r = critiquePage({ html: page('<main></main>'), design: d });
    expect(r.findings.some((f) => f.rule.startsWith('scenario-'))).toBe(false);
    expect(r.passed.some((p) => p.startsWith('scenario-'))).toBe(false);
  });
});
