/** Small, dependency-free colour helpers (sRGB hex only). */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHex(value: string): boolean {
  return HEX_RE.test(value.trim());
}

export function normalizeHex(value: string): string {
  const m = HEX_RE.exec(value.trim());
  if (!m || !m[1]) throw new Error(`Not a hex colour: ${value}`);
  let h = m[1].toLowerCase();
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  return `#${h}`;
}

export function hexToRgb(hex: string): Rgb {
  const h = normalizeHex(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0–1. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1–21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

export function hexToHsl(hex: string): Hsl {
  return rgbToHsl(hexToRgb(hex));
}

/** Smallest angular distance between two hues, 0–180. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Light palettes have a paper luminance above 0.4. */
export function isLightPaper(paper: string): boolean {
  return luminance(paper) > 0.4;
}

/** Pick whichever of `options` has the best contrast against `bg`. */
export function bestTextOn(bg: string, options: string[]): string {
  let best = options[0] ?? '#000000';
  let bestRatio = -1;
  for (const o of options) {
    const r = contrast(bg, o);
    if (r > bestRatio) {
      best = o;
      bestRatio = r;
    }
  }
  return best;
}

/** Whether a colour reads as purple/indigo/blue and saturated enough to be "AI gradient" material. */
export function isPurpleBlue(hex: string): boolean {
  const { h, s, l } = hexToHsl(hex);
  return h >= 215 && h <= 300 && s >= 0.35 && l >= 0.2 && l <= 0.85;
}

/** Named CSS colours we care about when parsing gradients. Not exhaustive on purpose. */
const NAMED: Record<string, string> = {
  purple: '#800080',
  violet: '#ee82ee',
  indigo: '#4b0082',
  blue: '#0000ff',
  blueviolet: '#8a2be2',
  mediumpurple: '#9370db',
  slateblue: '#6a5acd',
  royalblue: '#4169e1',
  magenta: '#ff00ff',
  fuchsia: '#ff00ff',
  white: '#ffffff',
  black: '#000000',
};

/** Parse #hex, rgb()/rgba(), hsl()/hsla() and a few named colours into hex. Returns null when unknown. */
export function parseCssColor(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (isHex(v)) return normalizeHex(v);
  if (/^#[0-9a-f]{8}$/.test(v)) return v.slice(0, 7);
  if (/^#[0-9a-f]{4}$/.test(v)) return normalizeHex(v.slice(0, 4));
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(v);
  if (rgb) return rgbToHex({ r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) });
  const hsl = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(v);
  if (hsl) return hslToHex(Number(hsl[1]), Number(hsl[2]) / 100, Number(hsl[3]) / 100);
  return NAMED[v] ?? null;
}

export function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex({ r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 });
}

// ── OKLCH (Björn Ottosson's OKLab, polar form) ────────────────────────────────

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** OKLCH (L 0–1, C ≥ 0, H degrees) → linear sRGB, possibly out of gamut. */
function oklchToLinear(l: number, c: number, h: number): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/**
 * OKLCH → sRGB hex. Out-of-gamut colours keep their lightness and hue and lose chroma until they fit
 * (binary search), so the result is always a displayable colour.
 */
export function oklchToHex(l: number, c: number, h: number): string {
  let lo = 0;
  let hi = c;
  let rgb = oklchToLinear(l, c, h);
  if (!inGamut(rgb)) {
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      const t = oklchToLinear(l, mid, h);
      if (inGamut(t)) lo = mid;
      else hi = mid;
    }
    rgb = oklchToLinear(l, lo, h);
  }
  const [r, g, b] = rgb.map((v) => toGamma(Math.min(1, Math.max(0, v))) * 255) as [number, number, number];
  return rgbToHex({ r, g, b });
}

/** sRGB hex → OKLCH { l, c, h }. */
export function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const { r, g, b } = hexToRgb(hex);
  const [lr, lg, lb] = [r, g, b].map((v) => toLinear(v / 255)) as [number, number, number];
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const h = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c: Math.hypot(A, B), h };
}
