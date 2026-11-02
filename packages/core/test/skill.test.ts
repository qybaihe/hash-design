import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BANS } from '../src/data/bans.js';
import { BODY_FONTS, DISPLAY_FONTS } from '../src/data/fonts.js';
import { applySkillGeneratedBlock, readSkill, skillGeneratedBlock } from '../src/skill.js';

const repo = (p: string) => new URL(`../../../${p}`, import.meta.url);

describe('Skill ↔ data consistency', () => {
  const skill = readSkill();

  it('has valid frontmatter', () => {
    const m = /^---\nname: (.+)\ndescription: (.+)\n---\n/.exec(skill);
    expect(m?.[1]).toBe('hash-design');
    expect((m?.[2] ?? '').length).toBeGreaterThan(80);
    expect((m?.[2] ?? '').length).toBeLessThan(1024);
  });

  it('generated block is up to date (run `npm run sync` if this fails)', () => {
    expect(skill).toContain(skillGeneratedBlock());
    expect(applySkillGeneratedBlock(skill)).toBe(skill);
  });

  it('mentions every ban and the real font pool', () => {
    for (const b of BANS) expect(skill).toContain(b.id);
    expect(skill).toContain(`${DISPLAY_FONTS.length} 个标题字体 × ${BODY_FONTS.length} 个正文字体`);
  });

  it('copies for Claude Code and Cursor are identical to the source', () => {
    for (const p of ['.claude/skills/hash-design/SKILL.md', '.cursor/skills/hash-design/SKILL.md']) {
      expect(readFileSync(repo(p), 'utf8'), p).toBe(skill);
    }
  });
});
