# hash-design-mcp (private)

Private workspace wrapper around the [hash-design](https://github.com/qybaihe/hash-design) MCP server. The server itself lives in the published package, `hash-design` (`packages/core/src/mcp.ts`), and runs as `hash-design mcp`; this package re-exports it so a clone can still start it as `packages/mcp/dist/bin.js`. It is not published to npm.

```bash
# The usual way, no clone needed:
claude mcp add hash-design -- npx -y hash-design mcp
# From a clone:
git clone https://github.com/qybaihe/hash-design.git && cd hash-design && npm install && npm run build
claude mcp add hash-design -- node "$PWD/packages/mcp/dist/bin.js"
```

Tools: `roll_designs`, `get_brief`, `critique_page`, `build_compare_page`.
Resources: `hash-design://bans`, `hash-design://workflow`.
Prompt: `hash-design`. Full reference: [docs/mcp-tools.md](https://github.com/qybaihe/hash-design/blob/main/docs/mcp-tools.md). MIT.
