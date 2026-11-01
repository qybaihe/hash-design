# hash-design-mcp

Stdio [MCP](https://modelcontextprotocol.io) server for [hash-design](https://github.com/qybaihe/hash-design).

```json
{
  "mcpServers": {
    "hash-design": { "command": "npx", "args": ["-y", "hash-design-mcp"] }
  }
}
```

Tools: `roll_designs`, `get_brief`, `list_branches`, `get_branch`, `critique_page`, `build_compare_page`.
Resources: `hash-design://bans`, `hash-design://workflow`, `hash-design://branches`, `hash-design://branch/{id}`.
Prompt: `hash-design`.

Pair it with the Skill (`npx -y hash-design skill install`) so the agent follows the roll → 5 previews → compare → pick →
build workflow. See the [main README](https://github.com/qybaihe/hash-design#readme). MIT.
