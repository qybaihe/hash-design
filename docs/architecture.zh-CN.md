# 架构

[English](architecture.md) · [返回 README](../README.zh-CN.md)

hash-design 是一个 npm workspaces monorepo，包含两个包、一个 Skill 和四个记录下来的示例运行。全部用 TypeScript 编写（strict、ESM、Node ≥ 20）。

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

## 包

### `packages/core`（`hash-design`）

| 模块                       | 职责                                                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/hash.ts`              | `randomHash`（`crypto.getRandomValues` → SHA-256）、`seededHash`、`rollHashes`、`parseRef`（ref 就是哈希本身）、`ALGORITHM`（`hash-design/v2`）      |
| `src/sha256.ts`            | 纯 TypeScript 的 SHA-256（不依赖 `node:crypto`），哈希和指纹在浏览器里原样运行                                                                       |
| `src/browser.ts`           | 浏览器入口，导出为 `hash-design/browser`：除 `critique`、`files`、`skill`、CLI 和 MCP server 之外的全部；`index.ts` 重新导出它                       |
| `src/mapping.ts`           | `mapDesign`（一个哈希逐字节映射成一个设计）、`mapRoll`、约束、`BYTE_MAP`、`libraryFingerprint`、`scenarioFingerprint`、`DEFAULT_COUNT` / `MAX_COUNT` |
| `src/palette.ts`           | `buildPalette`：由色相 / 深浅 / 彩度字节构建 OKLCH 配色，文字颜色的明度按对比度下限解出                                                              |
| `src/color.ts`             | sRGB ↔ OKLCH（按降低彩度做色域映射）、WCAG 相对亮度与对比度                                                                                          |
| `src/data/fonts.ts`        | 扁平字体池：98 个标题字体、62 个正文字体、8 个等宽字体（Google Fonts）、14 个中文标题字体和 2 个中文正文字体；没有风格标签                           |
| `src/data/space.ts`        | 字节作为下标读取的短原语列表：大小写、分隔方式、锚点主体、母题形状与位置、材质、语气、变数                                                           |
| `src/data/scenarios.ts`    | 6 个场景（web、deck、app、dashboard、poster、email）：格式、画布、基准字号规则、密度范围、变数过滤、交付约定、规则                                   |
| `src/data/bans.ts`         | 14 条全局禁令、23 个禁用字体、框架默认颜色、中英文套话词表                                                                                           |
| `src/derive.ts`            | 派生 token：字号阶梯、字体栈、Google Fonts URL、WCAG 对比度报告、`tokens.css`、语言检测                                                              |
| `src/brief.ts`             | `roll`、`reproduce`、`directionLabel`、Markdown 和 JSON brief、掷骰摘要、`roll.json` 结构                                                            |
| `src/files.ts`             | `writeRoll`：冻结 `roll.json`、`ROLL.md` 和 `briefs/NN-<短哈希>.md`                                                                                  |
| `src/reply.ts`             | `renderReply`、`replyLine`：掷骰后和对比页后 Agent 发给用户的简短回复（见 [mcp-tools.zh-CN.md](mcp-tools.zh-CN.md#回复协议)）                        |
| `src/critique.ts`          | `critiquePage`：针对每条禁令的 HTML/CSS 静态检查，外加对比度 / 无障碍基础项和 brief 遵守度                                                           |
| `src/compare.ts`           | `buildComparePage`：一个自包含的 HTML 文件，含缩放的 iframe、标签、桌面/手机切换、聚焦快捷键                                                         |
| `src/skill.ts`             | 定位 `SKILL.md`（仓库内或包内副本），并渲染生成的禁令块                                                                                              |
| `src/cli.ts`, `src/bin.ts` | `hash-design` CLI（用 `node:util` 的 `parseArgs`，不用 CLI 框架）                                                                                    |
| `src/mcp.ts`               | MCP server（`createServer`、`serveStdio`；4 个工具、2 个资源、1 个 prompt），由 `hash-design mcp` 加载；以 `hash-design/mcp` 导出                    |

运行时依赖：`node-html-parser`（供 `critique_page` 使用），以及 MCP server 用的 `@modelcontextprotocol/sdk` 和 `zod`；CLI 只在 `hash-design mcp` 时才加载它们。

### MCP server（`src/mcp.ts`、`packages/mcp`）

基于 `@modelcontextprotocol/sdk` 和 `zod` 输入 schema，在 core 的公开 API 之上做的一层薄适配，用 `hash-design mcp` 启动。`packages/mcp`（`hash-design-mcp`，private）只是重新导出它，所以在克隆的源码里 `node packages/mcp/dist/bin.js` 照样能用。每个工具都有对应的 CLI 命令，另有一个测试检查：带 seed 调用 `roll_designs`，返回的 ref 与 core 的 `roll` 用同一 seed 得到的完全一致。见 [mcp-tools.zh-CN.md](mcp-tools.zh-CN.md)。

设计取舍：

- **扁平的约束参数**（`light_only`、`brand_colors`……），而不是嵌套对象：模型填扁平 schema 更可靠。
- `roll_designs` 返回**两个内容块**：给模型读的 Markdown，以及给程序化客户端用的一个小 JSON 块。
- **设置了 `out_dir` 时默认 `detail: summary`**，这样五份完整 brief 不会塞满上下文；之后由 Agent 分别读取每个 brief 文件，正是这一点保证了预览彼此独立。
- 工具注解把 `get_brief` 和 `critique_page` 标为只读。

## 数据即代码

没有风格目录。映射在哈希之外读取的，只有几份 TypeScript 列表：

- **字体**（`data/fonts.ts`）：字体名、它在 Google Fonts 上真实存在的字重、是否有斜体、回退类别。仅此而已：没有情绪、年代或流派标签，所以一个字节选中一个字体，选中本身不暗示任何风格。
- **原语**（`data/space.ts`）：中性构件的短列表（`{ id, text }`），例如 12 种母题形状、8 种锚点主体、9 个变数对象和 10 种变数操作。它们彼此之间、与连续值之间都可以自由组合；没有哪一项绑定另一项。
- **场景**（`data/scenarios.ts`）：每个场景有双语摘要、交付约定、数量、版式 / 锚点 / 动效如何落地的说明、基准字号规则、格式（第 28 字节）、密度范围、要移除的变数对象和操作，以及必须 / 不要清单。它们单独计算 `scenarioFingerprint`。见 [mapping.zh-CN.md §7](mapping.zh-CN.md#7-场景)。

字体、原语和 `BYTE_MAP` 一起计入库指纹，`mapping.test.ts` 钉住了这个值，所以任何会改变哈希映射结果的改动都是看得见的。`mapping.test.ts` 还检查：字体池没有重复、不含禁用字体；在数千个随机哈希上，两种深浅的配色都满足对比度下限；每个字节只改变它自己的参数。`scripts/verify-fonts.mjs` 在线检查 brief 可能输出的每个 Google Fonts URL；它需要联网，所以不在 CI 里跑。

## 生成的文件

`npm run sync`（build + `scripts/sync.mjs`）会重新生成由数据派生的内容：

- `skills/hash-design/SKILL.md` 里位于 `<!-- BEGIN GENERATED: bans (npm run sync) -->` 和 `<!-- END GENERATED: bans -->` 之间的禁令块（也写明字体池大小）
- 副本 `.claude/skills/hash-design/SKILL.md` 和 `.cursor/skills/hash-design/SKILL.md`

其中任何一个过期，`skill.test.ts` 都会失败。

## 示例

`examples/` 下的 4 个示例（面包店、开发者工具、单车修理铺、音乐节）是 `hash-design/v2` 的运行：事实、用固定 seed（文件夹名）的一次掷骰、冻结的 brief、每份 brief 一个子 Agent 按 Skill 流程做的预览、截图和对比页。`examples.test.ts` 检查：每次掷骰能用 seed 和当前库指纹复现；磁盘上的每份 brief 都和它的 ref 渲染出来的一字不差；每个预览和截图都在；每个预览 critique 不低于 90 分、brief 遵守度不低于 80，且没有 critical/major；Pages 首页和 README 链接到每个示例。`scripts/examples.mjs` 负责重掷、批量 critique、重建对比页和 Pages 首页；`scripts/showcase.mjs`、`hero.mjs` 和 `hero-gif.mjs` 用掷骰结果和截图生成 README 的展示图和首图。

## 测试与 CI

- **Vitest**，`packages/core/test` 下 14 个测试文件：`hash`、`mapping`、`count`（N）、`scenarios`、`brief`、`reply`、`critique`（带好/坏两类 HTML 夹具）、`compare`、`cli`、`skill`（同步检查）、`examples`、`release`（发布就绪检查）、`mcp`（in-memory transport），以及 `browser`（纯 TypeScript SHA-256 对照 `node:crypto` 和 FIPS 向量；用 Vite 打包 `hash-design/browser`，不含 Node 内置模块，映射结果与库完全一致）。
- **`scripts/smoke.mjs`**：运行构建好的 CLI，并通过真实的 stdio 管道与 `hash-design mcp` 和 `packages/mcp` 包装通信。
- **CI**（`.github/workflows/ci.yml`），在 Node 20、22 和 24 上依次跑：`npm ci`、build、typecheck（含测试）、ESLint、Prettier 检查、测试、冒烟测试，以及两个包的 `npm pack --dry-run`。
- **Pages**（`.github/workflows/pages.yml`）：`examples/` 有改动时发布到 GitHub Pages。

## 打包

只有 `packages/core` 会发布，包名 `hash-design`（0.1.0 自 2026-11-02 起已在 npm 上）。它的 `prepack` 会把 `SKILL.md` 和 `LICENSE` 复制进包里，这样从 npm 安装后 `hash-design skill install` 也能用；`tsbuildinfo` 文件不会打进 tarball。这个包还带着 MCP server（`hash-design mcp`，0.2.0 起）及其两个依赖。`packages/mcp` 是给克隆源码用的 private 包装；它按版本号（`^<version>`）依赖 `hash-design`，npm 通过链接工作区来满足这个依赖。发布流程见 [publishing.zh-CN.md](publishing.zh-CN.md)。
