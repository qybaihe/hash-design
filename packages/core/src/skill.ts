import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BANNED_FONTS, BANS } from './data/bans.js';
import { BODY_FONTS, DISPLAY_FONTS } from './data/fonts.js';

/**
 * Locate SKILL.md. The repository has exactly one, `skills/hash-design/SKILL.md`; running from this checkout
 * (`packages/core/src` or `packages/core/dist`) always reads it, so a leftover prepack copy cannot shadow it.
 * In the published package, `npm pack` copied it to `<pkg>/skill/SKILL.md`.
 */
export function skillPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = join(here, '..');
  const inRepo = basename(pkg) === 'core' && basename(join(pkg, '..')) === 'packages';
  const candidates = [
    ...(inRepo ? [join(pkg, '..', '..', 'skills', 'hash-design', 'SKILL.md')] : []),
    join(pkg, 'skill', 'SKILL.md'),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error(`SKILL.md not found (looked in ${candidates.join(', ')})`);
  return found;
}

export function readSkill(): string {
  return readFileSync(skillPath(), 'utf8');
}

export const SKILL_BLOCK_BEGIN = '<!-- BEGIN GENERATED: bans (npm run sync) -->';
export const SKILL_BLOCK_END = '<!-- END GENERATED: bans -->';

/** The part of SKILL.md that is generated from data (bans, banned fonts, font pool size). */
export function skillGeneratedBlock(): string {
  const lines = [
    SKILL_BLOCK_BEGIN,
    `### 全局禁令（${BANS.length} 条，与 hash-design 数据同步）`,
    '',
    ...BANS.map((b) => `- **${b.title.zh}** (\`${b.id}\`, ${b.severity})`),
    '',
    `禁用字体：${BANNED_FONTS.join(', ')}。`,
    '',
    `字体池：${DISPLAY_FONTS.length} 个标题字体 × ${BODY_FONTS.length} 个正文字体，由哈希字节直接选，没有风格分类。`,
    SKILL_BLOCK_END,
  ];
  return lines.join('\n');
}

/** Replace the generated block inside a SKILL.md text. */
export function applySkillGeneratedBlock(text: string): string {
  const start = text.indexOf(SKILL_BLOCK_BEGIN);
  const end = text.indexOf(SKILL_BLOCK_END);
  if (start < 0 || end < 0) throw new Error('SKILL.md is missing the generated-block markers');
  return text.slice(0, start) + skillGeneratedBlock() + text.slice(end + SKILL_BLOCK_END.length);
}
