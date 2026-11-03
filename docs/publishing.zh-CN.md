# 发布到 npm

[English](publishing.md) · [返回 README](../README.zh-CN.md)

本页写给维护者。发布到 npm 的只有一个包：**`hash-design`**（`packages/core`）。正式发布由 GitHub Actions 通过 [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers)（OIDC）完成：不创建 npm token，不存成 secret，工作流也不读取任何 token。

现状：`hash-design@0.1.0` 已于 2026-11-02 从提交 `475ba16` 手动发布（所以这个包已经存在，可以给它添加 Trusted Publisher）。从 0.2.0 起，之后的每个版本都走工作流，前提是：

1. [在 npmjs.com 上给 `hash-design` 添加 Trusted Publisher](#给-hash-design-添加-trusted-publisher)（一次）；
2. 每个版本按[发布步骤](#发布步骤)走。

## 包

| 包                | 目录            | npm 上                      | 内容                                                                                        | 命令             |
| ----------------- | --------------- | --------------------------- | ------------------------------------------------------------------------------------------- | ---------------- |
| `hash-design`     | `packages/core` | 由 `release.yml` 发布       | 库、CLI、`skill/SKILL.md`（由 prepack 复制进来）、MCP server（`hash-design mcp`，0.2.0 起） | `hash-design`    |
| `hash-design-mcp` | `packages/mcp`  | 不发布（`"private": true`） | 从 `hash-design/mcp` 启动 server 的包装                                                     | 只在克隆的源码里 |

根目录的 `package.json` 也是 private。三个 `package.json` 共用同一个版本号：`packages/mcp` 永远不发布，但它对 `hash-design` 的 `^<version>` 依赖必须覆盖工作区里的版本，否则 npm 会从 registry 安装一份，而不是链接 `packages/core`。`npm run release:version` 会让三者保持一致；如果 `packages/mcp` 不再是 private，`scripts/release-check.mjs` 会报错。

## 怎样获得 MCP server

从 0.2.0 起，`hash-design` 包含 MCP server（`packages/core/src/mcp.ts`）及其依赖（`@modelcontextprotocol/sdk`、`zod`），一个包就够了：

```bash
npx -y hash-design skill install --dir .                 # Skill
claude mcp add hash-design -- npx -y hash-design mcp     # MCP server（hash-design >= 0.2.0）
```

hash-design 0.1.0 没有 `mcp` 命令。在克隆的源码里，同一个 server 也可以用 `node ~/hash-design/packages/mcp/dist/bin.js` 启动：`packages/mcp` 作为这个 private 包装留在仓库里。

`hash-design-mcp` 不会再有新版本；它的 0.1.0 是和 `hash-design@0.1.0` 一起手动发布的 hash-design/v1 server，README 里已经不再提它。0.2.0 上了 npm 之后，维护者可以把它标记为 deprecated，让找到它的人改用新命令。这只修改 registry 上的元数据，不发布任何东西：

```bash
npm deprecate hash-design-mcp "Use npx -y hash-design mcp (hash-design 0.2.0 or later)"
```

如果曾经给 `hash-design-mcp` 添加过 Trusted Publisher，到那个包的 **Settings** 页删掉它；工作流永远不会发布这个包。

## 发布工作流

| 项目   | 内容                                                                                                                                                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 文件   | [`.github/workflows/release.yml`](../.github/workflows/release.yml)，所以 npm 要填的 workflow filename 是 `release.yml`                                                                 |
| 触发   | **发布 GitHub Release**，tag 为 `v<version>`（`release: types: [published]`）。推送到 `main` 永远不会发包。手动运行（Actions → Release → Run workflow）只是演练：只检查和打包，不发布。 |
| 权限   | `contents: read`、`id-token: write`（npm 用这个 OIDC token 换取短期的发布凭证）                                                                                                         |
| Secret | 无                                                                                                                                                                                      |
| 发布   | 只发布 `hash-design`                                                                                                                                                                    |

工作流会：

1. 检查 release 的 tag 是否为 `v<version>`，根目录、`hash-design` 和 private 的 `hash-design-mcp` 版本是否一致，`hash-design-mcp` 是否仍是 private 并依赖 `^<version>`，`CHANGELOG.md` 是否有 `## [<version>]` 一节，`hash-design` 的发布字段是否齐全，包括 provenance 要核对的 `repository`（`scripts/release-check.mjs`）；
2. 在 Node 24 + npm 11 上运行构建、类型检查、lint、格式检查、测试和 stdio 冒烟测试（npm 低于 11.5.1，即 trusted publishing 的最低版本时直接失败）；
3. 打出 `hash-design` 的 tarball 并检查内容（不含测试，包含 Skill 和 LICENSE）；
4. 用 `npm publish <tarball> --provenance --access public` 发布。npm 上已存在的版本会跳过，所以失败后可以直接重跑。带预发布后缀的版本（`0.3.0-rc.1`）或标记为 pre-release 的 release 发布到 `next` dist-tag，而不是 `latest`。

## 给 hash-design 添加 Trusted Publisher

以 `qybaihe` 登录 [npmjs.com](https://www.npmjs.com)，做一次：

1. 打开 `https://www.npmjs.com/package/hash-design`，进入 **Settings** 标签页。
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
```

然后在包的 **Settings → Publishing access** 里选择 **Require two-factor authentication and disallow tokens** 并保存。trusted publishing 不用 token，所以不受影响。

注意两点：

- npm 文档说明，新建的 trusted publisher 配置必须在 2 天内完成第一次成功发布。等下一个版本准备好了再添加（如果在那之前过期了，就重新添加）。
- 工作流文件名是信任关系的一部分。以后如果改了 `release.yml` 的文件名，要在同一次改动里更新 Trusted Publisher。

0.1.0 是在维护者的电脑上发布的，所以没有 provenance 声明（npm 只能在受支持的 CI 里生成）。第一个由工作流发布的版本会带上它。

## 发布步骤

1. 从最新、CI 全绿的 `main` 开始。
2. 统一设置版本号并刷新 `package-lock.json`：

   ```bash
   npm run release:version -- 0.2.0
   ```

3. 在 `CHANGELOG.md` 里把 `[Unreleased]` 的条目移到 `## [0.2.0] - YYYY-MM-DD` 下面。
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

6. 查看 **Actions → Release**。变绿后检查 `npm view hash-design version`、包页面上的 provenance 标识和 `npx -y hash-design --help`。

`npm run release:check` 也会在每次 push 和 pull request 的 CI 里运行，所以包清单一旦变得不可发布，或者 `packages/mcp` 不再是 private，CI 会在发版之前就报错。

0.2.0 上了 npm 之后，按上面的方法把 `hash-design-mcp` 标记为 deprecated。

## 发布步骤失败时

| Release 运行里的信息                                                          | 原因和处理                                                                                                                                                                               |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm … is too old for trusted publishing`                                     | runner 上的 npm 低于 11.5.1；`Use npm 11` 这一步本应避免这种情况。                                                                                                                       |
| `npm publish` 报认证错误（`ENEEDAUTH`、`E401`、`E403`、`E404`）               | `hash-design` 的 Trusted Publisher 缺失、已过期或填写不一致：owner `qybaihe`、repository `hash-design`、workflow filename `release.yml`、不填 environment。到 npmjs.com 改好后重跑任务。 |
| `release check failed: … packages/mcp/package.json must stay "private": true` | 有人把 `packages/mcp` 又改成可发布了。恢复 `"private": true`；`hash-design-mcp` 不发布。                                                                                                 |

不要退回去用 `NPM_TOKEN` secret：工作流根本不读取它。
