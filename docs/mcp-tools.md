# MCP server reference

[中文](mcp-tools.zh-CN.md) · [Back to README](../README.md)

The hash-design MCP server is a stdio [Model Context Protocol](https://modelcontextprotocol.io) server built on the official TypeScript SDK. It ships in the `hash-design` npm package and runs as `hash-design mcp`. Source: [`packages/core/src/mcp.ts`](../packages/core/src/mcp.ts); `packages/mcp` is a private wrapper that runs the same server from a clone. It exposes 4 tools, 2 resources and 1 prompt, and sends server instructions that summarise the workflow to the client.

> Register `npx -y hash-design mcp` with your client. The `mcp` command arrives in hash-design 0.2.0, the next release; 0.1.0 does not have it. Until 0.2.0 is out, use `npx -y hash-design-mcp@0.1.0` (the earlier, separately published hash-design/v1 server, with its 6 branch-library tools; no longer updated) or a clone: `node /ABS/PATH/hash-design/packages/mcp/dist/bin.js`. See [Install by hand](../README.md#install-by-hand).

## Working directory and file access

The server runs locally with your user's permissions and makes no network requests. Relative paths (`out_dir`, `path`, `roll_path`, `out_path`) resolve against the **server's working directory**, which is whatever directory your client starts it in. Claude Code and Cursor usually start it in the project; Claude Desktop does not, so give it absolute paths there.

Tools that touch the filesystem:

| Tool                 | Reads                     | Writes                                                                |
| -------------------- | ------------------------- | --------------------------------------------------------------------- |
| `roll_designs`       | —                         | `roll.json`, `ROLL.md`, `briefs/*.md` under `out_dir` (only if given) |
| `critique_page`      | `path`, `roll_path`       | —                                                                     |
| `build_compare_page` | `roll_path`, preview list | `compare.html` (or `out_path`)                                        |

## Shared constraint parameters

`roll_designs`, `get_brief` and `critique_page` accept the same flat constraint fields. They are documented in detail in [mapping.md §6](mapping.md#6-constraints) and, for `scenario`, [§7](mapping.md#7-scenarios).

| Parameter        | Type                             | Meaning                                                                                                                                      |
| ---------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `light_only`     | boolean                          | Light paper (byte 2 then sets only its lightness)                                                                                            |
| `dark_only`      | boolean                          | Dark paper (byte 2 then sets only its lightness)                                                                                             |
| `reduced_motion` | boolean                          | No motion: duration 0, easing `none`                                                                                                         |
| `brand_colors`   | string[] (≤ 2, `#rgb`/`#rrggbb`) | `[accent]` or `[accent, accent2]`; the first also sets the hue                                                                               |
| `scenario`       | enum                             | `web` (default) `deck` `app` `dashboard` `poster` `email`. Non-web scenarios add a format (byte 28), a canvas and output rules to each brief |

There is no style, family or branch filter: `hash-design/v2` has no library of styles to filter.

## Tools

### `roll_designs`

Roll N true-random hashes; each hash is one design direction, mapped byte by byte onto continuous parameters ([mapping.md](mapping.md)). Not read-only, not idempotent (every call without `seed` is a new roll).

| Parameter   | Type                | Default                               | Notes                                                              |
| ----------- | ------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| `subject`   | string, required    | —                                     | What the page is for                                               |
| `facts`     | string[]            | `[]`                                  | The only facts the page may state                                  |
| `count`     | integer 1–12        | 5                                     | Each direction is its own hash, so constraints never lower the cap |
| `seed`      | string              | —                                     | Reproducible roll for examples/tests only                          |
| `language`  | `zh` \| `en`        | auto-detected from subject and facts  | Brief language                                                     |
| `out_dir`   | string              | —                                     | Freeze `roll.json`, `ROLL.md`, `briefs/NN-<short>.md` here         |
| `detail`    | `full` \| `summary` | `summary` with `out_dir`, else `full` | Whether every brief is inlined in the response                     |
| constraints | see above           |                                       |                                                                    |

Returns two text blocks: (1) Markdown (summary table, refs, the files written, the briefs when `detail = full`, and the [reply](#reply-protocol) to send the user) and (2) a JSON object `{ reply, source, library, constraints, designs: [{ number, ref, label, format? }] }` for programmatic use. `ref` is the 64-hex hash, `label` a one-line summary such as `light · 156° · Libre Franklin / Atkinson Hyperlegible · 4 col`, and `format` appears only with a non-web `scenario`.

CLI: `hash-design roll --subject … --fact … --facts-file … --count … --seed … --out … --format md|json|summary|reply [constraints, e.g. --scenario deck]`. `--format reply` prints the reply (after the files when `--out` is given). The CLI has no `--language` flag; it always auto-detects.

### `get_brief`

Rebuild the brief for a ref. Read-only and idempotent: the same ref + constraints (scenario included) + library always gives the same brief.

| Parameter   | Type                 | Notes                                     |
| ----------- | -------------------- | ----------------------------------------- |
| `ref`       | string, required     | The 64-hex hash                           |
| `subject`   | string               | Put back into the brief's content section |
| `facts`     | string[]             |                                           |
| `language`  | `zh` \| `en`         |                                           |
| `format`    | `markdown` \| `json` | Default `markdown`                        |
| constraints | see above            | Must match the roll's constraints         |

CLI: `hash-design brief <ref> [constraints] [--subject …] [--fact …] [--format md|json]`.

### `critique_page`

Static critique of an HTML page against the 14 global bans plus contrast, `viewport`, `lang`, `img alt` and reduced-motion checks. With a brief it also scores adherence (the brief's fonts and palette, its corner radius and its shadow rule). When the brief has a non-web scenario it also checks the scenario's output contract under the rule `scenario-<id>`: at least 3 slides, a 1920×1080 or 16:9 canvas and keyboard navigation for `deck`; a 390 px frame and at least 2 screens for `app`; tabular figures for `dashboard`; the format's width and height for `poster`; no `<script>`, a `<table>` layout and the column width for `email`. Read-only.

| Parameter   | Type                 | Notes                                                                                                            |
| ----------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `html`      | string               | Full HTML source (give `html` or `path`)                                                                         |
| `path`      | string               | HTML file, relative to the server cwd                                                                            |
| `css`       | string               | Extra CSS not inlined in the HTML                                                                                |
| `brief_ref` | string               | Ref to check adherence against (+ the same constraints)                                                          |
| `roll_path` | string               | `roll.json` from `roll_designs` (alternative to `brief_ref`)                                                     |
| `pick`      | integer ≥ 1          | Design number inside `roll_path`                                                                                 |
| `facts`     | string[]             | Numbers on the page that are not in the facts get flagged; defaults to the roll's facts when `roll_path` is used |
| `format`    | `markdown` \| `json` |                                                                                                                  |
| constraints | see above            | Used with `brief_ref`                                                                                            |

Scoring: start at 100, subtract 25 per critical, 10 per major and 4 per minor finding. Grades: A ≥ 90, B ≥ 75, C ≥ 60, D ≥ 40, F below. Adherence is a separate 0–100 score, present only when a brief was given.

CLI: `hash-design critique <page.html> [--css <file>] [--brief <ref> | --roll <roll.json> --pick <n>] [--facts-file <path>] [--json] [--fail-under <score>]`. With `--fail-under`, the CLI exits with code 1 when the score is below the threshold, which makes it usable in CI.

### `build_compare_page`

Write `compare.html`: every preview in a scaled iframe side by side, each card titled `Direction <short hash>` (`方向 <short hash>` for a Chinese roll) with polarity and hue, colour swatches, faces, grid, density, voice and twist, a desktop / mobile toggle and a focus mode (keys 1–9). With a non-web scenario the subtitle and every card name the scenario and format; fixed canvases (`deck`, `poster`) are scaled from their real size and the desktop button becomes Canvas. Expects previews at `<previews_dir>/NN-<short>.html` and lists any that are missing; once all exist it returns the second [reply](#reply-protocol). Keys 1–9 focus the first nine previews; ←/→ step through all of them. The page's labels, buttons and instructions follow the roll's language (`content.language` in `roll.json`: Chinese or English).

| Parameter      | Type             | Default                              |
| -------------- | ---------------- | ------------------------------------ |
| `roll_path`    | string, required | —                                    |
| `out_path`     | string           | `compare.html` next to `roll.json`   |
| `previews_dir` | string           | `previews` (relative to `roll.json`) |
| `briefs_dir`   | string           | `briefs` (relative to `roll.json`)   |
| `title`        | string           | the roll's subject                   |

CLI: `hash-design compare [--roll <roll.json>] [--out <compare.html>] [--previews <dir>] [--briefs <dir>] [--title <t>]`.

## Reply protocol

What the agent tells the user is fixed, so it stays short with any agent. `renderReply()` in the library builds it from the frozen data; `roll_designs` returns it (and `reply` in the JSON block), `build_compare_page` returns the second one, and the CLI prints it with `roll --format reply` and from `compare`. The Skill tells the agent to send it as is (translated if the user writes another language) and stop.

```text
**hash-design** · N directions for “<subject>” · <scenario> · <true-random | seed …>

1. **<Display face>** / <Body face> — <light|dark> paper, hue <H>° · <C>-column grid · anchor: <subject>[ · <format>] · `<short ref>`
…

Reply with a number to build that direction as the final <page|deck|app screens|dashboard|poster|email>, **render** to see all N as previews side by side first, or **reroll** for a new set.
```

| Answer            | What the agent does                                                                     |
| ----------------- | --------------------------------------------------------------------------------------- |
| a number          | Builds the final artifact from that brief only, then runs `critique_page`               |
| `render`          | One independent preview per brief, `build_compare_page`, then the second reply and stop |
| `reroll`          | Rolls again (new true-random hashes)                                                    |
| a mix ("#2 + #4") | Builds it and notes both refs in the file                                               |

Every field of a line is read off the mapped numbers: the display and body faces, paper polarity and OKLCH hue, grid columns, the anchor subject, the format for non-web scenarios and the short ref. Non-web scenarios add the format and name their artifact in the question. After the compare page the header becomes `**hash-design** · N previews side by side: <path>` and the question asks only for the number. A Chinese roll gets the same reply in Chinese.

Real output, from `hash-design roll --subject "Fourth Lane Bakery" --fact "Closed Mondays" --seed reply-demo --count 3 --format reply`:

```text
**hash-design** · 3 directions for “Fourth Lane Bakery” · Web page · seed reply-demo

1. **Caveat** / Literata — light paper, hue 330° · 5-column grid · anchor: initial · `ea849a45`
2. **Hanken Grotesk** / Crimson Pro — light paper, hue 344° · 10-column grid · anchor: number · `f458a091`
3. **Overpass** / Barlow Condensed — light paper, hue 234° · 5-column grid · anchor: grid-diagram · `a6b46334`

Reply with a number to build that direction as the final page, **render** to see all 3 as previews side by side first, or **reroll** for a new set.
```

And with `--subject "Causeway volunteer briefing" --count 4 --scenario deck` (same seed, so the first three hashes are the same; the fourth is new):

```text
**hash-design** · 4 directions for “Causeway volunteer briefing” · Slide deck · seed reply-demo

1. **Caveat** / Literata — light paper, hue 330° · 5-column grid · anchor: initial · Index-rail master · `ea849a45`
2. **Hanken Grotesk** / Crimson Pro — light paper, hue 344° · 10-column grid · anchor: number · Full-bleed master · `f458a091`
3. **Overpass** / Barlow Condensed — light paper, hue 234° · 5-column grid · anchor: grid-diagram · Index-rail master · `a6b46334`
4. **Big Shoulders Stencil Display** / STIX Two Text — light paper, hue 282° · 9-column grid · anchor: colour-block · Index-rail master · `c8a976a3`

Reply with a number to build that direction as the final deck, **render** to see all 4 as previews side by side first, or **reroll** for a new set.
```

`packages/core/test/reply.test.ts` checks this shape for three rolls (web N=3, deck N=7 in Chinese, email N=1) and that the Skill's sketch matches.

## Resources

| URI                      | Content                                               |
| ------------------------ | ----------------------------------------------------- |
| `hash-design://bans`     | The 14 global bans with ids and severities (Markdown) |
| `hash-design://workflow` | The full Skill (`SKILL.md`)                           |

## Prompt

`hash-design` with arguments `subject` (required), `facts` (one per line), `count` and `scenario`. It expands to a user message that walks the agent through: `roll_designs` with `out_dir="design/hash-design"`, the scenario if given, and no seed → send the reply and stop → on "render": one preview per brief, `critique_page` with `roll_path` + `pick`, `build_compare_page`, send its reply and stop → on a number: build the final artifact from that brief and critique it again.

## Files written by a roll

```
design/hash-design/
  roll.json            # algorithm, library, createdAt, source, constraints, content, designs[] (full brief JSON)
  ROLL.md              # summary table + full refs
  briefs/01-<short>.md          # <short> = first 8 hex digits of the hash
  …
  previews/01-<short>.html      # written by the agent, one per brief
  compare.html                # written by build_compare_page
```

## Client configuration

See [Install by hand](../README.md#install-by-hand) in the README for Claude Code, Cursor and Claude Desktop. The command is `npx -y hash-design mcp` (hash-design 0.2.0 or later); until that release, `npx -y hash-design-mcp@0.1.0`, or `node …/packages/mcp/dist/bin.js` in a clone.

## Testing

`packages/core/test/mcp.test.ts` drives the server through the SDK's in-memory transport, including a test that `roll_designs` with a seed returns exactly what the library's `roll` returns for that seed, and one that no branch tool or branch constraint field is exposed. `scripts/smoke.mjs` starts `hash-design mcp` and the `packages/mcp` wrapper over real stdio in CI.
