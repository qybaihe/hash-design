/**
 * hash-design for browsers: everything that does not touch the file system or Node APIs.
 *
 *   roll()          true-random (crypto.getRandomValues) or seeded hashes → one design per hash
 *   reproduce()     one design from its ref (the hash) and constraints
 *   renderBrief()   one design → frozen Markdown brief, byte for byte what `hash-design brief` prints
 *   renderReply()   the short message an agent sends after a roll
 *
 * The CLI, the MCP server and this entry run the same modules; `browser.test.ts` bundles this file for
 * the browser and checks its briefs against the CLI's.
 */
export * from './types.js';
export {
  BANS,
  BANNED_FONTS,
  BUZZWORDS_EN,
  BUZZWORDS_ZH,
  FRAMEWORK_DEFAULT_HEX,
  banIds,
  isBannedFont,
} from './data/bans.js';
export { BODY_FONTS, CJK_BODY_FONTS, CJK_DISPLAY_FONTS, DISPLAY_FONTS, MONO_FONTS } from './data/fonts.js';
export {
  ANCHOR_SUBJECTS,
  BORDER_STYLES,
  DISPLAY_CASES,
  HEADLINE_FORMS,
  MOTIF_PLACEMENTS,
  MOTIF_SHAPES,
  MOTION_PROPERTIES,
  RADII,
  SEPARATORS,
  TEXTURES,
  TWIST_OPERATIONS,
  TWIST_TARGETS,
  VOICE_PERSONS,
  type Primitive,
} from './data/space.js';
export { SCENARIOS, SCENARIO_IDS, getScenario } from './data/scenarios.js';
export { sha256, toHex } from './sha256.js';
export {
  ALGORITHM,
  hashBytes,
  isHash,
  parseRef,
  randomHash,
  rollHashes,
  seededHash,
  sha256Hex,
  shortHash,
  type DesignRef,
} from './hash.js';
export {
  BYTE_MAP,
  DEFAULT_COUNT,
  MAX_COUNT,
  describeConstraints,
  libraryFingerprint,
  mapDesign,
  mapRoll,
  normalizeConstraints,
  scenarioBaseSize,
  scenarioFingerprint,
  twistText,
  type Constraints,
  type Design,
  type DesignAnchor,
  type DesignDensity,
  type DesignLayout,
  type DesignMotif,
  type DesignMotion,
  type DesignPalette,
  type DesignScenario,
  type DesignSurface,
  type DesignTwist,
  type DesignType,
  type DesignVoice,
  type MapOptions,
  type NormalizedConstraints,
  type TraceStep,
} from './mapping.js';
export {
  briefJson,
  designSlug,
  directionLabel,
  normalizeContent,
  renderBrief,
  renderRoll,
  renderRollSummary,
  reproduce,
  roll,
  rollJson,
  type BriefJson,
  type BriefOptions,
  type Content,
  type Roll,
  type RollJson,
  type RollOptions,
} from './brief.js';
export {
  baseSize,
  contrastReport,
  detectLanguage,
  fontStack,
  fontStacks,
  googleFontsUrl,
  tokensCss,
  typeScale,
  type Language,
} from './derive.js';
export {
  buildComparePage,
  compareEntriesFromRoll,
  compareSubtitle,
  type CompareEntry,
  type CompareOptions,
} from './compare.js';
export {
  contrast,
  hexToHsl,
  hexToOklch,
  isLightPaper,
  luminance,
  normalizeHex,
  oklchToHex,
  parseCssColor,
} from './color.js';
export { brandHue, buildPalette, type PaletteParams, type Polarity } from './palette.js';
export { renderReply, replyLine, type ReplyOptions, type ReplyStage } from './reply.js';
