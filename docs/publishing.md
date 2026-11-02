# Publishing to npm

[中文](publishing.zh-CN.md) · [Back to README](../README.md)

This page is for maintainers. Nothing has been published yet: the steps below are how the first and every later release go out.

## Packages

| Package           | Directory       | Contains                                              | Binary            |
| ----------------- | --------------- | ----------------------------------------------------- | ----------------- |
| `hash-design`     | `packages/core` | library, CLI, `skill/SKILL.md` (copied in by prepack) | `hash-design`     |
| `hash-design-mcp` | `packages/mcp`  | stdio MCP server; depends on `hash-design`            | `hash-design-mcp` |

Both names were unclaimed on the npm registry when this was written (`npm view hash-design` and `npm view hash-design-mcp` returned 404 on 2026-11-02). npm can still refuse an unscoped name at publish time if it is too similar to an existing package; the fallback would be the `@qybaihe` scope (`@qybaihe/hash-design`, `@qybaihe/hash-design-mcp`), which would also mean changing the dependency in `packages/mcp`, the import in `packages/mcp/src`, the docs and `scripts/release-check.mjs`.

The root `package.json` is private and is never published. All three `package.json` files share one version.

## How a release is published

[`.github/workflows/release.yml`](../.github/workflows/release.yml) runs when a **GitHub Release is published**. It does not run on pushes to `main`, so merging code never publishes anything. The workflow:

1. checks that the release tag is `v<version>`, that the root, `hash-design` and `hash-design-mcp` versions match, that `hash-design-mcp` depends on `^<version>`, that `CHANGELOG.md` has a `## [<version>]` section and that both manifests have their publish fields (`scripts/release-check.mjs`);
2. runs build, typecheck, lint, format check, tests and the stdio smoke test;
3. packs both tarballs and checks their contents (no tests, the Skill and LICENSE included);
4. publishes `hash-design`, then `hash-design-mcp`, with [provenance](https://docs.npmjs.com/generating-provenance-statements). A version that is already on npm is skipped, so a failed run can simply be re-run. Versions with a pre-release part (`0.3.0-rc.1`) or releases marked as pre-release go to the `next` dist-tag instead of `latest`.

Running the workflow by hand (Actions → Release → Run workflow) is a dry run: it verifies and packs, and publishes nothing.

## One-time setup: the `NPM_TOKEN` secret

The workflow reads the token from the repository secret `NPM_TOKEN`; it is never stored in the repository.

1. On [npmjs.com](https://www.npmjs.com), sign in as the account that will own the packages, open your avatar menu → **Access Tokens** → **Generate New Token**. npm stopped issuing classic "automation" tokens in November 2025, so this is a **granular access token**:
   - **Packages and scopes → Permissions:** _Read and write_ (publish).
   - **Select packages:** _All packages_ for the first release (packages that do not exist yet cannot be selected). After the first release you can replace the token with one limited to `hash-design` and `hash-design-mcp`.
   - **Bypass two-factor authentication:** tick it if your account requires 2FA for publishing; otherwise the workflow fails with `EOTP`.
   - **Expiration:** npm caps write tokens at 90 days, so note the date and rotate the secret before it expires.
2. On GitHub, open the repository → **Settings → Secrets and variables → Actions → New repository secret**. Name: `NPM_TOKEN`. Value: the token. Save.

Optional, after the first release: configure [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) on each package's settings page on npmjs.com (publisher: GitHub Actions; owner `qybaihe`; repository `hash-design`; workflow filename `release.yml`). The workflow already has `id-token: write` and npm ≥ 11.5.1, so once both packages trust the workflow you can delete `NPM_TOKEN` and publish without a long-lived token.

## Release steps

1. Start from an up-to-date `main` with green CI.
2. Set the version everywhere and refresh `package-lock.json`:

   ```bash
   npm run release:version -- 0.2.0
   ```

3. In `CHANGELOG.md`, move the `[Unreleased]` entries under `## [0.2.0] - YYYY-MM-DD` and update the note that says nothing is on npm yet.
4. Check locally, then commit and merge through a pull request:

   ```bash
   npm run check && npm run release:check
   git switch -c release/v0.2.0 && git commit -am "chore(release): 0.2.0"
   ```

5. After the merge, publish a GitHub Release from the merge commit on `main`, tagged `v0.2.0`, either in the web UI (Releases → Draft a new release → new tag `v0.2.0` → Publish release) or with:

   ```bash
   git switch main && git pull
   gh release create v0.2.0 --target main --title "v0.2.0" --notes "See CHANGELOG.md"
   ```

   A release created by another workflow with `GITHUB_TOKEN` does not trigger the publish workflow; create it yourself.

6. Watch **Actions → Release**. When it is green, check `npm view hash-design version`, `npx -y hash-design --help` and `npx -y hash-design-mcp` (it waits for an MCP client on stdin; Ctrl-C to quit).
7. After the first release, update the "not on npm yet" notes: the five READMEs (same change in every language), `packages/core/README.md`, `packages/mcp/README.md`, `docs/mcp-tools*.md` and the Skill, so that `npx -y hash-design` and `npx -y hash-design-mcp` become the documented install path.

`npm run release:check` also runs in CI on every push and pull request, so a manifest that is no longer publishable fails CI before a release is attempted.
