# hash-design

Core library + CLI of [hash-design](https://github.com/qybaihe/hash-design): roll true-random hashes and map them,
through a fixed and reproducible decision tree, onto concrete design directions — so AI-built pages stop collapsing into
the same template (Inter, purple gradients, centered hero with two buttons, three identical cards…).

```bash
npx -y hash-design roll --subject "Fourth Lane Bakery" --fact "Open Tue–Sun 7:00–19:00" --out design/hash-design
npx -y hash-design critique design/hash-design/previews/01-*.html --roll design/hash-design/roll.json --pick 1
npx -y hash-design compare --roll design/hash-design/roll.json
npx -y hash-design skill install --target both
```

```ts
import { roll, renderBrief, critiquePage } from 'hash-design';

const r = roll({ count: 5, content: { subject: '第四巷面包店', facts: ['周一休息'] } });
console.log(renderBrief(r.designs[0], r.content));
```

See the [main README](https://github.com/qybaihe/hash-design#readme) (中文) for the method, the MCP server and the Skill.
MIT.
