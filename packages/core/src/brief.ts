import { BANS } from './data/bans.js';
import { getScenario } from './data/scenarios.js';
import {
  baseSize,
  contrastReport,
  detectLanguage,
  fontStacks,
  googleFontsUrl,
  type Language,
  tokensCss,
  typeScale,
} from './derive.js';
import { ALGORITHM, rollHashes } from './hash.js';
import {
  type Constraints,
  type Design,
  DEFAULT_COUNT,
  MAX_COUNT,
  describeConstraints,
  libraryFingerprint,
  mapDesign,
  mapRoll,
  normalizeConstraints,
} from './mapping.js';
import type { Bilingual, FontSpec, Scenario } from './types.js';

/** What the page is about. Facts are the ONLY content the page may state. */
export interface Content {
  subject: string;
  facts: string[];
  /** Defaults to auto-detection from subject + facts. */
  language?: Language;
}

export interface Roll {
  algorithm: string;
  library: string;
  createdAt: string;
  /** "system-random" for real rolls; "seed:<seed>" for reproducible examples. */
  source: string;
  constraints: Design['constraints'];
  content: Content & { language: Language };
  designs: Design[];
}

export interface RollOptions {
  count?: number;
  seed?: string;
  constraints?: Constraints;
  content?: Partial<Content>;
  /** Override hashes (e.g. to rebuild a roll from stored hashes). */
  hashes?: string[];
  now?: Date;
}

export function normalizeContent(content: Partial<Content> = {}): Content & { language: Language } {
  const subject = content.subject?.trim() || '(untitled)';
  const facts = (content.facts ?? []).map((f) => f.trim()).filter(Boolean);
  return { subject, facts, language: content.language ?? detectLanguage(subject, ...facts) };
}

/** Roll N designs: N true-random (or seeded) hashes → N independent, deterministic designs. */
export function roll(opts: RollOptions = {}): Roll {
  const count = opts.count ?? DEFAULT_COUNT;
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT)
    throw new Error(`count must be a whole number from 1 to ${MAX_COUNT} (got ${count})`);
  const hashes = opts.hashes ?? rollHashes(count, opts.seed);
  const designs = mapRoll(hashes, opts.constraints);
  return {
    algorithm: ALGORITHM,
    library: libraryFingerprint(),
    createdAt: (opts.now ?? new Date()).toISOString(),
    source: opts.hashes ? 'provided-hashes' : opts.seed !== undefined ? `seed:${opts.seed}` : 'system-random',
    constraints: normalizeConstraints(opts.constraints),
    content: normalizeContent(opts.content),
    designs,
  };
}

/** Reproduce one design from its ref (the hash) and the constraints used for the roll. */
export function reproduce(ref: { hash: string }, constraints?: Constraints): Design {
  return mapDesign(ref.hash, constraints ? { constraints } : {});
}

function fontLine(label: string, f: FontSpec, extra = ''): string {
  const ital = f.italic ? ' + italic' : '';
  return `- **${label}**: ${f.family} ${f.weights.join('/')}${ital}${extra} — fallback \`${f.fallback}\``;
}

/** One-line label for a direction (used as its title, in summaries and on the compare page). */
export function directionLabel(d: Design): string {
  return `${d.palette.polarity} · ${Math.round(d.palette.hue)}° · ${d.type.display.family} / ${d.type.body.family} · ${d.layout.columns} col`;
}

function registerText(r: number): string {
  return r < 0.34 ? 'spoken and casual' : r < 0.67 ? 'plain and neutral' : 'formal and exact';
}

function blockText(l: Design['layout']): string {
  const end = l.start + l.span - 1;
  const before = l.start - 1;
  const after = l.columns - end;
  const where =
    l.span === l.columns
      ? 'full width'
      : before === 0
        ? 'flush left'
        : after === 0
          ? 'flush right'
          : before === after
            ? 'centred'
            : before < after
              ? 'left of centre'
              : 'right of centre';
  return `columns ${l.start}–${end} of ${l.columns} (${where})`;
}

function textureCss(sf: Design['surface']): string | null {
  const o = sf.textureOpacity;
  switch (sf.texture.id) {
    case 'grain':
      return `body { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='${o / 100}'/%3E%3C/svg%3E"); }`;
    case 'line-screen':
      return `body { background-image: repeating-linear-gradient(0deg, color-mix(in srgb, var(--ink) ${o}%, transparent) 0 1px, transparent 1px 4px); }`;
    case 'dot-screen':
      return `body { background-image: radial-gradient(color-mix(in srgb, var(--ink) ${o}%, transparent) 1px, transparent 1.5px); background-size: 6px 6px; }`;
    default:
      return null;
  }
}

function scenarioOf(design: Design): Scenario | undefined {
  return design.scenario ? getScenario(design.scenario.id) : undefined;
}

function sizeRule(s: Scenario, density: number): string {
  const r = s.baseSize;
  return 'scale' in r
    ? `density base ${density}px × ${r.scale}`
    : `density base ${density}px clamped to ${r.min}–${r.max}px`;
}

/** The Scenario section of a non-web brief: format, output contract, translation rules, musts. */
function renderScenario(design: Design, lang: Language): string[] {
  const sc = design.scenario;
  const s = scenarioOf(design);
  if (!sc || !s) return [];
  const t = (b: Bilingual) => b[lang];
  const f = sc.format;
  const out: string[] = [];
  out.push(`## 场景 Scenario — ${s.name.zh} / ${s.name.en}`);
  out.push('');
  out.push(t(s.summary));
  out.push('');
  out.push(
    `- **Format — ${t(f.name)}** (${f.width}×${f.height}${f.fixed ? ', fixed canvas' : ''}): ${t(f.description)}`,
  );
  out.push(`- **Output:** ${t(s.output)}`);
  out.push(`- **Count:** ${t(s.count)}`);
  out.push(`- **Layout:** ${t(s.layout)}`);
  out.push(`- **Anchor:** ${t(s.anchor)}`);
  out.push(`- **Motion:** ${t(s.motion)}`);
  out.push(
    `- **Type base:** ${sc.baseSize}px (${sizeRule(s, design.density.baseSize)}); the type scale and tokens.css below use it.`,
  );
  out.push('');
  out.push(lang === 'zh' ? '场景规则：' : 'Scenario rules:');
  out.push('');
  for (const m of s.must) out.push(`- ${t(m)}`);
  out.push('');
  out.push(lang === 'zh' ? '场景禁忌：' : 'Scenario must-nots:');
  out.push('');
  for (const m of s.mustNot) out.push(`- ${t(m)}`);
  out.push('');
  return out;
}

export interface BriefOptions {
  /** Position in the roll, 1-based (for headings). */
  number?: number;
  /** Include the mapping trace table (default true). */
  trace?: boolean;
}

/** Render one design as a Markdown brief an agent can execute without further taste decisions. */
export function renderBrief(design: Design, content: Partial<Content> = {}, opts: BriefOptions = {}): string {
  const c = normalizeContent(content);
  const lang = c.language;
  const pal = design.palette;
  const col = pal.colors;
  const ty = design.type;
  const l = design.layout;
  const a = design.anchor;
  const sf = design.surface;
  const mo = design.motion;
  const v = design.voice;
  const fontsUrl = googleFontsUrl(ty, lang);
  const contrastInfo = contrastReport(col);
  const scale = typeScale(design);
  const n = opts.number ? `#${opts.number} ` : '';
  const out: string[] = [];

  out.push(`# ${n}Direction ${design.short}`);
  out.push('');
  out.push(`> ${directionLabel(design)}`);
  out.push('');
  out.push('| | |');
  out.push('|---|---|');
  out.push(`| hash / ref | \`${design.hash}\` |`);
  out.push(`| algorithm / library | ${design.algorithm} / \`${design.library}\` |`);
  out.push(`| constraints | ${describeConstraints(design.constraints)} |`);
  if (design.scenario) {
    const s = scenarioOf(design);
    const f = design.scenario.format;
    out.push(
      `| scenario | ${s?.name.en} — ${f.name.en} (${f.width}×${f.height}) · scenario data \`${design.scenario.data}\` |`,
    );
  }
  out.push('');
  out.push(
    lang === 'zh'
      ? '**这份 brief 是冻结的执行规格，不是灵感板。** 每个数值都来自哈希：不要替换字体、颜色、栅格或数值，不要"顺手优化"成你习惯的样子。若与全局禁令冲突，以禁令为准；若 twist 无法照字面执行，取最接近字面的做法，并在 HTML 注释里写明。'
      : '**This brief is a frozen spec, not a mood board.** Every value comes from the hash: do not swap fonts, colours, the grid or the numbers for ones you prefer. Global bans override everything; if the twist cannot apply literally, apply the nearest literal reading and say so in an HTML comment.',
  );
  out.push('');

  if (opts.trace !== false) {
    out.push('## 映射过程 Mapping trace');
    out.push('');
    out.push('| bytes | hex | parameter | rule | → result |');
    out.push('|---|---|---|---|---|');
    for (const t of design.trace) {
      const note = t.note ? ` _(${t.note})_` : '';
      out.push(
        `| ${t.bytes.join('+')} | \`${t.hex}\` | ${t.dimension} | ${t.rule}${note} | **${t.result}** |`,
      );
    }
    out.push(
      `| ${design.scenario ? '31' : '28, 31'} | \`${design.unusedBytes}\` | (unused) | recorded, not used | — |`,
    );
    out.push('');
  }

  out.push('## 内容 Content');
  out.push('');
  out.push(`**Subject:** ${c.subject}`);
  out.push('');
  if (c.facts.length) {
    out.push(
      lang === 'zh'
        ? '只能使用以下事实。不得编造数字、评价、奖项或客户；缺少的信息留空或写"待补"。'
        : 'Use only these facts. Do not invent numbers, reviews, awards or customers; leave gaps visibly empty.',
    );
    out.push('');
    for (const f of c.facts) out.push(`- ${f}`);
  } else {
    out.push(
      '_(no facts supplied — use clearly marked placeholders such as "【待补：营业时间】", never invented data)_',
    );
  }
  out.push('');

  out.push(...renderScenario(design, lang));

  out.push('## 文案语气 Voice');
  out.push('');
  out.push(`- **Person:** ${v.person.text}`);
  out.push(`- **Headlines:** ${v.headline.text}`);
  out.push(
    `- **Sentences:** about ${v.sentenceWords} words on average (about ${v.sentenceWords * 2} characters in Chinese)`,
  );
  out.push(`- **Register:** ${v.register} on a 0–1 scale — ${registerText(v.register)}`);
  out.push('');

  out.push('## 版式 Layout');
  out.push('');
  const width = design.scenario?.format;
  out.push(
    `- **Grid:** ${l.columns} columns, ${l.gutter}px gutters, max width ${width ? `${width.width}px (${width.fixed ? 'canvas' : 'scenario width'})` : `${design.density.maxWidth}px`}`,
  );
  out.push(`- **Text block:** ${blockText(l)}`);
  out.push(`- **First screen:** ${l.firstScreen}% of the viewport height`);
  out.push(`- **Sections:** ${l.sections}, separated by ${l.separator.text}`);
  out.push('- Below 640px wide the grid collapses to one column; separators and the anchor stay.');
  out.push('');
  out.push(
    `**First-screen anchor:** ${a.subject.text}; about ${a.size}% of the first screen's width, centred at ${Math.round(a.x * 100)}% from the left edge, rotated ${a.rotation}°.`,
  );
  out.push('');

  out.push('## 字体 Typography');
  out.push('');
  out.push(
    fontLine(
      'Display',
      ty.display,
      ` · set at ${ty.weight}, ${ty.case.text}, letter-spacing ${ty.tracking}em`,
    ),
  );
  out.push(fontLine('Body', ty.body));
  out.push(fontLine('Mono', ty.mono));
  out.push(`- **CJK** (Chinese pages): display ${ty.cjk.display}, body ${ty.cjk.body}`);
  out.push('');
  out.push(
    `Scale: ratio **${design.scale}** on a ${baseSize(design)}px base → ` +
      scale.map((s) => `${s.step}: ${s.px}px`).join(' · '),
  );
  out.push('');
  if (fontsUrl) {
    out.push('```html');
    out.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
    out.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
    out.push(`<link rel="stylesheet" href="${fontsUrl}">`);
    out.push('```');
    out.push('');
  }

  out.push(`## 配色 Colour — ${pal.polarity}, hue ${pal.hue}°`);
  out.push('');
  out.push(
    `Computed in OKLCH: paper L ${pal.paperL} / C ${pal.paperC} at hue ${pal.hue}°; accents at chroma ${pal.accentC}, accent2 ${pal.accent2Offset}° round the wheel. Text lightness is solved for contrast (ink ≥ 7.5:1, muted ≥ 4.6:1, accents ≥ 3:1 on paper).`,
  );
  out.push('');
  out.push('| token | hex | role |');
  out.push('|---|---|---|');
  out.push(`| paper | \`${col.paper}\` | page background |`);
  out.push(`| ink | \`${col.ink}\` | primary text |`);
  out.push(`| muted | \`${col.muted}\` | secondary text |`);
  out.push(`| accent | \`${col.accent}\` | the anchor and one kind of mark |`);
  out.push(`| accent2 | \`${col.accent2}\` | sparingly, under a tenth of the page |`);
  out.push(`| rule | \`${col.rule}\` | lines, borders |`);
  out.push(`| panel | \`${col.panel}\` | secondary background |`);
  out.push('');
  if (pal.brand) {
    out.push(
      `**Brand override:** accent → ${pal.brand.accent ?? '(computed)'}${pal.brand.accent2 ? `, accent2 → ${pal.brand.accent2}` : ''}. Check the contrast table before using brand colours for text.`,
    );
    out.push('');
  }
  out.push('Contrast (WCAG):');
  out.push('');
  for (const line of contrastInfo.lines) out.push(`- ${line.pair}: **${line.ratio}:1** — ${line.verdict}`);
  out.push('');

  const dn = design.density;
  out.push(`## 密度 Density — ${dn.t}`);
  out.push('');
  out.push(
    `${dn.t} on the density axis (0 = airiest, 1 = most packed): base ${dn.baseSize}px, line-height ${dn.lineHeight}, spacing unit ${dn.unit}px, section gap ${dn.sectionGap}px, max width ${dn.maxWidth}px.` +
      (design.scenario
        ? ` Scenario: type base ${design.scenario.baseSize}px and ${design.scenario.format.fixed ? 'canvas' : 'width'} ${design.scenario.format.width}${design.scenario.format.fixed ? `×${design.scenario.format.height}` : ''}px replace the base size and max width.`
        : ''),
  );
  out.push('');

  out.push('## 形状与材质 Shape & surface');
  out.push('');
  out.push(
    `- **Radius:** ${sf.radius ? `${sf.radius}px on boxes and inputs` : '0 — square corners everywhere'}`,
  );
  out.push(
    `- **Borders:** ${sf.border ? `${sf.border}px ${sf.borderStyle} in the rule colour` : 'none; use the separators and space'}`,
  );
  out.push(
    `- **Shadow:** ${sf.shadow ? `hard offset ${sf.shadow}px ${sf.shadow}px in ink, no blur` : 'none'} (never a soft, blurred shadow)`,
  );
  out.push(
    `- **Texture:** ${sf.texture.text}${sf.texture.id === 'none' ? '' : ` at ${sf.textureOpacity}% opacity`}`,
  );
  const tex = textureCss(sf);
  if (tex) {
    out.push('');
    out.push('```css');
    out.push(tex);
    out.push('```');
  }
  out.push('');

  const m = design.motif;
  out.push('## 母题 Motif');
  out.push('');
  out.push(
    `${m.shape.text[0]?.toUpperCase()}${m.shape.text.slice(1)}, each about ${m.size}px, ${m.placement.text}, at ${m.angle}°. Draw them with CSS or inline SVG in the palette colours; no icon fonts, no emoji.`,
  );
  out.push('');

  out.push('## 动效 Motion');
  out.push('');
  out.push(
    mo.still
      ? 'No motion: nothing animates or transitions.'
      : `${mo.property.text[0]?.toUpperCase()}${mo.property.text.slice(1)} changes over ${mo.duration}ms with \`${mo.easing}\`, on hover, focus and state changes, plus the anchor once on load. Never animate every section on scroll. Under prefers-reduced-motion nothing moves.`,
  );
  out.push('');

  out.push('## 变数 Twist');
  out.push('');
  out.push(design.twist.text);
  out.push('');

  out.push('## 全局禁令 Global bans');
  out.push('');
  for (const ban of BANS) out.push(`- **${ban.title.zh}** (${ban.id}, ${ban.severity}): ${ban.detail}`);
  out.push('');

  out.push('## tokens.css');
  out.push('');
  out.push('```css');
  out.push(tokensCss(design, lang));
  out.push('```');
  out.push('');

  out.push('## 交付前自检 Before you ship');
  out.push('');
  out.push(
    `- [ ] Fonts on the page are exactly: ${ty.display.family} / ${ty.body.family} / ${ty.mono.family}${lang === 'zh' ? ` (+ ${ty.cjk.display} / ${ty.cjk.body})` : ''}`,
  );
  out.push('- [ ] Every colour on the page comes from the 7 palette tokens above');
  out.push(
    `- [ ] ${l.columns}-column grid, text block in ${blockText(l)}, first screen built around ${a.subject.text}`,
  );
  out.push(`- [ ] Copy uses ${v.person.text}, headlines are ${v.headline.text}, only the facts`);
  out.push(
    `- [ ] Radius ${sf.radius}px, ${sf.shadow ? `hard ${sf.shadow}px shadow` : 'no shadow'}, ${sf.texture.id} texture`,
  );
  out.push(`- [ ] Twist applied: ${design.twist.text}`);
  if (design.scenario) {
    const s = scenarioOf(design);
    const f = design.scenario.format;
    out.push(
      `- [ ] Delivered as a ${s?.name.en.toLowerCase()}: ${f.name.en}, ${f.width}×${f.height}${f.fixed ? ' fixed canvas' : ''}, following the Scenario section`,
    );
    out.push('- [ ] Every scenario rule holds and no scenario must-not appears');
  }
  out.push(
    `- [ ] \`critique_page\` (or \`hash-design critique --brief ${design.ref}\`) reports no critical/major findings`,
  );
  out.push('');
  return out.join('\n');
}

/** Machine-readable brief (stable JSON shape). */
export function briefJson(design: Design, content: Partial<Content> = {}) {
  const c = normalizeContent(content);
  const lang = c.language;
  return {
    ref: design.ref,
    hash: design.hash,
    short: design.short,
    algorithm: design.algorithm,
    library: design.library,
    constraints: design.constraints,
    ...(design.scenario ? { scenario: scenarioJson(design, lang) } : {}),
    content: c,
    label: directionLabel(design),
    palette: design.palette,
    contrast: contrastReport(design.palette.colors),
    type: design.type,
    fonts: { stacks: fontStacks(design.type, lang), googleFontsUrl: googleFontsUrl(design.type, lang) },
    scale: { ratio: design.scale, steps: typeScale(design) },
    density: design.density,
    layout: design.layout,
    anchor: design.anchor,
    motif: design.motif,
    surface: design.surface,
    motion: design.motion,
    voice: design.voice,
    twist: design.twist,
    bans: BANS.map((b) => b.id),
    tokensCss: tokensCss(design, lang),
    trace: design.trace,
  };
}

export type BriefJson = ReturnType<typeof briefJson>;

/** Scenario part of the JSON brief, with text in the brief's language. */
function scenarioJson(design: Design, lang: Language) {
  const sc = design.scenario as NonNullable<Design['scenario']>;
  const s = scenarioOf(design) as Scenario;
  const t = (b: Bilingual) => b[lang];
  return {
    id: sc.id,
    data: sc.data,
    name: s.name,
    format: sc.format,
    baseSize: sc.baseSize,
    summary: t(s.summary),
    output: t(s.output),
    count: t(s.count),
    layout: t(s.layout),
    anchor: t(s.anchor),
    motion: t(s.motion),
    must: s.must.map(t),
    mustNot: s.mustNot.map(t),
  };
}

/** File-system friendly slug for a design in a roll: "01-4e60ca25" (number + short hash). */
export function designSlug(design: Design, index: number): string {
  return `${String(index + 1).padStart(2, '0')}-${design.short}`;
}

/** Compact overview of a roll (Markdown). */
export function renderRollSummary(r: Roll): string {
  const out: string[] = [];
  out.push(`# hash-design roll — ${r.content.subject}`);
  out.push('');
  out.push(
    `${r.designs.length} directions · source: ${r.source} · ${r.algorithm} · library \`${r.library}\` · constraints: ${describeConstraints(r.constraints)}`,
  );
  out.push('');
  out.push('| # | ref (short) | colour | type | grid | anchor | density | voice | twist |');
  out.push('|---|---|---|---|---|---|---|---|---|');
  r.designs.forEach((d, i) => {
    out.push(
      `| ${i + 1} | \`${d.short}\` | ${d.palette.polarity}, ${Math.round(d.palette.hue)}° \`${d.palette.colors.accent}\` | ${d.type.display.family} / ${d.type.body.family} | ${d.layout.columns} col${d.scenario ? ` · ${d.scenario.format.name.en}` : ''} | ${d.anchor.subject.id} | ${d.density.t} | ${d.voice.person.id} · ${d.voice.headline.id} | ${d.twist.target.id} → ${d.twist.operation.id} |`,
    );
  });
  out.push('');
  out.push(
    'Full refs (reproduce any brief with `get_brief` / `hash-design brief <ref>` + the same constraints):',
  );
  out.push('');
  r.designs.forEach((d, i) => out.push(`${i + 1}. \`${d.ref}\``));
  out.push('');
  return out.join('\n');
}

/** Full roll as Markdown: summary + every brief. */
export function renderRoll(r: Roll, opts: { trace?: boolean } = {}): string {
  const parts = [renderRollSummary(r)];
  r.designs.forEach((d, i) => {
    parts.push('---');
    parts.push(renderBrief(d, r.content, { number: i + 1, trace: opts.trace ?? true }));
  });
  return parts.join('\n\n');
}

/** Roll serialised for disk (roll.json): refs + content + constraints + brief JSON for each design. */
export function rollJson(r: Roll) {
  return {
    algorithm: r.algorithm,
    library: r.library,
    createdAt: r.createdAt,
    source: r.source,
    constraints: r.constraints,
    content: r.content,
    designs: r.designs.map((d, i) => ({ number: i + 1, slug: designSlug(d, i), ...briefJson(d, r.content) })),
  };
}

export type RollJson = ReturnType<typeof rollJson>;
