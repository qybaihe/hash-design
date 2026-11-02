#!/usr/bin/env node
import { SERVER_VERSION, serveStdio } from './server.js';

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (arg === '--version' || arg === '-v') {
    process.stdout.write(`${SERVER_VERSION}\n`);
    return;
  }
  if (arg === '--help' || arg === '-h') {
    process.stdout.write(
      `hash-design-mcp ${SERVER_VERSION}\nStdio MCP server from a hash-design checkout. The same server ships in the\n` +
        `hash-design package as \`hash-design mcp\` (from 0.2.0), e.g.\n` +
        `  { "mcpServers": { "hash-design": { "command": "npx", "args": ["-y", "hash-design", "mcp"] } } }\n` +
        `From a checkout: { "command": "node", "args": ["/ABS/PATH/hash-design/packages/mcp/dist/bin.js"] }\n`,
    );
    return;
  }
  await serveStdio('hash-design-mcp');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
