#!/usr/bin/env node
// Sets one version across the monorepo: the private root, hash-design (the only published package),
// the private hash-design-mcp workspace and its dependency on hash-design (^<version>, so npm keeps
// linking packages/core), then refreshes package-lock.json. Does not commit, tag or publish.
//
//   npm run release:version -- 0.2.0
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2]?.replace(/^v/, '');
if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error('usage: npm run release:version -- <version>   (for example 0.2.0 or 0.2.0-rc.1)');
  process.exit(1);
}

const update = (rel, edit) => {
  const path = join(root, rel);
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  edit(pkg);
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`${rel}: ${pkg.name}@${pkg.version}`);
};

update('package.json', (p) => (p.version = version));
update('packages/core/package.json', (p) => (p.version = version));
update('packages/mcp/package.json', (p) => {
  p.version = version;
  p.dependencies['hash-design'] = `^${version}`;
});

execFileSync('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], {
  cwd: root,
  stdio: 'inherit',
});
console.log(`\nNext: move CHANGELOG.md [Unreleased] to "## [${version}] - <date>", run npm run check and
npm run release:check, commit, merge, then publish a GitHub Release tagged v${version} (docs/publishing.md).`);
