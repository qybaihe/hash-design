import { describe, expect, it } from 'vitest';
import { contrast, isLightPaper } from '../src/color.js';
import { BANNED_FONTS } from '../src/data/bans.js';
import { BRANCHES } from '../src/data/branches/index.js';
import { validateBranch, validateLibrary } from '../src/validate.js';

describe('branch library', () => {
  it('has at least 40 branches', () => {
    expect(BRANCHES.length).toBeGreaterThanOrEqual(40);
  });

  it.each(BRANCHES.map((b) => [b.id, b] as const))('%s is valid', (_id, branch) => {
    expect(validateBranch(branch)).toEqual([]);
  });

  it('passes library-level checks (unique ids, font diversity)', () => {
    expect(validateLibrary(BRANCHES)).toEqual([]);
  });

  it('never uses a banned font anywhere', () => {
    const banned = new Set(BANNED_FONTS.map((f) => f.toLowerCase()));
    for (const b of BRANCHES) {
      for (const t of b.type) {
        for (const f of [t.display, t.body, t.mono]) {
          if (f) expect(banned.has(f.family.toLowerCase()), `${b.id}/${t.id}: ${f.family}`).toBe(false);
        }
      }
    }
  });

  it('every palette is readable and every branch has a light palette', () => {
    for (const b of BRANCHES) {
      expect(
        b.palettes.some((p) => isLightPaper(p.colors.paper)),
        b.id,
      ).toBe(true);
      for (const p of b.palettes) {
        expect(contrast(p.colors.ink, p.colors.paper), `${b.id}/${p.id}`).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it('branches are genuinely different: no two share the same first palette paper+accent', () => {
    const seen = new Map<string, string>();
    for (const b of BRANCHES) {
      for (const p of b.palettes) {
        const key = `${p.colors.paper}/${p.colors.accent}/${p.colors.ink}`;
        expect(seen.has(key), `${b.id}/${p.id} duplicates ${seen.get(key)}`).toBe(false);
        seen.set(key, `${b.id}/${p.id}`);
      }
    }
  });
});
