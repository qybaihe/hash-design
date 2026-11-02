# hash-design

Library, CLI, Skill and MCP server of [hash-design](https://github.com/qybaihe/hash-design): roll true-random hashes and map them,
through a fixed and reproducible decision tree, onto concrete design directions — so AI-built pages stop collapsing into
the same template (Inter, purple gradients, centered hero with two buttons, three identical cards…).

```bash
npx -y hash-design skill install --target both --dir .   # the Skill, for Claude Code and Cursor
claude mcp add hash-design -- npx -y hash-design mcp     # the MCP server (0.2.0 or later)
npx -y hash-design --help                                # the CLI
```

`hash-design mcp` is new in 0.2.0; with 0.1.0, register `npx -y hash-design-mcp@0.1.0` instead.

```bash
hash-design roll --subject "Fourth Lane Bakery" --fact "Open Tue–Sun 7:00–19:00" --out design/hash-design
hash-design critique design/hash-design/previews/01-*.html --roll design/hash-design/roll.json --pick 1
hash-design compare --roll design/hash-design/roll.json
hash-design skill install --target both
hash-design mcp   # stdio MCP server, started by your agent
```

```ts
import { roll, renderBrief, critiquePage } from 'hash-design';

const r = roll({ count: 5, content: { subject: '第四巷面包店', facts: ['周一休息'] } });
console.log(renderBrief(r.designs[0], r.content));
```

See the [main README](https://github.com/qybaihe/hash-design#readme) for the method, the MCP tools, the Skill and a
live demo. Also in [简体中文](https://github.com/qybaihe/hash-design/blob/main/README.zh-CN.md) ·
[日本語](https://github.com/qybaihe/hash-design/blob/main/README.ja.md) ·
[한국어](https://github.com/qybaihe/hash-design/blob/main/README.ko.md) ·
[Español](https://github.com/qybaihe/hash-design/blob/main/README.es.md). MIT.
