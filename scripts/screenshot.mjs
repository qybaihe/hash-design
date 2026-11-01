#!/usr/bin/env node
// Screenshots every preview (desktop first screen, desktop full page, mobile first screen) and the compare page.
// Usage: node scripts/screenshot.mjs [example-dir]   (requires: npx playwright install chromium)
import { mkdir, readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const dir = resolve(process.argv[2] ?? 'examples/fourth-lane-bakery');
const outDir = join(dir, 'screenshots');
await mkdir(outDir, { recursive: true });
const previews = (await readdir(join(dir, 'previews'))).filter((f) => f.endsWith('.html')).sort();
const only = process.argv[3];

const browser = await chromium.launch();
async function shoot(file, name, viewport, { fullPage = false, maxHeight = 6000 } = {}) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: viewport.width < 500 ? 2 : 1 });
  await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(400);
  let clip;
  if (fullPage) {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    clip = { x: 0, y: 0, width: viewport.width, height: Math.min(h, maxHeight) };
  }
  await page.screenshot({ path: join(outDir, name), fullPage, ...(clip ? { clip } : {}) });
  await page.close();
  console.log(`  ${name}`);
}

for (const f of previews) {
  const slug = basename(f, '.html');
  if (only && !slug.startsWith(only)) continue;
  const file = join(dir, 'previews', f);
  await shoot(file, `${slug}-desktop.png`, { width: 1440, height: 900 });
  await shoot(file, `${slug}-full.png`, { width: 1440, height: 900 }, { fullPage: true });
  await shoot(file, `${slug}-mobile.png`, { width: 390, height: 844 });
}
if (!only) {
  const compare = join(dir, 'compare.html');
  await shoot(compare, 'compare.png', { width: 1800, height: 1000 });
}
await browser.close();
