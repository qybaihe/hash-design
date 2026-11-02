# Publishing to npm

[中文](publishing.zh-CN.md) · [Back to README](../README.md)

This page is for maintainers. One package is published to npm: **`hash-design`** (`packages/core`). Releases are published by GitHub Actions with [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC): no npm token is created, stored as a secret or read by the workflow.

Where things stand: `hash-design@0.1.0` was published by hand on 2026-11-02 from commit `475ba16` (so the package exists and a Trusted Publisher can be attached to it). Every later version goes through the workflow, once:

1. [the Trusted Publisher is added to `hash-design` on npmjs.com](#add-the-trusted-publisher-to-hash-design) (once), then
2. each version follows the [release steps](#release-steps).

## Packages

| Package           | Directory       | On npm                            | Contains                                                                                              | Binary          |
| ----------------- | --------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------- |
| `hash-design`     | `packages/core` | published by `release.yml`        | library, CLI, `skill/SKILL.md` (copied in by prepack), the MCP server (`hash-design mcp`, from 0.2.0) | `hash-design`   |
| `hash-design-mcp` | `packages/mcp`  | not published (`"private": true`) | wrapper that runs the server from `hash-design/mcp`                                                   | in a clone only |

The root `package.json` is private too. All three `package.json` files share one version: `packages/mcp` is never published, but its `^<version>` dependency on `hash-design` has to cover the workspace version, or npm would install the registry copy instead of linking `packages/core`. `npm run release:version` keeps them in step and `scripts/release-check.mjs` fails if `packages/mcp` stops being private.

## Getting the MCP server

From 0.2.0 the `hash-design` package contains the MCP server (`packages/core/src/mcp.ts`) and its dependencies (`@modelcontextprotocol/sdk`, `zod`), so the one package covers everything:

```bash
npx -y hash-design skill install --target both --dir .   # the Skill
claude mcp add hash-design -- npx -y hash-design mcp     # the MCP server (hash-design >= 0.2.0)
```

hash-design 0.1.0 does not have the `mcp` command. Until 0.2.0 is published, the server comes from `hash-design-mcp@0.1.0`, which the one-time manual publish of 0.1.0 put on npm and which still works (`claude mcp add hash-design -- npx -y hash-design-mcp@0.1.0`), or from a clone (`node ~/hash-design/packages/mcp/dist/bin.js`). `packages/mcp` stays in the repository as that private wrapper.

`hash-design-mcp` gets no new versions. Once 0.2.0 is out, a maintainer can deprecate it so people who find it are pointed at the new command. This only changes registry metadata and publishes nothing; do not run it before 0.2.0, because until then it is the documented fallback:

```bash
npm deprecate hash-design-mcp "Use npx -y hash-design mcp (hash-design 0.2.0 or later)"
```

If a Trusted Publisher was ever added to `hash-design-mcp`, remove it on that package's **Settings** page; the workflow never publishes it.

## The release workflow

| Item        | Value                                                                                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File        | [`.github/workflows/release.yml`](../.github/workflows/release.yml), so the workflow filename npm needs is `release.yml`                                                                                                              |
| Trigger     | a **published GitHub Release** tagged `v<version>` (`release: types: [published]`). Pushes to `main` never publish. Running it by hand (Actions → Release → Run workflow) is a dry run: it verifies and packs, and publishes nothing. |
| Permissions | `contents: read`, `id-token: write` (the OIDC token npm exchanges for a short-lived publish credential)                                                                                                                               |
| Secrets     | none                                                                                                                                                                                                                                  |
| Publishes   | `hash-design` only                                                                                                                                                                                                                    |

The workflow:

1. checks that the release tag is `v<version>`, that the root, `hash-design` and the private `hash-design-mcp` versions match, that `hash-design-mcp` is still private and depends on `^<version>`, that `CHANGELOG.md` has a `## [<version>]` section and that `hash-design` has its publish fields, including `repository`, which provenance is checked against (`scripts/release-check.mjs`);
2. runs build, typecheck, lint, format check, tests and the stdio smoke test, on Node 24 with npm 11 (it fails if npm is older than 11.5.1, the trusted-publishing minimum);
3. packs the `hash-design` tarball and checks its contents (no tests, the Skill and LICENSE included);
4. publishes it with `npm publish <tarball> --provenance --access public`. A version that is already on npm is skipped, so a failed run can simply be re-run. Versions with a pre-release part (`0.3.0-rc.1`) or releases marked as pre-release go to the `next` dist-tag instead of `latest`.

## Add the Trusted Publisher to hash-design

Once, signed in to [npmjs.com](https://www.npmjs.com) as `qybaihe`:

1. Open `https://www.npmjs.com/package/hash-design` and go to its **Settings** tab.
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
```

Then, on the package's **Settings → Publishing access**, choose **Require two-factor authentication and disallow tokens** and save. Trusted publishing keeps working, because it does not use a token.

Two things to keep in mind:

- npm's docs say a newly created trusted publisher configuration must complete its first successful publish within 2 days. Add it when the next release is ready (or add it again if it expired before that release).
- The workflow filename is part of the trust. If `release.yml` is ever renamed, update the Trusted Publisher in the same change.

0.1.0 was published from a maintainer's machine, so it has no provenance statement (npm only generates one from a supported CI provider). The first version published by the workflow will have one.

## Release steps

1. Start from an up-to-date `main` with green CI.
2. Set the version everywhere and refresh `package-lock.json`:

   ```bash
   npm run release:version -- 0.2.0
   ```

3. In `CHANGELOG.md`, move the `[Unreleased]` entries under `## [0.2.0] - YYYY-MM-DD`.
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

6. Watch **Actions → Release**. When it is green, check `npm view hash-design version`, the provenance note on the package page and `npx -y hash-design --help`.

`npm run release:check` also runs in CI on every push and pull request, so a manifest that is no longer publishable, or a `packages/mcp` that is no longer private, fails CI before a release is attempted.

After 0.2.0 is on npm: remove the `hash-design-mcp@0.1.0` fallback notes from the five READMEs, `packages/core/README.md` and `docs/mcp-tools*.md`, and deprecate `hash-design-mcp` as above.

## When the publish step fails

| Message in the Release run                                                       | Cause and fix                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm … is too old for trusted publishing`                                        | The npm installed on the runner is older than 11.5.1; the `Use npm 11` step should prevent this.                                                                                                                       |
| An authentication error (`ENEEDAUTH`, `E401`, `E403`, `E404`) from `npm publish` | The Trusted Publisher on `hash-design` is missing, has expired, or does not match: owner `qybaihe`, repository `hash-design`, workflow filename `release.yml`, no environment. Fix it on npmjs.com and re-run the job. |
| `release check failed: … packages/mcp/package.json must stay "private": true`    | Someone made `packages/mcp` publishable again. Restore `"private": true`; `hash-design-mcp` is not published.                                                                                                          |

Do not fall back to an `NPM_TOKEN` secret: the workflow does not read one.
