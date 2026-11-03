import { createHash } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';
import { beforeAll, describe, expect, it } from 'vitest';
import type * as BrowserModule from '../src/browser.js';
import * as node from '../src/index.js';
import { sha256, toHex } from '../src/sha256.js';

type BrowserEntry = typeof BrowserModule;

const nodeSha = (input: string | Uint8Array): string => createHash('sha256').update(input).digest('hex');

/** Deterministic bytes for the length sweep (xorshift32). */
function bytes(n: number, seed: number): Uint8Array {
  const out = new Uint8Array(n);
  let x = seed || 1;
  for (let i = 0; i < n; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    out[i] = x & 0xff;
  }
  return out;
}

describe('sha256 (pure TypeScript)', () => {
  it('matches the FIPS 180-4 test vectors', () => {
    expect(toHex(sha256(''))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(toHex(sha256('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(toHex(sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
    expect(toHex(sha256('a'.repeat(1_000_000)))).toBe(
      'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
    );
  });

  it('matches node:crypto for every length across the padding boundaries and for UTF-8 text', () => {
    for (let n = 0; n <= 300; n++) {
      const b = bytes(n, n + 7);
      expect(toHex(sha256(b)), `length ${n}`).toBe(nodeSha(b));
    }
    for (const s of ['第四巷面包店', 'Café — naïve', '🥐 bakery', `${node.ALGORITHM}:seed:0`, '\u0000￿'])
      expect(toHex(sha256(s)), s).toBe(nodeSha(s));
  });

  it('keeps every seeded hash and both fingerprints unchanged', () => {
    for (let i = 0; i < 12; i++)
      expect(node.seededHash('fourth-lane-bakery', i)).toBe(
        nodeSha(`${node.ALGORITHM}:fourth-lane-bakery:${i}`),
      );
    expect(node.libraryFingerprint()).toBe('bd20321c36ab');
    expect(node.scenarioFingerprint()).toBe('4b8c484cc50e');
  });

  it('random hashes come from crypto.getRandomValues', () => {
    const hs = Array.from({ length: 64 }, () => node.randomHash());
    expect(hs.every(node.isHash)).toBe(true);
    expect(new Set(hs).size).toBe(64);
  });
});

describe('hash-design/browser', () => {
  let bundle: string;
  let entry: BrowserEntry;

  beforeAll(async () => {
    // Bundle src/browser.ts the way a browser app would get it: everything inlined, no Node APIs.
    const out = await build({
      configFile: false,
      logLevel: 'silent',
      root: fileURLToPath(new URL('..', import.meta.url)),
      build: {
        lib: { entry: 'src/browser.ts', formats: ['es'], fileName: 'browser' },
        write: false,
        minify: false,
        target: 'es2022',
      },
    });
    const outputs = Array.isArray(out) ? out : [out];
    const chunk = outputs.flatMap((o) => ('output' in o ? o.output : [])).find((c) => c.type === 'chunk');
    if (!chunk || chunk.type !== 'chunk') throw new Error('vite build produced no chunk');
    bundle = chunk.code;
    const file = join(await mkdtemp(join(tmpdir(), 'hd-browser-')), 'browser.mjs');
    await writeFile(file, bundle);
    entry = (await import(pathToFileURL(file).href)) as BrowserEntry;
  }, 60_000);

  it('bundles with no Node built-ins and no remaining imports', () => {
    expect(bundle).not.toMatch(/from\s*["']node:|import\(\s*["']node:|\brequire\(|__vite-browser-external/);
    expect(bundle).not.toMatch(/^\s*import\s/m);
    expect(bundle.length).toBeGreaterThan(10_000);
  });

  it('the bundle maps seeded rolls exactly as the library does', () => {
    for (const constraints of [
      {},
      { scenario: 'deck' as const },
      { darkOnly: true, brandColors: ['#c8102e'] },
    ]) {
      const opts = {
        seed: 'browser-parity',
        count: 12,
        constraints,
        content: { subject: 'Fourth Lane Bakery' },
      };
      const a = entry.roll(opts);
      const b = node.roll(opts);
      expect(a.designs.map((d) => d.ref)).toEqual(b.designs.map((d) => d.ref));
      a.designs.forEach((d, i) =>
        expect(entry.renderBrief(d, a.content)).toBe(node.renderBrief(b.designs[i]!, b.content)),
      );
      expect(entry.renderReply(a)).toBe(node.renderReply(b));
    }
    expect(entry.libraryFingerprint()).toBe(node.libraryFingerprint());
  });

  it('the bundle rolls true-random hashes with crypto.getRandomValues', () => {
    const r = entry.roll({ count: 12 });
    expect(r.source).toBe('system-random');
    expect(new Set(r.designs.map((d) => d.hash)).size).toBe(12);
    for (const d of r.designs) expect(node.reproduce(node.parseRef(d.ref)).short).toBe(d.short);
  });
});
