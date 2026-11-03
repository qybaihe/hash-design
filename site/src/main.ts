/**
 * Page behaviour that needs no library: the nav rule on scroll, copy buttons and the hero video.
 * The parts that run hash-design itself (byte map, demo, rebuild) load from ./interactive.ts once the page is idle.
 */

const motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)');

const nav = document.querySelector<HTMLElement>('[data-nav]');
const onScroll = () => nav?.classList.toggle('is-scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

document.addEventListener('click', (event) => {
  const button = (event.target as Element | null)?.closest<HTMLButtonElement>(
    '[data-copy], [data-copy-from]',
  );
  if (!button) return;
  const from = button.dataset.copyFrom;
  // innerText follows CSS white-space: a <pre> keeps its lines, a paragraph loses its source indentation.
  const text =
    button.dataset.copy ?? (from ? document.querySelector<HTMLElement>(from)?.innerText : '') ?? '';
  void copyText(text.trim()).then((ok) => {
    const label = button.dataset.label ?? button.textContent ?? 'Copy';
    button.dataset.label = label;
    button.textContent = ok ? 'Copied' : 'Press ⌘C';
    button.classList.toggle('is-done', ok);
    window.setTimeout(() => {
      button.textContent = label;
      button.classList.remove('is-done');
    }, 1600);
  });
});

/** The hero video plays muted and looped while visible, unless the visitor prefers reduced motion. */
const video = document.querySelector<HTMLVideoElement>('[data-hero-video]');
if (video && motionOK.matches && 'IntersectionObserver' in window) {
  video.removeAttribute('controls');
  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) void video.play().catch(() => video.setAttribute('controls', ''));
      else video.pause();
    },
    { threshold: 0.25 },
  );
  io.observe(video);
}

const start = () => void import('./interactive.js').then((m) => m.init());
if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 1200 });
else setTimeout(start, 200);
