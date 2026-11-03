# MCP server 参考

[English](mcp-tools.md) · [返回 README](../README.zh-CN.md)

hash-design 的 MCP server 是一个基于官方 TypeScript SDK 的 stdio [Model Context Protocol](https://modelcontextprotocol.io) server。它包含在 npm 包 `hash-design` 里，用 `hash-design mcp` 启动。源码：[`packages/core/src/mcp.ts`](../packages/core/src/mcp.ts)；`packages/mcp` 是一个 private 包装，在克隆的源码里运行同一个 server。它提供 4 个工具、2 个资源和 1 个 prompt，并向客户端发送概括工作流程的 server instructions。

> 在客户端里注册 `npx -y hash-design mcp`。`mcp` 命令从下一个版本 hash-design 0.2.0 开始提供，0.1.0 里没有。0.2.0 发布之前，用 `npx -y hash-design-mcp@0.1.0`（之前单独发布的 hash-design/v1 server，带分支库的 6 个工具，不再更新），或者克隆源码运行：`node /ABS/PATH/hash-design/packages/mcp/dist/bin.js`。见[手动安装](../README.zh-CN.md#手动安装)。

## 工作目录与文件访问

server 在本地以你的用户权限运行，不发起任何网络请求。相对路径（`out_dir`、`path`、`roll_path`、`out_path`）按 **server 的工作目录**解析，也就是客户端启动它时所在的目录。Claude Code 和 Cursor 通常在项目目录里启动它；Claude Desktop 不会，所以在 Claude Desktop 里请传绝对路径。

会读写文件系统的工具：

| 工具                 | 读取                  | 写入                                                               |
| -------------------- | --------------------- | ------------------------------------------------------------------ |
| `roll_designs`       | —                     | `out_dir` 下的 `roll.json`、`ROLL.md`、`briefs/*.md`（仅在传入时） |
| `critique_page`      | `path`, `roll_path`   | —                                                                  |
| `build_compare_page` | `roll_path`、预览列表 | `compare.html`（或 `out_path`）                                    |

## 共用的约束参数

`roll_designs`、`get_brief` 和 `critique_page` 接受同样的扁平约束字段，详见 [mapping.zh-CN.md §6](mapping.zh-CN.md#6-约束)，`scenario` 见 [§7](mapping.zh-CN.md#7-场景)。

| 参数             | 类型                             | 含义                                                                                                                     |
| ---------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `light_only`     | boolean                          | 浅色纸（此时字节 2 只决定纸的明度）                                                                                      |
| `dark_only`      | boolean                          | 深色纸（此时字节 2 只决定纸的明度）                                                                                      |
| `reduced_motion` | boolean                          | 无动效：时长 0，缓动 `none`                                                                                              |
| `brand_colors`   | string[] (≤ 2, `#rgb`/`#rrggbb`) | `[accent]` 或 `[accent, accent2]`；第一个同时决定色相                                                                    |
| `scenario`       | enum                             | `web`（默认）`deck` `app` `dashboard` `poster` `email`。非 web 场景会给每份 brief 加上格式（第 28 字节）、画布和输出规则 |

没有风格、家族或分支过滤：`hash-design/v2` 没有可供过滤的风格库。

掷 N 个真随机哈希；每个哈希就是一个设计方向，按字节映射到连续参数上（见 [mapping.zh-CN.md](mapping.zh-CN.md)）。非只读、非幂等（每次不带 `seed` 的调用都是一次新的掷骰）。

| 参数       | 类型                | 默认值                                     | 说明                                                         |
| ---------- | ------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| `subject`  | string，必填        | —                                          | 页面是做什么的                                               |
| `facts`    | string[]            | `[]`                                       | 页面唯一可以陈述的事实                                       |
| `count`    | integer 1–12        | 5                                          | 每个方向各是一个独立的哈希，约束不会降低上限                 |
| `seed`     | string              | —                                          | 可复现的掷骰，仅用于示例/测试                                |
| `language` | `zh` \| `en`        | 根据 subject 和 facts 自动判断             | brief 的语言                                                 |
| `out_dir`  | string              | —                                          | 把 `roll.json`、`ROLL.md`、`briefs/NN-<short>.md` 冻结到这里 |
| `detail`   | `full` \| `summary` | 有 `out_dir` 时为 `summary`，否则为 `full` | 是否把每份 brief 都内联在返回结果里                          |
| 约束       | 见上文              |                                            |                                                              |

返回两个文本块：（1）Markdown（汇总表、ref、写入的文件、`detail = full` 时的 brief，以及要发给用户的 [reply](#回复协议)）；（2）一个 JSON 对象 `{ reply, source, library, constraints, designs: [{ number, ref, label, format? }] }`，供程序使用。`ref` 是 64 位十六进制哈希，`label` 是一行摘要，例如 `light · 156° · Libre Franklin / Atkinson Hyperlegible · 4 col`；只有非 web 的 `scenario` 才有 `format`。

CLI：`hash-design roll --subject … --fact … --facts-file … --count … --seed … --out … --format md|json|summary|reply [约束参数，如 --scenario deck]`。`--format reply` 打印 reply（带 `--out` 时打印在文件列表之后）。CLI 没有 `--language` 参数，始终自动判断。

### `get_brief`

为一个 ref 重建 brief。只读且幂等：同样的 ref + 约束（含场景）+ 库，永远得到同一份 brief。

| 参数       | 类型                 | 说明                   |
| ---------- | -------------------- | ---------------------- |
| `ref`      | string，必填         | 64 位十六进制哈希      |
| `subject`  | string               | 放回 brief 的内容部分  |
| `facts`    | string[]             |                        |
| `language` | `zh` \| `en`         |                        |
| `format`   | `markdown` \| `json` | 默认 `markdown`        |
| 约束       | 见上文               | 必须与掷骰时的约束一致 |

CLI：`hash-design brief <ref> [constraints] [--subject …] [--fact …] [--format md|json]`。

### `critique_page`

对 HTML 页面做静态评审：对照 14 条全局禁令，外加对比度、`viewport`、`lang`、`img alt` 和 reduced-motion 检查。提供 brief 时还会给遵守度打分（brief 的字体和配色、圆角和阴影规则）。brief 带非 web 场景时，还会按规则 `scenario-<id>` 检查场景的输出约定：`deck` 至少 3 页、1920×1080 或 16:9 画布、键盘翻页；`app` 390 px 机框、至少 2 屏；`dashboard` 等宽数字；`poster` 格式的宽和高；`email` 不含 `<script>`、用 `<table>` 布局、写明栏宽。只读。

| 参数        | 类型                 | 说明                                                                          |
| ----------- | -------------------- | ----------------------------------------------------------------------------- |
| `html`      | string               | 完整 HTML 源码（提供 `html` 或 `path`）                                       |
| `path`      | string               | HTML 文件，相对于 server 的 cwd                                               |
| `css`       | string               | 没有内联在 HTML 里的额外 CSS                                                  |
| `brief_ref` | string               | 用来检查遵守度的 ref（加上同样的约束）                                        |
| `roll_path` | string               | `roll_designs` 产出的 `roll.json`（可替代 `brief_ref`）                       |
| `pick`      | integer ≥ 1          | `roll_path` 里的设计编号                                                      |
| `facts`     | string[]             | 页面上出现但不在事实里的数字会被标记；使用 `roll_path` 时默认取该次掷骰的事实 |
| `format`    | `markdown` \| `json` |                                                                               |
| 约束        | 见上文               | 与 `brief_ref` 一起使用                                                       |

评分：从 100 分起扣，每个 critical 问题扣 25 分，每个 major 扣 10 分，每个 minor 扣 4 分。等级：A ≥ 90，B ≥ 75，C ≥ 60，D ≥ 40，再低为 F。遵守度是单独的 0–100 分，只在提供了 brief 时才有。

CLI：`hash-design critique <page.html> [--css <file>] [--brief <ref> | --roll <roll.json> --pick <n>] [--facts-file <path>] [--json] [--fail-under <score>]`。使用 `--fail-under` 时，分数低于阈值 CLI 就以退出码 1 退出，因此可以用在 CI 里。

### `build_compare_page`

写出 `compare.html`：把每个预览放进缩放的 iframe 里并排展示，每张卡片标题为 `方向 <短哈希>`（英文 roll 为 `Direction <short hash>`），并写明深浅与色相、色块、字体、栅格、密度、语气和变数，带桌面 / 手机切换和聚焦模式（按键 1–9）。非 web 场景下，副标题和每张卡片会写明场景和格式；固定画布（`deck`、`poster`）按真实尺寸缩放，“桌面”按钮变为“画布”。预览应位于 `<previews_dir>/NN-<short>.html`，缺失的会被列出来；全部齐全时返回第二段 [reply](#回复协议)。按键 1–9 聚焦前九个预览，←/→ 可以逐个切换全部预览。页面上的标签、按钮和操作说明跟随这次 roll 的语言（`roll.json` 里的 `content.language`，中文或英文）。

| 参数           | 类型         | 默认值                            |
| -------------- | ------------ | --------------------------------- |
| `roll_path`    | string，必填 | —                                 |
| `out_path`     | string       | `roll.json` 旁边的 `compare.html` |
| `previews_dir` | string       | `previews`（相对于 `roll.json`）  |
| `briefs_dir`   | string       | `briefs`（相对于 `roll.json`）    |
| `title`        | string       | 该次掷骰的 subject                |

CLI：`hash-design compare [--roll <roll.json>] [--out <compare.html>] [--previews <dir>] [--briefs <dir>] [--title <t>]`。

## 回复协议

Agent 对用户说什么是固定的，所以换哪个 Agent 都一样简短。库里的 `renderReply()` 从冻结的数据生成它；`roll_designs` 会返回它（JSON 块里也有 `reply`），`build_compare_page` 返回第二段，CLI 用 `roll --format reply` 和 `compare` 打印。Skill 要求 Agent 原样发给用户（用户用别的语言就翻译），然后停下。

```text
**hash-design** · N directions for “<subject>” · <scenario> · <true-random | seed …>

1. **<Display face>** / <Body face> — <light|dark> paper, hue <H>° · <C>-column grid · anchor: <subject>[ · <format>] · `<short ref>`
…

Reply with a number to build that direction as the final <page|deck|app screens|dashboard|poster|email>, **render** to see all N as previews side by side first, or **reroll** for a new set.
```

| 用户回复          | Agent 做什么                                                           |
| ----------------- | ---------------------------------------------------------------------- |
| 编号              | 只按那份 brief 做正式产物，然后调用 `critique_page`                    |
| `render` / 预览   | 每份 brief 一个独立预览，`build_compare_page`，发出第二段 reply 并停下 |
| `reroll` / 重掷   | 重新掷（新的真随机哈希）                                               |
| 混搭（"#2 + #4"） | 照做，并在文件里注明两个 ref                                           |

每一行的字段都直接读自映射出的数字：标题和正文字体、纸面深浅和 OKLCH 色相、栅格栏数、首屏锚点、非 web 场景的格式，以及短 ref。非 web 场景会加上格式，并在问句里说出产物名称。对比页之后，标题行变为 `**hash-design** · N 个预览已并排：<路径>`，问句只问编号。中文 roll 的 reply 是中文。

真实输出，来自 `hash-design roll --subject "第四巷面包店" --fact "周一休息" --seed reply-demo --count 3 --scenario app --format reply`：

```text
**hash-design** · 为「第四巷面包店」掷出 3 个方向 · 手机 App 界面 · seed reply-demo

1. **Caveat** / Literata — 浅色纸，色相 330° · 5 栏网格 · 首屏锚点 initial · 顶部分段 + 返回栈 · `ea849a45`
2. **Hanken Grotesk** / Crimson Pro — 浅色纸，色相 344° · 10 栏网格 · 首屏锚点 number · 单任务流程 · `f458a091`
3. **Overpass** / Barlow Condensed — 浅色纸，色相 234° · 5 栏网格 · 首屏锚点 grid-diagram · 顶部分段 + 返回栈 · `a6b46334`

回复编号，直接按该方向做正式 App 界面；回复「预览」先把 3 个方向都做成预览并排对比；回复「重掷」换一批。
```

`packages/core/test/reply.test.ts` 会对三次掷骰（web N=3、中文 deck N=7、email N=1）检查这个形状，并检查 Skill 里的示意与之一致。

## 资源

| URI                      | 内容                                        |
| ------------------------ | ------------------------------------------- |
| `hash-design://bans`     | 14 条全局禁令，含 id 和严重程度（Markdown） |
| `hash-design://workflow` | 完整的 Skill（`SKILL.md`）                  |

## Prompt

`hash-design`，参数为 `subject`（必填）、`facts`（每行一条）、`count` 和 `scenario`。它会展开成一条用户消息，带 Agent 依次完成：用 `out_dir="design/hash-design"`、给定的场景、不带 seed 调用 `roll_designs` → 发出 reply 并停下 → 用户回复“render”时：每份 brief 做一个预览，用 `roll_path` + `pick` 调用 `critique_page`，`build_compare_page`，发出它的 reply 并停下 → 用户回复编号时：按那份 brief 做正式产物，并再评审一次。

## 一次掷骰写出的文件

```
design/hash-design/
  roll.json            # algorithm、library、createdAt、source、constraints、content、designs[]（完整 brief JSON）
  ROLL.md              # 汇总表 + 完整 ref
  briefs/01-<short>.md          # <short> = 哈希的前 8 位十六进制
  …
  previews/01-<short>.html      # 由 Agent 写出，每份 brief 一个
  compare.html                # 由 build_compare_page 写出
```

## 客户端配置

Claude Code、Cursor 和 Claude Desktop 的配置见 README 中的[手动安装](../README.zh-CN.md#手动安装)。命令是 `npx -y hash-design mcp`（hash-design 0.2.0 及以后）；在那之前用 `npx -y hash-design-mcp@0.1.0`，或克隆源码里的 `node …/packages/mcp/dist/bin.js`。

## 测试

`packages/core/test/mcp.test.ts` 通过 SDK 的 in-memory transport 驱动 server，其中一个测试检查带 seed 调用 `roll_designs` 返回的结果与库的 `roll` 用同一 seed 得到的完全一致，另一个检查没有暴露任何分支工具或分支约束字段。`scripts/smoke.mjs` 在 CI 中通过真实的 stdio 启动 `hash-design mcp` 和 `packages/mcp` 包装。
