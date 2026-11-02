/**
 * The v2 parameter space. There is no library of genres: a hash is mapped straight onto continuous
 * values (colour, sizes, spacing, timing, angles) and onto small lists of primitives that combine
 * freely (a motif shape × a placement × a size × an angle, a twist target × an operation × an amount).
 * Nothing here names a style, a period or a genre, and no entry is tied to any other.
 *
 * Every list is part of the library fingerprint: editing one changes what a hash maps to.
 */

export interface Primitive {
  id: string;
  /** Plain description used in briefs. */
  text: string;
}

/** Byte 8 (with the face's own weights): how the display face is set. */
export const DISPLAY_CASES: readonly Primitive[] = [
  { id: 'as-written', text: 'as written (sentence case)' },
  { id: 'upper', text: 'UPPERCASE' },
  { id: 'lower', text: 'lowercase' },
  { id: 'small-caps', text: 'small caps (font-variant-caps: all-small-caps)' },
];

/** Byte 15: how sections are separated. */
export const SEPARATORS: readonly Primitive[] = [
  { id: 'rules', text: 'hairline rules in the rule colour' },
  { id: 'bands', text: 'full-width bands alternating paper and panel' },
  { id: 'numbers', text: 'numbered section heads (01, 02 …) in the mono face' },
  { id: 'space', text: 'space only: the section gap, no lines or fills' },
  { id: 'boxes', text: 'each section in a bordered box on the grid' },
];

/** Byte 16: what the first screen is built around. */
export const ANCHOR_SUBJECTS: readonly Primitive[] = [
  { id: 'headline', text: 'the headline, set as large as the width allows' },
  { id: 'number', text: 'one number taken from the facts' },
  { id: 'initial', text: 'the initial letter (or first character) of the subject' },
  { id: 'colour-block', text: 'a solid block of the accent colour holding the headline' },
  { id: 'grid-diagram', text: 'a diagram drawn from the grid lines themselves' },
  { id: 'fact-list', text: 'the facts as one list, nothing else' },
  { id: 'word', text: 'one word from the subject' },
  { id: 'motif', text: 'the motif drawn at full scale' },
];

/** Byte 18: the repeated graphic element. */
export const MOTIF_SHAPES: readonly Primitive[] = [
  { id: 'rules', text: 'hairline rules' },
  { id: 'dots', text: 'dots' },
  { id: 'rings', text: 'concentric circles' },
  { id: 'stripes', text: 'parallel stripes' },
  { id: 'crosses', text: 'small crosses (+)' },
  { id: 'brackets', text: 'square brackets' },
  { id: 'arrows', text: 'arrows' },
  { id: 'numerals', text: 'index numerals' },
  { id: 'squares', text: 'squares' },
  { id: 'half-circles', text: 'half circles' },
  { id: 'zigzags', text: 'zigzag lines' },
  { id: 'ticks', text: 'tick marks, like a ruler' },
];

/** Byte 19: where the motif appears. */
export const MOTIF_PLACEMENTS: readonly Primitive[] = [
  { id: 'edges', text: 'along the page edges' },
  { id: 'dividers', text: 'between sections' },
  { id: 'behind-anchor', text: 'behind the first-screen anchor' },
  { id: 'markers', text: 'as list and heading markers' },
];

/** Byte 20 (high bits): border style. */
export const BORDER_STYLES: readonly string[] = ['solid', 'solid', 'dashed', 'dotted'];

/** Byte 20 (low bits): corner radius in px. Half the values are square corners. */
export const RADII: readonly number[] = [0, 0, 0, 0, 2, 4, 8, 16];

/** Byte 21: surface texture. */
export const TEXTURES: readonly Primitive[] = [
  { id: 'none', text: 'flat colour, no texture' },
  { id: 'grain', text: 'fine noise grain over the paper' },
  { id: 'line-screen', text: 'a fine line screen (repeating-linear-gradient)' },
  { id: 'dot-screen', text: 'a fine dot screen (radial-gradient pattern)' },
];

/** Byte 22 (high bits): what moves. */
export const MOTION_PROPERTIES: readonly Primitive[] = [
  { id: 'opacity', text: 'opacity' },
  { id: 'transform', text: 'position (transform: translate)' },
  { id: 'clip-path', text: 'a wipe (clip-path)' },
  { id: 'colour', text: 'colour (color / background-color)' },
];

/** Byte 24: grammatical person of the copy. */
export const VOICE_PERSONS: readonly Primitive[] = [
  { id: 'i', text: 'first person singular ("I")' },
  { id: 'we', text: 'first person plural ("we")' },
  { id: 'you', text: 'second person ("you")' },
  { id: 'none', text: 'impersonal: no pronouns, facts stated plainly' },
];

/** Byte 24 (high bits): the shape of headlines. */
export const HEADLINE_FORMS: readonly Primitive[] = [
  { id: 'statement', text: 'a plain statement' },
  { id: 'question', text: 'a question the facts answer' },
  { id: 'label', text: 'a label: a noun phrase, no verb' },
  { id: 'imperative', text: 'an instruction to the reader' },
  { id: 'number-first', text: 'starts with a number from the facts' },
  { id: 'two-words', text: 'two words at most' },
];

/** Byte 26: what the twist acts on. */
export const TWIST_TARGETS: readonly Primitive[] = [
  { id: 'headline', text: 'the main headline' },
  { id: 'navigation', text: 'the navigation' },
  { id: 'numbers', text: 'every number on the page' },
  { id: 'footer', text: 'the footer' },
  { id: 'section-heads', text: 'the section headings' },
  { id: 'anchor', text: 'the first-screen anchor' },
  { id: 'labels', text: 'captions and labels' },
  { id: 'links', text: 'the links' },
  { id: 'cta', text: 'the primary call to action' },
];

/** Byte 27: what the twist does; `amount` is floor(byte / 10), 0–25. */
export const TWIST_OPERATIONS: readonly Primitive[] = [
  { id: 'rotate', text: 'rotated' },
  { id: 'vertical', text: 'set vertically (writing-mode: vertical-rl)' },
  { id: 'oversize', text: 'set far larger than expected' },
  { id: 'undersize', text: 'set far smaller than expected' },
  { id: 'invert', text: 'inverted: paper-coloured on ink' },
  { id: 'repeat', text: 'repeated' },
  { id: 'strike', text: 'struck through, with the correction set beside it' },
  { id: 'off-grid', text: 'pushed off the grid' },
  { id: 'mono', text: 'set in the mono face' },
  { id: 'outline', text: 'outlined: stroke only, no fill' },
];
