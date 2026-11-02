# hash-design-mcp

Stdio [MCP](https://modelcontextprotocol.io) server for [hash-design](https://github.com/qybaihe/hash-design).

> **Not published to npm.** Only the core package, [`hash-design`](https://www.npmjs.com/package/hash-design) (library, CLI and Skill), is published. This server is part of the monorepo: build it from a clone and point your client at the built entry. An early `hash-design-mcp@0.1.0` is on npm from a one-time manual publish; it will not be updated.
>
> ```bash
> git clone https://github.com/qybaihe/hash-design.git && cd hash-design && npm install && npm run build
> claude mcp add hash-design -- node "$PWD/packages/mcp/dist/bin.js"
> ```

```json
{
  "mcpServers": {
    "hash-design": {
      "command": "node",
      "args": ["/ABS/PATH/hash-design/packages/mcp/dist/bin.js"]
    }
  }
}
```

Tools: `roll_designs`, `get_brief`, `list_branches`, `get_branch`, `critique_page`, `build_compare_page`.
Resources: `hash-design://bans`, `hash-design://workflow`, `hash-design://branches`, `hash-design://branch/{id}`.
Prompt: `hash-design`. Full reference: [docs/mcp-tools.md](https://github.com/qybaihe/hash-design/blob/main/docs/mcp-tools.md).

Pair it with the Skill (`node packages/core/dist/bin.js skill install`) so the agent follows the roll → 5 previews →
compare → pick → build workflow. See the [main README](https://github.com/qybaihe/hash-design#readme). MIT.
