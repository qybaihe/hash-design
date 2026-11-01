import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderBrief, roll } from '../src/brief.js';
import { parseFactsText } from '../src/cli.js';
import { libraryFingerprint } from '../src/mapping.js';

const ex = (p: string) => new URL(`../../../examples/fourth-lane-bakery/${p}`, import.meta.url);

describe('examples/fourth-lane-bakery stays consistent with the data', () => {
  const saved = JSON.parse(readFileSync(ex('roll.json'), 'utf8'));
  const facts = parseFactsText(readFileSync(ex('facts.md'), 'utf8'));
  const fresh = roll({ seed: 'fourth-lane-bakery', content: { subject: '第四巷面包店', facts } });

  it('was rolled with the current library (re-roll the example if the data changed)', () => {
    expect(saved.library).toBe(libraryFingerprint());
    expect(saved.designs.map((d: { ref: string }) => d.ref)).toEqual(fresh.designs.map((d) => d.ref));
    expect(saved.content.facts).toEqual(facts);
  });

  it('frozen briefs match what the library renders today', () => {
    fresh.designs.forEach((d, i) => {
      const slug = saved.designs[i].slug as string;
      const md = readFileSync(ex(`briefs/${slug}.md`), 'utf8');
      const expected = renderBrief(d, fresh.content, { number: i + 1 });
      expect(md).toBe(expected.endsWith('\n') ? expected : `${expected}\n`);
    });
  });

  it('has a preview per brief and a compare page', () => {
    for (const d of saved.designs as Array<{ slug: string }>) {
      expect(existsSync(ex(`previews/${d.slug}.html`)), d.slug).toBe(true);
    }
    expect(existsSync(ex('compare.html'))).toBe(true);
  });
});
