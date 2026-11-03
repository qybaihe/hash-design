import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderBrief, reproduce, roll } from '../src/brief.js';
import { parseFactsText } from '../src/cli.js';
import { critiquePage } from '../src/critique.js';
import { ALGORITHM, parseRef } from '../src/hash.js';
import { libraryFingerprint } from '../src/mapping.js';

const root = new URL('../../../', import.meta.url);
const examplesDir = new URL('examples/', root);

/** Every directory under examples/ that holds a roll.json is a full example run. */
const EXAMPLES = readdirSync(examplesDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(new URL(`${e.name}/roll.json`, examplesDir)))
  .map((e) => e.name)
  .sort();

interface SavedDesign {
  number: number;
  slug: string;
  ref: string;
  short: string;
}

const load = (name: string) => {
  const ex = (p: string) => new URL(`${name}/${p}`, examplesDir);
  const saved = JSON.parse(readFileSync(ex('roll.json'), 'utf8'));
  const designs = saved.designs as SavedDesign[];
  return { ex, saved, designs };
};

it('finds the examples', () => {
  expect(EXAMPLES).toEqual(['bridge-two-bikes', 'causeway-festival', 'fourth-lane-bakery', 'sluice']);
});

describe.each(EXAMPLES)('examples/%s', (name) => {
  const { ex, saved, designs } = load(name);
  const facts = parseFactsText(readFileSync(ex('facts.md'), 'utf8'));

  it('is a current hash-design/v2 run from its own seed and facts', () => {
    expect(saved.algorithm).toBe(ALGORITHM);
    expect(saved.library).toBe(libraryFingerprint());
    expect(saved.source).toBe(`seed:${name}`);
    expect(saved.content.facts).toEqual(facts);
    const again = roll({ seed: name, count: designs.length, content: saved.content });
    expect(again.designs.map((d) => d.ref)).toEqual(designs.map((d) => d.ref));
  });

  it('every brief on disk is exactly what its ref reproduces', () => {
    for (const d of designs) {
      const design = reproduce(parseRef(d.ref), saved.constraints);
      const brief = renderBrief(design, saved.content, { number: d.number });
      const onDisk = readFileSync(ex(`briefs/${d.slug}.md`), 'utf8');
      expect(onDisk, d.slug).toBe(brief.endsWith('\n') ? brief : `${brief}\n`);
    }
  });

  it('has a preview and screenshots per design, a compare page and a README that names every ref', () => {
    const readme = readFileSync(ex('README.md'), 'utf8');
    expect(readme).toContain(ALGORITHM);
    expect(readme).toContain(`--seed ${name}`);
    for (const d of designs) {
      expect(existsSync(ex(`previews/${d.slug}.html`)), d.slug).toBe(true);
      for (const shot of ['desktop', 'mobile']) {
        expect(existsSync(ex(`screenshots/${d.slug}-${shot}.png`)), `${d.slug}-${shot}`).toBe(true);
      }
      expect(readme, `README → ${d.short}`).toContain(d.short);
    }
    for (const f of ['compare.html', 'screenshots/compare.png', 'ROLL.md']) {
      expect(existsSync(ex(f)), f).toBe(true);
    }
  });

  it.each(designs.map((d) => [d.slug, d] as const))(
    'preview %s scores ≥ 90 with no critical or major findings and follows its brief',
    (_slug, d) => {
      const html = readFileSync(ex(`previews/${d.slug}.html`), 'utf8');
      expect(html.split('\n')[0]).toBe(`<!-- hash-design #${d.number} · ${d.short} · ref ${d.ref} -->`);
      const design = reproduce(parseRef(d.ref), saved.constraints);
      const result = critiquePage({ html, facts, design });
      const serious = result.findings.filter((f) => f.severity !== 'minor');
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.adherence).toBeGreaterThanOrEqual(80);
    },
  );
});

describe('the examples together', () => {
  it('are all linked from the Pages index and shown in the README showcase', () => {
    const index = readFileSync(new URL('index.html', examplesDir), 'utf8');
    const readme = readFileSync(new URL('README.md', root), 'utf8');
    for (const name of EXAMPLES) {
      expect(index, `index.html → ${name}`).toContain(`href="${name}/compare.html"`);
      const plate = `docs/assets/showcase/${name}.png`;
      expect(existsSync(new URL(plate, root)), `${plate} (run npm run showcase)`).toBe(true);
      expect(readme, `README.md → ${plate}`).toContain(`(${plate})`);
      expect(readme, `README.md → examples/${name}`).toContain(`](examples/${name})`);
      for (const d of load(name).designs)
        expect(index, `index.html → ${d.slug}`).toContain(`${name}/previews/${d.slug}.html`);
    }
  });

  it('no hash appears in two examples', () => {
    const refs = EXAMPLES.flatMap((name) => load(name).designs.map((d) => d.ref));
    expect(new Set(refs).size).toBe(refs.length);
  });
});
