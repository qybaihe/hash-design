/**
 * hash-design — random-hash–driven design directions.
 *
 *   roll()          true-random (or seeded) hashes → one design per hash, every byte a parameter
 *   renderBrief()   one design → frozen Markdown brief (tokens, fonts, palette, layout, bans)
 *   critiquePage()  static "AI-template" critique of an HTML page (+ brief adherence)
 *   buildComparePage() side-by-side light table for the rendered previews
 */
export * from './browser.js';
export {
  critiquePage,
  renderCritique,
  type CritiqueInput,
  type CritiqueResult,
  type Finding,
} from './critique.js';
export { writeRoll, type WrittenRoll } from './files.js';
export {
  SKILL_BLOCK_BEGIN,
  SKILL_BLOCK_END,
  applySkillGeneratedBlock,
  readSkill,
  skillGeneratedBlock,
  skillPath,
} from './skill.js';
