# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Neither package (`hash-design`, `hash-design-mcp`) has been published to npm yet, and no git tag has been created. Version 0.1.0 below is the state of `main` at commit `ec5398a`.

## [Unreleased]

### Added

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
- `scripts/hero-gif.mjs` (`npm run hero:gif`) renders an animated hero from the same example: `/hash-design` picked in a prompt box, five SHA-256 refs ticking and locking to the real ones, the five previews popping in and lining up as a compare row. Frames are captured deterministically at `t = i / fps` and encoded to `docs/assets/hero.gif` (960 px, 20 fps, 6 s loop) and `docs/assets/hero.mp4` (H.264).

- npm release automation, nothing published yet: `.github/workflows/release.yml` publishes `hash-design` and then `hash-design-mcp` with provenance when a GitHub Release tagged `v<version>` is published (never on a plain push; a manual run is a dry run). It authenticates with npm Trusted Publishing (OIDC: `id-token: write`, npm ≥ 11.5.1), so no npm token or repository secret is used; because a Trusted Publisher can only be attached to an existing package, the first version of each package is published once by hand, as `docs/publishing.md` describes. `scripts/release-check.mjs` (`npm run release:check`, now also in CI instead of the bare `npm pack --dry-run`) checks lockstep versions, the tag, the CHANGELOG section, the publish fields and the tarball contents. `scripts/release-version.mjs` (`npm run release:version -- <version>`) sets one version across the workspace. Setup and steps: [docs/publishing.md](docs/publishing.md).

### Changed

- All five READMEs share one structure, modelled on [qybaihe/bla](https://github.com/qybaihe/bla): a centred header with the GIF, badges, links, section nav and a copy-paste "tell your agent" install sentence; then What hash-design does, Quick start (Tell your agent, Install by hand, Use it, CLI, Library, Update), How it works, Examples, Reference, FAQ (which absorbs Known limitations), Documentation, Contributing and License. Install by hand clones to `~/hash-design`.
- The READMEs' Examples section is now Showcase: one plate per example linked to its folder, a single link to the examples site, and no per-direction preview tables. `examples.test.ts` checks for the plate in every README.
- The Fourth Lane Bakery per-direction notes moved from `README.zh-CN.md` to `examples/fourth-lane-bakery/README.md`.
- Every README now opens with the animated hero; readers who prefer reduced motion get the static `hero.png` through a `<picture>` source.
- The first screen of every README: a problem-first pitch, four badges (the rest in a collapsed block), the new hero linked to the Causeway compare page, a quick start that installs from source, and a four-line overview. The Fourth Lane Bakery compare image moved to the top of each Demo section.
- `npm run screenshots` now covers every example; `node scripts/screenshot.mjs <name|dir> [prefix]` still shoots one.
- The package READMEs (`packages/core/README.md`, `packages/mcp/README.md`) now say the packages are not on npm yet and show the source install.
- `examples.test.ts` checks every example instead of only the bakery: refs, briefs and library fingerprint, a preview and screenshots per brief, a critique score of at least 90 with no critical or major findings, no branch shared between examples, and links from the Pages index and every README.

### Fixed

- CLI subcommands now accept `--help` / `-h` (and `hash-design help <command>`) and print that command's options, instead of failing with `Unknown option '--help'`. Argument errors such as an unknown option now point at the command's help. A test checks that every option a command parses is documented in its help.

## [0.1.0] - 2026-11-01

First complete version, not yet published to npm.

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

[Unreleased]: https://github.com/qybaihe/hash-design/compare/ec5398a...HEAD
[0.1.0]: https://github.com/qybaihe/hash-design/tree/ec5398a
