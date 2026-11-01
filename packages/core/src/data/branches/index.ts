import type { Branch } from '../../types.js';
import { documentBranches } from './document.js';
import { modernistCraftBranches } from './modernist-craft.js';
import { printBranches } from './print.js';
import { signageScreenBranches } from './signage-screen.js';

/**
 * The branch library, in mapping order. ORDER IS PART OF THE ALGORITHM:
 * appending is safe for new rolls but changes the modulus, so every change bumps the library fingerprint.
 */
export const BRANCHES: readonly Branch[] = Object.freeze([
  ...printBranches,
  ...documentBranches,
  ...signageScreenBranches,
  ...modernistCraftBranches,
]);
