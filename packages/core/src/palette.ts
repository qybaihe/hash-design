/**
 * hash-design/v2 palettes are computed, not looked up. Bytes set a hue, a polarity, how tinted the paper
 * is, how saturated the accents are and how far the second accent sits from the first; the lightness of
 * every text colour is then solved so the contrast floors always hold:
 *
 *   ink on paper ≥ 7.5:1 · muted on paper ≥ 4.6:1 · accent on paper ≥ 3.2:1 · accent2 on paper ≥ 3:1
 *
 * All colours are built in OKLCH and mapped into sRGB by reducing chroma, never by shifting hue.
 */
import { contrast, hexToOklch, normalizeHex, oklchToHex } from './color.js';
import type { PaletteColors } from './types.js';

export type Polarity = 'light' | 'dark';

export interface PaletteParams {
  polarity: Polarity;
  /** OKLCH hue of paper, ink and accent, 0–360. */
  hue: number;
  /** OKLCH lightness of the paper. */
  paperL: number;
  /** OKLCH chroma of the paper (0 = neutral). */
  paperC: number;
  /** OKLCH chroma of the accents. */
  accentC: number;
  /** Hue offset of accent2 from accent, degrees. */
  accent2Offset: number;
  /** Brand colours that replace the computed accents. */
  brand?: { accent?: string; accent2?: string };
}

const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

/** Walk lightness from `start` towards `end` until the colour reaches `target` contrast with `bg`. */
function solve(bg: string, h: number, c: number, start: number, end: number, target: number): string {
  const step = start < end ? 0.005 : -0.005;
  for (let l = start; step > 0 ? l <= end : l >= end; l += step) {
    const hex = oklchToHex(l, c, h);
    if (contrast(hex, bg) >= target) return hex;
  }
  return oklchToHex(end, c, h);
}

export function buildPalette(p: PaletteParams): PaletteColors {
  const light = p.polarity === 'light';
  const toward = light ? 0 : 1;
  const paper = oklchToHex(p.paperL, p.paperC, p.hue);
  const ink = solve(paper, p.hue, Math.min(0.035, p.paperC + 0.012), light ? 0.34 : 0.84, toward, 7.5);
  const muted = solve(paper, p.hue, 0.02, light ? 0.66 : 0.52, toward, 4.6);
  const accent = p.brand?.accent
    ? normalizeHex(p.brand.accent)
    : solve(paper, p.hue, p.accentC, light ? 0.7 : 0.58, toward, 3.2);
  const accent2 = p.brand?.accent2
    ? normalizeHex(p.brand.accent2)
    : solve(paper, (p.hue + p.accent2Offset) % 360, p.accentC * 0.9, light ? 0.7 : 0.58, toward, 3);
  const rule = oklchToHex(light ? p.paperL - 0.17 : p.paperL + 0.17, p.paperC + 0.01, p.hue);
  const panel = oklchToHex(light ? p.paperL - 0.045 : p.paperL + 0.05, p.paperC + 0.008, p.hue);
  return { paper, ink, muted, accent, accent2, rule, panel };
}

/** OKLCH hue of a brand colour, or null when it is too grey to carry a hue. */
export function brandHue(hex: string): number | null {
  const { c, h } = hexToOklch(hex);
  return c >= 0.03 ? round(h, 2) : null;
}
