import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^hash-design\/browser$/,
        replacement: fileURLToPath(new URL('./packages/core/src/browser.ts', import.meta.url)),
      },
      {
        find: /^hash-design$/,
        replacement: fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      },
    ],
  },
  test: {
    include: ['packages/*/test/**/*.test.ts', 'site/test/**/*.test.ts'],
    testTimeout: 20_000,
  },
});
