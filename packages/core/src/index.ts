/**
 * hash-design — random-hash–driven design directions.
 *
 *   roll()          true-random (or seeded) hashes → one design per hash, every byte a parameter
 *   renderBrief()   one design → frozen Markdown brief (tokens, fonts, palette, layout, bans)
 *   critiquePage()  static "AI-template" critique of an HTML page (+ brief adherence)
 *   buildComparePage() side-by-side light table for the rendered previews
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
  critiquePage,
  renderCritique,
  type CritiqueInput,
  type CritiqueResult,
  type Finding,
} from './critique.js';
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
export { writeRoll, type WrittenRoll } from './files.js';
export {
  SKILL_BLOCK_BEGIN,
  SKILL_BLOCK_END,
  applySkillGeneratedBlock,
  readSkill,
  skillGeneratedBlock,
  skillPath,
} from './skill.js';
