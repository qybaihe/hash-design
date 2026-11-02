import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseFactsText } from '../src/cli.js';
import { critiquePage } from '../src/critique.js';
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
  branch: { id: string };
}

const load = (name: string) => {
  const ex = (p: string) => new URL(`${name}/${p}`, examplesDir);
  const saved = JSON.parse(readFileSync(ex('roll.json'), 'utf8'));
  const designs = saved.designs as SavedDesign[];
  return { ex, saved, designs };
};

it('finds the examples', () => {
  expect(EXAMPLES).toContain('fourth-lane-bakery');
  expect(EXAMPLES.length).toBeGreaterThanOrEqual(4);
});

/**
 * The four example runs were rolled with hash-design/v1 (the 40-branch library that v2 removed). They are
 * kept as records of real runs: v2 cannot reproduce their refs, so these tests check that they say so and
 * that their rendered previews still pass the global bans; brief adherence needs v1 and is not checked here.
 */
describe.each(EXAMPLES)('examples/%s (hash-design/v1 record)', (name) => {
  const { ex, saved, designs } = load(name);
  const facts = parseFactsText(readFileSync(ex('facts.md'), 'utf8'));

  it('is labelled as a v1 run, from a fixed seed, with its own facts', () => {
    expect(saved.algorithm).toBe('hash-design/v1');
    expect(saved.library).not.toBe(libraryFingerprint());
    expect(saved.source).toMatch(/^seed:/);
    expect(saved.content.facts).toEqual(facts);
    expect(readFileSync(ex('README.md'), 'utf8')).toContain('hash-design/v1');
  });

  it('has a brief, a preview and screenshots per design, a compare page and a README', () => {
    for (const d of designs) {
      expect(existsSync(ex(`briefs/${d.slug}.md`)), d.slug).toBe(true);
      expect(existsSync(ex(`previews/${d.slug}.html`)), d.slug).toBe(true);
      for (const shot of ['desktop', 'mobile']) {
        expect(existsSync(ex(`screenshots/${d.slug}-${shot}.png`)), `${d.slug}-${shot}`).toBe(true);
      }
    }
    for (const f of ['compare.html', 'screenshots/compare.png', 'README.md', 'ROLL.md']) {
      expect(existsSync(ex(f)), f).toBe(true);
    }
  });

  it.each(designs.map((d) => [d.slug, d] as const))(
    'preview %s still scores ≥ 90 with no critical or major findings',
    (_slug, d) => {
      const html = readFileSync(ex(`previews/${d.slug}.html`), 'utf8');
      expect(html).toContain(`hash-design #${d.number} · ${d.branch.id} · ref ${d.ref}`);
      const result = critiquePage({ html, facts });
      const serious = result.findings.filter((f) => f.severity !== 'minor');
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
      expect(result.score).toBeGreaterThanOrEqual(90);
    },
  );
});

describe('the examples together', () => {
  it('are all linked from the Pages index and shown in the showcase of every README', () => {
    const index = readFileSync(new URL('index.html', examplesDir), 'utf8');
    const readmes = ['README.md', 'README.zh-CN.md', 'README.ja.md', 'README.ko.md', 'README.es.md'];
    for (const name of EXAMPLES) {
      expect(index, `index.html → ${name}`).toContain(`href="${name}/compare.html"`);
      const plate = `docs/assets/showcase/${name}.png`;
      expect(existsSync(new URL(plate, root)), `${plate} (run npm run showcase)`).toBe(true);
      for (const file of readmes) {
        const md = readFileSync(new URL(file, root), 'utf8');
        expect(md, `${file} → ${plate}`).toContain(`(${plate})`);
        expect(md, `${file} → examples/${name}`).toContain(`](examples/${name})`);
      }
    }
  });
});
