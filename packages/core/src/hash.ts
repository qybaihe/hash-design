import { sha256, toHex } from './sha256.js';

/**
 * Algorithm identifier. Bump when the byte → parameter assignment changes.
 * v1 picked one of 40 genre branches; v2 maps the hash straight onto continuous parameters, so v1 refs
 * do not reproduce under v2.
 */
export const ALGORITHM = 'hash-design/v2';

const HASH_RE = /^[0-9a-f]{64}$/;

/** SHA-256 as lowercase hex (strings are UTF-8). Pure TypeScript, so it runs in Node and browsers alike. */
export function sha256Hex(input: string | Uint8Array): string {
  return toHex(sha256(input));
}

/**
 * A true-random hash: SHA-256 over 32 bytes from Web Crypto's `crypto.getRandomValues`, the OS CSPRNG
 * (a global in Node ≥ 20 and in every browser).
 */
export function randomHash(): string {
  return sha256Hex(globalThis.crypto.getRandomValues(new Uint8Array(32)));
}

/** A reproducible hash for examples/tests. Not for real rolls. */
export function seededHash(seed: string, index: number): string {
  return sha256Hex(`${ALGORITHM}:${seed}:${index}`);
}

/** Roll `count` hashes. With a seed the roll is reproducible; without, it uses system randomness. */
export function rollHashes(count: number, seed?: string): string[] {
  if (!Number.isInteger(count) || count < 1)
    throw new Error(`count must be a positive integer (got ${count})`);
  return Array.from({ length: count }, (_, i) => (seed === undefined ? randomHash() : seededHash(seed, i)));
}

export function isHash(value: string): boolean {
  return HASH_RE.test(value);
}

export function hashBytes(hash: string): Uint8Array {
  const h = hash.trim().toLowerCase();
  if (!isHash(h)) throw new Error(`Expected a 64-char lowercase hex SHA-256 hash, got "${hash}"`);
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export interface DesignRef {
  hash: string;
}

/** A v2 ref is the 64-hex hash itself. v1 refs could carry "+<probe>"; those belong to hash-design/v1. */
export function parseRef(ref: string): DesignRef {
  const r = ref.trim();
  if (/^[0-9a-fA-F]{64}\+\d+$/.test(r)) {
    throw new Error(
      `"${r}" is a hash-design/v1 ref (the "+<probe>" suffix only existed in v1). hash-design/v2 refs are the bare 64-char hash; v1 refs reproduce only with hash-design v1.`,
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(r)) {
    throw new Error(`Invalid design ref "${ref}". Expected a 64-char hex hash.`);
  }
  return { hash: r.toLowerCase() };
}

export function shortHash(hash: string): string {
  return hash.slice(0, 8);
}
