import { describe, expect, it } from 'vitest';
import { DEFAULT_COUNT, MAX_COUNT, mapDesign, parseRef, reproduce, roll, seededHash } from '../src/index.js';

describe('N: how many directions a roll has', () => {
  it('defaults to 5 and accepts whole numbers from 1 to 12', () => {
    expect(DEFAULT_COUNT).toBe(5);
    expect(MAX_COUNT).toBe(12);
    expect(roll({ seed: 'n' }).designs).toHaveLength(5);
    for (let n = 1; n <= MAX_COUNT; n++) expect(roll({ seed: 'n', count: n }).designs).toHaveLength(n);
    for (const bad of [0, 13, 2.5, Number.NaN, -1])
      expect(() => roll({ seed: 'n', count: bad })).toThrow(/whole number from 1 to 12/);
  });

  it('does not depend on constraints: every hash maps on its own, so all 12 are always available', () => {
    for (const constraints of [
      { lightOnly: true },
      { darkOnly: true },
      { reducedMotion: true, brandColors: ['#c8102e'] },
      { scenario: 'deck' as const },
    ])
      expect(roll({ seed: 'n', count: MAX_COUNT, constraints }).designs).toHaveLength(MAX_COUNT);
  });

  it('direction i is mapDesign(hash i) alone, so seeded rolls are prefix-stable', () => {
    const full = roll({ seed: 'count-prefix', count: MAX_COUNT });
    full.designs.forEach((d, i) => {
      expect(d.hash).toBe(seededHash('count-prefix', i));
      expect(d.ref).toBe(mapDesign(d.hash).ref);
    });
    for (let k = 1; k <= MAX_COUNT; k++)
      expect(roll({ seed: 'count-prefix', count: k }).designs.map((d) => d.ref)).toEqual(
        full.designs.slice(0, k).map((d) => d.ref),
      );
  });

  it('a single direction reproduces from its ref and constraints, whatever N was', () => {
    const r = roll({ seed: 'count-repro', count: MAX_COUNT, constraints: { scenario: 'app' } });
    for (const d of r.designs) {
      const again = reproduce(parseRef(d.ref), r.constraints);
      expect(again.palette.colors).toEqual(d.palette.colors);
      expect(again.type.display.family).toBe(d.type.display.family);
      expect(again.scenario?.format.id).toBe(d.scenario?.format.id);
    }
  });
});
