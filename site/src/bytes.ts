/**
 * The byte map: which bytes of a hash drive which part of a direction. Pure functions, used by the build
 * (site/build/content.ts prerenders the worked example) and by the page (re-rendering for a new hash).
 */
import { BYTE_MAP, hashBytes, oklchToHex, reproduce, type Design } from 'hash-design/browser';

export interface ByteGroup {
  id: string;
  label: string;
  bytes: number[];
}

/** The groups of the README's byte table; `site/test/content.test.ts` checks they cover BYTE_MAP exactly. */
export const BYTE_GROUPS: ByteGroup[] = [
  { id: 'palette', label: 'Palette', bytes: [0, 1, 2, 3, 4, 5] },
  { id: 'type', label: 'Type', bytes: [6, 7, 8, 9, 10] },
  { id: 'density', label: 'Density', bytes: [11] },
  { id: 'layout', label: 'Layout', bytes: [12, 13, 14, 15] },
  { id: 'anchor', label: 'Anchor', bytes: [16, 17] },
  { id: 'motif', label: 'Motif', bytes: [18, 19] },
  { id: 'surface', label: 'Surface', bytes: [20, 21] },
  { id: 'motion', label: 'Motion', bytes: [22, 23] },
  { id: 'voice', label: 'Voice', bytes: [24, 25] },
  { id: 'twist', label: 'Twist', bytes: [26, 27] },
  { id: 'format', label: 'Format', bytes: [28] },
  { id: 'faces', label: 'CJK · mono', bytes: [29, 30] },
  { id: 'unused', label: 'Unused', bytes: [31] },
];

/** The worked example of docs/mapping.md §9, shown before anyone rolls. */
export const WORKED_EXAMPLE = '6ebe9acd06cbf4810ad2989965b22bc39bd527084bdda2964f9f0d49eb25562d';

const groupOf = (i: number): ByteGroup => BYTE_GROUPS.find((g) => g.bytes.includes(i)) ?? BYTE_GROUPS.at(-1)!;

/** One quiet colour per group, evenly spaced in OKLCH hue. */
export function groupColor(id: string): string {
  const i = BYTE_GROUPS.findIndex((g) => g.id === id);
  if (id === 'unused') return '#c9c4b9';
  return oklchToHex(0.74, 0.085, 20 + (i * 360) / (BYTE_GROUPS.length - 1));
}

export const esc = (v: unknown): string =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

export interface ByteDetail {
  index: number;
  hex: string;
  value: number;
  group: string;
  dimension: string;
  rule: string;
  result: string;
}

/** What byte `i` of a design's hash decided, read from the design's own mapping trace. */
export function byteDetail(design: Design, i: number): ByteDetail {
  const b = hashBytes(design.hash)[i] as number;
  const step = design.trace.find((t) => t.bytes.includes(i));
  const spec = BYTE_MAP.find((m) => m.bytes.includes(i));
  const base = { index: i, hex: b.toString(16).padStart(2, '0'), value: b, group: groupOf(i).label };
  if (step) return { ...base, dimension: step.dimension, rule: step.rule, result: step.result };
  if (spec)
    return {
      ...base,
      dimension: spec.dimension,
      rule: spec.rule,
      result: i === 28 ? 'read only for non-web scenarios' : 'not used by this design',
    };
  return { ...base, dimension: 'unused', rule: 'not read by any rule', result: 'recorded in the brief' };
}

export function detailHtml(d: ByteDetail): string {
  const bytes = `byte ${d.index}`;
  return `<p class="bd-head"><span class="bd-byte">${bytes}</span><code>0x${d.hex}</code><span class="bd-dec">= ${d.value}</span><span class="bd-group">${esc(d.group)}</span></p>
<p class="bd-dim">${esc(d.dimension)}</p>
<p class="bd-rule"><span>rule</span><code>${esc(d.rule)}</code></p>
<p class="bd-result"><span>result</span><strong>${esc(d.result)}</strong></p>`;
}

/** The 32 cells for one hash. */
export function cellsHtml(hash: string, selected = 6): string {
  const b = hashBytes(hash);
  return Array.from(b, (v, i) => {
    const g = groupOf(i);
    const on = i === selected ? ' aria-pressed="true"' : ' aria-pressed="false"';
    return `<li><button type="button" class="byte" data-i="${i}" data-g="${g.id}" style="--g:${groupColor(g.id)}"${on} aria-label="Byte ${i}: 0x${v.toString(16).padStart(2, '0')}, ${esc(g.label)}"><span class="byte-i">${String(i).padStart(2, '0')}</span><span class="byte-v">${v.toString(16).padStart(2, '0')}</span></button></li>`;
  }).join('');
}

export function legendHtml(): string {
  return BYTE_GROUPS.map(
    (g) =>
      `<li data-g="${g.id}"><i style="background:${groupColor(g.id)}"></i>${esc(g.label)} <span>${g.bytes.length > 1 ? `${g.bytes[0]}–${g.bytes.at(-1)}` : g.bytes[0]}</span></li>`,
  ).join('');
}

/** Prerendered state for a hash: the cells and the detail of the selected byte. */
export function byteMapState(hash: string, selected = 6): { cells: string; detail: string; design: Design } {
  const design = reproduce({ hash });
  return { cells: cellsHtml(hash, selected), detail: detailHtml(byteDetail(design, selected)), design };
}
