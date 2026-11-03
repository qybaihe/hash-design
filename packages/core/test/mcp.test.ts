import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { BANS, readSkill, roll } from '../src/index.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from '../src/mcp.js';

type TextContent = { type: 'text'; text: string };

let client: Client;

beforeAll(async () => {
  const server = createServer();
  const [a, b] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'test', version: '0.0.0' });
  await Promise.all([server.connect(a), client.connect(b)]);
});

afterAll(async () => {
  await client.close();
});

async function call(name: string, args: Record<string, unknown>) {
  const res = await client.callTool({ name, arguments: args });
  const content = res.content as TextContent[];
  return { res, text: content.map((c) => c.text).join('\n') };
}

const EXPECTED_TOOLS = ['roll_designs', 'get_brief', 'critique_page', 'build_compare_page'];

describe('hash-design MCP server', () => {
  it('exposes the documented tools, and the Skill documents exactly those tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([...EXPECTED_TOOLS].sort());
    const skill = readSkill();
    for (const n of names) expect(skill, `SKILL.md should mention ${n}`).toContain(`\`${n}\``);
    for (const t of tools) expect((t.description ?? '').length).toBeGreaterThan(40);
  });

  it('roll_designs returns 5 distinct briefs with refs and a trace', async () => {
    const { text, res } = await call('roll_designs', {
      subject: '第四巷面包店',
      facts: ['周一休息'],
      seed: 'mcp',
    });
    expect(res.isError).toBeFalsy();
    expect(text).toContain('Mapping trace');
    expect(text).toContain('周一休息');
    const machine = JSON.parse((res.content as TextContent[])[1]!.text);
    expect(machine.designs).toHaveLength(5);
    expect(new Set(machine.designs.map((d: { ref: string }) => d.ref)).size).toBe(5);
    expect(machine.algorithm ?? 'hash-design/v2').toBe('hash-design/v2');
    expect(text).not.toMatch(/\bbranch\b/i);
    expect(machine.source).toBe('seed:mcp');
  });

  it('roll_designs without a seed uses system randomness', async () => {
    const a = JSON.parse(
      (
        (await client.callTool({ name: 'roll_designs', arguments: { subject: 'x', detail: 'summary' } }))
          .content as TextContent[]
      )[1]!.text,
    );
    const b = JSON.parse(
      (
        (await client.callTool({ name: 'roll_designs', arguments: { subject: 'x', detail: 'summary' } }))
          .content as TextContent[]
      )[1]!.text,
    );
    expect(a.source).toBe('system-random');
    expect(a.designs[0].ref).not.toBe(b.designs[0].ref);
  });

  it('get_brief reproduces a design from roll_designs', async () => {
    const r = await client.callTool({
      name: 'roll_designs',
      arguments: { subject: 'x', seed: 'rep', light_only: true },
    });
    const machine = JSON.parse((r.content as TextContent[])[1]!.text);
    const first = machine.designs[0];
    const { text } = await call('get_brief', { ref: first.ref, light_only: true, format: 'json' });
    const brief = JSON.parse(text);
    expect(brief.ref).toBe(first.ref);
    expect(brief.palette.polarity).toBe('light');
    expect(brief.constraints.lightOnly).toBe(true);
  });

  it('get_brief reports bad refs as tool errors', async () => {
    const { res, text } = await call('get_brief', { ref: 'not-a-hash' });
    expect(res.isError).toBe(true);
    expect(text).toMatch(/Invalid design ref/);
  });

  it('roll_designs with out_dir freezes files and build_compare_page writes the light table', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hd-mcp-'));
    const { text } = await call('roll_designs', { subject: '面包', seed: 'disk', out_dir: dir });
    expect(text).toContain('briefs/01-');
    const roll = JSON.parse(await readFile(join(dir, 'roll.json'), 'utf8'));
    expect(roll.designs).toHaveLength(5);
    const cmp = await call('build_compare_page', { roll_path: join(dir, 'roll.json') });
    expect(cmp.text).toContain('Missing previews');
    expect(await readFile(join(dir, 'compare.html'), 'utf8')).toContain('<iframe');
  });

  it('roll_designs with a scenario freezes it into roll.json, briefs and get_brief', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hd-mcp-scn-'));
    const r = await client.callTool({
      name: 'roll_designs',
      arguments: { subject: 'Quarterly review', seed: 'scn', scenario: 'deck', out_dir: dir },
    });
    expect(r.isError).toBeFalsy();
    const machine = JSON.parse((r.content as TextContent[])[1]!.text);
    expect(machine.constraints.scenario).toBe('deck');
    expect(machine.designs[0].format).toMatch(/^(full-bleed|index-rail|document)$/);
    const roll = JSON.parse(await readFile(join(dir, 'roll.json'), 'utf8'));
    expect(roll.constraints.scenario).toBe('deck');
    const first = roll.designs[0];
    const saved = await readFile(join(dir, 'briefs', `01-${first.short}.md`), 'utf8');
    expect(saved).toContain('## 场景 Scenario');
    expect(saved).toContain('1920×1080');
    const { text } = await call('get_brief', {
      ref: first.ref,
      subject: 'Quarterly review',
      scenario: 'deck',
      format: 'json',
    });
    const brief = JSON.parse(text);
    expect(brief.scenario.id).toBe('deck');
    expect(brief.scenario.format.id).toBe(machine.designs[0].format);
    // Same ref without the scenario: same palette and type, no scenario section.
    const web = JSON.parse((await call('get_brief', { ref: first.ref, format: 'json' })).text);
    expect(web.palette).toEqual(brief.palette);
    expect(web.type).toEqual(brief.type);
    expect(web.scenario).toBeUndefined();
    // critique_page applies the scenario's output checks.
    const crit = JSON.parse(
      (
        await call('critique_page', {
          html: '<html><body><p>one slide</p></body></html>',
          roll_path: join(dir, 'roll.json'),
          pick: 1,
          format: 'json',
        })
      ).text,
    );
    expect(crit.findings.map((f: { rule: string }) => f.rule)).toContain('scenario-deck');
  });

  it('roll_designs rejects unknown scenarios', async () => {
    const { res } = await call('roll_designs', { subject: 'x', seed: 's', scenario: 'billboard' });
    expect(res.isError).toBe(true);
  });

  it('roll_designs takes N from count (1–12, whatever the constraints) and returns the reply to send the user', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hd-mcp-n-'));
    const r = await client.callTool({
      name: 'roll_designs',
      arguments: { subject: 'Bakery', facts: ['Closed Mondays'], seed: 'n', count: 3, out_dir: dir },
    });
    const [md, json] = (r.content as TextContent[]).map((c) => c.text);
    const machine = JSON.parse(json!);
    expect(machine.designs).toHaveLength(3);
    const reply: string = machine.reply;
    expect(reply.split('\n')).toHaveLength(3 + 4);
    expect(md).toContain('Send the user exactly this reply');
    expect(md).toContain(reply);
    const dark = JSON.parse(
      (
        (
          await client.callTool({
            name: 'roll_designs',
            arguments: { subject: 'x', seed: 'n', count: 12, dark_only: true },
          })
        ).content as TextContent[]
      )[1]!.text,
    );
    expect(dark.designs).toHaveLength(12);
    for (const count of [0, 13]) {
      const bad = await call('roll_designs', { subject: 'x', seed: 'n', count });
      expect(bad.res.isError).toBe(true);
    }
    // build_compare_page: the second reply only once every preview exists.
    const missing = await call('build_compare_page', { roll_path: join(dir, 'roll.json') });
    expect(missing.text).not.toContain('Send the user');
    const roll = JSON.parse(await readFile(join(dir, 'roll.json'), 'utf8'));
    await mkdir(join(dir, 'previews'), { recursive: true });
    for (const d of roll.designs) await writeFile(join(dir, 'previews', `${d.slug}.html`), '<html></html>');
    const done = await call('build_compare_page', { roll_path: join(dir, 'roll.json') });
    expect(done.text).toMatch(/3 previews side by side: .*compare\.html/);
    expect(done.text).toContain('Reply with a number to build that direction as the final page.');
  });

  it('has no branch tools or branch constraint fields (hash-design/v2)', async () => {
    const { tools } = await client.listTools();
    const roll = tools.find((t) => t.name === 'roll_designs')!;
    const props = Object.keys((roll.inputSchema as { properties: object }).properties);
    for (const gone of ['families', 'include_branches', 'exclude_branches'])
      expect(props).not.toContain(gone);
    const bad = await call('get_brief', { ref: `${'a'.repeat(64)}+1` });
    expect(bad.res.isError).toBe(true);
    expect(bad.text).toMatch(/v1/);
  });

  it('critique_page flags an AI-template page', async () => {
    const html = `<html><style>body{font-family:Inter}.h{text-align:center;background:linear-gradient(#8b5cf6,#3b82f6)}</style>
      <section class="h"><h1>Unlock seamless growth</h1><a class="btn">Start</a><a class="btn">Demo</a></section></html>`;
    const { text } = await call('critique_page', { html, format: 'json' });
    const r = JSON.parse(text);
    const rules = r.findings.map((f: { rule: string }) => f.rule);
    expect(rules).toEqual(
      expect.arrayContaining([
        'generic-sans',
        'purple-blue-gradient',
        'centered-hero-two-buttons',
        'buzzword-copy',
      ]),
    );
    expect(r.score).toBeLessThan(50);
  });

  it('serves resources and the workflow prompt', async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toEqual(expect.arrayContaining(['hash-design://bans', 'hash-design://workflow']));
    expect(uris.some((u) => u.includes('branch'))).toBe(false);
    const bans = await client.readResource({ uri: 'hash-design://bans' });
    const bansText = (bans.contents[0] as { text: string }).text;
    for (const b of BANS) expect(bansText).toContain(b.id);
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toContain('hash-design');
    const p = await client.getPrompt({ name: 'hash-design', arguments: { subject: '面包店' } });
    expect(JSON.stringify(p.messages)).toContain('roll_designs');
    expect(JSON.stringify(p.messages)).toContain('count=5');
    const p3 = await client.getPrompt({
      name: 'hash-design',
      arguments: { subject: 'Deck', count: '3', scenario: 'deck' },
    });
    const text3 = JSON.stringify(p3.messages);
    expect(text3).toContain('count=3');
    expect(text3).toContain('scenario=\\"deck\\"');
    expect(text3).toMatch(/Send me the reply it returns, nothing more, and STOP/);
  });

  it('rolls exactly what the library (and so the CLI) rolls for the same seed', async () => {
    const res = await client.callTool({
      name: 'roll_designs',
      arguments: {
        subject: '第四巷面包店',
        facts: ['周一休息'],
        seed: 'parity',
        count: 4,
        detail: 'summary',
      },
    });
    const machine = JSON.parse((res.content as TextContent[])[1]!.text);
    const lib = roll({ seed: 'parity', count: 4, content: { subject: '第四巷面包店', facts: ['周一休息'] } });
    expect(machine.designs.map((d: { ref: string }) => d.ref)).toEqual(lib.designs.map((d) => d.ref));
    expect(machine.library).toBe(lib.library);
  });
});
