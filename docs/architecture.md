# Architecture

[中文](architecture.zh-CN.md) · [Back to README](../README.md)

hash-design is an npm-workspaces monorepo with two packages, one Skill and four recorded example runs. Everything is TypeScript (strict, ESM, Node ≥ 20).

```
                 ┌──────────────────────────── packages/core (npm: hash-design) ─────────────────────────────┐
  facts ───────► │ hash.ts ──► mapping.ts ──► brief.ts / derive.ts ──► files.ts (roll.json, ROLL.md, briefs/) │
  constraints    │   ▲            ▲    └──► palette.ts / color.ts (OKLCH, contrast solving)                  │
                 │   │       data/ (fonts, space, bans, scenarios)                                           │
                 │ crypto     critique.ts (static HTML/CSS checks)   compare.ts (compare.html)                │
                 │            cli.ts / bin.ts (hash-design CLI)      skill.ts (SKILL.md access + sync block) │
                 │            mcp.ts (MCP server: 4 tools, 2 resources, 1 prompt) ◄── `hash-design mcp`      │
                 └───────────────▲────────────────────────────────────────────────────────────────────────────┘
                                 │ re-exports hash-design/mcp
                 ┌───────────────┴──── packages/mcp (private wrapper) ─────────┐
                 │ bin.ts: the same server, run from a clone                   │
                 └─────────────────────────────────────────────────────────────┘
  skills/hash-design/SKILL.md ── the agent workflow (synced to .claude/ and .cursor/)
```

## Packages

### `packages/core` (`hash-design`)

| Module                     | Responsibility                                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/hash.ts`              | `randomHash` (`crypto.getRandomValues` → SHA-256), `seededHash`, `rollHashes`, `parseRef` (a ref is the bare hash), `ALGORITHM` (`hash-design/v2`)                |
| `src/sha256.ts`            | Pure TypeScript SHA-256 (no `node:crypto`), so hashing and the fingerprints run unchanged in a browser                                                            |
| `src/browser.ts`           | The browser entry, exported as `hash-design/browser`: everything except `critique`, `files`, `skill`, the CLI and the MCP server. `index.ts` re-exports it        |
| `src/mapping.ts`           | `mapDesign` (one hash → one design, byte by byte), `mapRoll`, constraints, `BYTE_MAP`, `libraryFingerprint`, `scenarioFingerprint`, `DEFAULT_COUNT` / `MAX_COUNT` |
| `src/palette.ts`           | `buildPalette`: OKLCH palette from the hue / polarity / chroma bytes, with text lightness solved to the contrast floors                                           |
| `src/color.ts`             | sRGB ↔ OKLCH (gamut-mapped by chroma), WCAG relative luminance and contrast                                                                                       |
| `src/data/fonts.ts`        | The flat font pool: 98 display, 62 body, 8 mono (Google Fonts), 14 CJK display and 2 CJK body faces; no style tags                                                |
| `src/data/space.ts`        | The short primitive lists bytes index into: cases, separators, anchor subjects, motif shapes and placements, textures, voice, twist                               |
| `src/data/scenarios.ts`    | 6 scenarios (web, deck, app, dashboard, poster, email): formats, canvas, base-size rule, density range, twist filters, contract, rules                            |
| `src/data/bans.ts`         | 14 global bans, 23 banned fonts, framework default colours, English and Chinese buzzword lists                                                                    |
| `src/derive.ts`            | Derived tokens: type scale, font stacks, Google Fonts URL, WCAG contrast report, `tokens.css`, language detection                                                 |
| `src/brief.ts`             | `roll`, `reproduce`, `directionLabel`, Markdown and JSON briefs, roll summaries, `roll.json` shape                                                                |
| `src/files.ts`             | `writeRoll`: freezes `roll.json`, `ROLL.md` and `briefs/NN-<short hash>.md`                                                                                       |
| `src/reply.ts`             | `renderReply`, `replyLine`: the short reply an agent sends after a roll and after the compare page (see [mcp-tools.md](mcp-tools.md#reply-protocol))              |
| `src/critique.ts`          | `critiquePage`: static HTML/CSS checks for every ban plus contrast / a11y basics and brief adherence                                                              |
| `src/compare.ts`           | `buildComparePage`: one self-contained HTML file with scaled iframes, labels, desktop/mobile toggle, focus keys                                                   |
| `src/skill.ts`             | Locates `SKILL.md` (repo or packaged copy) and renders the generated bans block                                                                                   |
| `src/cli.ts`, `src/bin.ts` | The `hash-design` CLI (`node:util` `parseArgs`, no CLI framework)                                                                                                 |
| `src/mcp.ts`               | The MCP server (`createServer`, `serveStdio`; 4 tools, 2 resources, 1 prompt), loaded by `hash-design mcp`; exported as `hash-design/mcp`                         |

Runtime dependencies: `node-html-parser` (for `critique_page`), and `@modelcontextprotocol/sdk` and `zod` for the MCP server, which the CLI loads only for `hash-design mcp`.

### The MCP server (`src/mcp.ts`, `packages/mcp`)

A thin adapter over the core's public API using `@modelcontextprotocol/sdk` and `zod` input schemas, run as `hash-design mcp`. `packages/mcp` (`hash-design-mcp`, private) only re-exports it, so `node packages/mcp/dist/bin.js` keeps working in a clone. Every tool has a CLI equivalent, and a test checks that `roll_designs` with a seed returns exactly the refs of the core's `roll` with the same seed. See [mcp-tools.md](mcp-tools.md).

Design choices:

- **Flat constraint parameters** (`light_only`, `brand_colors`, …) rather than a nested object: models fill flat schemas more reliably.
- **Two content blocks** from `roll_designs`: Markdown for the model to read and a small JSON block for programmatic clients.
- **`detail: summary` by default when `out_dir` is set**, so five full briefs do not flood the context; the agent then reads each brief file on its own, which is what keeps previews independent.
- Tool annotations mark `get_brief` and `critique_page` as read-only.

## Data as code

There is no catalogue of styles. What the mapping reads besides the hash is a handful of TypeScript lists:

- **Fonts** (`data/fonts.ts`): family, the weights it really has on Google Fonts, italic, fallback class. Nothing else: no mood, era or genre tags, so a byte picks a face and nothing is implied by the pick.
- **Primitives** (`data/space.ts`): short lists of neutral building blocks (`{ id, text }`), such as 12 motif shapes, 8 anchor subjects, 9 twist targets and 10 twist operations. They combine freely with each other and with the continuous values; no entry is tied to another.
- **Scenarios** (`data/scenarios.ts`): each has a bilingual summary, output contract, count, notes on how layout / anchor / motion translate, a base-size rule, its formats (byte 28), its density range, the twist targets and operations it removes, and must / must-not lists. They are hashed into their own `scenarioFingerprint`. See [mapping.md §7](mapping.md#7-scenarios).

Fonts, primitives and `BYTE_MAP` are hashed into the library fingerprint, which `mapping.test.ts` pins, so any change to what a hash maps to is a visible change. `mapping.test.ts` also checks that the font pools are unique and free of banned faces, that palettes meet their contrast floors in both polarities over thousands of random hashes, and that each byte moves only its own parameters. `scripts/verify-fonts.mjs` checks every Google Fonts URL a brief can emit online; it is not in CI because it needs the network.

## Generated files

`npm run sync` (build + `scripts/sync.mjs`) regenerates what is derived from the data:

- the bans block inside `skills/hash-design/SKILL.md`, between `<!-- BEGIN GENERATED: bans (npm run sync) -->` and `<!-- END GENERATED: bans -->` (it also states the size of the font pool)
- the copies `.claude/skills/hash-design/SKILL.md` and `.cursor/skills/hash-design/SKILL.md`

`skill.test.ts` fails if any of these is stale.

## The examples: recorded v1 runs

The four runs under `examples/` (a bakery, a developer tool, a bicycle repair shop and a music festival) were rolled with `hash-design/v1`, the 40-branch library that v2 removed. They are kept as records of real runs (facts, frozen briefs, previews made by agents following the Skill, screenshots and compare pages), not as fixtures of the current mapping: v2 cannot reproduce their refs. `examples.test.ts` checks that each one is labelled `hash-design/v1` in its `roll.json` and README, that every brief, preview and screenshot is present, that each preview still scores at least 90 on the critique with no critical or major findings, and that the Pages index and every README link to each example. `scripts/examples.mjs` lists the examples and critiques their previews; it refuses to re-roll a v1 record or rebuild its compare page, since both need v1.

## Testing and CI

- **Vitest**, 14 test files in `packages/core/test`: `hash`, `mapping`, `count` (N), `scenarios`, `brief`, `reply`, `critique` (with good and bad HTML fixtures), `compare`, `cli`, `skill` (sync checks), `examples`, `release` (publish readiness), `mcp` (in-memory transport) and `browser` (the pure SHA-256 against `node:crypto` and the FIPS vectors, and `hash-design/browser` bundled by Vite with no Node built-ins, mapping exactly as the library does).
- **`scripts/smoke.mjs`**: runs the built CLI and talks to `hash-design mcp` and the `packages/mcp` wrapper over a real stdio pipe.
- **CI** (`.github/workflows/ci.yml`), on Node 20, 22 and 24: `npm ci`, build, typecheck (including tests), ESLint, Prettier check, tests, smoke test, `npm pack --dry-run` for both packages.
- **Pages** (`.github/workflows/pages.yml`): publishes `examples/` to GitHub Pages when it changes.

## Packaging

Only `packages/core` is published, as `hash-design` (0.1.0 has been on npm since 2026-11-02). Its `prepack` copies `SKILL.md` and `LICENSE` into the package so `hash-design skill install` works from an npm install, and `tsbuildinfo` files are excluded from the tarball. The package also carries the MCP server (`hash-design mcp`, from 0.2.0) and its two dependencies. `packages/mcp` is a private wrapper for clones; it depends on `hash-design` by version (`^<version>`), which npm satisfies by linking the workspace. Releases: [publishing.md](publishing.md).
