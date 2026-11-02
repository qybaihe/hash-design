import { describe, expect, it } from 'vitest';
import {
  SCENARIO_IDS,
  renderReply,
  roll,
  rollJson,
  type Constraints,
  type ScenarioId,
} from '../src/index.js';

const LINE_EN =
  /^(\d+)\. \*\*[^*]+\*\* \/ .+ — (light|dark) paper, hue \d+° · \d+-column grid · anchor: [a-z-]+( · .+)? · `[0-9a-f]{8}`$/;
const LINE_ZH =
  /^(\d+)\. \*\*[^*]+\*\* \/ .+ — (浅色|深色)纸，色相 \d+° · \d+ 栏网格 · 首屏锚点 [a-z-]+( · .+)? · `[0-9a-f]{8}`$/;

/** Three dry runs: different N, languages and scenarios. */
const RUNS: { name: string; count: number; subject: string; facts: string[]; scenario?: ScenarioId }[] = [
  { name: 'web, en, N=3', count: 3, subject: 'Fourth Lane Bakery', facts: ['Closed Mondays'] },
  { name: 'deck, zh, N=7', count: 7, subject: '季度复盘', facts: ['营收 1200 万'], scenario: 'deck' },
  { name: 'email, en, N=1', count: 1, subject: 'Sluice release notes', facts: ['v2.1'], scenario: 'email' },
];

function rollFor(run: (typeof RUNS)[number]) {
  const constraints: Constraints = run.scenario ? { scenario: run.scenario } : {};
  return roll({
    seed: `reply-${run.name}`,
    count: run.count,
    constraints,
    content: { subject: run.subject, facts: run.facts },
  });
}

describe('reply protocol', () => {
  for (const run of RUNS) {
    it(`after a roll: header, one line per direction, one question (${run.name})`, () => {
      const r = rollFor(run);
      const reply = renderReply(r);
      const lines = reply.split('\n');
      expect(lines).toHaveLength(run.count + 4);
      expect(lines[1]).toBe('');
      expect(lines.at(-2)).toBe('');
      const zh = r.content.language === 'zh';
      expect(lines[0]).toContain(zh ? `掷出 ${run.count} 个方向` : `${run.count} direction`);
      expect(lines[0]).toContain(run.subject);
      const items = lines.slice(2, 2 + run.count);
      items.forEach((l, i) => {
        expect(l, l).toMatch(zh ? LINE_ZH : LINE_EN);
        expect(l.startsWith(`${i + 1}. `)).toBe(true);
        const d = r.designs[i]!;
        expect(l).toContain(`**${d.type.display.family}** / ${d.type.body.family}`);
        expect(l).toContain(`${Math.round(d.palette.hue)}°`);
        expect(l).toContain(d.anchor.subject.id);
        expect(l).toContain(d.short);
        if (d.scenario) expect(l).toContain(d.scenario.format.name[zh ? 'zh' : 'en']);
        expect(l.length).toBeLessThan(200);
      });
      // Nothing from the brief internals: no hex colours, no tokens, no trace.
      expect(reply).not.toMatch(/#[0-9a-f]{6}|tokens\.css|mapping trace|映射/i);
      const ask = lines.at(-1)!;
      if (zh) expect(ask).toMatch(/回复编号.*「预览」.*「重掷」/);
      else expect(ask).toMatch(/^Reply with a number .* \*\*render\*\* .* \*\*reroll\*\*/);
      // The same reply from roll.json (what build_compare_page and the CLI read back).
      expect(renderReply(rollJson(r))).toBe(reply);
    });
  }

  it('after the compare page: the path, the same list, and only the number question', () => {
    const r = rollFor(RUNS[0]!);
    const reply = renderReply(rollJson(r), {
      stage: 'compared',
      comparePath: 'design/hash-design/compare.html',
    });
    const lines = reply.split('\n');
    expect(lines[0]).toBe('**hash-design** · 3 previews side by side: design/hash-design/compare.html');
    expect(lines.slice(2, 5)).toEqual(renderReply(r).split('\n').slice(2, 5));
    expect(lines.at(-1)).toBe('Reply with a number to build that direction as the final page.');
  });

  it('names the artifact of every scenario in the question', () => {
    const nouns: Record<ScenarioId, [string, string]> = {
      web: ['final page', '正式页面'],
      deck: ['final deck', '正式幻灯片'],
      app: ['final app screens', '正式 App 界面'],
      dashboard: ['final dashboard', '正式看板'],
      poster: ['final poster', '正式海报'],
      email: ['final email', '正式邮件'],
    };
    for (const id of SCENARIO_IDS) {
      const en = roll({
        seed: id,
        count: 2,
        constraints: { scenario: id },
        content: { subject: 'x', language: 'en' },
      });
      const zh = roll({
        seed: id,
        count: 2,
        constraints: { scenario: id },
        content: { subject: '某', language: 'zh' },
      });
      expect(renderReply(en).split('\n').at(-1)).toContain(nouns[id][0]);
      expect(renderReply(zh).split('\n').at(-1)).toContain(nouns[id][1]);
    }
  });

  it('dark paper and brand colours still give one plain line per direction', () => {
    const r = roll({
      seed: 'reply-dark',
      count: 4,
      constraints: { darkOnly: true, brandColors: ['#c8102e'] },
      content: { subject: 'Night market', language: 'en' },
    });
    for (const l of renderReply(r).split('\n').slice(2, 6)) expect(l).toMatch(/— dark paper, hue \d+°/);
  });
});
