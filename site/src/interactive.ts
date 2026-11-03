/**
 * The parts of the page that run the hash-design library in the browser: the byte map, the roll demo and
 * "rebuild from a ref". Everything comes from `hash-design/browser`, the same modules the CLI runs.
 */
import {
  DEFAULT_COUNT,
  MAX_COUNT,
  googleFontsUrl,
  parseRef,
  randomHash,
  renderReply,
  reproduce,
  roll,
  tokensCss,
  type Design,
  type Language,
  type Roll,
  type ScenarioId,
} from 'hash-design/browser';
import { byteDetail, cellsHtml, detailHtml, esc } from './bytes.js';
import { briefCommand, briefText, type BriefInput } from './rebuild.js';

const $ = <T extends Element>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);

/* ── Byte map ───────────────────────────────────────────────────────── */

function initBytes(): void {
  const box = $<HTMLElement>('[data-bytes]');
  const cells = $<HTMLOListElement>('[data-bytes-cells]');
  const detail = $<HTMLElement>('[data-bytes-detail]');
  if (!box || !cells || !detail) return;
  let design: Design = reproduce({ hash: box.dataset.hash ?? '' });
  let selected = 6;

  const select = (i: number) => {
    selected = i;
    for (const b of cells.querySelectorAll<HTMLButtonElement>('.byte'))
      b.setAttribute('aria-pressed', String(Number(b.dataset.i) === i));
    detail.innerHTML = detailHtml(byteDetail(design, i));
  };
  cells.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('.byte');
    if (b) select(Number(b.dataset.i));
  });
  cells.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 8, ArrowUp: -8 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const next = Math.min(31, Math.max(0, selected + step));
    select(next);
    cells.querySelector<HTMLButtonElement>(`[data-i="${next}"]`)?.focus();
  });
  $('[data-bytes-roll]', box)?.addEventListener('click', () => {
    design = reproduce({ hash: randomHash() });
    cells.innerHTML = cellsHtml(design.hash, selected);
    const hashEl = $('[data-bytes-hash]', box);
    if (hashEl) hashEl.textContent = design.hash;
    const src = $('[data-bytes-source]', box);
    if (src) src.textContent = 'A new true-random hash (crypto.getRandomValues → SHA-256)';
    select(selected);
  });
}

/* ── Demo ───────────────────────────────────────────────────────────── */

interface DemoState {
  subject: string;
  scenario: ScenarioId;
  count: number;
}

let current: { roll: Roll; state: DemoState } | undefined;

function readState(form: HTMLFormElement): DemoState {
  const data = new FormData(form);
  const count = Math.min(MAX_COUNT, Math.max(1, Math.round(Number(data.get('count')) || DEFAULT_COUNT)));
  return {
    subject: String(data.get('subject') ?? '').trim(),
    scenario: (String(data.get('scenario') ?? 'web') as ScenarioId) || 'web',
    count,
  };
}

/** The reply as the agent sends it, with its Markdown bold and code shown as such. */
function replyHtml(text: string): string {
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  const lines = text.split('\n');
  const items = lines.filter((l) => /^\d+\. /.test(l));
  const head = lines[0] ?? '';
  const ask = lines.at(-1) ?? '';
  return `<p>${inline(head)}</p><ol>${items.map((l) => `<li>${inline(l)}</li>`).join('')}</ol><p>${inline(ask)}</p>`;
}

/** `tokens.css` without the page-level rules, scoped to one specimen. */
function scopedTokens(d: Design, lang: Language, selector: string): string {
  const css = tokensCss(d, lang);
  const body = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
  return `${selector} {${body}\n}`;
}

const CASE: Record<string, string> = {
  upper: 'text-transform: uppercase',
  lower: 'text-transform: lowercase',
  'small-caps': 'font-variant-caps: all-small-caps',
};

function specimenText(d: Design): string {
  return `${d.type.body.family} · ${d.density.baseSize}px base · ratio ${d.scale}`;
}

function cardHtml(d: Design, i: number, subject: string): string {
  const n = String(i + 1).padStart(2, '0');
  const c = d.palette.colors;
  const L = d.layout;
  const cols = Array.from(
    { length: L.columns },
    (_, k) => `<i${k + 1 >= L.start && k + 1 < L.start + L.span ? ' class="on"' : ''}></i>`,
  ).join('');
  const swatches = (['paper', 'ink', 'muted', 'accent', 'accent2', 'rule', 'panel'] as const)
    .map((k) => `<i style="background:${c[k]}" title="${k} ${c[k]}"></i>`)
    .join('');
  return `<li class="dir" data-n="${i}" style="--i:${i}">
  <div class="dir-top"><b>${n}</b><span>${d.palette.polarity} · ${Math.round(d.palette.hue)}°</span><code>${d.short}</code></div>
  <div class="specimen">
    <div class="spec-grid" style="grid-template-columns:repeat(${L.columns},1fr)" aria-hidden="true">${cols}</div>
    <p class="spec-head" style="${CASE[d.type.case.id] ?? ''}">${esc(subject || 'Untitled')}</p>
    <p class="spec-body">${esc(specimenText(d))}</p>
    <div class="spec-mark" aria-hidden="true"><i></i><i></i></div>
  </div>
  <div class="swatches" aria-label="Palette">${swatches}</div>
  <div class="dir-meta">
    <p><strong>${esc(d.type.display.family)}</strong> / ${esc(d.type.body.family)}</p>
    <p>${L.columns}-column grid · anchor: ${esc(d.anchor.subject.id)} · motif: ${esc(d.motif.shape.id)} · ${esc(d.twist.text)}</p>
  </div>
  <div class="dir-actions">
    <button class="copy" type="button" data-open="${i}">Open brief</button>
    <button class="copy" type="button" data-copy="${d.ref}">Copy ref</button>
  </div>
</li>`;
}

function loadFonts(r: Roll, subject: string): void {
  for (const old of document.querySelectorAll('link[data-demo-font]')) old.remove();
  const lang = r.content.language;
  const urls = new Set<string>();
  for (const d of r.designs) {
    const url = googleFontsUrl(d.type, lang);
    if (!url) continue;
    // Only the glyphs the specimen shows, so twelve faces cost a few kilobytes.
    const chars = [...new Set(`${subject}${specimenText(d)}Untitled0123456789`)].join('');
    urls.add(`${url}&text=${encodeURIComponent(chars)}`);
  }
  for (const href of urls) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.demoFont = '';
    document.head.append(link);
  }
}

function render(out: HTMLElement, state: DemoState): void {
  const r = roll({
    count: state.count,
    constraints: state.scenario === 'web' ? {} : { scenario: state.scenario },
    content: { subject: state.subject },
  });
  current = { roll: r, state };
  const lang = r.content.language;
  const style = r.designs.map((d, i) => scopedTokens(d, lang, `.dir[data-n="${i}"] .specimen`)).join('\n');
  out.innerHTML = `<style>${style}</style>
<div class="reply">
  <div class="reply-head"><span>What your agent sends you</span><span class="fn">renderReply()</span></div>
  <div class="reply-body">${replyHtml(renderReply(r))}</div>
</div>
<ol class="dirs">${r.designs.map((d, i) => cardHtml(d, i, state.subject)).join('')}</ol>`;
  loadFonts(r, state.subject);
}

/* ── Brief dialog ───────────────────────────────────────────────────── */

function openBrief(title: string, input: BriefInput): void {
  const dialog = $<HTMLDialogElement>('[data-brief]');
  if (!dialog) return;
  const t = $('[data-brief-title]', dialog);
  const cmd = $('[data-brief-cmd]', dialog);
  const text = $<HTMLElement>('[data-brief-text]', dialog);
  if (t) t.textContent = title;
  if (cmd) cmd.textContent = briefCommand(input);
  if (text) {
    text.textContent = briefText(input);
    text.scrollTop = 0;
  }
  if (!dialog.open) dialog.showModal();
}

function initDialog(): void {
  const dialog = $<HTMLDialogElement>('[data-brief]');
  if (!dialog) return;
  $('[data-brief-close]', dialog)?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}

function initDemo(): void {
  const form = $<HTMLFormElement>('[data-demo-form]');
  const out = $<HTMLElement>('[data-demo-out]');
  if (!form || !out) return;
  const countInput = form.elements.namedItem('count') as HTMLInputElement;
  form.addEventListener('click', (e) => {
    const step = (e.target as Element).closest<HTMLButtonElement>('[data-step]');
    if (!step) return;
    const next = Math.min(
      MAX_COUNT,
      Math.max(1, (Number(countInput.value) || DEFAULT_COUNT) + Number(step.dataset.step)),
    );
    countInput.value = String(next);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const state = readState(form);
    countInput.value = String(state.count);
    render(out, state);
  });
  out.addEventListener('click', (e) => {
    const open = (e.target as Element).closest<HTMLButtonElement>('[data-open]');
    if (!open || !current) return;
    const i = Number(open.dataset.open);
    const d = current.roll.designs[i];
    if (!d) return;
    openBrief(`Direction ${String(i + 1).padStart(2, '0')} · ${d.short}`, {
      ref: d.ref,
      scenario: current.state.scenario,
      subject: current.state.subject,
    });
  });
  render(out, readState(form));

  const rebuild = $<HTMLFormElement>('[data-rebuild-form]');
  const error = $<HTMLElement>('[data-rebuild-error]');
  rebuild?.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = String(new FormData(rebuild).get('ref') ?? '');
    if (error) error.textContent = '';
    try {
      const { hash } = parseRef(raw);
      const state = readState(form);
      openBrief(`Direction ${hash.slice(0, 8)}`, {
        ref: hash,
        scenario: state.scenario,
        subject: state.subject,
      });
    } catch (err) {
      if (error) error.textContent = err instanceof Error ? err.message : String(err);
    }
  });
}

export function init(): void {
  initBytes();
  initDialog();
  initDemo();
}
