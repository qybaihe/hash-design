import { describe, expect, it } from 'vitest';
import { roll, rollJson } from '../src/brief.js';
import { buildComparePage, compareEntriesFromRoll } from '../src/compare.js';

describe('compare page', () => {
  const r = roll({ seed: 'compare', content: { subject: '第四巷 <面包>' } });

  it('lists one framed iframe per design with labels', () => {
    const entries = compareEntriesFromRoll(r);
    const html = buildComparePage({ title: r.content.subject, entries });
    expect(entries).toHaveLength(5);
    for (const e of entries) {
      expect(html).toContain(`src="${e.preview}"`);
      expect(html).toContain(e.branchZh);
      expect(e.preview).toMatch(/^previews\/0\d-[a-z0-9-]+\.html$/);
    }
    expect(html).toContain('第四巷 &lt;面包&gt;');
    expect(html).toContain('回复编号');
  });

  it('accepts roll.json shaped input with the same slugs', () => {
    const fromJson = compareEntriesFromRoll(JSON.parse(JSON.stringify(rollJson(r))), { previewDir: 'p' });
    const fromRoll = compareEntriesFromRoll(r, { previewDir: 'p' });
    expect(fromJson.map((e) => e.preview)).toEqual(fromRoll.map((e) => e.preview));
  });
});
