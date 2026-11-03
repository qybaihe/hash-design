import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COMMAND_HELP, COMMAND_OPTIONS, main, parseFactsText } from '../src/cli.js';

let out = '';
beforeEach(() => {
  out = '';
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    out += String(chunk);
    return true;
  });
  process.exitCode = undefined;
});
afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

describe('cli', () => {
  it('prints help and version', async () => {
    await main(['--help']);
    expect(out).toContain('hash-design roll');
    out = '';
    await main(['--version']);
    expect(out.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('roll --seed is reproducible', async () => {
    await main(['roll', '--subject', '面包店', '--seed', 'cli', '--format', 'summary']);
    const first = out;
    out = '';
    await main(['roll', '--subject', '面包店', '--seed', 'cli', '--format', 'summary']);
    expect(out).toBe(first);
    expect(out).toContain('seed:cli');
  });

  it('roll --format json is parseable and honours constraints', async () => {
    await main(['roll', '--seed', 'j', '--count', '3', '--light-only', '--format', 'json']);
    const j = JSON.parse(out);
    expect(j.designs).toHaveLength(3);
    expect(j.constraints.lightOnly).toBe(true);
  });

  it('roll --scenario adds the scenario; brief and critique reproduce it from roll.json', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hd-cli-scenario-'));
    await main([
      'roll',
      '--subject',
      'Causeway',
      '--fact',
      'A festival',
      '--seed',
      's',
      '--scenario',
      'deck',
      '--out',
      dir,
    ]);
    const roll = JSON.parse(await readFile(join(dir, 'roll.json'), 'utf8'));
    expect(roll.constraints.scenario).toBe('deck');
    expect(roll.designs[0].scenario.format.width).toBe(1920);
    const saved = await readFile(join(dir, 'briefs', `${roll.designs[0].slug}.md`), 'utf8');
    expect(saved).toContain('## 场景 Scenario — 幻灯片 / Slide deck');
    out = '';
    await main([
      'brief',
      roll.designs[0].ref,
      '--scenario',
      'deck',
      '--subject',
      'Causeway',
      '--fact',
      'A festival',
    ]);
    expect(out.split('\n').slice(1).join('\n')).toBe(saved.split('\n').slice(1).join('\n'));
    const page = join(dir, 'page.html');
    await writeFile(page, '<!doctype html><html lang="en"><body><h1>Not a deck</h1></body></html>');
    out = '';
    await main(['critique', page, '--roll', join(dir, 'roll.json'), '--pick', '1']);
    expect(out).toContain('scenario-deck');
    out = '';
    await main(['compare', '--roll', join(dir, 'roll.json')]);
    expect(await readFile(join(dir, 'compare.html'), 'utf8')).toContain('data-w="1920"');
  });

  it('roll --scenario web is the same as no scenario; unknown scenarios fail', async () => {
    await main(['roll', '--seed', 'w', '--format', 'json']);
    const plain = JSON.parse(out);
    out = '';
    await main(['roll', '--seed', 'w', '--scenario', 'web', '--format', 'json']);
    const web = JSON.parse(out);
    expect(web.designs).toEqual(plain.designs);
    expect(web.constraints).toEqual(plain.constraints);
    await expect(main(['roll', '--scenario', 'billboard'])).rejects.toThrow(/Unknown scenario "billboard"/);
  });

  it('roll --out writes files and compare builds the light table', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hd-cli-'));
    const facts = join(dir, 'facts.md');
    await writeFile(facts, '# facts\n- 周一休息\n- 乡村面包 ¥38\n\n2. 地址：第四巷 17 号\n');
    await main(['roll', '--subject', '第四巷面包店', '--facts-file', facts, '--seed', 'o', '--out', dir]);
    const roll = JSON.parse(await readFile(join(dir, 'roll.json'), 'utf8'));
    expect(roll.content.facts).toEqual(['周一休息', '乡村面包 ¥38', '地址：第四巷 17 号']);
    out = '';
    await main(['compare', '--roll', join(dir, 'roll.json')]);
    expect(out).toContain('missing previews');
    const html = await readFile(join(dir, 'compare.html'), 'utf8');
    expect(html).toContain('previews/01-');
  });

  it('brief reproduces a ref', async () => {
    await main(['roll', '--seed', 'b', '--count', '1', '--format', 'json']);
    const ref = JSON.parse(out).designs[0].ref as string;
    out = '';
    await main(['brief', ref]);
    expect(out).toContain(ref);
  });

  it('has no branch commands or branch constraint flags any more (hash-design/v2)', async () => {
    await expect(main(['branches'])).rejects.toThrow(/Unknown command/);
    await expect(main(['branch', 'ink-and-seal'])).rejects.toThrow(/Unknown command/);
    await expect(main(['roll', '--family', 'print'])).rejects.toThrow(/Unknown option/);
    await expect(main(['brief', `${'a'.repeat(64)}+1`])).rejects.toThrow(/v1/);
  });

  it('critique sets a failing exit code under --fail-under', async () => {
    const slop = new URL('./fixtures/slop.html', import.meta.url).pathname;
    await main(['critique', slop, '--fail-under', '80']);
    expect(out).toContain('generic-sans');
    expect(process.exitCode).toBe(1);
  });

  it('skill install defaults to .claude (Claude Code) and .agents (Codex, Cursor, Copilot, Windsurf)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hd-skill-'));
    await main(['skill', 'install', '--dir', dir]);
    const a = await readFile(join(dir, '.claude/skills/hash-design/SKILL.md'), 'utf8');
    const b = await readFile(join(dir, '.agents/skills/hash-design/SKILL.md'), 'utf8');
    expect(a).toBe(b);
    expect(a).toMatch(/^---\nname: hash-design\n/);
    expect(existsSync(join(dir, '.cursor/skills/hash-design/SKILL.md'))).toBe(false);
    // Run from a checkout here, so the hints use this bin.js; through npx they read `npx -y hash-design`.
    expect(out).toMatch(/^CLI: +node .+bin\.js <command>$/m);
    expect(out).toMatch(/^MCP server: node .+bin\.js mcp$/m);
  });

  it('skill install --target lists, aliases and --to for any other skills folder', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hd-skill-t-'));
    await main(['skill', 'install', '--dir', dir, '--target', 'all']);
    for (const f of ['.claude', '.cursor', '.agents'])
      expect(existsSync(join(dir, f, 'skills/hash-design/SKILL.md')), f).toBe(true);
    const other = await mkdtemp(join(tmpdir(), 'hd-skill-to-'));
    await main(['skill', 'install', '--to', join(other, 'skills')]);
    expect(existsSync(join(other, 'skills/hash-design/SKILL.md'))).toBe(true);
    expect(existsSync(join(other, '.claude'))).toBe(false);
    await expect(main(['skill', 'install', '--dir', dir, '--target', 'windsurf'])).rejects.toThrow(
      /Unknown --target "windsurf"/,
    );
  });

  it('roll --count sets N within 1–12, under any constraint, and rejects anything else', async () => {
    for (const n of ['1', '7', '12']) {
      out = '';
      await main(['roll', '--seed', 'n', '--count', n, '--format', 'json']);
      expect(JSON.parse(out).designs).toHaveLength(Number(n));
    }
    out = '';
    await main([
      'roll',
      '--seed',
      'n',
      '--count',
      '12',
      '--dark-only',
      '--scenario',
      'poster',
      '--format',
      'json',
    ]);
    expect(JSON.parse(out).designs).toHaveLength(12);
    for (const bad of ['0', '13', '2.5', 'five'])
      await expect(main(['roll', '--seed', 'n', '--count', bad])).rejects.toThrow(
        /--count must be a whole number from 1 to 12/,
      );
  });

  it('roll --format reply prints the reply protocol, also after --out; compare prints the second one', async () => {
    await main([
      'roll',
      '--subject',
      'Bakery',
      '--fact',
      'Closed Mondays',
      '--seed',
      'r',
      '-n',
      '3',
      '-f',
      'reply',
    ]);
    const lines = out.trimEnd().split('\n');
    expect(lines).toHaveLength(3 + 4);
    expect(lines[0]).toContain('3 directions for “Bakery”');
    expect(lines.slice(2, 5).every((l, i) => l.startsWith(`${i + 1}. **`))).toBe(true);
    expect(lines.at(-1)).toMatch(/^Reply with a number .* \*\*render\*\* .* \*\*reroll\*\*/);
    const dir = await mkdtemp(join(tmpdir(), 'hd-cli-reply-'));
    out = '';
    await main(['roll', '--subject', 'Bakery', '--seed', 'r', '-n', '3', '--out', dir, '-f', 'reply']);
    expect(out).toContain('Wrote 5 files');
    expect(out).toContain('1. **');
    await expect(main(['roll', '--seed', 'r', '--out', dir, '-f', 'json'])).rejects.toThrow(
      /With --out, --format must be summary or reply/,
    );
    const roll = JSON.parse(await readFile(join(dir, 'roll.json'), 'utf8'));
    await mkdir(join(dir, 'previews'), { recursive: true });
    for (const d of roll.designs) await writeFile(join(dir, 'previews', `${d.slug}.html`), '<html></html>');
    out = '';
    await main(['compare', '--roll', join(dir, 'roll.json')]);
    expect(out).toMatch(/3 previews side by side: .*compare\.html/);
    expect(out).toContain('Reply with a number to build that direction as the final page.');
  });

  it('mcp is a command: listed in the help, with its own help and the npx registration line', async () => {
    await main(['--help']);
    expect(out).toMatch(/^ {2}hash-design mcp {7}Run the MCP server on stdio/m);
    out = '';
    await main(['mcp', '--help']);
    expect(out).toBe(`${COMMAND_HELP.get('mcp')}`);
    expect(out).toContain('claude mcp add hash-design -- npx -y hash-design mcp');
    await expect(main(['mcp', '--port', '3000'])).rejects.toThrow(/Unknown option '--port'/);
  });

  it('rejects unknown commands', async () => {
    await expect(main(['frobnicate'])).rejects.toThrow(/Unknown command/);
  });

  const commands = ['roll', 'brief', 'critique', 'compare', 'skill', 'mcp'];

  it.each(commands)('%s --help and -h print the command help without running it', async (cmd) => {
    await main([cmd, '--help']);
    expect(out).toMatch(new RegExp(`^hash-design ${cmd} — `));
    expect(out).toContain('Usage');
    expect(out).not.toContain('# hash-design roll —'); // roll --help must not roll
    const help = out;
    out = '';
    await main([cmd, '-h']);
    expect(out).toBe(help);
    out = '';
    await main(['help', cmd]);
    expect(out).toBe(help);
  });

  it('honours --help anywhere before "--", including after other arguments', async () => {
    await main(['roll', '--seed', 'x', '--help']);
    expect(out).toBe(`${COMMAND_HELP.get('roll')}`);
    out = '';
    await main(['skill', 'install', '--help']);
    expect(out).toBe(`${COMMAND_HELP.get('skill')}`);
    await expect(main(['brief', '--', '--help'])).rejects.toThrow(/Invalid design ref "--help"/);
  });

  it('documents every option each command accepts', () => {
    expect([...COMMAND_OPTIONS.keys()].sort()).toEqual([...commands].sort());
    for (const [cmd, options] of COMMAND_OPTIONS) {
      const help = COMMAND_HELP.get(cmd) ?? '';
      for (const [name, spec] of Object.entries(options)) {
        const flag = spec.short ? `-${spec.short}, --${name}` : `--${name}`;
        expect(help, `${cmd} help should document ${flag}`).toMatch(
          new RegExp(`^ {2}${flag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'm'),
        );
      }
    }
  });

  it('points at the command help on argument errors', async () => {
    await expect(main(['roll', '--bogus'])).rejects.toThrow(
      /Unknown option '--bogus'\nRun "hash-design roll --help"/,
    );
    await expect(main(['help', 'nope'])).rejects.toThrow(/Unknown command "nope"/);
    out = '';
    await main(['help']);
    expect(out).toContain('hash-design <command> --help');
  });

  it('parses facts files leniently', () => {
    expect(parseFactsText('# t\n- a\n* b\n1. c\n\n d \n')).toEqual(['a', 'b', 'c', 'd']);
  });
});
