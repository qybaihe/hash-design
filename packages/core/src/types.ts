/**
 * hash-design data model.
 *
 * hash-design/v2 has no library of genres: a hash maps straight onto continuous design parameters
 * (see mapping.ts). What stays here as data is what every design shares: fonts, scenarios and the bans.
 * Everything is plain data so it can be serialised into briefs, MCP responses and tests.
 */

/** Bilingual text. `zh` is the primary language of briefs; `en` is used for English briefs and docs. */
export interface Bilingual {
  zh: string;
  en: string;
}

export type FontSource = 'google' | 'system';

export interface FontSpec {
  /** Exact family name as published on Google Fonts (or a system font name when source = 'system'). */
  family: string;
  /** Weights to load / use. */
  weights: number[];
  /** Whether italics are part of the voice. */
  italic?: boolean;
  /** CSS fallback stack appended after the family. Never include banned families. */
  fallback: string;
  source: FontSource;
}

export interface PaletteColors {
  /** Page background. */
  paper: string;
  /** Primary text. Must reach ≥ 7:1 against paper. */
  ink: string;
  /** Secondary text. Must reach ≥ 4.5:1 against paper. */
  muted: string;
  /** Primary accent (fills, marks, big type). */
  accent: string;
  /** Secondary accent. */
  accent2: string;
  /** Hairlines, borders, rules. */
  rule: string;
  /** Secondary background for panels / blocks. */
  panel: string;
}

/**
 * What is being designed. `web` is the default; every other scenario keeps the rolled direction
 * (palette, type, layout, voice, …) and adds an output format, a canvas and scenario rules.
 */
export type ScenarioId = 'web' | 'deck' | 'app' | 'dashboard' | 'poster' | 'email';

/** One concrete format inside a scenario. Byte 28 picks one (non-web scenarios only). */
export interface ScenarioFormat {
  id: string;
  name: Bilingual;
  description: Bilingual;
  /** Canvas (fixed formats) or design viewport / column width, in CSS px. */
  width: number;
  height: number;
  /** A fixed artboard that is scaled to fit and never reflowed (slides, posters). */
  fixed: boolean;
}

/** How the scenario sets the root text size: scale the density's base size, or clamp it. */
export type BaseSizeRule = { scale: number } | { min: number; max: number };

export interface Scenario {
  id: ScenarioId;
  name: Bilingual;
  /** One line: what gets delivered. */
  summary: Bilingual;
  /** File and structure contract for the previews and the final artifact. */
  output: Bilingual;
  /** How many slides / screens / artboards. */
  count: Bilingual;
  /** How the rolled layout, anchor and motion translate into this scenario. */
  layout: Bilingual;
  anchor: Bilingual;
  motion: Bilingual;
  baseSize: BaseSizeRule;
  /** Byte 28 picks one. Empty for web. */
  formats: ScenarioFormat[];
  /** The slice of the density axis (0 = airiest, 1 = most packed) this scenario uses; byte 11 is mapped into it. */
  densityRange: [number, number];
  /** Twist targets that make no sense here; byte 26 picks from the rest. */
  dropTwistTargets: string[];
  /** Twist operations that make no sense here; byte 27 picks from the rest. */
  dropTwistOperations: string[];
  /** No motion at all (as with reduced_motion). */
  stillMotion: boolean;
  must: Bilingual[];
  mustNot: Bilingual[];
}

export type BanSeverity = 'critical' | 'major' | 'minor';

export interface Ban {
  id: string;
  title: Bilingual;
  /** What exactly is banned and why. */
  detail: string;
  severity: BanSeverity;
  /** Whether critique_page can detect it automatically. */
  detectable: boolean;
}
