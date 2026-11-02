# Contributing to hash-design

Thanks for your interest! Bug reports, fonts for the pool, better critique rules, documentation and translations are all welcome. By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

[中文摘要](#中文摘要)

## Ground rules

- **Do not let the model choose the style.** The project exists to take aesthetic choice away from the agent. Features that let an agent override a rolled direction "because it looks better" will not be accepted.
- **No invented facts.** Examples, fixtures and docs must not contain fake testimonials, user counts or logos.
- **Keep the CLI and the MCP server in parity.** Every MCP tool has a CLI equivalent, and both go through the core's public API.
- **Docs must match the code.** If you change a parameter, a flag, a tool or a default, update the docs in the same pull request.

## Development setup

Requires Node.js ≥ 20; `.nvmrc` pins 22.

```bash
git clone https://github.com/qybaihe/hash-design.git
cd hash-design
npm install
npm run build
npm run check   # typecheck + lint + prettier --check + vitest
node scripts/smoke.mjs
```

| Script                          | What it does                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run build`                 | `tsc -b` for both packages                                                                  |
| `npm test`                      | Vitest (core, CLI, MCP over in-memory transport, sync and example checks)                   |
| `npm run check`                 | Everything CI checks except the smoke test and pack dry-run                                 |
| `npm run format`                | Prettier `--write`                                                                          |
| `npm run sync`                  | Regenerate `SKILL.md`'s bans block and its `.claude/` / `.cursor/` copies                   |
| `node scripts/smoke.mjs`        | CLI + MCP server over real stdio                                                            |
| `node scripts/verify-fonts.mjs` | Check every Google Fonts URL online (not run in CI)                                         |
| `npm run examples`              | List the example runs and their seeds (`scripts/examples.mjs`)                              |
| `npm run example:roll`          | Re-roll an example with its fixed seed (`-- <name>` for one); skips hash-design/v1 records  |
| `npm run example:critique`      | Critique every example preview (against its brief unless it is a v1 record); fails below 90 |
| `npm run example:compare`       | Rebuild an example's `compare.html`; skips hash-design/v1 records                           |
| `npm run screenshots`           | Playwright screenshots of every example (`npx playwright install chromium` first)           |
| `npm run hero`                  | Rebuild `docs/assets/hero.png` and `social-preview.png` from the example screenshots        |
| `npm run hero:gif`              | Rebuild the animated `docs/assets/hero.gif` and `hero.mp4` (needs ffmpeg)                   |
| `npm run showcase`              | Rebuild the README showcase plates, `docs/assets/showcase/<example>.png`                    |

The code layout is described in [docs/architecture.md](docs/architecture.md), and the mapping algorithm in [docs/mapping.md](docs/mapping.md).

## Pull requests

1. Fork, then create a branch from `main`.
2. Make focused commits using [Conventional Commits](https://www.conventionalcommits.org/) as the history does: `feat(core): …`, `fix(mcp): …`, `docs: …`, `test: …`, `ci: …`, `chore: …`.
3. Run `npm run check` and `node scripts/smoke.mjs` locally.
4. Add an entry under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md) for user-visible changes.
5. Open the pull request and fill in the template. CI must be green on Node 20, 22 and 24.

## Changing the parameter space

There is no style library to add to: in `hash-design/v2` the hash is the direction, and the mapping reads only a flat font pool, a few lists of neutral primitives and the byte rules ([docs/mapping.md](docs/mapping.md)). Do not add genre names, mood tags or bundles of options that travel together; every entry must combine freely with every other.

1. **Fonts** live in `packages/core/src/data/fonts.ts` (display, body, mono, CJK). An entry is the Google Fonts family, the weights it really has, whether it has an italic, and a fallback stack. `mapping.test.ts` rejects duplicates and banned faces (fallbacks included). Run `node scripts/verify-fonts.mjs` so every URL a brief can emit resolves.
2. **Primitives** live in `packages/core/src/data/space.ts`. Each is `{ id, text }`, where `text` is the plain instruction a brief prints.
3. **Byte rules and formulas** live in `BYTE_MAP` and `mapDesign` in `packages/core/src/mapping.ts`, with the palette solver in `palette.ts`.
4. Any of these changes the library fingerprint, which `mapping.test.ts` pins: update the pinned value in the same commit and say why in the pull request. Changing which byte drives which parameter, or a formula, also requires bumping `ALGORITHM` (see [mapping.md §11](docs/mapping.md#11-changing-the-mapping)).
5. Update `docs/mapping.md` and `docs/mapping.zh-CN.md` (byte table and worked example), then run `npm run sync` so the Skill's generated block reports the new pool size.

## The examples

The four runs under `examples/` (`fourth-lane-bakery`, `sluice`, `bridge-two-bikes`, `causeway-festival`, listed in [`scripts/examples.mjs`](scripts/examples.mjs)) were rolled with `hash-design/v1` and are kept as records of real runs. v2 cannot reproduce them, so they do not need re-rolling when the mapping changes, and `npm run example:roll` / `example:compare` skip them. `examples.test.ts` still checks that each is labelled as a v1 run and that every preview scores at least 90 with no critical or major findings.

A new example made with the current algorithm would go through the full loop:

1. Add it to `EXAMPLES` in `scripts/examples.mjs` with a `facts.md`, then `npm run build && npm run example:roll -- <name>` writes `roll.json`, `ROLL.md` and `briefs/`.
2. Render one preview per brief following the [Skill](skills/hash-design/SKILL.md), step 3: each preview is produced from **its own brief only** (separate agent sessions), as a single self-contained HTML file in `previews/NN-<short>.html`.
3. `npm run example:critique -- <name>` must pass: every preview scores at least 90 with no critical or major findings.
4. `npm run example:compare -- <name>`, `npm run screenshots`, then `npm run showcase` for its README plate, and link it from `examples/index.html` and the Showcase section of every `README*.md`.

## Changing the critique rules

Rules live in `packages/core/src/critique.ts`. Add or adjust a fixture under `packages/core/test/fixtures/` and a test in `critique.test.ts` that shows the rule firing on bad input and staying quiet on good input. Keep the rule ids in sync with the bans in `packages/core/src/data/bans.ts`, then run `npm run sync`.

## Changing MCP tools or CLI flags

Update, in the same pull request: the tool schema in `packages/core/src/mcp.ts`, the CLI in `packages/core/src/cli.ts` (including `--help`), the tests, [docs/mcp-tools.md](docs/mcp-tools.md) and its Chinese version, the tool tables in all `README*.md` files, and the MCP ↔ CLI table in `skills/hash-design/SKILL.md` (then `npm run sync`).

## Documentation and translations

- `README.md` (English) is the source of truth. `README.zh-CN.md`, `README.ja.md`, `README.ko.md` and `README.es.md` are translations.
- When you change the English README, update the translations if you can. If you cannot, open an issue so a translator can follow up, and mention it in the pull request.
- Keep code blocks, commands, package names, tool names and flags identical across languages; only prose and comments are translated.
- New translations are welcome. Add the file as `README.<lang>.md` and add it to the language switcher in every README.

## Releasing

Only maintainers release. Publishing a GitHub Release tagged `v<version>` runs [`.github/workflows/release.yml`](.github/workflows/release.yml), which verifies everything and publishes `hash-design` (`packages/core`) to npm; pushes to `main` never publish. The MCP server ships inside `hash-design` (`hash-design mcp`); `packages/mcp` (`hash-design-mcp`) is a private wrapper for clones and is not published. The workflow authenticates with npm Trusted Publishing (OIDC), so there is no npm token or secret; the Trusted Publisher fields on npmjs.com and the step-by-step release are in [docs/publishing.md](docs/publishing.md). `npm run release:check` runs in CI and fails if `hash-design` stops being publishable or `packages/mcp` stops being private.

## Reporting bugs and requesting features

Use the [issue templates](https://github.com/qybaihe/hash-design/issues/new/choose). For security problems, follow [SECURITY.md](SECURITY.md) and do not open a public issue.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).

---

## 中文摘要

- **原则**：风格由骰子决定，不接受让 Agent "觉得更好看"就改方向的功能；示例和文档里不得编造事实；MCP 与 CLI 保持一一对应；改参数、命令或默认值时，同一个 PR 里同步更新文档。
- **开发**：Node ≥ 20（`.nvmrc` 为 22）。`npm install && npm run build && npm run check`，再跑 `node scripts/smoke.mjs`。
- **提交**：沿用 Conventional Commits（`feat(core): …`、`docs: …` 等）；用户可见的改动写进 `CHANGELOG.md` 的 `[Unreleased]`；CI 必须在 Node 20/22/24 上全绿。
- **参数空间**：v2 里哈希本身就是方向，没有风格库可加。可以改的是扁平字体池（`data/fonts.ts`）、中性原语列表（`data/space.ts`）和字节规则（`mapping.ts` 的 `BYTE_MAP`）。不要加流派名、情绪标签或捆绑在一起的选项。任何改动都会改变库指纹：在同一个提交里更新 `mapping.test.ts` 钉住的值；改字节分配或公式还要提升 `ALGORITHM`。改字体后跑 `node scripts/verify-fonts.mjs`，然后 `npm run sync`，并同步 `docs/mapping*.md`。
- **示例**：`examples/` 下的 4 个示例是用 `hash-design/v1` 掷的，作为真实运行的记录保留；v2 无法复现它们，所以改映射时不用重掷，`npm run example:roll` / `example:compare` 会跳过它们。`examples.test.ts` 仍检查它们标明了 v1，且每个预览 ≥ 90 分、无 critical/major。
- **翻译**：英文 `README.md` 是基准，其余语言是译本。代码块、命令、包名、工具名在各语言中保持一致。
- **发布**：只有维护者发布。发布 tag 为 `v<version>` 的 GitHub Release 会触发 `.github/workflows/release.yml`，校验通过后把 `hash-design`（`packages/core`）发布到 npm；推送到 `main` 不会发包。MCP server 包含在 `hash-design` 里（`hash-design mcp`）；`packages/mcp`（`hash-design-mcp`）是给克隆源码用的 private 包装，不发布。认证用 npm Trusted Publishing（OIDC），不需要 npm token 或 secret；npmjs.com 上 Trusted Publisher 的填写和完整步骤见 [docs/publishing.zh-CN.md](docs/publishing.zh-CN.md)。`npm run release:check` 在 CI 里运行，`hash-design` 不再可发布或 `packages/mcp` 不再是 private 时会失败。
- **安全问题**请按 [SECURITY.md](SECURITY.md) 私下报告，不要开公开 issue。
