import { describe, expect, it } from 'vitest';
import { roll, rollJson } from '../src/brief.js';
import { buildComparePage, compareEntriesFromRoll, compareSubtitle } from '../src/compare.js';

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

  it('defaults to Chinese chrome and the Chinese subtitle', () => {
    const html = buildComparePage({
      title: 't',
      subtitle: compareSubtitle(r),
      entries: compareEntriesFromRoll(r),
    });
    expect(html).toContain('<html lang="zh-CN">');
    expect(compareSubtitle(r)).toMatch(/^5 个方向 · seed:compare · hash-design\/v1 · library [0-9a-f]{12}$/);
  });

  it('uses English chrome, voice and twist names for an English roll', () => {
    const en = roll({ seed: 'compare', content: { subject: 'Sluice', facts: ['A self-hosted inbox'] } });
    expect(en.content.language).toBe('en');
    const entries = compareEntriesFromRoll(en);
    const html = buildComparePage({
      title: en.content.subject,
      subtitle: compareSubtitle(en),
      entries,
      language: en.content.language,
    });
    expect(html).toContain('<html lang="en">');
    expect(compareSubtitle(en)).toMatch(/^5 directions · seed:compare/);
    expect(html).toContain('reply with a number (1–5)');
    for (const label of [
      'Layout',
      'Type',
      'Colour',
      'Density',
      'Voice',
      'Twist',
      'Open page ↗',
      'Zoom · 1',
    ]) {
      expect(html).toContain(label);
    }
    en.designs.forEach((d, i) => {
      expect(entries[i]!.voice).toBe(d.voice.name.en);
      expect(entries[i]!.twist).toBe(d.twist.name.en);
      expect(html).toContain(`<strong>${d.branch.name.en}</strong>`);
    });
    expect(html).not.toMatch(/回复编号|版式|放大看|打开整页|个方向/);
  });

  it('labels scenario rolls and shows fixed canvases at their own size', () => {
    const deck = roll({
      seed: 'compare',
      content: { subject: 'Causeway', facts: ['A festival'] },
      constraints: { scenario: 'deck' },
    });
    const entries = compareEntriesFromRoll(deck);
    const html = buildComparePage({ title: 't', subtitle: compareSubtitle(deck), entries, language: 'en' });
    expect(compareSubtitle(deck)).toMatch(/ · Slide deck$/);
    expect(entries[0]!.scenario).toMatchObject({ width: 1920, height: 1080, fixed: true });
    expect(html).toContain('<dt>Scenario</dt><dd>Slide deck · ');
    expect(html.match(/data-w="1920" data-h="1080"/g)).toHaveLength(5);
    expect(html).toContain('>Canvas</button>');
    expect(html).toContain('screen.dataset.w');

    const app = roll({ seed: 'compare', content: { subject: '第四巷' }, constraints: { scenario: 'app' } });
    const appHtml = buildComparePage({ title: 't', entries: compareEntriesFromRoll(app) });
    expect(appHtml).toContain('<dt>场景</dt><dd>手机 App 界面 · ');
    expect(appHtml).not.toContain('data-w=');
    expect(appHtml).toContain('>桌面 1440</button>');
    const fromJson = compareEntriesFromRoll(JSON.parse(JSON.stringify(rollJson(deck))));
    expect(fromJson.map((e) => e.scenario)).toEqual(entries.map((e) => e.scenario));
  });

  it('keeps web compare pages free of scenario markup', () => {
    const html = buildComparePage({ title: 't', entries: compareEntriesFromRoll(r) });
    expect(html).not.toMatch(/<dt>场景<\/dt>|data-w=|screen\.dataset\.w|>画布</);
  });

  it('accepts roll.json shaped input with the same slugs', () => {
    const fromJson = compareEntriesFromRoll(JSON.parse(JSON.stringify(rollJson(r))), { previewDir: 'p' });
    const fromRoll = compareEntriesFromRoll(r, { previewDir: 'p' });
    expect(fromJson.map((e) => e.preview)).toEqual(fromRoll.map((e) => e.preview));
  });
});
