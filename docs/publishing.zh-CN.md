# 发布到 npm

[English](publishing.md) · [返回 README](../README.zh-CN.md)

本页写给维护者。目前还没有发布过任何版本：第一次以及以后每次发布都按下面的步骤走。

## 包

| 包                | 目录            | 内容                                             | 命令              |
| ----------------- | --------------- | ------------------------------------------------ | ----------------- |
| `hash-design`     | `packages/core` | 库、CLI、`skill/SKILL.md`（由 prepack 复制进来） | `hash-design`     |
| `hash-design-mcp` | `packages/mcp`  | stdio MCP server；依赖 `hash-design`             | `hash-design-mcp` |

撰写本文时这两个名字在 npm 上都还没人用（2026-11-02 运行 `npm view hash-design` 和 `npm view hash-design-mcp` 均返回 404）。如果某个不带 scope 的名字和已有的包太像，npm 仍可能在发布时拒绝；备选方案是 `@qybaihe` scope（`@qybaihe/hash-design`、`@qybaihe/hash-design-mcp`），那样还要同时修改 `packages/mcp` 的依赖、`packages/mcp/src` 里的 import、文档和 `scripts/release-check.mjs`。

根目录的 `package.json` 是 private，永远不会发布。三个 `package.json` 共用同一个版本号。

## 发布是怎么进行的

[`.github/workflows/release.yml`](../.github/workflows/release.yml) 在**发布 GitHub Release** 时运行。推送到 `main` 不会触发它，所以合并代码永远不会发包。这个工作流会：

1. 检查 release 的 tag 是否为 `v<version>`，根目录、`hash-design`、`hash-design-mcp` 的版本是否一致，`hash-design-mcp` 是否依赖 `^<version>`，`CHANGELOG.md` 是否有 `## [<version>]` 一节，两个包的发布字段是否齐全（`scripts/release-check.mjs`）；
2. 运行构建、类型检查、lint、格式检查、测试和 stdio 冒烟测试；
3. 打出两个 tarball 并检查内容（不含测试，包含 Skill 和 LICENSE）；
4. 先发布 `hash-design`，再发布 `hash-design-mcp`，并附带 [provenance](https://docs.npmjs.com/generating-provenance-statements)。npm 上已存在的版本会跳过，所以失败后可以直接重跑。带预发布后缀的版本（`0.3.0-rc.1`）或标记为 pre-release 的 release 发布到 `next` dist-tag，而不是 `latest`。

手动运行这个工作流（Actions → Release → Run workflow）只是演练：只检查和打包，不发布任何东西。

## 一次性设置：`NPM_TOKEN` secret

工作流从仓库 secret `NPM_TOKEN` 读取 token，token 永远不会存进仓库。

1. 在 [npmjs.com](https://www.npmjs.com) 用将来拥有这两个包的账号登录，打开头像菜单 → **Access Tokens** → **Generate New Token**。npm 从 2025 年 11 月起不再签发经典的 "automation" token，所以这里生成的是 **granular access token**：
   - **Packages and scopes → Permissions**：选 _Read and write_（可发布）。
   - **选择包**：第一次发布选 _All packages_（还不存在的包没法单独选）。首次发布之后，可以换成只限 `hash-design` 和 `hash-design-mcp` 的 token。
   - **Bypass two-factor authentication**：如果你的账号要求发布时做 2FA，就勾上；否则工作流会报 `EOTP` 失败。
   - **Expiration**：npm 规定有写权限的 token 最长 90 天，记下到期日，到期前轮换 secret。
2. 在 GitHub 打开仓库 → **Settings → Secrets and variables → Actions → New repository secret**。Name 填 `NPM_TOKEN`，Value 填 token，保存。

可选，在首次发布之后：在 npmjs.com 上每个包的设置页配置 [npm trusted publishing](https://docs.npmjs.com/trusted-publishers)（publisher 选 GitHub Actions；owner `qybaihe`；repository `hash-design`；workflow filename `release.yml`）。工作流已经有 `id-token: write`，npm 也 ≥ 11.5.1，所以两个包都信任这个工作流之后，就可以删掉 `NPM_TOKEN`，不再依赖长期 token。

## 发布步骤

1. 从最新、CI 全绿的 `main` 开始。
2. 统一设置版本号并刷新 `package-lock.json`：

   ```bash
   npm run release:version -- 0.2.0
   ```

3. 在 `CHANGELOG.md` 里把 `[Unreleased]` 的条目移到 `## [0.2.0] - YYYY-MM-DD` 下面，并更新"尚未发布到 npm"的说明。
4. 本地检查，然后通过 pull request 提交并合并：

   ```bash
   npm run check && npm run release:check
   git switch -c release/v0.2.0 && git commit -am "chore(release): 0.2.0"
   ```

5. 合并后，从 `main` 上的合并提交发布一个 tag 为 `v0.2.0` 的 GitHub Release：可以在网页上操作（Releases → Draft a new release → 新建 tag `v0.2.0` → Publish release），也可以运行：

   ```bash
   git switch main && git pull
   gh release create v0.2.0 --target main --title "v0.2.0" --notes "See CHANGELOG.md"
   ```

   由其他工作流用 `GITHUB_TOKEN` 创建的 release 不会触发发布工作流，请自己创建。

6. 查看 **Actions → Release**。变绿后检查 `npm view hash-design version`、`npx -y hash-design --help` 和 `npx -y hash-design-mcp`（它会在 stdin 上等待 MCP 客户端，按 Ctrl-C 退出）。
7. 首次发布之后，更新所有"尚未发布到 npm"的说明：五个 README（每种语言做同样的修改）、`packages/core/README.md`、`packages/mcp/README.md`、`docs/mcp-tools*.md` 和 Skill，让 `npx -y hash-design` 和 `npx -y hash-design-mcp` 成为文档里的安装方式。

`npm run release:check` 也会在每次 push 和 pull request 的 CI 里运行，所以包清单一旦变得不可发布，CI 会在发版之前就报错。
