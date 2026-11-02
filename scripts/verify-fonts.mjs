#!/usr/bin/env node
// Verifies that the exact Google Fonts URL every brief would emit (families + weights + italics, Latin and CJK)
// resolves. Network-dependent, so it is not part of CI. Usage: npm run build && node scripts/verify-fonts.mjs
import {
  BODY_FONTS,
  CJK_BODY_FONTS,
  CJK_DISPLAY_FONTS,
  DISPLAY_FONTS,
  MONO_FONTS,
  googleFontsUrl,
} from '../packages/core/dist/index.js';

// One URL per family in the pool (with every weight it lists), plus each CJK face, the way briefs emit them.
const google = (f) => ({ ...f, source: 'google' });
const mono = google(MONO_FONTS[0]);
const urls = new Map();
const add = (type, lang, label) => {
  const url = googleFontsUrl(type, lang);
  if (url) urls.set(url, label);
};
for (const f of [...DISPLAY_FONTS, ...BODY_FONTS, ...MONO_FONTS]) {
  const t = {
    display: google(f),
    body: google(f),
    mono: google(f),
    cjk: { display: CJK_BODY_FONTS[0], body: CJK_BODY_FONTS[0] },
  };
  add(t, 'en', f.family);
}
for (const cjk of [...CJK_DISPLAY_FONTS, ...CJK_BODY_FONTS]) {
  add({ display: mono, body: mono, mono, cjk: { display: cjk, body: cjk } }, 'zh', cjk);
}
let bad = 0;
const entries = [...urls];
for (let i = 0; i < entries.length; i += 8) {
  await Promise.all(
    entries.slice(i, i + 8).map(async ([url, label]) => {
      const res = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/130 Safari/537.36' },
      });
      if (!res.ok) {
        bad++;
        console.log(`✗ ${label} ${res.status}\n  ${url}`);
      }
    }),
  );
}
console.log(`${entries.length - bad}/${entries.length} font URLs resolve on Google Fonts`);
process.exit(bad ? 1 : 0);
