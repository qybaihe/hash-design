#!/usr/bin/env node
// Keeps the one Skill file, skills/hash-design/SKILL.md, in step with the data. Requires `npm run build` first.
//
//   node scripts/sync.mjs           rewrite the generated bans block inside SKILL.md (npm run sync)
//   node scripts/sync.mjs --check   exit 1 if that block is stale or another SKILL.md is checked in (CI)
//
// There are no checked-in copies: `hash-design skill install` copies this file into .claude/skills, .agents/skills,
// .cursor/skills or any --to folder, and `npm pack` ships it as packages/core/skill/SKILL.md (scripts/prepack-core.mjs).
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySkillGeneratedBlock } from '../packages/core/dist/index.js';

const SKILL = 'skills/hash-design/SKILL.md';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, SKILL);
const current = await readFile(source, 'utf8');
const next = applySkillGeneratedBlock(current);

if (process.argv.includes('--check')) {
  const problems = [];
  if (next !== current) problems.push(`${SKILL}: the generated bans block is stale (run npm run sync)`);
  const tracked = execFileSync('git', ['ls-files', '--', '*SKILL.md'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  const copies = tracked.filter((f) => f !== SKILL);
  if (copies.length)
    problems.push(`checked-in copies of the Skill (${copies.join(', ')}); ${SKILL} is the only one`);
  if (problems.length) {
    for (const p of problems) console.error(`sync --check: ${p}`);
    process.exit(1);
  }
  console.log(`sync --check: ${SKILL} is the only SKILL.md and its generated block is current`);
} else {
  if (next !== current) await writeFile(source, next, 'utf8');
  console.log(`synced: ${SKILL}${next === current ? ' (already current)' : ''}`);
}
