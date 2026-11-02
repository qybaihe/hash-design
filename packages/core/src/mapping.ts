import { hexToHsl, hueDistance, isLightPaper, normalizeHex } from './color.js';
import { BRANCHES } from './data/branches/index.js';
import { DENSITIES, SCALES, TWISTS, VOICES } from './data/pools.js';
import { getScenario, SCENARIO_IDS, SCENARIOS } from './data/scenarios.js';
import { ALGORITHM, formatRef, hashBytes, sha256Hex, shortHash } from './hash.js';
import type {
  Branch,
  BranchFamily,
  Density,
  LayoutOption,
  MotionOption,
  Option,
  Palette,
  Scale,
  Scenario,
  ScenarioFormat,
  ScenarioId,
  SurfaceOption,
  Twist,
  TypePairing,
  Voice,
} from './types.js';

/** User constraints. They filter pools *before* bytes are applied, so they are part of a design's identity. */
export interface Constraints {
  /** Only light palettes. */
  lightOnly?: boolean;
  /** Only dark palettes (branches without one are skipped). */
  darkOnly?: boolean;
  /** Force the stillest motion option. */
  reducedMotion?: boolean;
  /** Brand colours that must survive: [0] replaces accent, [1] replaces accent2. */
  brandColors?: string[];
  /** Restrict the branch pool to these families. */
  families?: BranchFamily[];
  /** Restrict the branch pool to these branch ids. */
  include?: string[];
  /** Remove these branch ids from the pool. */
  exclude?: string[];
  /** What is being designed (default "web", which leaves the mapping unchanged). */
  scenario?: ScenarioId;
}

export interface NormalizedConstraints {
  lightOnly: boolean;
  darkOnly: boolean;
  reducedMotion: boolean;
  brandColors: string[];
  families: BranchFamily[];
  include: string[];
  exclude: string[];
  /** Present only for non-web scenarios, so web constraints serialise exactly as before. */
  scenario?: Exclude<ScenarioId, 'web'>;
}

/** The scenario layer of a design (non-web scenarios only). */
export interface DesignScenario {
  id: Exclude<ScenarioId, 'web'>;
  /** Fingerprint of the scenario data; the branch library fingerprint is unaffected by scenarios. */
  data: string;
  /** Picked by byte 13. */
  format: ScenarioFormat;
  /** Root text size in px for this scenario; replaces the density's web base size in the type scale. */
  baseSize: number;
}

/** One step of the decision tree, kept so the mapping is auditable ("show your work"). */
export interface TraceStep {
  dimension: string;
  /** Byte positions used, e.g. [0, 1]. */
  bytes: number[];
  /** Raw byte values as hex, e.g. "3f a9". */
  hex: string;
  /** Human-readable rule, e.g. "0x3fa9 = 16297; 16297 mod 40 = 17". */
  rule: string;
  poolSize: number;
  index: number;
  result: string;
  note?: string;
}

export interface Design {
  algorithm: string;
  /** Fingerprint of the data library the mapping used. */
  library: string;
  hash: string;
  short: string;
  /** Collision steps walked inside the roll (0 = primary branch). */
  probe: number;
  /** `<hash>` or `<hash>+<probe>`; enough (with constraints) to reproduce this design. */
  ref: string;
  constraints: NormalizedConstraints;
  branch: Branch;
  voice: Voice;
  layout: LayoutOption;
  type: TypePairing;
  palette: Palette;
  /** Set when brand colours replaced palette slots. */
  paletteOverride?: { basePaletteId: string; accent?: string; accent2?: string };
  density: Density;
  motion: MotionOption;
  motif: Option;
  anchor: Option;
  scale: Scale;
  surface: SurfaceOption;
  twist: Twist;
  /** Set for non-web scenarios only. */
  scenario?: DesignScenario;
  trace: TraceStep[];
  /** Bytes 13–31 (14–31 with a non-web scenario): recorded, deliberately unused. */
  unusedBytes: string;
}

export const BYTE_MAP: ReadonlyArray<{ bytes: number[]; dimension: string; source: string }> = [
  {
    bytes: [0, 1],
    dimension: 'branch',
    source:
      'library (uint16 big-endian mod N; collisions — same branch, or same family while families remain — walk forward)',
  },
  { bytes: [2], dimension: 'voice', source: 'global voices' },
  { bytes: [3], dimension: 'layout', source: 'branch.layouts' },
  { bytes: [4], dimension: 'type', source: 'branch.type' },
  {
    bytes: [5],
    dimension: 'palette',
    source: 'branch.palettes (after light/dark filter; brand → nearest hue)',
  },
  { bytes: [6], dimension: 'density', source: 'branch.densities' },
  { bytes: [7], dimension: 'motion', source: 'branch.motion (reduced-motion → stillest)' },
  { bytes: [8], dimension: 'motif', source: 'branch.motifs' },
  { bytes: [9], dimension: 'anchor', source: 'branch.anchors' },
  { bytes: [10], dimension: 'scale', source: 'branch.scales' },
  { bytes: [11], dimension: 'surface', source: 'branch.surfaces' },
  { bytes: [12], dimension: 'twist', source: 'global twists (minus the scenario’s dropped twists)' },
  { bytes: [13], dimension: 'format', source: 'scenario.formats (non-web scenarios only; unused for web)' },
];

let cachedFingerprint: string | undefined;

/** Short fingerprint of everything that influences the mapping. Changes whenever data or algorithm change. */
export function libraryFingerprint(): string {
  cachedFingerprint ??= sha256Hex(
    JSON.stringify({ ALGORITHM, BRANCHES, VOICES, TWISTS, DENSITIES, SCALES }),
  ).slice(0, 12);
  return cachedFingerprint;
}

let cachedScenarioFingerprint: string | undefined;

/**
 * Fingerprint of the scenario data, recorded in non-web designs. Kept separate from the library
 * fingerprint so that scenario data can change without touching web refs.
 */
export function scenarioFingerprint(): string {
  cachedScenarioFingerprint ??= sha256Hex(JSON.stringify({ ALGORITHM, SCENARIOS })).slice(0, 12);
  return cachedScenarioFingerprint;
}

/** Root text size for a scenario: the density's web base size, scaled or clamped. */
export function scenarioBaseSize(s: Scenario, density: Density): number {
  const r = s.baseSize;
  if ('scale' in r) return Math.round(density.baseSize * r.scale);
  return Math.min(r.max, Math.max(r.min, density.baseSize));
}

export function normalizeConstraints(c: Constraints = {}): NormalizedConstraints {
  const n: NormalizedConstraints = {
    lightOnly: Boolean(c.lightOnly),
    darkOnly: Boolean(c.darkOnly),
    reducedMotion: Boolean(c.reducedMotion),
    brandColors: (c.brandColors ?? []).map((h) => normalizeHex(h)),
    families: [...new Set(c.families ?? [])].sort(),
    include: [...new Set(c.include ?? [])].sort(),
    exclude: [...new Set(c.exclude ?? [])].sort(),
  };
  if (c.scenario !== undefined && c.scenario !== 'web') {
    if (!getScenario(c.scenario)) {
      throw new Error(`Unknown scenario "${c.scenario}". Use one of: ${SCENARIO_IDS.join(', ')}.`);
    }
    n.scenario = c.scenario;
  }
  if (n.lightOnly && n.darkOnly) throw new Error('lightOnly and darkOnly cannot both be set');
  if (n.brandColors.length > 2) throw new Error('At most 2 brand colours are supported (accent, accent2)');
  const known = new Set(BRANCHES.map((b) => b.id));
  for (const id of [...n.include, ...n.exclude]) {
    if (!known.has(id)) throw new Error(`Unknown branch id "${id}". Use list_branches to see valid ids.`);
  }
  return n;
}

export function describeConstraints(c: NormalizedConstraints): string {
  const parts: string[] = [];
  if (c.lightOnly) parts.push('light-only');
  if (c.darkOnly) parts.push('dark-only');
  if (c.reducedMotion) parts.push('reduced-motion');
  if (c.brandColors.length) parts.push(`brand=${c.brandColors.join(',')}`);
  if (c.families.length) parts.push(`families=${c.families.join(',')}`);
  if (c.include.length) parts.push(`include=${c.include.join(',')}`);
  if (c.exclude.length) parts.push(`exclude=${c.exclude.join(',')}`);
  if (c.scenario) parts.push(`scenario=${c.scenario}`);
  return parts.length ? parts.join('; ') : 'none';
}

function isDarkPalette(p: Palette): boolean {
  return !isLightPaper(p.colors.paper);
}

function paletteCandidates(branch: Branch, c: NormalizedConstraints): Palette[] {
  if (c.lightOnly) return branch.palettes.filter((p) => !isDarkPalette(p));
  if (c.darkOnly) return branch.palettes.filter(isDarkPalette);
  return branch.palettes;
}

/** The ordered branch pool after constraints. Order is library order. */
export function branchPool(c: NormalizedConstraints): Branch[] {
  let pool = [...BRANCHES];
  if (c.families.length) pool = pool.filter((b) => c.families.includes(b.family));
  if (c.include.length) pool = pool.filter((b) => c.include.includes(b.id));
  if (c.exclude.length) pool = pool.filter((b) => !c.exclude.includes(b.id));
  if (c.darkOnly) pool = pool.filter((b) => b.palettes.some(isDarkPalette));
  if (pool.length === 0) throw new Error('Constraints leave no design branches to choose from');
  return pool;
}

const hx = (n: number) => n.toString(16).padStart(2, '0');

function pick<T extends { id: string }>(
  list: readonly T[],
  byte: number,
  dimension: string,
  byteIndex: number,
  trace: TraceStep[],
  note?: string,
): T {
  const index = byte % list.length;
  const item = list[index] as T;
  trace.push({
    dimension,
    bytes: [byteIndex],
    hex: hx(byte),
    rule: `0x${hx(byte)} = ${byte}; ${byte} mod ${list.length} = ${index}`,
    poolSize: list.length,
    index,
    result: item.id,
    ...(note ? { note } : {}),
  });
  return item;
}

/** Primary branch index for a hash (before collision handling). */
export function primaryBranchIndex(hash: string, poolSize: number): number {
  const b = hashBytes(hash);
  return (((b[0] as number) << 8) | (b[1] as number)) % poolSize;
}

export interface MapOptions {
  probe?: number;
  constraints?: Constraints;
}

/** Map one hash to a design. Pure and deterministic given (hash, probe, constraints, library). */
export function mapDesign(hash: string, opts: MapOptions = {}): Design {
  const constraints = normalizeConstraints(opts.constraints);
  const probe = opts.probe ?? 0;
  if (!Number.isInteger(probe) || probe < 0) throw new Error(`probe must be a non-negative integer`);
  const bytes = hashBytes(hash);
  const h = hash.toLowerCase();
  const pool = branchPool(constraints);
  const byte = (i: number) => bytes[i] as number;
  const trace: TraceStep[] = [];
  const scenario = constraints.scenario ? (getScenario(constraints.scenario) as Scenario) : undefined;

  const u16 = (byte(0) << 8) | byte(1);
  const primary = u16 % pool.length;
  const index = (primary + probe) % pool.length;
  const branch = pool[index] as Branch;
  trace.push({
    dimension: 'branch',
    bytes: [0, 1],
    hex: `${hx(byte(0))} ${hx(byte(1))}`,
    rule:
      `0x${hx(byte(0))}${hx(byte(1))} = ${u16}; ${u16} mod ${pool.length} = ${primary}` +
      (probe ? `; collision → +${probe} = ${index}` : ''),
    poolSize: pool.length,
    index,
    result: branch.id,
    ...(probe
      ? { note: `primary branch (or its family) already used in this roll; walked forward ${probe} step(s)` }
      : {}),
  });

  const voice = pick(VOICES, byte(2), 'voice', 2, trace);
  const layout = pick(branch.layouts, byte(3), 'layout', 3, trace);
  const type = pick(branch.type, byte(4), 'type', 4, trace);

  // Palette: light/dark filter first; brand colours pick the nearest accent hue instead of the byte.
  const candidates = paletteCandidates(branch, constraints);
  let palette: Palette;
  let paletteOverride: Design['paletteOverride'];
  const filterNote = constraints.lightOnly
    ? 'light-only filter'
    : constraints.darkOnly
      ? 'dark-only filter'
      : '';
  const brand = constraints.brandColors;
  if (brand.length) {
    const target = hexToHsl(brand[0] as string);
    let bestIdx = 0;
    let bestDist = Infinity;
    candidates.forEach((p, i) => {
      const a = hexToHsl(p.colors.accent);
      // Achromatic brand colours match on lightness; chromatic ones on hue.
      const d = target.s < 0.12 ? Math.abs(a.l - target.l) * 180 : hueDistance(a.h, target.h);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    const base = candidates[bestIdx] as Palette;
    paletteOverride = {
      basePaletteId: base.id,
      accent: brand[0],
      ...(brand[1] ? { accent2: brand[1] } : {}),
    };
    palette = {
      ...base,
      id: `${base.id}+brand`,
      name: `${base.name} (brand override)`,
      colors: { ...base.colors, accent: brand[0] as string, ...(brand[1] ? { accent2: brand[1] } : {}) },
    };
    trace.push({
      dimension: 'palette',
      bytes: [5],
      hex: hx(byte(5)),
      rule: `brand colour ${brand[0]} → nearest accent hue among ${candidates.length} palette(s) = ${base.id}`,
      poolSize: candidates.length,
      index: bestIdx,
      result: palette.id,
      note: ['byte 5 not used because brand colours were given', filterNote].filter(Boolean).join('; '),
    });
  } else {
    palette = pick(candidates, byte(5), 'palette', 5, trace, filterNote || undefined);
  }

  // Scenarios may drop densities that do not suit the canvas (e.g. packed slides), unless none would remain.
  let densities = branch.densities;
  let densityNote: string | undefined;
  if (scenario) {
    const dropped = branch.densities.filter((d) => scenario.dropDensities.includes(d));
    const kept = branch.densities.filter((d) => !scenario.dropDensities.includes(d));
    if (dropped.length && kept.length) {
      densities = kept;
      densityNote = `scenario ${scenario.id} drops ${dropped.join(', ')}`;
    } else if (dropped.length) {
      densityNote = `scenario ${scenario.id} would drop ${dropped.join(', ')}, leaving nothing; branch list kept`;
    }
  }
  const densityId = densities[byte(6) % densities.length] as Density['id'];
  const density = DENSITIES[densityId];
  trace.push({
    dimension: 'density',
    bytes: [6],
    hex: hx(byte(6)),
    rule: `0x${hx(byte(6))} = ${byte(6)}; ${byte(6)} mod ${densities.length} = ${byte(6) % densities.length}`,
    poolSize: densities.length,
    index: byte(6) % densities.length,
    result: density.id,
    ...(densityNote ? { note: densityNote } : {}),
  });

  let motion: MotionOption;
  if (constraints.reducedMotion || scenario?.stillMotion) {
    const why = constraints.reducedMotion ? 'reduced-motion' : `scenario ${scenario?.id}`;
    const ms = (m: MotionOption) =>
      parseFloat(m.duration) * (m.duration.trim().endsWith('ms') ? 1 : 1000) || 0;
    const sorted = branch.motion.map((m, i) => ({ m, i })).sort((a, b) => ms(a.m) - ms(b.m) || a.i - b.i);
    const chosen = sorted[0] as { m: MotionOption; i: number };
    motion = chosen.m;
    trace.push({
      dimension: 'motion',
      bytes: [7],
      hex: hx(byte(7)),
      rule: `${why} → stillest option (shortest duration) = ${motion.id}`,
      poolSize: branch.motion.length,
      index: chosen.i,
      result: motion.id,
      note: constraints.reducedMotion
        ? 'byte 7 not used because reduced-motion was requested'
        : `byte 7 not used because scenario ${scenario?.id} is static`,
    });
  } else {
    motion = pick(branch.motion, byte(7), 'motion', 7, trace);
  }

  const motif = pick(branch.motifs, byte(8), 'motif', 8, trace);
  const anchor = pick(branch.anchors, byte(9), 'anchor', 9, trace);

  const scaleId = branch.scales[byte(10) % branch.scales.length] as Scale['id'];
  const scale = SCALES[scaleId];
  trace.push({
    dimension: 'scale',
    bytes: [10],
    hex: hx(byte(10)),
    rule: `0x${hx(byte(10))} = ${byte(10)}; ${byte(10)} mod ${branch.scales.length} = ${byte(10) % branch.scales.length}`,
    poolSize: branch.scales.length,
    index: byte(10) % branch.scales.length,
    result: scale.id,
  });

  const surface = pick(branch.surfaces, byte(11), 'surface', 11, trace);
  const droppedTwists = scenario ? TWISTS.filter((t) => scenario.dropTwists.includes(t.id)) : [];
  const twist = pick(
    droppedTwists.length ? TWISTS.filter((t) => !droppedTwists.includes(t)) : TWISTS,
    byte(12),
    'twist',
    12,
    trace,
    droppedTwists.length
      ? `scenario ${scenario?.id} drops ${droppedTwists.map((t) => t.id).join(', ')}`
      : undefined,
  );

  let scenarioPart: DesignScenario | undefined;
  if (scenario && constraints.scenario) {
    const format = pick(scenario.formats, byte(13), 'format', 13, trace, `scenario ${scenario.id}`);
    scenarioPart = {
      id: constraints.scenario,
      data: scenarioFingerprint(),
      format,
      baseSize: scenarioBaseSize(scenario, density),
    };
  }

  return {
    algorithm: ALGORITHM,
    library: libraryFingerprint(),
    hash: h,
    short: shortHash(h),
    probe,
    ref: formatRef(h, probe),
    constraints,
    branch,
    voice,
    layout,
    type,
    palette,
    ...(paletteOverride ? { paletteOverride } : {}),
    density,
    motion,
    motif,
    anchor,
    scale,
    surface,
    twist,
    ...(scenarioPart ? { scenario: scenarioPart } : {}),
    trace,
    unusedBytes: h.slice(scenarioPart ? 28 : 26),
  };
}

/**
 * Map a whole roll. Each hash gets its primary branch, then walks forward (index + 1, + 2, …) past
 * "collisions" so every direction in the roll is genuinely different:
 *  - a branch already used in this roll is always a collision;
 *  - a branch whose *family* is already used is also a collision while some family in the pool is
 *    still unused (family spread), so a 5-roll never clusters in, say, five paper documents.
 * The walk is recorded as `probe`, so `mapDesign(hash, { probe })` reproduces each design on its own.
 */
export function mapRoll(hashes: readonly string[], constraints: Constraints = {}): Design[] {
  const norm = normalizeConstraints(constraints);
  const pool = branchPool(norm);
  if (hashes.length > pool.length) {
    throw new Error(`Cannot roll ${hashes.length} distinct designs from a pool of ${pool.length} branches`);
  }
  const familyCount = new Set(pool.map((b) => b.family)).size;
  const usedBranches = new Set<number>();
  const usedFamilies = new Set<string>();
  return hashes.map((hash) => {
    const primary = primaryBranchIndex(hash, pool.length);
    const spread = usedFamilies.size < familyCount;
    let probe = 0;
    for (;;) {
      const idx = (primary + probe) % pool.length;
      const family = (pool[idx] as Branch).family;
      if (!usedBranches.has(idx) && !(spread && usedFamilies.has(family))) break;
      probe++;
    }
    const idx = (primary + probe) % pool.length;
    usedBranches.add(idx);
    usedFamilies.add((pool[idx] as Branch).family);
    return mapDesign(hash, { probe, constraints: norm });
  });
}

export function getBranch(id: string): Branch | undefined {
  return BRANCHES.find((b) => b.id === id);
}
