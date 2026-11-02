# 发布到 npm

[English](publishing.md) · [返回 README](../README.zh-CN.md)

本页写给维护者。目前还没有发布过任何版本。正式发布由 GitHub Actions 通过 [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers)（OIDC）完成：不创建 npm token，不存成 secret，工作流也不读取任何 token。npm 只能给**已经存在**的包添加 Trusted Publisher，所以每个包的第一个版本要手动发布一次。

顺序：

1. [首次发布（一次性，手动）](#首次发布一次性手动)
2. [在 npmjs.com 上添加 Trusted Publisher](#在-npmjscom-上添加-trusted-publisher)（每个包一次）
3. 之后每个版本按[发布步骤](#发布步骤)走

## 包

| 包                | 目录            | 内容                                             | 命令              |
| ----------------- | --------------- | ------------------------------------------------ | ----------------- |
| `hash-design`     | `packages/core` | 库、CLI、`skill/SKILL.md`（由 prepack 复制进来） | `hash-design`     |
| `hash-design-mcp` | `packages/mcp`  | stdio MCP server；依赖 `hash-design`             | `hash-design-mcp` |

撰写本文时这两个名字在 npm 上都还没人用（2026-11-02 运行 `npm view hash-design` 和 `npm view hash-design-mcp` 均返回 404），两个包都将归 npm 账号 `qybaihe` 所有。如果某个不带 scope 的名字和已有的包太像，npm 仍可能在发布时拒绝；备选方案是 `@qybaihe` scope（`@qybaihe/hash-design`、`@qybaihe/hash-design-mcp`），那样还要同时修改 `packages/mcp` 的依赖、`packages/mcp/src` 里的 import、文档、`scripts/release-check.mjs` 和工作流里的包名列表。

根目录的 `package.json` 是 private，永远不会发布。三个 `package.json` 共用同一个版本号。

## 发布工作流

| 项目   | 内容                                                                                                                                                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 文件   | [`.github/workflows/release.yml`](../.github/workflows/release.yml)，所以 npm 要填的 workflow filename 是 `release.yml`                                                                 |
| 触发   | **发布 GitHub Release**，tag 为 `v<version>`（`release: types: [published]`）。推送到 `main` 永远不会发包。手动运行（Actions → Release → Run workflow）只是演练：只检查和打包，不发布。 |
| 权限   | `contents: read`、`id-token: write`（npm 用这个 OIDC token 换取短期的发布凭证）                                                                                                         |
| Secret | 无                                                                                                                                                                                      |

工作流会：

1. 检查 release 的 tag 是否为 `v<version>`，根目录、`hash-design`、`hash-design-mcp` 的版本是否一致，`hash-design-mcp` 是否依赖 `^<version>`，`CHANGELOG.md` 是否有 `## [<version>]` 一节，两个包的发布字段是否齐全，包括 provenance 要核对的 `repository`（`scripts/release-check.mjs`）；
2. 在 Node 24 + npm 11 上运行构建、类型检查、lint、格式检查、测试和 stdio 冒烟测试（npm 低于 11.5.1，即 trusted publishing 的最低版本时直接失败）；
3. 打出两个 tarball 并检查内容（不含测试，包含 Skill 和 LICENSE）；
4. 先发布 `hash-design`，再发布 `hash-design-mcp`，命令是 `npm publish <tarball> --provenance --access public`。npm 上已存在的版本会跳过，所以失败后可以直接重跑。npm 上还不存在的包会让任务停下，并提示去做下面的首次发布。带预发布后缀的版本（`0.3.0-rc.1`）或标记为 pre-release 的 release 发布到 `next` dist-tag，而不是 `latest`。

## 首次发布（一次性，手动）

Trusted Publisher 是在包的设置页上配置的，npm 的 [`npm trust`](https://docs.npmjs.com/cli/v11/commands/npm-trust) 文档写明"要配置的包必须已经存在于 npm registry 上"。trusted publishing 不能创建新包，所以每个包的第一个版本要由维护者在自己的电脑上发布。不要在 CI 里做，也不要为此创建 token；用开启了双重验证的 `npm login` 即可。

1. 按[发布步骤](#发布步骤)第 1–4 步准备好版本（改版本号、CHANGELOG、合并 pull request）。
2. 在干净、最新、位于合并提交的 `main` 上：

   ```bash
   git switch main && git pull && git status        # nothing to commit
   npm ci && npm run build && npm run check && npm run release:check
   npm login                                        # as qybaihe, with 2FA
   npm whoami                                       # must print qybaihe
   npm publish -w hash-design --access public       # core first …
   npm publish -w hash-design-mcp --access public   # … then the MCP server that depends on it
   ```

   这个首发版本没有 provenance 声明：npm 只能在受支持的 CI 里生成 provenance。

3. 发布 GitHub Release `v<version>`（发布步骤第 5 步）。工作流会跑完全部检查，并因为该版本已在 npm 上而跳过两个包，这也在第一次自动发布之前验证了整条流程。
4. 给两个包添加 Trusted Publisher（下一节）。之后每个版本都走工作流。

## 在 npmjs.com 上添加 Trusted Publisher

以 `qybaihe` 登录 [npmjs.com](https://www.npmjs.com)，先对 **`hash-design`**、再对 **`hash-design-mcp`** 各做一次：

1. 打开包页面（`https://www.npmjs.com/package/hash-design`，然后是 `https://www.npmjs.com/package/hash-design-mcp`），进入 **Settings** 标签页。
2. 在 **Trusted Publisher** 一节的 **Select your publisher** 下选择 **GitHub Actions**。
3. 按下表原样填写：

   | 字段                 | 值                                                                  |
   | -------------------- | ------------------------------------------------------------------- |
   | Organization or user | `qybaihe`                                                           |
   | Repository           | `hash-design`                                                       |
   | Workflow filename    | `release.yml`（只填文件名，不要填 `.github/workflows/release.yml`） |
   | Environment name     | 留空（工作流没有使用 GitHub environment）                           |

   如果 npm 还显示 **Allowed actions**，允许发布（publish）。

4. 保存配置。

也可以在终端里完成（需要 npm ≥ 11.15.0，账号已开启双重验证）：

```bash
npm trust github hash-design --repo qybaihe/hash-design --file release.yml --allow-publish
npm trust github hash-design-mcp --repo qybaihe/hash-design --file release.yml --allow-publish
```

然后在每个包的 **Settings → Publishing access** 里选择 **Require two-factor authentication and disallow tokens** 并保存。trusted publishing 不用 token，所以不受影响。

注意两点：

- npm 文档说明，新建的 trusted publisher 配置必须在 2 天内完成第一次成功发布。等下一个版本准备好了再添加（如果在那之前过期了，就重新添加）。
- 工作流文件名是信任关系的一部分。以后如果改了 `release.yml` 的文件名，要在同一次改动里更新两个包的 Trusted Publisher。

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

6. 查看 **Actions → Release**。变绿后检查 `npm view hash-design version`、包页面上的 provenance 标识、`npx -y hash-design --help` 和 `npx -y hash-design-mcp`（它会在 stdin 上等待 MCP 客户端，按 Ctrl-C 退出）。
7. 首次发布之后，更新所有"尚未发布到 npm"的说明：五个 README（每种语言做同样的修改）、`packages/core/README.md`、`packages/mcp/README.md`、`docs/mcp-tools*.md` 和 Skill，让 `npx -y hash-design` 和 `npx -y hash-design-mcp` 成为文档里的安装方式。

`npm run release:check` 也会在每次 push 和 pull request 的 CI 里运行，所以包清单一旦变得不可发布，CI 会在发版之前就报错。

## 发布步骤失败时

| Release 运行里的信息                                            | 原因和处理                                                                                                                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `… does not exist on npm yet`                                   | 这个包还没做一次性的[首次发布](#首次发布一次性手动)。                                                                                                                   |
| `npm … is too old for trusted publishing`                       | runner 上的 npm 低于 11.5.1；`Use npm 11` 这一步本应避免这种情况。                                                                                                      |
| `npm publish` 报认证错误（`ENEEDAUTH`、`E401`、`E403`、`E404`） | Trusted Publisher 缺失、已过期或填写不一致：owner `qybaihe`、repository `hash-design`、workflow filename `release.yml`、不填 environment。到 npmjs.com 改好后重跑任务。 |

不要退回去用 `NPM_TOKEN` secret：工作流根本不读取它。
