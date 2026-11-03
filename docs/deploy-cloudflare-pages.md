# Deploying the website to Cloudflare Pages

The website lives in [`site/`](../site). It is a static Vite build: `npm run site:build` reads the library
source (`packages/core/src`), the example runs (`examples/`) and the media (`docs/assets/`) and writes the
finished site to `site/dist/`. Nothing runs on a server; the in-browser demo is the library itself, bundled.

This page lists the settings for a Cloudflare Pages project connected to this GitHub repository (Git
integration). No Cloudflare project has been created yet; a maintainer with access to the Cloudflare account
does it once, from the dashboard.

## Before you start

Check that the build works from a clean checkout, the way Cloudflare runs it:

```bash
npm ci
npm run site:build      # → site/dist/
npm run site:preview    # serves site/dist/ on http://localhost:4173
```

`npm run site:dev` runs the dev server with live reload. CI runs `npm run site:build` on Node 20, 22 and 24 for
every pull request, and `site/test/` (part of `npm test`) checks the page's content and the demo's parity with
the CLI.

## Create the project

In the Cloudflare dashboard: **Workers & Pages** → **Create application** → **Pages** → **Connect to Git** →
**GitHub**. Install and authorize the Cloudflare Pages app for `qybaihe/hash-design` (it only needs this
repository), select the repository, then **Begin setup**.

| Setting                   | Value                                                 |
| ------------------------- | ----------------------------------------------------- |
| Project name              | `hash-design` (gives `https://hash-design.pages.dev`) |
| Production branch         | `main`                                                |
| Framework preset          | **None**                                              |
| Build command             | `npm run site:build`                                  |
| Build output directory    | `site/dist`                                           |
| Root directory (advanced) | leave empty (the repository root)                     |
| Environment variable      | `NODE_VERSION` = `22`                                 |

Then **Save and Deploy**.

Why these values:

- **Framework preset: None.** There is no plain Vite preset; the presets that mention Vite assume a framework
  app with `npm run build` and `dist`. This repository's `npm run build` builds the npm packages, not the site.
- **Root directory: empty.** The build reads `packages/core/src`, `examples/` and `docs/assets/`, which sit
  outside `site/`, and the dependencies (Vite included) are in the root `package-lock.json`. Setting the root
  directory to `site` would break the build.
- **Build output directory: `site/dist`**, relative to the root directory.
- **`NODE_VERSION` = `22`.** Vite 8 needs Node `^20.19.0 || >=22.12.0`. The repository's `.nvmrc` already says
  `22`, and Cloudflare's v3 build image defaults to Node 22, but Cloudflare does not document which of `.nvmrc`
  and `NODE_VERSION` wins, so the variable pins it explicitly. Set it for both Production and Preview
  (**Settings** → **Variables and Secrets** / **Environment variables**).
- **Dependencies.** The build image installs the dependencies from `package-lock.json` before running the
  build command. To control the install yourself, set `SKIP_DEPENDENCY_INSTALL` = `1` and use
  `npm ci && npm run site:build` as the build command.

The project name decides the `*.pages.dev` subdomain. The page's canonical URL and its Open Graph / Twitter
image (`https://hash-design.pages.dev/media/social-preview.png`) are set in
[`site/build/content.ts`](../site/build/content.ts) (`SITE_URL`); if the project gets another name or a
custom domain, change `SITE_URL` there.

## Production and preview deployments

- **Production:** every push to `main` (including merged pull requests) builds and deploys to
  `https://hash-design.pages.dev`.
- **Previews:** by default every push to any other branch of this repository builds a preview deployment,
  including the branches of open pull requests; Cloudflare reports the build and its preview URL on GitHub.
  Each preview has a unique URL, `https://<deployment-hash>.hash-design.pages.dev`, and an alias that follows
  the branch, `https://<branch>.hash-design.pages.dev` (lower-cased, with characters other than letters and
  digits turned into `-`: branch `fix/api` → `fix-api.hash-design.pages.dev`).
- **Which branches build:** **Settings** → **Builds & deployments** → **Configure Production deployments** /
  **Configure Preview deployments**. Preview options: _All non-Production branches_ (default), _None_, or
  _Custom branches_ with include and exclude patterns (`*` is a wildcard), e.g. exclude `dependabot/*`.
- **Skipping unrelated pushes (optional):** **Settings** → **Build** → **Build watch paths**. The site depends
  on more than `site/`, so if you use watch paths, include at least `site/*`, `packages/core/src/*`,
  `examples/*`, `docs/assets/*`, `package.json` and `package-lock.json`.

## What the build ships

- `site/dist/index.html`: the page, with every number, ref, score and scenario filled in at build time from
  the code and the example runs.
- `site/dist/assets/`: hashed JavaScript and CSS. The library is in a separate chunk that loads once the page is
  idle.
- `site/dist/media/`: copies of `docs/assets/hero.mp4`, `hero.png`, `social-preview.png` and
  `showcase/*.png`.
- `site/dist/_headers`: Cloudflare Pages
  [headers](https://developers.cloudflare.com/pages/configuration/headers/) from
  [`site/public/_headers`](../site/public/_headers): hashed assets are cached for a year, media for a day, and
  every response gets `X-Content-Type-Options: nosniff` and a referrer policy.
- `site/dist/favicon.svg` and `robots.txt`.

The only third-party requests the page makes are to Google Fonts (the page's own faces, and the faces of the
directions the demo rolls).
