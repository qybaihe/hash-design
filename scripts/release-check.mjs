#!/usr/bin/env node
// Checks that hash-design (packages/core), the only package published to npm, is ready to publish, and
// that packages/mcp (hash-design-mcp) stays private. Used by CI (`npm run release:check`) and by
// .github/workflows/release.yml before anything is published. Publishes nothing.
//
//   node scripts/release-check.mjs                 manifests: lockstep versions, publish fields, mcp private
//   node scripts/release-check.mjs --pack          … plus `npm pack --dry-run`: required files, no tests
//   node scripts/release-check.mjs --tag v0.2.0    … plus the release tag must be v<version> and CHANGELOG.md
//                                                  must have a "## [<version>]" section
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));

const { values } = parseArgs({
  options: { tag: { type: 'string' }, pack: { type: 'boolean', default: false } },
});

const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const PACKAGES = [
  {
    dir: 'packages/core',
    name: 'hash-design',
    bin: 'hash-design',
    dependencies: ['@modelcontextprotocol/sdk', 'zod', 'node-html-parser'],
    files: [
      'package.json',
      'README.md',
      'LICENSE',
      'dist/index.js',
      'dist/index.d.ts',
      'dist/bin.js',
      'dist/mcp.js',
      'skill/SKILL.md',
    ],
  },
];

const problems = [];
const rootPkg = readJson('package.json');
const version = readJson('packages/core/package.json').version;

if (!SEMVER.test(version)) problems.push(`packages/core version "${version}" is not a SemVer version`);
if (rootPkg.private !== true) problems.push('the root package.json must stay "private": true');
if (rootPkg.version !== version)
  problems.push(
    `root package.json version ${rootPkg.version} differs from ${version} (versions move in lockstep)`,
  );

for (const p of PACKAGES) {
  const pkg = readJson(`${p.dir}/package.json`);
  const where = `${p.dir}/package.json`;
  if (pkg.name !== p.name) problems.push(`${where}: name is "${pkg.name}", expected "${p.name}"`);
  if (pkg.version !== version) problems.push(`${where}: version ${pkg.version} differs from ${version}`);
  if (pkg.private) problems.push(`${where}: must not be private`);
  for (const field of [
    'description',
    'license',
    'homepage',
    'bugs',
    'type',
    'main',
    'types',
    'exports',
    'files',
  ])
    if (!pkg[field]) problems.push(`${where}: missing "${field}"`);
  if (!pkg.repository?.url?.includes('github.com/qybaihe/hash-design'))
    problems.push(
      `${where}: repository.url must point at github.com/qybaihe/hash-design (needed for provenance)`,
    );
  if (pkg.repository?.directory !== p.dir) problems.push(`${where}: repository.directory must be "${p.dir}"`);
  if (!pkg.engines?.node) problems.push(`${where}: missing engines.node`);
  // npm normalises "./dist/bin.js" to "dist/bin.js" at publish time and warns that the original was invalid.
  if (pkg.bin?.[p.bin] !== 'dist/bin.js') problems.push(`${where}: bin.${p.bin} must be dist/bin.js`);
  // `hash-design mcp` runs the MCP server from this package, so its runtime dependencies ship with it.
  for (const dep of p.dependencies ?? [])
    if (!pkg.dependencies?.[dep]) problems.push(`${where}: missing dependency ${dep}`);
  if (pkg.exports?.['./mcp']?.import !== './dist/mcp.js')
    problems.push(`${where}: exports["./mcp"] must point at ./dist/mcp.js`);
  if (pkg.publishConfig?.access !== 'public')
    problems.push(`${where}: publishConfig.access must be "public"`);
}

// packages/mcp is a private workspace: never published, but its dependency on hash-design must keep
// covering the workspace version, or npm installs the registry copy instead of linking packages/core.
const mcp = readJson('packages/mcp/package.json');
if (mcp.name !== 'hash-design-mcp') problems.push(`packages/mcp/package.json: name is "${mcp.name}"`);
if (mcp.private !== true)
  problems.push('packages/mcp/package.json must stay "private": true (hash-design-mcp is not published)');
if (mcp.publishConfig) problems.push('packages/mcp/package.json: remove publishConfig (it is not published)');
if (mcp.version !== version)
  problems.push(`packages/mcp/package.json: version ${mcp.version} differs from ${version}`);
if (mcp.dependencies?.['hash-design'] !== `^${version}`)
  problems.push(
    `packages/mcp depends on hash-design "${mcp.dependencies?.['hash-design']}", expected "^${version}" (run npm run release:version)`,
  );

if (values.tag !== undefined) {
  if (values.tag !== `v${version}`)
    problems.push(`release tag "${values.tag}" does not match the package version (expected v${version})`);
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  if (!changelog.includes(`## [${version}]`)) problems.push(`CHANGELOG.md has no "## [${version}]" section`);
}

if (values.pack) {
  // prepack scripts print to stdout, so the JSON starts at the first "[".
  const out = execFileSync(
    'npm',
    ['pack', '--dry-run', '--json', ...PACKAGES.flatMap((p) => ['-w', p.name])],
    {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    },
  );
  const packed = JSON.parse(out.slice(out.indexOf('[')));
  for (const p of PACKAGES) {
    const entry = packed.find((e) => e.name === p.name);
    if (!entry) {
      problems.push(`npm pack produced no tarball for ${p.name}`);
      continue;
    }
    const files = new Set(entry.files.map((f) => f.path));
    for (const f of p.files) if (!files.has(f)) problems.push(`${p.name} tarball is missing ${f}`);
    const leaked = [...files].filter((f) => /(^|\/)test\/|\.test\.|\.tsbuildinfo$|^src\//.test(f));
    if (leaked.length) problems.push(`${p.name} tarball contains ${leaked.join(', ')}`);
    const bin = readFileSync(join(root, p.dir, 'dist/bin.js'), 'utf8');
    if (!bin.startsWith('#!/usr/bin/env node')) problems.push(`${p.dir}/dist/bin.js has no node shebang`);
    console.log(
      `${p.name}@${entry.version}: ${entry.entryCount} files, ${(entry.size / 1024).toFixed(0)} kB packed`,
    );
  }
}

if (problems.length) {
  console.error(`release check failed:\n${problems.map((p) => `- ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(
  `release check passed for ${PACKAGES.map((p) => `${p.name}@${version}`).join(' and ')}${values.tag ? ` (tag ${values.tag})` : ''}; hash-design-mcp stays private`,
);
