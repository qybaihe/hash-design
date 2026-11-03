import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { MEDIA, fillHtml } from './build/content.js';

const site = fileURLToPath(new URL('.', import.meta.url));
const repo = join(site, '..');

const TYPES: Record<string, string> = { '.mp4': 'video/mp4', '.png': 'image/png' };

/** Fills index.html from the code and the example runs, and ships the repository's real media files. */
function hashDesignSite(): Plugin {
  return {
    name: 'hash-design-site',
    transformIndexHtml: { order: 'pre', handler: (html) => fillHtml(html, repo) },
    configureServer(server) {
      server.middlewares.use('/media/', (req, res, next) => {
        const src = MEDIA[decodeURIComponent((req.url ?? '').split('?')[0]!.replace(/^\//, ''))];
        if (!src || !existsSync(join(repo, src))) return next();
        res.setHeader('Content-Type', TYPES[extname(src)] ?? 'application/octet-stream');
        createReadStream(join(repo, src)).pipe(res);
      });
    },
    generateBundle() {
      for (const [name, src] of Object.entries(MEDIA))
        this.emitFile({ type: 'asset', fileName: `media/${name}`, source: readFileSync(join(repo, src)) });
    },
  };
}

export default defineConfig({
  root: site,
  publicDir: join(site, 'public'),
  resolve: {
    alias: { 'hash-design/browser': join(repo, 'packages/core/src/browser.ts') },
  },
  server: { fs: { allow: [repo] } },
  build: {
    outDir: join(site, 'dist'),
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 0,
  },
  plugins: [hashDesignSite()],
});
