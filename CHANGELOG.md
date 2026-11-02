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

### Fixed

- CLI subcommands now accept `--help` / `-h` (and `hash-design help <command>`) and print that command's options, instead of failing with `Unknown option '--help'`. Argument errors such as an unknown option now point at the command's help. A test checks that every option a command parses is documented in its help.

### Changed

- The package READMEs (`packages/core/README.md`, `packages/mcp/README.md`) now say the packages are not on npm yet and show the source install.

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
