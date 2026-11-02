/**
 * The hash-design MCP server (stdio). Run it with `hash-design mcp`; packages/mcp (private) re-exports it.
 * Imported lazily by the CLI so the other commands never load the MCP SDK.
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  BANS,
  type Constraints,
  type RollJson,
  SCENARIO_IDS,
  type ScenarioId,
  briefJson,
  buildComparePage,
  compareEntriesFromRoll,
  compareSubtitle,
  critiquePage,
  directionLabel,
  parseRef,
  readSkill,
  renderBrief,
  renderCritique,
  renderRoll,
  renderRollSummary,
  reproduce,
  roll,
  writeRoll,
} from './index.js';
import { z } from 'zod';

const here = dirname(fileURLToPath(import.meta.url));
export const SERVER_VERSION = (
  JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')) as { version: string }
).version;

/** Constraint fields shared by roll_designs / get_brief / critique_page. Flat on purpose: easier for models. */
const constraintShape = {
  light_only: z.boolean().optional().describe('Only light paper.'),
  dark_only: z.boolean().optional().describe('Only dark paper.'),
  reduced_motion: z.boolean().optional().describe('No motion at all.'),
  brand_colors: z
    .array(z.string().regex(/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/))
    .max(2)
    .optional()
    .describe('Brand colours that must be kept: [accent] or [accent, accent2], hex.'),
  scenario: z
    .enum(SCENARIO_IDS as [ScenarioId, ...ScenarioId[]])
    .optional()
    .describe(
      'What is being designed: web (default), deck (16:9 slides), app (phone screens), dashboard, poster (poster / social card), email (HTML email). Non-web scenarios add a format (byte 13), a canvas and output rules to each brief. Part of the design identity: pass it again to reproduce.',
    ),
};

type ConstraintArgs = {
  light_only?: boolean | undefined;
  dark_only?: boolean | undefined;
  reduced_motion?: boolean | undefined;
  brand_colors?: string[] | undefined;
  scenario?: ScenarioId | undefined;
};

function toConstraints(a: ConstraintArgs): Constraints {
  return {
    lightOnly: Boolean(a.light_only),
    darkOnly: Boolean(a.dark_only),
    reducedMotion: Boolean(a.reduced_motion),
    brandColors: a.brand_colors ?? [],
    ...(a.scenario ? { scenario: a.scenario } : {}),
  };
}

const text = (t: string) => ({ type: 'text' as const, text: t });

function fail(err: unknown) {
  return { isError: true, content: [text(`Error: ${err instanceof Error ? err.message : String(err)}`)] };
}

export function bansMarkdown(): string {
  const lines = ['# hash-design global bans', ''];
  for (const b of BANS)
    lines.push(`- **${b.title.zh} / ${b.title.en}** (\`${b.id}\`, ${b.severity}) — ${b.detail}`);
  return lines.join('\n');
}

export const SERVER_INSTRUCTIONS = `hash-design breaks the default "AI page" aesthetic with external randomness.
Workflow: roll_designs (N true-random hashes; each hash is one direction → one frozen brief) → render ONE independent HTML preview per brief,
following it literally → build_compare_page → STOP and let the user pick a number → build the final page from the
picked brief only → critique_page with brief_ref to self-check. Never choose a style yourself; never "improve" a brief
toward your own taste; never invent facts. Load the hash-design Skill (or the hash-design://workflow resource) for the
full procedure.`;

export function createServer(): McpServer {
  const server = new McpServer(
    { name: 'hash-design', version: SERVER_VERSION },
    { instructions: SERVER_INSTRUCTIONS },
  );

  server.registerTool(
    'roll_designs',
    {
      title: 'Roll design directions',
      description:
        'Roll N true-random SHA-256 hashes (crypto.randomBytes); each hash IS one design direction: its bytes are mapped by fixed rules straight onto continuous parameters (OKLCH palette, display and body faces from a flat font pool, type scale, density, grid, anchor, motif, surface, motion, voice, twist). No genre library, no names. Returns the hashes, the mapping trace and one frozen Markdown brief per direction. Use `seed` only to reproduce examples. Pass `scenario` for a slide deck, app screens, a dashboard, a poster / social card or an HTML email (default: web page). Pass `out_dir` to freeze the briefs on disk (roll.json, ROLL.md, briefs/NN-<short>.md) — recommended, then render each preview from its own brief file.',
      inputSchema: {
        subject: z.string().describe('What the page is for, e.g. "第四巷面包店 一页站".'),
        facts: z
          .array(z.string())
          .optional()
          .describe(
            'The only facts the page may state (hours, prices, address…). Nothing else may be invented.',
          ),
        count: z.number().int().min(1).max(12).optional().describe('How many directions (default 5).'),
        seed: z.string().optional().describe('Reproducible roll for examples/tests. Omit for real use.'),
        language: z
          .enum(['zh', 'en'])
          .optional()
          .describe('Page language (default: auto-detect from subject/facts).'),
        out_dir: z
          .string()
          .optional()
          .describe('Directory (relative to the server cwd) to write roll.json, ROLL.md and briefs/*.md.'),
        detail: z
          .enum(['full', 'summary'])
          .optional()
          .describe(
            'full = every brief inline; summary = table + refs (default: summary when out_dir is set).',
          ),
        ...constraintShape,
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        const r = roll({
          count: args.count ?? 5,
          ...(args.seed !== undefined ? { seed: args.seed } : {}),
          constraints: toConstraints(args),
          content: {
            subject: args.subject,
            facts: args.facts ?? [],
            ...(args.language ? { language: args.language } : {}),
          },
        });
        const detail = args.detail ?? (args.out_dir ? 'summary' : 'full');
        const parts: string[] = [];
        if (args.out_dir) {
          const written = await writeRoll(r, args.out_dir);
          parts.push(renderRollSummary(r));
          parts.push(
            `Frozen to \`${relative(process.cwd(), written.dir) || '.'}\`:\n${written.files.map((f) => `- ${f}`).join('\n')}`,
          );
          if (detail === 'full') parts.push(renderRoll(r));
        } else {
          parts.push(detail === 'full' ? renderRoll(r) : renderRollSummary(r));
        }
        parts.push(
          'Next: render one self-contained HTML preview per brief (only that brief in view, follow it literally), save as previews/NN-<short>.html, then call build_compare_page and stop for the user to choose.',
        );
        const machine = {
          source: r.source,
          library: r.library,
          constraints: r.constraints,
          designs: r.designs.map((d, i) => ({
            number: i + 1,
            ref: d.ref,
            label: directionLabel(d),
            ...(d.scenario ? { format: d.scenario.format.id } : {}),
          })),
        };
        return { content: [text(parts.join('\n\n')), text(JSON.stringify(machine))] };
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'get_brief',
    {
      title: 'Reproduce a brief',
      description:
        'Rebuild the brief for a design ref (the 64-hex hash) with the same constraints that were used for the roll. Deterministic: the same ref + constraints + library always gives the same brief.',
      inputSchema: {
        ref: z.string().describe('Design ref from roll_designs, e.g. "3fa9…c1" or "3fa9…c1+1".'),
        subject: z.string().optional(),
        facts: z.array(z.string()).optional(),
        language: z.enum(['zh', 'en']).optional(),
        format: z.enum(['markdown', 'json']).optional(),
        ...constraintShape,
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (args) => {
      try {
        const design = reproduce(parseRef(args.ref), toConstraints(args));
        const content = {
          subject: args.subject ?? '',
          facts: args.facts ?? [],
          ...(args.language ? { language: args.language } : {}),
        };
        const body =
          args.format === 'json'
            ? JSON.stringify(briefJson(design, content), null, 2)
            : renderBrief(design, content);
        return { content: [text(body)] };
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'critique_page',
    {
      title: 'Critique a page for AI-template tells',
      description:
        'Static critique of an HTML page (inline <style>, style attributes and optional extra CSS) against the global bans: banned fonts, purple-blue gradients, centered hero + two buttons, identical cards, glassmorphism, emoji icons, buzzwords, soft shadows, invented social proof, framework palettes, scroll fades, pill badges, placeholders, template sections, contrast. With brief_ref (or roll_path + pick) it also scores adherence to the brief (fonts, palette, radius/shadow policy). Provide either html or path.',
      inputSchema: {
        html: z.string().optional().describe('Full HTML source.'),
        path: z.string().optional().describe('Path to an HTML file (relative to the server cwd).'),
        css: z.string().optional().describe('Extra CSS not inlined in the HTML.'),
        brief_ref: z.string().optional().describe('Design ref to check adherence against.'),
        roll_path: z
          .string()
          .optional()
          .describe('roll.json written by roll_designs (alternative to brief_ref).'),
        pick: z.number().int().min(1).optional().describe('Design number inside roll_path.'),
        facts: z
          .array(z.string())
          .optional()
          .describe('Facts; numbers on the page not in the facts are flagged.'),
        format: z.enum(['markdown', 'json']).optional(),
        ...constraintShape,
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (args) => {
      try {
        const html = args.html ?? (args.path ? await readFile(resolve(args.path), 'utf8') : undefined);
        if (!html) throw new Error('Provide html or path.');
        let design;
        let facts = args.facts;
        if (args.roll_path) {
          const r = JSON.parse(await readFile(resolve(args.roll_path), 'utf8')) as RollJson;
          const entry = r.designs.find((d) => d.number === args.pick);
          if (!entry) throw new Error(`pick must be one of ${r.designs.map((d) => d.number).join(', ')}`);
          design = reproduce(parseRef(entry.ref), r.constraints);
          facts ??= r.content.facts;
        } else if (args.brief_ref) {
          design = reproduce(parseRef(args.brief_ref), toConstraints(args));
        }
        const result = critiquePage({
          html,
          ...(args.css ? { css: args.css } : {}),
          ...(design ? { design } : {}),
          ...(facts?.length ? { facts } : {}),
        });
        return {
          content: [text(args.format === 'json' ? JSON.stringify(result, null, 2) : renderCritique(result))],
        };
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'build_compare_page',
    {
      title: 'Build the side-by-side compare page',
      description:
        'Write compare.html next to roll.json: every preview in a scaled iframe side by side, with palette/type/grid labels, desktop/mobile toggle and focus mode (keys 1–9). Expects previews at <previews_dir>/NN-<short>.html.',
      inputSchema: {
        roll_path: z.string().describe('roll.json written by roll_designs (relative to the server cwd).'),
        out_path: z.string().optional().describe('Default: compare.html next to roll.json.'),
        previews_dir: z.string().optional().describe('Relative to roll.json (default "previews").'),
        briefs_dir: z.string().optional().describe('Relative to roll.json (default "briefs").'),
        title: z.string().optional(),
      },
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (args) => {
      try {
        const rollPath = resolve(args.roll_path);
        const r = JSON.parse(await readFile(rollPath, 'utf8')) as RollJson;
        const out = resolve(args.out_path ?? join(dirname(rollPath), 'compare.html'));
        const base = dirname(out);
        const previewDir = relative(base, resolve(dirname(rollPath), args.previews_dir ?? 'previews')) || '.';
        const briefDir = relative(base, resolve(dirname(rollPath), args.briefs_dir ?? 'briefs')) || '.';
        const entries = compareEntriesFromRoll(r, { previewDir, briefDir });
        const missing = entries.filter((e) => !existsSync(resolve(base, e.preview))).map((e) => e.preview);
        await mkdir(base, { recursive: true });
        await writeFile(
          out,
          buildComparePage({
            title: args.title ?? r.content.subject,
            subtitle: compareSubtitle(r),
            entries,
            generatedAt: new Date().toISOString().slice(0, 10),
            language: r.content.language,
          }),
          'utf8',
        );
        const lines = [`Wrote ${relative(process.cwd(), out)} (${entries.length} previews).`];
        if (missing.length)
          lines.push(`Missing previews — render them first:\n${missing.map((m) => `- ${m}`).join('\n')}`);
        lines.push('Now show the compare page to the user and STOP until they pick a number.');
        return { content: [text(lines.join('\n\n'))] };
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerPrompt(
    'hash-design',
    {
      title: 'Design a page with hash-design',
      description: 'Start the full roll → 5 previews → compare → pick → build workflow.',
      argsSchema: {
        subject: z.string().describe('What the page is for.'),
        facts: z.string().optional().describe('Facts, one per line.'),
        count: z.string().optional().describe('Number of directions (default 5).'),
        scenario: z.string().optional().describe('web (default), deck, app, dashboard, poster or email.'),
      },
    },
    (args) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Use hash-design to design: ${args.subject}`,
              args.facts
                ? `Facts (the only content allowed):\n${args.facts}`
                : 'No facts supplied: ask me for them before writing copy.',
              '',
              `1. Call roll_designs with count=${args.count ?? '5'}, the subject and facts, ${args.scenario ? `scenario="${args.scenario}", ` : ''}out_dir="design/hash-design". Do not pass a seed.`,
              '2. For each brief in design/hash-design/briefs, read only that brief and write a self-contained preview to design/hash-design/previews/<same name>.html. Follow it literally.',
              '3. Run critique_page with roll_path + pick on each preview; fix every critical/major finding.',
              '4. Call build_compare_page, show me compare.html, and STOP. Wait for my number.',
              '5. Build the final page from the chosen brief only, then critique it again.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  server.registerResource(
    'bans',
    'hash-design://bans',
    {
      title: 'Global bans',
      description: 'The anti-AI-template ban list copied into every brief.',
      mimeType: 'text/markdown',
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: bansMarkdown() }] }),
  );

  server.registerResource(
    'workflow',
    'hash-design://workflow',
    {
      title: 'Workflow (Skill)',
      description: 'The hash-design Skill: full agent workflow.',
      mimeType: 'text/markdown',
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: readSkill() }] }),
  );

  return server;
}

/** Start the server on stdin/stdout. stdout belongs to the protocol, so the ready line goes to stderr. */
export async function serveStdio(label = 'hash-design mcp'): Promise<void> {
  await createServer().connect(new StdioServerTransport());
  console.error(`${label} ${SERVER_VERSION} ready on stdio (cwd: ${process.cwd()})`);
}
