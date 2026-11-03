import { describe, expect, it } from 'vitest';
import { contrast, hexToOklch } from '../src/color.js';
import { BANNED_FONTS, isBannedFont } from '../src/data/bans.js';
import { BODY_FONTS, CJK_DISPLAY_FONTS, DISPLAY_FONTS, MONO_FONTS } from '../src/data/fonts.js';
import { ALGORITHM, parseRef, randomHash, seededHash } from '../src/hash.js';
import { BYTE_MAP, libraryFingerprint, mapDesign, mapRoll, type Design } from '../src/mapping.js';
import { reproduce, roll } from '../src/brief.js';

/** A hash with chosen byte values (others 0). */
function hashOf(bytes: Record<number, number>): string {
  return Array.from({ length: 32 }, (_, i) => (bytes[i] ?? 0).toString(16).padStart(2, '0')).join('');
}

const results = (d: Design) => Object.fromEntries(d.trace.map((t) => [t.bytes.join('+'), t.result]));

describe('hash-design/v2: the hash is the direction', () => {
  it('is algorithm v2 with a pinned library fingerprint', () => {
    expect(ALGORITHM).toBe('hash-design/v2');
    expect(libraryFingerprint()).toMatch(/^[0-9a-f]{12}$/);
    expect(libraryFingerprint()).toBe('bd20321c36ab');
    expect(seededHash('x', 0)).not.toBe(seededHash('x', 1));
  });

  it('same hash + constraints always gives the same design', () => {
    const h = randomHash();
    expect(mapDesign(h)).toEqual(mapDesign(h));
    expect(mapDesign(h, { constraints: { scenario: 'deck' } })).toEqual(
      mapDesign(h, { constraints: { scenario: 'deck' } }),
    );
    expect(reproduce(parseRef(h))).toEqual(mapDesign(h));
  });

  it('has no genre: no branch, family, name or reference anywhere in a design', () => {
    const d = mapDesign(randomHash());
    expect(Object.keys(d)).not.toContain('branch');
    const json = JSON.stringify(d);
    expect(json).not.toMatch(/"branch"|"genre"|"references"|"concept"|"keywords"/);
  });

  it('reads bytes 0–30 as documented; 31 (and 28 on the web) stay unused', () => {
    const covered = BYTE_MAP.flatMap((m) => m.bytes).sort((a, b) => a - b);
    expect(covered).toEqual(Array.from({ length: 31 }, (_, i) => i));
    const web = mapDesign(hashOf({}));
    expect(web.trace.flatMap((t) => t.bytes)).not.toContain(28);
    expect(web.unusedBytes.split(' ')).toHaveLength(2);
    expect(
      mapDesign(hashOf({}), { constraints: { scenario: 'poster' } }).unusedBytes.split(' '),
    ).toHaveLength(1);
  });

  it('follows the byte rules exactly', () => {
    const h = hashOf({
      0: 0x80,
      1: 0x00,
      2: 200,
      6: 5,
      7: 70,
      8: 6,
      10: 255,
      11: 0,
      12: 27,
      13: 0xf0,
      14: 255,
      15: 7,
      16: 9,
      18: 13,
      20: 7,
      21: 3,
      22: 127,
      24: 6,
      25: 0xf2,
      26: 2,
      27: 50,
      30: 9,
    });
    const d = mapDesign(h);
    expect(d.palette.hue).toBe(180);
    expect(d.palette.polarity).toBe('light');
    expect(d.type.display.family).toBe(DISPLAY_FONTS[5]!.family);
    expect(d.type.body.family).toBe(BODY_FONTS[70 % BODY_FONTS.length]!.family);
    expect(d.type.case.id).toBe('lower');
    expect(d.type.mono.family).toBe(MONO_FONTS[9 % MONO_FONTS.length]!.family);
    expect(d.scale).toBe(1.618);
    expect(d.density).toMatchObject({
      t: 0,
      baseSize: 18,
      lineHeight: 1.65,
      unit: 10,
      sectionGap: 168,
      maxWidth: 1080,
    });
    expect(d.layout.columns).toBe(3 + (27 % 10));
    expect(d.layout.gutter).toBe(10 * (1 + (Math.floor(27 / 10) % 4)));
    expect(d.layout.start + d.layout.span - 1).toBe(d.layout.columns); // start nibble 15 → flush right
    expect(d.layout.firstScreen).toBe(100);
    expect(d.layout.sections).toBe(3 + (7 % 6));
    expect(d.layout.separator.id).toBe('bands');
    expect(d.anchor.subject.id).toBe('number');
    expect(d.motif.shape.id).toBe('dots');
    expect(d.surface.radius).toBe(16);
    expect(d.surface.shadow).toBe(6);
    expect(d.motion.property.id).toBe('transform');
    expect(d.motion.duration).toBe(600);
    expect(d.voice.person.id).toBe('you');
    expect(d.voice.headline.id).toBe('question');
    expect(d.voice.sentenceWords).toBe(5);
    expect(d.voice.register).toBe(1);
    expect(d.twist.target.id).toBe('numbers');
    expect(d.twist.operation.id).toBe('rotate');
    expect(d.twist.text).toBe('Rotate every number on the page by 4.5°.');
    expect(mapDesign(hashOf({ 2: 76 })).palette.polarity).toBe('dark');
    expect(mapDesign(hashOf({ 2: 77 })).palette.polarity).toBe('light');
  });

  it('each byte only moves its own parameters', () => {
    // byte → trace rows it may change: 6 feeds the weight, 11 the unit-based sizes, 12 the column count
    const depends: Record<number, string[]> = { 6: ['6', '8'], 11: ['11', '12', '18'], 12: ['12', '13'] };
    const base = randomHash();
    const before = results(mapDesign(base));
    for (let i = 0; i <= 30; i++) {
      const bytes = base.match(/../g)!.map((x) => parseInt(x, 16));
      bytes[i] = (bytes[i]! + 97) % 256;
      const flipped = bytes.map((x) => x.toString(16).padStart(2, '0')).join('');
      const after = results(mapDesign(flipped));
      const own = new Set(depends[i] ?? [i === 0 || i === 1 ? '0+1' : String(i)]);
      for (const k of Object.keys(before))
        if (!own.has(k)) expect(after[k], `byte ${i} moved ${k}`).toBe(before[k]);
    }
  });

  it('is high-cardinality: no small set of looks', () => {
    const ds = Array.from({ length: 2000 }, () => mapDesign(randomHash()));
    const count = (f: (d: Design) => string) => new Set(ds.map(f)).size;
    expect(count((d) => `${d.type.display.family}/${d.type.body.family}`)).toBeGreaterThan(1200);
    expect(count((d) => d.palette.colors.accent)).toBeGreaterThan(1700);
    expect(count((d) => `${d.layout.columns}/${d.layout.start}/${d.layout.span}`)).toBeGreaterThan(120);
    expect(count((d) => `${d.motif.shape.id}/${d.motif.placement.id}/${d.motif.angle}`)).toBeGreaterThan(
      1000,
    );
    expect(count((d) => d.twist.text)).toBeGreaterThan(400);
    expect(count((d) => JSON.stringify([d.palette.colors, d.type.display.family, d.layout, d.anchor]))).toBe(
      2000,
    );
  });

  it('palettes always meet the contrast floors, in both polarities', () => {
    let dark = 0;
    for (let i = 0; i < 2000; i++) {
      const c = mapDesign(randomHash()).palette;
      if (c.polarity === 'dark') dark++;
      expect(contrast(c.colors.ink, c.colors.paper)).toBeGreaterThanOrEqual(7.5);
      expect(contrast(c.colors.muted, c.colors.paper)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.colors.accent, c.colors.paper)).toBeGreaterThanOrEqual(3.2);
      expect(contrast(c.colors.accent2, c.colors.paper)).toBeGreaterThanOrEqual(3);
    }
    expect(dark / 2000).toBeGreaterThan(0.2);
    expect(dark / 2000).toBeLessThan(0.4);
  });

  it('the font pool is flat, unique and free of banned faces', () => {
    for (const pool of [DISPLAY_FONTS, BODY_FONTS, MONO_FONTS]) {
      expect(pool.length).toBeLessThanOrEqual(256);
      expect(new Set(pool.map((f) => f.family)).size).toBe(pool.length);
      for (const f of pool) expect(isBannedFont(f.family), f.family).toBe(false);
    }
    expect(CJK_DISPLAY_FONTS.length).toBeGreaterThan(5);
    expect(BANNED_FONTS).toContain('Inter');
  });
});

describe('N directions', () => {
  it('a roll is N independent mappings of N hashes', () => {
    for (const count of [1, 3, 5, 12]) {
      const r = roll({ seed: 'n', count });
      expect(r.designs).toHaveLength(count);
      r.designs.forEach((d, i) => expect(d).toEqual(mapDesign(seededHash('n', i))));
    }
    const hashes = [randomHash(), randomHash()];
    expect(mapRoll(hashes)).toEqual(hashes.map((h) => mapDesign(h)));
  });

  it('seeded rolls are prefix-stable and refs are the bare hash', () => {
    const twelve = roll({ seed: 'p', count: 12 }).designs.map((d) => d.ref);
    expect(roll({ seed: 'p', count: 4 }).designs.map((d) => d.ref)).toEqual(twelve.slice(0, 4));
    for (const ref of twelve) expect(ref).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects N outside 1–12', () => {
    for (const count of [0, 13, 2.5]) expect(() => roll({ count })).toThrow(/1 to 12/);
  });

  it('rejects v1 refs with an explanation', () => {
    expect(() => parseRef(`${'a'.repeat(64)}+2`)).toThrow(/hash-design\/v2 ref/);
    expect(() => parseRef('nope')).toThrow(/Invalid design ref/);
  });
});

describe('constraints', () => {
  const hs = Array.from({ length: 200 }, () => randomHash());

  it('light_only / dark_only fix the polarity; byte 2 still sets the paper lightness', () => {
    for (const h of hs) {
      expect(mapDesign(h, { constraints: { lightOnly: true } }).palette.polarity).toBe('light');
      expect(mapDesign(h, { constraints: { darkOnly: true } }).palette.polarity).toBe('dark');
    }
    expect(mapDesign(hashOf({ 2: 0 }), { constraints: { lightOnly: true } }).palette.paperL).toBe(0.9);
    expect(mapDesign(hashOf({ 2: 255 }), { constraints: { lightOnly: true } }).palette.paperL).toBe(0.985);
    expect(() => mapDesign(hs[0]!, { constraints: { lightOnly: true, darkOnly: true } })).toThrow();
  });

  it('reduced_motion stops all motion', () => {
    const d = mapDesign(hs[0]!, { constraints: { reducedMotion: true } });
    expect(d.motion).toMatchObject({ still: true, duration: 0, easing: 'none' });
  });

  it('brand colours become the accents and set the hue', () => {
    const d = mapDesign(hs[1]!, { constraints: { brandColors: ['#C8102E', '#1d4d8f'] } });
    expect(d.palette.colors.accent).toBe('#c8102e');
    expect(d.palette.colors.accent2).toBe('#1d4d8f');
    expect(Math.abs(d.palette.hue - hexToOklch('#c8102e').h)).toBeLessThan(0.01);
    expect(d.trace.find((t) => t.dimension === 'hue')?.note).toMatch(/brand colour/);
  });

  it('constraints are part of identity', () => {
    const h = hs[2]!;
    expect(mapDesign(h, { constraints: { darkOnly: true } })).not.toEqual(
      mapDesign(h, { constraints: { lightOnly: true } }),
    );
    expect(() => mapDesign(h, { constraints: { scenario: 'billboard' as never } })).toThrow(
      /Unknown scenario/,
    );
  });
});
