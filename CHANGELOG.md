# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`hash-design@0.1.0` and `hash-design-mcp@0.1.0` were published to npm by hand on 2026-11-02, both built from commit `475ba16`. From 0.2.0 on, only `hash-design` is published, by the release workflow; `hash-design-mcp` is a private workspace in this repository and its 0.1.0 on npm will not be updated. No git tag was created for 0.1.0. The `[0.1.0]` section below describes `main` at commit `ec5398a`; the published 0.1.0 tarballs also contain the `[0.2.0]` entries that were merged by `475ba16` (everything up to and including design scenarios, before `hash-design/v2`). 0.2.0 is the first version published by the release workflow, tagged `v0.2.0`.

## [Unreleased]

## [0.2.0] - 2026-11-02

What changes for someone on the published 0.1.0:

- **`hash-design/v2`: the hash is the direction.** There is no branch library any more; each byte of a hash sets one design parameter. Refs are the bare 64-hex hash, so v1 refs (`<hash>+<n>`) need 0.1.0 to reproduce. The four examples stay as v1 records.
- **One package.** The MCP server ships in `hash-design` and runs as `npx -y hash-design mcp`. `hash-design-mcp` gets no new versions.
- **N directions and a short reply.** A roll has 1–12 directions (default 5). After a roll the agent sends one line per direction and waits for a number, `render` or `reroll`.
- **Any agent.** `skill install` writes `.claude/skills/` and `.agents/skills/` (Codex, Cursor, VS Code Copilot, Windsurf), and `--to` takes any other skills folder.
- **Release workflow.** Published from GitHub Actions with npm Trusted Publishing and provenance.

The full list follows. Entries up to and including design scenarios were already in the 0.1.0 tarballs (see the note at the top).

### Added

- `packages/core/src/palette.ts` and OKLCH conversion in `color.ts` (`oklchToHex`, `hexToOklch`): palettes are computed from the hash, with the lightness of ink, muted text and both accents solved to fixed contrast floors on the paper (7.5, 4.6, 3.2 and 3.0). Out-of-gamut colours lose chroma, never hue.
- `packages/core/src/data/fonts.ts`: a flat font pool (98 display, 62 body and 8 mono Google Fonts faces, 14 CJK display and 2 CJK body faces) with no style tags, taken from the fonts the v1 library already used and checked online (`scripts/verify-fonts.mjs`, 174/174).
- `packages/core/src/data/space.ts`: short lists of neutral primitives that bytes index into (cases, separators, anchor subjects, motif shapes and placements, border styles, radii, textures, motion properties, voice persons, headline forms, twist targets and operations).
- `directionLabel()` and `twistText()` in the library; `roll_designs` returns a `label` per design instead of a branch.
- Mapping tests for v2: the pinned library fingerprint, determinism, the documented byte rules, that each byte moves only its own parameters, contrast floors in both polarities over 2,000 random hashes, the spread of fonts, accents, grids and twists, N independent designs, prefix-stable seeded rolls and v1 refs being rejected.
- English README as the main document, with full translations in Simplified Chinese (`README.zh-CN.md`), Japanese (`README.ja.md`), Korean (`README.ko.md`) and Spanish (`README.es.md`), and a language switcher at the top of each.
- `docs/architecture.md`, `docs/mapping.md` (the `hash-design/v1` specification with worked examples) and `docs/mcp-tools.md` (every MCP tool, resource and prompt with CLI equivalents), each with a Chinese version, plus a `docs/README.md` index.
- Community files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SECURITY.md`, this changelog, issue templates (bug report, feature request, new branch proposal) and a pull request template.
- README badges for CI, Pages, the live demo, license, Node version and npm status.
- Three more full example runs. Each has a fact sheet, a fixed-seed roll, five briefs, five previews rendered by separate agents, a compare page, screenshots and a README that records the process and critique scores. No two examples share a branch, so the four examples show 20 of the 40 branches.
  - `examples/sluice/`: Sluice, a self-hosted webhook inbox (English page, developer tool);
  - `examples/bridge-two-bikes/`: 二号桥单车铺, a bicycle repair shop (Chinese page);
  - `examples/causeway-festival/`: Causeway, a one-day music festival on a tidal island (English page).
- "More examples" in every README: each new example's compare page, five desktop thumbnails and links to the live pages and the example folder. The Pages index (`examples/index.html`) now lists all four examples.
- The compare page (`hash-design compare`, `build_compare_page`) follows the roll's language: an English roll gets English labels, buttons, instructions and voice/twist names, and `<html lang="en">`. Chinese rolls are unchanged. `compareSubtitle()` is exported from the library.
- `scripts/examples.mjs` and the npm scripts `examples`, `example:roll`, `example:critique` and `example:compare`, which list, re-roll, critique or rebuild the compare pages of every example (or one, with `-- <name>`).
- `scripts/hero.mjs` (`npm run hero`) builds the README hero `docs/assets/hero.png` and a 1280×640 `docs/assets/social-preview.png` from one example's roll and screenshots: the prompt fans out into the five previews, labelled with their refs, branch names and palettes. Both images currently show `examples/causeway-festival`.
- `scripts/showcase.mjs` (`npm run showcase`) renders `docs/assets/showcase/<example>.png`: one plate per example run with its five directions side by side, labelled with branch, branch id, palette and ref from `roll.json`.
- Design scenarios: `scenario` (`web` default, `deck`, `app`, `dashboard`, `poster`, `email`) on `roll_designs`, `get_brief` and `critique_page`, `--scenario` on the CLI, and `Constraints.scenario` in the library. A scenario is a constraint, so it is part of a design's identity. It keeps the rolled direction (same branch, probe, voice, layout, type, palette, motif, anchor, scale and surface). It removes densities and twists that do not fit the medium before bytes 6 and 12 are read, uses byte 13 to pick a format (for example a deck's slide master or a poster's aspect ratio), and sets a canvas and a base text size. Briefs gain a Scenario section (output contract, count, how layout, anchor and motion translate, rules and must-nots). `critique_page` checks each scenario's output contract (`scenario-<id>`), and the compare page labels the scenario and scales fixed canvases from their real size. `web` normalises away, so existing refs, briefs, the examples and the library fingerprint are unchanged; scenario data has its own `scenarioFingerprint()`. The scenario list and rules draw on the templates of [nexu-io/open-design](https://github.com/nexu-io/open-design). See `docs/mapping.md` §6.
- Reply protocol: `renderReply()` builds the short message an agent sends after a roll (one header line, one line per direction read off the mapped numbers: display and body faces, paper polarity and hue, grid columns, anchor, the format for non-web scenarios and the short ref; then one question) and after the compare page. `roll_designs` returns it (also as `reply` in its JSON block), `build_compare_page` returns the second one, the CLI prints it with `roll --format reply` and from `compare`, and the Skill tells the agent to send it as is and stop. `reply.test.ts` dry-runs three rolls (web N=3, deck N=7 in Chinese, email N=1) and fails if the Skill's sketch drifts from the renderer.
- N, the number of directions, is documented end to end: `count` (MCP), `--count`/`-n` (CLI) and the Skill, which reads it from the request ("3 directions", `/hash-design 3`, Claude Code's `ARGUMENTS:`). Range 1–12, default 5, exported as `DEFAULT_COUNT` and `MAX_COUNT`. Each direction is its own hash, so constraints never lower the cap; 12 is a product cap (one brief and one independently rendered preview per direction).
- `skill install --target agents` writes `.agents/skills/` (read by Codex, Cursor, VS Code Copilot and Windsurf, per their docs), `--target` takes comma lists and `all`, and `--to <skills-dir>` drops the skill into any other agent's folder. Afterwards it prints the CLI and `mcp` commands that work where it ran (`npx -y hash-design …` through npx). The READMEs document Codex (`codex mcp add hash-design -- npx -y hash-design mcp`, `~/.codex/config.toml`) and any other stdio MCP client.
- `scripts/hero-gif.mjs` (`npm run hero:gif`) renders an animated hero from the same example: `/hash-design` picked in a prompt box, five SHA-256 refs ticking and locking to the real ones, the five previews popping in and lining up as a compare row. Frames are captured deterministically at `t = i / fps` and encoded to `docs/assets/hero.gif` (960 px, 20 fps, 6 s loop) and `docs/assets/hero.mp4` (H.264).
- npm release automation for the one published package, `hash-design`: `.github/workflows/release.yml` publishes it with provenance when a GitHub Release tagged `v<version>` is published (never on a plain push; a manual run is a dry run). It authenticates with npm Trusted Publishing (OIDC: `id-token: write`, `contents: read`, npm ≥ 11.5.1), so no npm token or repository secret is used; the Trusted Publisher is configured on `hash-design` only. `scripts/release-check.mjs` (`npm run release:check`, now also in CI instead of the bare `npm pack --dry-run`) checks lockstep versions, the tag, the CHANGELOG section, `hash-design`'s publish fields and tarball contents, and that `packages/mcp` stays private. `scripts/release-version.mjs` (`npm run release:version -- <version>`) sets one version across the workspace. Setup and steps: [docs/publishing.md](docs/publishing.md).
- `hash-design mcp` runs the MCP server on stdio from the published package: `claude mcp add hash-design -- npx -y hash-design mcp`. The server moved from `packages/mcp/src/server.ts` to `packages/core/src/mcp.ts` (exported as `hash-design/mcp`), and `hash-design` now depends on `@modelcontextprotocol/sdk` and `zod`; the CLI loads them only for this command. `hash-design` 0.1.0 does not have it. The smoke test drives both `hash-design mcp` and the `packages/mcp` wrapper, and `release-check` requires `dist/mcp.js` and the server's dependencies in the tarball.

### Changed

- **Breaking: algorithm `hash-design/v2`. The hash is the direction.** v1 used bytes 0–1 to pick one of 40 genre branches and bytes 2–13 to pick among that branch's options. v2 has no genre layer: every byte drives one design parameter, either a continuous value or an index into a short primitive list. Bytes 0–5 set the palette (hue, polarity and paper lightness, paper chroma, accent chroma, the second accent's hue offset), 6–10 the type (display and body faces, case and weight, tracking, a scale ratio from 1.067 to 1.618), 11 the density (one continuous position), 12–15 the layout (3–12 columns, gutter, text-block columns, first-screen height, sections, separator), 16–17 the anchor, 18–19 the motif, 20–21 the surface, 22–23 the motion, 24–25 the voice, 26–27 the twist (target × operation × amount), 28 a non-web scenario's format, 29–30 the CJK display and mono faces; 31 is unused. The full rules are in `docs/mapping.md`.
- **Breaking: refs are the bare 64-hex hash.** There is no collision walk and no probe, so a roll of N is N independent mappings and any design reproduces from its hash alone. `parseRef` rejects v1 `<hash>+<n>` refs with a message saying they need v1. Seeded hashes are now `sha256("hash-design/v2:<seed>:<i>")`.
- The library fingerprint now covers the font pool, the primitive lists and the byte map (currently `bd20321c36ab`), and `mapping.test.ts` pins it. Scenario data has new fields (a density range and the twist targets / operations each scenario removes), so the scenario fingerprint changed too (`4b8c484cc50e`).
- Scenarios keep the rolled palette, faces, scale ratio, grid, anchor, motif, surface and voice; they now narrow the density range, filter twist targets and operations, and pick their format with byte 28 (was 13). `email` has no motion.
- `reduced_motion` now means no motion (duration 0, easing `none`). `light_only` / `dark_only` fix the polarity and read byte 2 over its full range as the paper lightness. `brand_colors[0]` replaces the accent and, when it has chroma, sets the hue; `brand_colors[1]` replaces accent2.
- Briefs: titled `Direction <short hash>` with a one-line label; the Layout, Typography (case, weight, tracking), Colour (OKLCH parameters), Density, Shape & surface, Motif, Motion and Twist sections are written from the mapped numbers; `tokens.css` adds `--display-weight`, `--display-tracking`, `--columns`, `--gutter`, `--radius`, `--border`, `--shadow` and `--motion-duration`. Brief files are `briefs/NN-<short hash>.md`. The compare page titles each card `Direction <short hash>` (`方向 <short hash>` for Chinese rolls) with polarity and hue, faces, grid, density, voice and twist.
- `critique_page`'s shape adherence checks the brief's corner radius and shadow (none, or a hard shadow with no blur) instead of a branch policy.
- The Skill, MCP tool descriptions and server instructions, CLI help, `docs/mapping.md`, `docs/architecture.md`, `docs/mcp-tools.md` (each with its Chinese version), `CONTRIBUTING.md`, the issue and pull request templates and all five READMEs describe v2.
- The four example runs are kept as **hash-design/v1 records** rather than re-rolled: their `roll.json` files still say `hash-design/v1`, each example README says so and points to commit `475ba16` to reproduce them, and the README hero caption and Showcase section say they are v1 runs. `examples.test.ts` checks that they are labelled v1 and that every preview still scores at least 90 on the critique; `scripts/examples.mjs` refuses to re-roll a v1 record or rebuild its compare page.
- `hash-design-mcp` is no longer published to npm. `packages/mcp` stays in the repository as a private workspace (`"private": true`, so it cannot be published by accident) and is now a thin wrapper that re-exports the server from `hash-design`, so `node …/packages/mcp/dist/bin.js` keeps working in a clone.
- The READMEs install from npm: `npx -y hash-design skill install --dir .` and `claude mcp add hash-design -- npx -y hash-design mcp`, a "tell your agent" line built on those two commands, a real npm version badge, and a From source section for contributors. The not-on-npm callout and badge are gone. `packages/core/README.md` (the npm page), `docs/mcp-tools*.md`, `docs/architecture*.md` and `docs/publishing*.md` match.
- After a roll the agent now replies with one line per direction and stops; previews and the compare page are rendered when the user answers `render` (the MCP prompt, server instructions and Skill follow the same stop points). A number builds that direction straight away.
- `skill install` defaults to `claude,agents` instead of `claude,cursor` (`both` still means the old pair). Cursor reads `.agents/skills/`, so it is still covered.
- `hash-design roll --count` rejects anything but a whole number from 1 to 12, and `--out` with `--format md|json` is an error instead of being ignored.
- All five READMEs share one structure, modelled on [qybaihe/bla](https://github.com/qybaihe/bla): a centred header with the GIF, badges, links, section nav and a copy-paste "tell your agent" install sentence; then What hash-design does, Quick start (Tell your agent, Install by hand, Use it, CLI, Library, Update), How it works, Examples, Reference, FAQ (which absorbs Known limitations), Documentation, Contributing and License. Install by hand clones to `~/hash-design`.
- The READMEs' Examples section is now Showcase: one plate per example linked to its folder, a single link to the examples site, and no per-direction preview tables. `examples.test.ts` checks for the plate in every README.
- The Fourth Lane Bakery per-direction notes moved from `README.zh-CN.md` to `examples/fourth-lane-bakery/README.md`.
- Every README now opens with the animated hero; readers who prefer reduced motion get the static `hero.png` through a `<picture>` source.
- The first screen of every README: a problem-first pitch, four badges (the rest in a collapsed block), the new hero linked to the Causeway compare page, a quick start, and a four-line overview. The Fourth Lane Bakery compare image moved to the top of each Demo section.
- `npm run screenshots` now covers every example; `node scripts/screenshot.mjs <name|dir> [prefix]` still shoots one.
- `examples.test.ts` checks every example instead of only the bakery: refs, briefs and library fingerprint, a preview and screenshots per brief, a critique score of at least 90 with no critical or major findings, no branch shared between examples, and links from the Pages index and every README.

### Removed

- **The 40-branch library** (`packages/core/src/data/branches/`, `data/pools.ts`), its validator (`validate.ts`), the catalogue renderer (`catalog.ts`), `docs/branches.md`, `branches.test.ts` and the "new branch proposal" issue template. There are no branch ids, families, names, references, keywords or per-branch option lists any more.
- The MCP tools `list_branches` and `get_branch`, the resources `hash-design://branches` and `hash-design://branch/{id}`, and the constraint fields `families`, `include_branches` and `exclude_branches`.
- The CLI commands `hash-design branches` and `hash-design branch`, and the flags `--family`, `--include` and `--exclude`.
- `formatRef` and the `probe` part of refs.

### Fixed

- CLI subcommands now accept `--help` / `-h` (and `hash-design help <command>`) and print that command's options, instead of failing with `Unknown option '--help'`. Argument errors such as an unknown option now point at the command's help. A test checks that every option a command parses is documented in its help.

## [0.1.0] - 2026-11-01

First complete version. Published to npm on 2026-11-02 (see the note at the top).

### Added

- **Core library** (`hash-design`): true-random hashes (`crypto.randomBytes(32)` → SHA-256) mapped through the fixed `hash-design/v1` decision tree onto 12 design dimensions: branch, voice, layout, type, palette, density, motion, motif, anchor, scale, surface and twist.
- **Design library** of 40 real-world genres in 6 families (print, document, signage, screen, craft, modernist). Each branch has 3 options per dimension with Google Fonts and CJK pairings, seven-colour palettes, grid numbers, radius / border / shadow policy and motion specs, all checked by a validator (contrast, banned fonts, framework colours, font diversity).
- **Collision handling with family spread**: rolls walk forward past used branches and, while families remain, past used families; branch order spreads each family evenly so per-branch frequency stays within 9–17% for 5-rolls. Refs (`<hash>+<probe>`) reproduce single designs.
- **Constraints**: light-only, dark-only, reduced motion, brand colours (nearest-hue palette with accent override), families, include / exclude branches.
- **Frozen briefs** in Markdown and JSON with mapping trace, facts, tokens, type scale, contrast table, `tokens.css`, the 14 global bans and a checklist; `writeRoll` freezes `roll.json`, `ROLL.md` and `briefs/`.
- **Critique engine**: static checks for all 14 bans plus contrast, `viewport`, `lang`, `img alt`, reduced motion, invented numbers and brief adherence (fonts, palette, radius / shadow policy).
- **Compare page** builder: previews side by side in scaled iframes with a desktop / mobile toggle and focus keys.
- **CLI** `hash-design`: `roll`, `brief`, `branches`, `branch`, `critique` (with `--fail-under`), `compare`, `skill install | print | path`.
- **MCP server** `hash-design-mcp` (stdio): tools `roll_designs`, `get_brief`, `list_branches`, `get_branch`, `critique_page`, `build_compare_page`; resources `hash-design://bans`, `hash-design://workflow`, `hash-design://branches`, `hash-design://branch/{id}`; prompt `hash-design`.
- **Agent Skill** (`skills/hash-design/SKILL.md`) for Claude Code and Cursor, with a bans block generated from the data and synced copies under `.claude/` and `.cursor/`.
- **Example**: Fourth Lane Bakery, a full run from facts to five independently rendered previews, a compare page and screenshots, published on GitHub Pages.
- **Tooling**: Vitest suite (core, CLI, MCP over in-memory transport, sync and example consistency), stdio smoke test, ESLint, Prettier, GitHub Actions CI on Node 20 / 22 / 24 with `npm pack --dry-run`, and a Pages workflow.

[Unreleased]: https://github.com/qybaihe/hash-design/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/qybaihe/hash-design/compare/ec5398a...v0.2.0
[0.1.0]: https://github.com/qybaihe/hash-design/tree/ec5398a
