# Publishing to npm

[中文](publishing.zh-CN.md) · [Back to README](../README.md)

This page is for maintainers. Nothing has been published yet. Releases are published by GitHub Actions with [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC): no npm token is created, stored as a secret or read by the workflow. Because npm can only attach a Trusted Publisher to a package that already exists, the very first version of each package is published once by hand.

In order:

1. [First publish (one-time, manual)](#first-publish-one-time-manual)
2. [Add the Trusted Publisher on npmjs.com](#add-the-trusted-publisher-on-npmjscom) (once per package)
3. [Release steps](#release-steps) for every later version

## Packages

| Package           | Directory       | Contains                                              | Binary            |
| ----------------- | --------------- | ----------------------------------------------------- | ----------------- |
| `hash-design`     | `packages/core` | library, CLI, `skill/SKILL.md` (copied in by prepack) | `hash-design`     |
| `hash-design-mcp` | `packages/mcp`  | stdio MCP server; depends on `hash-design`            | `hash-design-mcp` |

Both names were unclaimed on the npm registry when this was written (`npm view hash-design` and `npm view hash-design-mcp` returned 404 on 2026-11-02), and both packages will be owned by the npm account `qybaihe`. npm can still refuse an unscoped name at publish time if it is too similar to an existing package; the fallback would be the `@qybaihe` scope (`@qybaihe/hash-design`, `@qybaihe/hash-design-mcp`), which would also mean changing the dependency in `packages/mcp`, the import in `packages/mcp/src`, the docs, `scripts/release-check.mjs` and the workflow's package list.

The root `package.json` is private and is never published. All three `package.json` files share one version.

## The release workflow

| Item        | Value                                                                                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File        | [`.github/workflows/release.yml`](../.github/workflows/release.yml), so the workflow filename npm needs is `release.yml`                                                                                                              |
| Trigger     | a **published GitHub Release** tagged `v<version>` (`release: types: [published]`). Pushes to `main` never publish. Running it by hand (Actions → Release → Run workflow) is a dry run: it verifies and packs, and publishes nothing. |
| Permissions | `contents: read`, `id-token: write` (the OIDC token npm exchanges for a short-lived publish credential)                                                                                                                               |
| Secrets     | none                                                                                                                                                                                                                                  |

The workflow:

1. checks that the release tag is `v<version>`, that the root, `hash-design` and `hash-design-mcp` versions match, that `hash-design-mcp` depends on `^<version>`, that `CHANGELOG.md` has a `## [<version>]` section and that both manifests have their publish fields, including `repository`, which provenance is checked against (`scripts/release-check.mjs`);
2. runs build, typecheck, lint, format check, tests and the stdio smoke test, on Node 24 with npm 11 (it fails if npm is older than 11.5.1, the trusted-publishing minimum);
3. packs both tarballs and checks their contents (no tests, the Skill and LICENSE included);
4. publishes `hash-design`, then `hash-design-mcp`, with `npm publish <tarball> --provenance --access public`. A version that is already on npm is skipped, so a failed run can simply be re-run. A package that does not exist on npm yet stops the job with a pointer to the first publish below. Versions with a pre-release part (`0.3.0-rc.1`) or releases marked as pre-release go to the `next` dist-tag instead of `latest`.

## First publish (one-time, manual)

A Trusted Publisher is configured on a package's settings page, and npm's [`npm trust`](https://docs.npmjs.com/cli/v11/commands/npm-trust) docs state that "the package you're configuring must already exist on the npm registry". Trusted publishing cannot create a package, so the first version of each package is published from a maintainer's machine. Do not run this from CI and do not create a token for it; `npm login` with two-factor authentication is enough.

1. Prepare the version as in [Release steps](#release-steps) 1–4 (version bump, CHANGELOG, merged pull request).
2. From a clean, up-to-date `main` at the merge commit:

   ```bash
   git switch main && git pull && git status        # nothing to commit
   npm ci && npm run build && npm run check && npm run release:check
   npm login                                        # as qybaihe, with 2FA
   npm whoami                                       # must print qybaihe
   npm publish -w hash-design --access public       # core first …
   npm publish -w hash-design-mcp --access public   # … then the MCP server that depends on it
   ```

   This first version has no provenance statement: npm can only generate one from a supported CI provider.

3. Publish the GitHub Release `v<version>` (Release steps 5). The workflow runs all its checks and skips both packages because that version is already on npm, which also proves the pipeline before the first automated publish.
4. Add the Trusted Publisher to both packages (next section). After that, every version goes through the workflow.

## Add the Trusted Publisher on npmjs.com

Do this for **`hash-design`** and then for **`hash-design-mcp`**, signed in to [npmjs.com](https://www.npmjs.com) as `qybaihe`:

1. Open the package page (`https://www.npmjs.com/package/hash-design`, then `https://www.npmjs.com/package/hash-design-mcp`) and go to its **Settings** tab.
2. In the **Trusted Publisher** section, under **Select your publisher**, choose **GitHub Actions**.
3. Fill in the fields exactly:

   | Field                | Value                                                                   |
   | -------------------- | ----------------------------------------------------------------------- |
   | Organization or user | `qybaihe`                                                               |
   | Repository           | `hash-design`                                                           |
   | Workflow filename    | `release.yml` (the file name only, not `.github/workflows/release.yml`) |
   | Environment name     | leave empty (the workflow does not use a GitHub environment)            |

   If npm also offers **Allowed actions**, allow publishing.

4. Save the configuration.

The same from a terminal, with npm ≥ 11.15.0 and 2FA enabled on the account:

```bash
npm trust github hash-design --repo qybaihe/hash-design --file release.yml --allow-publish
npm trust github hash-design-mcp --repo qybaihe/hash-design --file release.yml --allow-publish
```

Then, on each package's **Settings → Publishing access**, choose **Require two-factor authentication and disallow tokens** and save. Trusted publishing keeps working, because it does not use a token.

Two things to keep in mind:

- npm's docs say a newly created trusted publisher configuration must complete its first successful publish within 2 days. Add it when the next release is ready (or add it again if it expired before that release).
- The workflow filename is part of the trust. If `release.yml` is ever renamed, update the Trusted Publisher on both packages in the same change.

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

6. Watch **Actions → Release**. When it is green, check `npm view hash-design version`, the provenance note on the package page, `npx -y hash-design --help` and `npx -y hash-design-mcp` (it waits for an MCP client on stdin; Ctrl-C to quit).
7. After the first release, update the "not on npm yet" notes: the five READMEs (same change in every language), `packages/core/README.md`, `packages/mcp/README.md`, `docs/mcp-tools*.md` and the Skill, so that `npx -y hash-design` and `npx -y hash-design-mcp` become the documented install path.

`npm run release:check` also runs in CI on every push and pull request, so a manifest that is no longer publishable fails CI before a release is attempted.

## When the publish step fails

| Message in the Release run                                                       | Cause and fix                                                                                                                                                                                         |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `… does not exist on npm yet`                                                    | The one-time [first publish](#first-publish-one-time-manual) has not been done for that package.                                                                                                      |
| `npm … is too old for trusted publishing`                                        | The npm installed on the runner is older than 11.5.1; the `Use npm 11` step should prevent this.                                                                                                      |
| An authentication error (`ENEEDAUTH`, `E401`, `E403`, `E404`) from `npm publish` | The Trusted Publisher is missing, has expired, or does not match: owner `qybaihe`, repository `hash-design`, workflow filename `release.yml`, no environment. Fix it on npmjs.com and re-run the job. |

Do not fall back to an `NPM_TOKEN` secret: the workflow does not read one.
