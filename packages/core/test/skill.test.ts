import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BANS } from '../src/data/bans.js';
import { BODY_FONTS, DISPLAY_FONTS } from '../src/data/fonts.js';
import { applySkillGeneratedBlock, readSkill, skillGeneratedBlock, skillPath } from '../src/skill.js';

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

  it('mentions every ban and the real font pool, and no branch library', () => {
    for (const b of BANS) expect(skill).toContain(b.id);
    expect(skill).toContain(`${DISPLAY_FONTS.length} 个标题字体 × ${BODY_FONTS.length} 个正文字体`);
    expect(skill).not.toMatch(/list_branches|get_branch|分支库|branch library/i);
  });

  it('is the only SKILL.md in the repository, and the checkout reads it', () => {
    const tracked = execFileSync('git', ['ls-files', '--', '*SKILL.md'], {
      cwd: fileURLToPath(repo('')),
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);
    expect(tracked).toEqual(['skills/hash-design/SKILL.md']);
    expect(skillPath()).toBe(fileURLToPath(repo('skills/hash-design/SKILL.md')));
  });
});
