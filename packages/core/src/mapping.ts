/**
 * hash-design/v2: a hash IS the design direction.
 *
 * There is no library of genres to pick from. Each of the 32 bytes of a SHA-256 hash drives one
 * parameter (or two, split into bits): a hue, a polarity, chromas, a display face and a body face from
 * a flat font pool, case and tracking, the type-scale ratio, a density position, grid columns and
 * gutters, where the text block sits, how tall the first screen is, what anchors it, a motif
 * (shape × size × placement × angle), corners, borders, shadow and texture, motion timing and easing,
 * the copy voice (person × headline form × sentence length × register), a twist (target × operation ×
 * amount) and, for non-web scenarios, the format. Every rule is in BYTE_MAP and in the brief's trace.
 */
import { normalizeHex } from './color.js';
import { BODY_FONTS, CJK_BODY_FONTS, CJK_DISPLAY_FONTS, DISPLAY_FONTS, MONO_FONTS } from './data/fonts.js';
import { getScenario, SCENARIO_IDS, SCENARIOS } from './data/scenarios.js';
import {
  ANCHOR_SUBJECTS,
  BORDER_STYLES,
  DISPLAY_CASES,
  HEADLINE_FORMS,
  MOTIF_PLACEMENTS,
  MOTIF_SHAPES,
  MOTION_PROPERTIES,
  type Primitive,
  RADII,
  SEPARATORS,
  TEXTURES,
  TWIST_OPERATIONS,
  TWIST_TARGETS,
  VOICE_PERSONS,
} from './data/space.js';
import { ALGORITHM, hashBytes, sha256Hex, shortHash } from './hash.js';
import { brandHue, buildPalette, type Polarity } from './palette.js';
import type { FontSpec, PaletteColors, Scenario, ScenarioFormat, ScenarioId } from './types.js';

/** User constraints. They are applied before bytes are read, so they are part of a design's identity. */
export interface Constraints {
  /** Light paper only. */
  lightOnly?: boolean;
  /** Dark paper only. */
  darkOnly?: boolean;
  /** No motion. */
  reducedMotion?: boolean;
  /** Brand colours that must survive: [0] replaces accent (and sets the hue), [1] replaces accent2. */
  brandColors?: string[];
  /** What is being designed (default "web"). */
  scenario?: ScenarioId;
}

export interface NormalizedConstraints {
  lightOnly: boolean;
  darkOnly: boolean;
  reducedMotion: boolean;
  brandColors: string[];
  /** Present only for non-web scenarios. */
  scenario?: Exclude<ScenarioId, 'web'>;
}

/** The scenario layer of a design (non-web scenarios only). */
export interface DesignScenario {
  id: Exclude<ScenarioId, 'web'>;
  /** Fingerprint of the scenario data. */
  data: string;
  /** Picked by byte 28. */
  format: ScenarioFormat;
  /** Root text size in px for this scenario; replaces the density's base size in the type scale. */
  baseSize: number;
}

/** One step of the mapping, kept so it is auditable ("show your work"). */
export interface TraceStep {
  dimension: string;
  /** Byte positions used, e.g. [0, 1]. */
  bytes: number[];
  /** Raw byte values as hex, e.g. "3f a9". */
  hex: string;
  /** The formula with the numbers filled in. */
  rule: string;
  result: string;
  note?: string;
}

export interface DesignPalette {
  polarity: Polarity;
  /** OKLCH hue, degrees. */
  hue: number;
  paperL: number;
  paperC: number;
  accentC: number;
  accent2Offset: number;
  colors: PaletteColors;
  /** Set when brand colours replaced the computed accents. */
  brand?: { accent?: string; accent2?: string };
}

export interface DesignType {
  display: FontSpec;
  body: FontSpec;
  mono: FontSpec;
  /** CJK faces used on Chinese pages. */
  cjk: { display: string; body: string };
  case: Primitive;
  /** Display weight, one of the face's own weights. */
  weight: number;
  /** Display letter-spacing in em. */
  tracking: number;
}

export interface DesignDensity {
  /** Position on the density axis: 0 = airiest, 1 = most packed (after the scenario's range). */
  t: number;
  baseSize: number;
  lineHeight: number;
  unit: number;
  sectionGap: number;
  maxWidth: number;
}

export interface DesignLayout {
  columns: number;
  gutter: number;
  /** Columns the main text block spans, and the column it starts at (1-based). */
  span: number;
  start: number;
  /** First-screen height, % of the viewport height. */
  firstScreen: number;
  sections: number;
  separator: Primitive;
}

export interface DesignAnchor {
  subject: Primitive;
  /** Width of the anchor, % of the first screen's width. */
  size: number;
  /** Horizontal position of the anchor's centre, 0 = left edge, 1 = right edge. */
  x: number;
  /** Rotation in degrees. */
  rotation: number;
}

export interface DesignMotif {
  shape: Primitive;
  /** Size of one element, px. */
  size: number;
  placement: Primitive;
  /** Angle, degrees. */
  angle: number;
}

export interface DesignSurface {
  radius: number;
  border: number;
  borderStyle: string;
  /** Hard offset shadow in px (no blur); 0 = no shadow. */
  shadow: number;
  texture: Primitive;
  /** Texture opacity, %. */
  textureOpacity: number;
}

export interface DesignMotion {
  /** True when nothing moves (reduced_motion, or a still scenario such as email). */
  still: boolean;
  property: Primitive;
  /** Duration in ms. */
  duration: number;
  easing: string;
}

export interface DesignVoice {
  person: Primitive;
  headline: Primitive;
  /** Average sentence length in words (about twice as many characters in Chinese). */
  sentenceWords: number;
  /** 0 = spoken and casual … 1 = formal and exact. */
  register: number;
}

export interface DesignTwist {
  target: Primitive;
  operation: Primitive;
  /** 0–25, read per operation (see twistText). */
  amount: number;
  /** The twist as one instruction. */
  text: string;
}

export interface Design {
  algorithm: string;
  /** Fingerprint of the parameter data (fonts and primitive lists). */
  library: string;
  hash: string;
  short: string;
  /** The hash; with the constraints it reproduces this design. */
  ref: string;
  constraints: NormalizedConstraints;
  palette: DesignPalette;
  type: DesignType;
  /** Modular type-scale ratio. */
  scale: number;
  density: DesignDensity;
  layout: DesignLayout;
  anchor: DesignAnchor;
  motif: DesignMotif;
  surface: DesignSurface;
  motion: DesignMotion;
  voice: DesignVoice;
  twist: DesignTwist;
  /** Set for non-web scenarios only. */
  scenario?: DesignScenario;
  trace: TraceStep[];
  /** Bytes the mapping does not read (31, and 28 for web): recorded, deliberately unused. */
  unusedBytes: string;
}

export const BYTE_MAP: ReadonlyArray<{ bytes: number[]; dimension: string; rule: string }> = [
  { bytes: [0, 1], dimension: 'hue', rule: 'uint16(b0, b1) / 65536 × 360°' },
  {
    bytes: [2],
    dimension: 'polarity · paper lightness',
    rule: 'b < 77 → dark, L = 0.14 + b/76 × 0.12; else light, L = 0.90 + (b−77)/178 × 0.085',
  },
  { bytes: [3], dimension: 'paper chroma', rule: 'b/255 × 0.045' },
  { bytes: [4], dimension: 'accent chroma', rule: '0.07 + b/255 × 0.16' },
  { bytes: [5], dimension: 'accent2 hue offset', rule: '30° + b/255 × 300°' },
  { bytes: [6], dimension: 'display face', rule: `b mod ${DISPLAY_FONTS.length}` },
  { bytes: [7], dimension: 'body face', rule: `b mod ${BODY_FONTS.length}` },
  {
    bytes: [8],
    dimension: 'display case · weight',
    rule: 'case b mod 4; weight = face weights[⌊b/4⌋ mod n]',
  },
  { bytes: [9], dimension: 'display tracking', rule: '−0.04 + b/255 × 0.24 em' },
  { bytes: [10], dimension: 'type scale ratio', rule: '1.067 + b/255 × 0.551' },
  { bytes: [11], dimension: 'density', rule: 't = b/255 mapped into the scenario range' },
  {
    bytes: [12],
    dimension: 'grid columns · gutter',
    rule: '3 + (b mod 10) columns; gutter = unit × (1 + ⌊b/10⌋ mod 4)',
  },
  { bytes: [13], dimension: 'text block span · start', rule: 'span from b & 15, start from b >> 4' },
  { bytes: [14], dimension: 'first-screen height', rule: '45 + b/255 × 55 % of the viewport' },
  { bytes: [15], dimension: 'sections · separator', rule: '3 + (b mod 6) sections; separator ⌊b/6⌋ mod 5' },
  {
    bytes: [16],
    dimension: 'anchor subject · size',
    rule: `subject b mod ${ANCHOR_SUBJECTS.length}; size 25 + ⌊b/8⌋/31 × 75 %`,
  },
  {
    bytes: [17],
    dimension: 'anchor position · rotation',
    rule: 'x = (b & 15)/15; rotation = ((b >> 4) − 7.5)/7.5 × 8°',
  },
  {
    bytes: [18],
    dimension: 'motif shape · size',
    rule: `shape b mod ${MOTIF_SHAPES.length}; size = unit × (1 + ⌊b/12⌋ mod 8)`,
  },
  { bytes: [19], dimension: 'motif placement · angle', rule: 'placement b mod 4; angle ⌊b/4⌋ × 180/63°' },
  {
    bytes: [20],
    dimension: 'radius · border',
    rule: 'radius RADII[b mod 8]; border ⌊b/8⌋ mod 4 px; style ⌊b/32⌋ mod 4',
  },
  {
    bytes: [21],
    dimension: 'shadow · texture',
    rule: 'shadow b & 3; texture (b >> 2) & 3; opacity 3 + (b >> 4) × 0.6 %',
  },
  {
    bytes: [22],
    dimension: 'motion property · duration',
    rule: 'property ⌊b/64⌋; duration (b mod 64)/63 × 600 ms',
  },
  { bytes: [23], dimension: 'easing', rule: 'b < 32 → steps(2 + b mod 6); else cubic-bezier from the bits' },
  { bytes: [24], dimension: 'voice person · headline form', rule: 'person b mod 4; headline ⌊b/4⌋ mod 6' },
  { bytes: [25], dimension: 'sentence length · register', rule: '3 + (b & 15) words; register (b >> 4)/15' },
  { bytes: [26], dimension: 'twist target', rule: 'b mod n (targets minus the scenario’s)' },
  {
    bytes: [27],
    dimension: 'twist operation · amount',
    rule: 'b mod n (operations minus the scenario’s); amount ⌊b/10⌋',
  },
  { bytes: [28], dimension: 'scenario format', rule: 'b mod n (non-web scenarios only)' },
  {
    bytes: [29],
    dimension: 'CJK display face',
    rule: `b mod ${CJK_DISPLAY_FONTS.length} (used on Chinese pages)`,
  },
  { bytes: [30], dimension: 'mono face', rule: `b mod ${MONO_FONTS.length}` },
];

let cachedFingerprint: string | undefined;

/** Fingerprint of everything the mapping reads besides the hash: algorithm, fonts and primitive lists. */
export function libraryFingerprint(): string {
  cachedFingerprint ??= sha256Hex(
    JSON.stringify({
      ALGORITHM,
      DISPLAY_FONTS,
      BODY_FONTS,
      MONO_FONTS,
      CJK_DISPLAY_FONTS,
      CJK_BODY_FONTS,
      DISPLAY_CASES,
      SEPARATORS,
      ANCHOR_SUBJECTS,
      MOTIF_SHAPES,
      MOTIF_PLACEMENTS,
      BORDER_STYLES,
      RADII,
      TEXTURES,
      MOTION_PROPERTIES,
      VOICE_PERSONS,
      HEADLINE_FORMS,
      TWIST_TARGETS,
      TWIST_OPERATIONS,
      BYTE_MAP,
    }),
  ).slice(0, 12);
  return cachedFingerprint;
}

let cachedScenarioFingerprint: string | undefined;

/** Fingerprint of the scenario data, recorded in every non-web brief. */
export function scenarioFingerprint(): string {
  cachedScenarioFingerprint ??= sha256Hex(JSON.stringify({ ALGORITHM, SCENARIOS })).slice(0, 12);
  return cachedScenarioFingerprint;
}

/** Root text size for a scenario: the density's base size scaled, or clamped into a range. */
export function scenarioBaseSize(s: Scenario, densityBase: number): number {
  const r = s.baseSize;
  if ('scale' in r) return Math.round(densityBase * r.scale);
  return Math.min(r.max, Math.max(r.min, densityBase));
}

export function normalizeConstraints(c: Constraints = {}): NormalizedConstraints {
  if (c.lightOnly && c.darkOnly) throw new Error('light_only and dark_only cannot both be set');
  const brandColors = (c.brandColors ?? []).slice(0, 2).map(normalizeHex);
  const n: NormalizedConstraints = {
    lightOnly: Boolean(c.lightOnly),
    darkOnly: Boolean(c.darkOnly),
    reducedMotion: Boolean(c.reducedMotion),
    brandColors,
  };
  if (c.scenario !== undefined) {
    if (!SCENARIO_IDS.includes(c.scenario))
      throw new Error(`Unknown scenario "${c.scenario}". Use one of: ${SCENARIO_IDS.join(', ')}.`);
    if (c.scenario !== 'web') n.scenario = c.scenario;
  }
  return n;
}

export function describeConstraints(c: NormalizedConstraints): string {
  const parts: string[] = [];
  if (c.lightOnly) parts.push('light_only');
  if (c.darkOnly) parts.push('dark_only');
  if (c.reducedMotion) parts.push('reduced_motion');
  if (c.brandColors.length) parts.push(`brand=${c.brandColors.join(',')}`);
  if (c.scenario) parts.push(`scenario=${c.scenario}`);
  return parts.length ? parts.join(' · ') : 'none';
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const hex2 = (b: number) => b.toString(16).padStart(2, '0');

function font(f: Omit<FontSpec, 'source'>): FontSpec {
  return { ...f, source: 'google' };
}

/** The twist as one instruction, with its amount read for the operation. */
export function twistText(target: Primitive, operation: Primitive, amount: number): string {
  const what = target.text;
  switch (operation.id) {
    case 'rotate':
      return `Rotate ${what} by ${r2(2 + amount * 0.5)}°.`;
    case 'oversize':
      return `Set ${what} at ${r2(2 + amount * 0.1)}× the size it would normally get.`;
    case 'undersize':
      return `Set ${what} at ${r2(0.6 - amount * 0.012)}× the size it would normally get.`;
    case 'repeat':
      return `Repeat ${what} ${2 + (amount % 4)} times in a row.`;
    case 'off-grid':
      return `Push ${what} ${1 + (amount % 3)} column${amount % 3 ? 's' : ''} off the grid.`;
    default:
      return `${what.charAt(0).toUpperCase()}${what.slice(1)}: ${operation.text}.`;
  }
}

export interface MapOptions {
  constraints?: Constraints;
}

/** Map one hash to a design. Pure and deterministic: same hash + constraints + library → same design. */
export function mapDesign(hash: string, opts: MapOptions = {}): Design {
  const constraints = normalizeConstraints(opts.constraints);
  const h = hash.trim().toLowerCase();
  const b = hashBytes(h);
  const byte = (i: number) => b[i] as number;
  const trace: TraceStep[] = [];
  const step = (bytes: number[], dimension: string, rule: string, result: string, note?: string) =>
    trace.push({
      dimension,
      bytes,
      hex: bytes.map((i) => hex2(byte(i))).join(' '),
      rule,
      result,
      ...(note ? { note } : {}),
    });
  const scenario = constraints.scenario ? (getScenario(constraints.scenario) as Scenario) : undefined;

  // ── palette (bytes 0–5) ────────────────────────────────────────────────────
  const brand = constraints.brandColors;
  const brandH = brand[0] ? brandHue(brand[0]) : null;
  const u16 = (byte(0) << 8) | byte(1);
  const hue = brandH ?? r2((u16 / 65536) * 360);
  step(
    [0, 1],
    'hue',
    `0x${hex2(byte(0))}${hex2(byte(1))} = ${u16}; ${u16}/65536 × 360`,
    `${hue}°`,
    brandH !== null ? `bytes 0–1 not used: hue of brand colour ${brand[0]}` : undefined,
  );
  const b2 = byte(2);
  let polarity: Polarity;
  let paperL: number;
  if (constraints.lightOnly || (!constraints.darkOnly && b2 >= 77)) {
    polarity = 'light';
    paperL = constraints.lightOnly ? r3(0.9 + (b2 / 255) * 0.085) : r3(0.9 + ((b2 - 77) / 178) * 0.085);
  } else {
    polarity = 'dark';
    paperL = constraints.darkOnly ? r3(0.14 + (b2 / 255) * 0.12) : r3(0.14 + (b2 / 76) * 0.12);
  }
  step(
    [2],
    'polarity · paper lightness',
    constraints.lightOnly || constraints.darkOnly
      ? `${polarity} (constraint); L from ${b2}/255`
      : b2 < 77
        ? `${b2} < 77 → dark; L = 0.14 + ${b2}/76 × 0.12`
        : `${b2} ≥ 77 → light; L = 0.90 + ${b2 - 77}/178 × 0.085`,
    `${polarity}, L ${paperL}`,
  );
  const paperC = r3((byte(3) / 255) * 0.045);
  step([3], 'paper chroma', `${byte(3)}/255 × 0.045`, `${paperC}`);
  const accentC = r3(0.07 + (byte(4) / 255) * 0.16);
  step(
    [4],
    'accent chroma',
    `0.07 + ${byte(4)}/255 × 0.16`,
    `${accentC}`,
    brand[0] ? 'accent replaced by brand colour' : undefined,
  );
  const accent2Offset = r2(30 + (byte(5) / 255) * 300);
  step(
    [5],
    'accent2 hue offset',
    `30 + ${byte(5)}/255 × 300`,
    `+${accent2Offset}°`,
    brand[1] ? 'accent2 replaced by brand colour' : undefined,
  );
  const brandOverride =
    brand.length > 0
      ? { ...(brand[0] ? { accent: brand[0] } : {}), ...(brand[1] ? { accent2: brand[1] } : {}) }
      : undefined;
  const colors = buildPalette({
    polarity,
    hue,
    paperL,
    paperC,
    accentC,
    accent2Offset,
    ...(brandOverride ? { brand: brandOverride } : {}),
  });

  // ── type (bytes 6–10, 29, 30) ─────────────────────────────────────────────
  const display = font(DISPLAY_FONTS[byte(6) % DISPLAY_FONTS.length]!);
  step(
    [6],
    'display face',
    `${byte(6)} mod ${DISPLAY_FONTS.length} = ${byte(6) % DISPLAY_FONTS.length}`,
    display.family,
  );
  const body = font(BODY_FONTS[byte(7) % BODY_FONTS.length]!);
  step([7], 'body face', `${byte(7)} mod ${BODY_FONTS.length} = ${byte(7) % BODY_FONTS.length}`, body.family);
  const dCase = DISPLAY_CASES[byte(8) % DISPLAY_CASES.length]!;
  const weight = display.weights[Math.floor(byte(8) / 4) % display.weights.length]!;
  step(
    [8],
    'display case · weight',
    `${byte(8)} mod 4 = ${byte(8) % 4}; ⌊${byte(8)}/4⌋ mod ${display.weights.length}`,
    `${dCase.id}, ${weight}`,
  );
  const tracking = r3(-0.04 + (byte(9) / 255) * 0.24);
  step([9], 'display tracking', `−0.04 + ${byte(9)}/255 × 0.24`, `${tracking}em`);
  const scale = r3(1.067 + (byte(10) / 255) * 0.551);
  step([10], 'type scale ratio', `1.067 + ${byte(10)}/255 × 0.551`, `${scale}`);
  const cjkDisplay = CJK_DISPLAY_FONTS[byte(29) % CJK_DISPLAY_FONTS.length]!;
  step(
    [29],
    'CJK display face',
    `${byte(29)} mod ${CJK_DISPLAY_FONTS.length}`,
    cjkDisplay,
    'used on Chinese pages',
  );
  const cjkBody =
    /serif/i.test(body.fallback) && !/sans-serif/i.test(body.fallback)
      ? CJK_BODY_FONTS[1]!
      : CJK_BODY_FONTS[0]!;
  const mono = font(MONO_FONTS[byte(30) % MONO_FONTS.length]!);
  step([30], 'mono face', `${byte(30)} mod ${MONO_FONTS.length}`, mono.family);

  // ── density (byte 11) ─────────────────────────────────────────────────────
  const [lo, hi] = scenario?.densityRange ?? [0, 1];
  const t = r3(lo + (byte(11) / 255) * (hi - lo));
  const density: DesignDensity = {
    t,
    baseSize: Math.round((18 - 4 * t) * 2) / 2,
    lineHeight: r2(1.65 - 0.3 * t),
    unit: Math.round(10 - 6 * t),
    sectionGap: Math.round(168 - 136 * t),
    maxWidth: Math.round((1080 + 360 * t) / 10) * 10,
  };
  step(
    [11],
    'density',
    lo === 0 && hi === 1 ? `t = ${byte(11)}/255` : `t = ${lo} + ${byte(11)}/255 × ${r2(hi - lo)}`,
    `t ${t}: base ${density.baseSize}px, line-height ${density.lineHeight}, unit ${density.unit}px`,
    scenario && (lo !== 0 || hi !== 1) ? `scenario ${scenario.id} uses t ${lo}–${hi}` : undefined,
  );

  // ── layout (bytes 12–15) ──────────────────────────────────────────────────
  const columns = 3 + (byte(12) % 10);
  const gutter = density.unit * (1 + (Math.floor(byte(12) / 10) % 4));
  step(
    [12],
    'grid columns · gutter',
    `3 + ${byte(12)} mod 10; unit × (1 + ⌊${byte(12)}/10⌋ mod 4)`,
    `${columns} columns, ${gutter}px gutter`,
  );
  const span = Math.max(Math.min(2, columns), Math.round(columns * (0.35 + 0.65 * ((byte(13) & 15) / 15))));
  const start = 1 + Math.round((columns - span) * ((byte(13) >> 4) / 15));
  step(
    [13],
    'text block span · start',
    `span ${byte(13) & 15}/15, start ${byte(13) >> 4}/15`,
    `columns ${start}–${start + span - 1} of ${columns}`,
  );
  const firstScreen = Math.round(45 + (byte(14) / 255) * 55);
  step([14], 'first-screen height', `45 + ${byte(14)}/255 × 55`, `${firstScreen}%`);
  const sections = 3 + (byte(15) % 6);
  const separator = SEPARATORS[Math.floor(byte(15) / 6) % SEPARATORS.length]!;
  step(
    [15],
    'sections · separator',
    `3 + ${byte(15)} mod 6; ⌊${byte(15)}/6⌋ mod 5`,
    `${sections} sections, ${separator.id}`,
  );

  // ── anchor (bytes 16–17) ──────────────────────────────────────────────────
  const subject = ANCHOR_SUBJECTS[byte(16) % ANCHOR_SUBJECTS.length]!;
  const size = Math.round(25 + (Math.floor(byte(16) / 8) / 31) * 75);
  step(
    [16],
    'anchor subject · size',
    `${byte(16)} mod 8; 25 + ⌊${byte(16)}/8⌋/31 × 75`,
    `${subject.id}, ${size}%`,
  );
  const x = r2((byte(17) & 15) / 15);
  const rotation = Math.round((((byte(17) >> 4) - 7.5) / 7.5) * 8 * 2) / 2;
  step(
    [17],
    'anchor position · rotation',
    `x ${byte(17) & 15}/15; ((${byte(17) >> 4}) − 7.5)/7.5 × 8`,
    `x ${x}, ${rotation}°`,
  );

  // ── motif (bytes 18–19) ───────────────────────────────────────────────────
  const shape = MOTIF_SHAPES[byte(18) % MOTIF_SHAPES.length]!;
  const motifSize = density.unit * (1 + (Math.floor(byte(18) / 12) % 8));
  step(
    [18],
    'motif shape · size',
    `${byte(18)} mod 12; unit × (1 + ⌊${byte(18)}/12⌋ mod 8)`,
    `${shape.id}, ${motifSize}px`,
  );
  const placement = MOTIF_PLACEMENTS[byte(19) % MOTIF_PLACEMENTS.length]!;
  const angle = Math.round((Math.floor(byte(19) / 4) * 180) / 63);
  step(
    [19],
    'motif placement · angle',
    `${byte(19)} mod 4; ⌊${byte(19)}/4⌋ × 180/63`,
    `${placement.id}, ${angle}°`,
  );

  // ── surface (bytes 20–21) ─────────────────────────────────────────────────
  const radius = RADII[byte(20) % RADII.length]!;
  const border = [0, 1, 2, 3][Math.floor(byte(20) / 8) % 4]!;
  const borderStyle = BORDER_STYLES[Math.floor(byte(20) / 32) % BORDER_STYLES.length]!;
  step(
    [20],
    'radius · border',
    `RADII[${byte(20)} mod 8]; ⌊${byte(20)}/8⌋ mod 4; ⌊${byte(20)}/32⌋ mod 4`,
    `${radius}px radius, ${border}px ${borderStyle} border`,
  );
  const shadow = [0, 0, 2, 6][byte(21) & 3]!;
  const texture = TEXTURES[(byte(21) >> 2) & 3]!;
  const textureOpacity = r2(3 + (byte(21) >> 4) * 0.6);
  step(
    [21],
    'shadow · texture',
    `${byte(21)} & 3; (${byte(21)} >> 2) & 3; 3 + ${byte(21) >> 4} × 0.6`,
    `${shadow ? `${shadow}px hard shadow` : 'no shadow'}, ${texture.id}${texture.id === 'none' ? '' : ` ${textureOpacity}%`}`,
  );

  // ── motion (bytes 22–23) ──────────────────────────────────────────────────
  const still = constraints.reducedMotion || Boolean(scenario?.stillMotion);
  const property = MOTION_PROPERTIES[Math.floor(byte(22) / 64)]!;
  const duration = still ? 0 : Math.round(((byte(22) % 64) / 63) * 60) * 10;
  const b23 = byte(23);
  const easing =
    b23 < 32
      ? `steps(${2 + (b23 % 6)}, end)`
      : `cubic-bezier(${r2((((b23 >> 2) & 7) / 7) * 0.9)}, ${r2(((b23 >> 5) / 7) * 1.4)}, ${r2(((b23 & 3) / 3) * 0.8 + 0.1)}, 1)`;
  const stillWhy = constraints.reducedMotion ? 'reduced_motion' : `scenario ${scenario?.id} is static`;
  step(
    [22],
    'motion property · duration',
    `⌊${byte(22)}/64⌋; (${byte(22)} mod 64)/63 × 600`,
    still ? 'none' : `${property.id}, ${duration}ms`,
    still ? `no motion: ${stillWhy}` : undefined,
  );
  step(
    [23],
    'easing',
    b23 < 32 ? `${b23} < 32 → steps` : `${b23} ≥ 32 → cubic-bezier from bits`,
    still ? 'none' : easing,
    still ? `no motion: ${stillWhy}` : undefined,
  );

  // ── voice (bytes 24–25) ───────────────────────────────────────────────────
  const person = VOICE_PERSONS[byte(24) % VOICE_PERSONS.length]!;
  const headline = HEADLINE_FORMS[Math.floor(byte(24) / 4) % HEADLINE_FORMS.length]!;
  step(
    [24],
    'voice person · headline form',
    `${byte(24)} mod 4; ⌊${byte(24)}/4⌋ mod 6`,
    `${person.id}, ${headline.id}`,
  );
  const sentenceWords = 3 + (byte(25) & 15);
  const register = r2((byte(25) >> 4) / 15);
  step(
    [25],
    'sentence length · register',
    `3 + (${byte(25)} & 15); (${byte(25)} >> 4)/15`,
    `${sentenceWords} words, register ${register}`,
  );

  // ── twist (bytes 26–27) ───────────────────────────────────────────────────
  const targets = TWIST_TARGETS.filter((x) => !scenario?.dropTwistTargets.includes(x.id));
  const ops = TWIST_OPERATIONS.filter((x) => !scenario?.dropTwistOperations.includes(x.id));
  const target = targets[byte(26) % targets.length]!;
  step(
    [26],
    'twist target',
    `${byte(26)} mod ${targets.length}`,
    target.id,
    targets.length < TWIST_TARGETS.length
      ? `scenario ${scenario?.id} leaves out ${scenario?.dropTwistTargets.join(', ')}`
      : undefined,
  );
  const operation = ops[byte(27) % ops.length]!;
  const amount = Math.floor(byte(27) / 10);
  step(
    [27],
    'twist operation · amount',
    `${byte(27)} mod ${ops.length}; ⌊${byte(27)}/10⌋`,
    `${operation.id}, ${amount}`,
    ops.length < TWIST_OPERATIONS.length
      ? `scenario ${scenario?.id} leaves out ${scenario?.dropTwistOperations.join(', ')}`
      : undefined,
  );

  // ── scenario format (byte 28) ─────────────────────────────────────────────
  let scenarioPart: DesignScenario | undefined;
  if (scenario && constraints.scenario) {
    const format = scenario.formats[byte(28) % scenario.formats.length]!;
    step(
      [28],
      'scenario format',
      `${byte(28)} mod ${scenario.formats.length}`,
      format.id,
      `scenario ${scenario.id}`,
    );
    scenarioPart = {
      id: constraints.scenario,
      data: scenarioFingerprint(),
      format,
      baseSize: scenarioBaseSize(scenario, density.baseSize),
    };
  }

  const unused = scenarioPart ? [31] : [28, 31];
  return {
    algorithm: ALGORITHM,
    library: libraryFingerprint(),
    hash: h,
    short: shortHash(h),
    ref: h,
    constraints,
    palette: {
      polarity,
      hue,
      paperL,
      paperC,
      accentC,
      accent2Offset,
      colors,
      ...(brandOverride ? { brand: brandOverride } : {}),
    },
    type: { display, body, mono, cjk: { display: cjkDisplay, body: cjkBody }, case: dCase, weight, tracking },
    scale,
    density,
    layout: { columns, gutter, span, start, firstScreen, sections, separator },
    anchor: { subject, size, x, rotation },
    motif: { shape, size: motifSize, placement, angle },
    surface: { radius, border, borderStyle, shadow, texture, textureOpacity },
    motion: { still, property, duration, easing: still ? 'none' : easing },
    voice: { person, headline, sentenceWords, register },
    twist: { target, operation, amount, text: twistText(target, operation, amount) },
    ...(scenarioPart ? { scenario: scenarioPart } : {}),
    trace: trace.sort((x, y) => (x.bytes[0] ?? 0) - (y.bytes[0] ?? 0)),
    unusedBytes: unused.map((i) => hex2(byte(i))).join(' '),
  };
}

/** Directions per roll when no count is given. */
export const DEFAULT_COUNT = 5;
/**
 * Directions per roll at most. The algorithm has no limit (every hash maps on its own), but each
 * direction becomes its own brief and its own independently rendered preview, and the compare page
 * focuses the first nine by number key; 12 keeps one roll reviewable in one sitting.
 */
export const MAX_COUNT = 12;

/** Map a roll: N hashes → N independent designs (one hash, one direction; nothing is shared or walked). */
export function mapRoll(hashes: readonly string[], constraints: Constraints = {}): Design[] {
  return hashes.map((hash) => mapDesign(hash, { constraints }));
}
