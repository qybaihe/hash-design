# 示例：第四巷面包店

一次完整的 hash-design 端到端运行。店铺是虚构的，事实见 [facts.md](facts.md)。

## 过程

1. **掷骰**：用固定 seed 是为了让示例可复现，真实使用请去掉 `--seed`。

   ```bash
   node packages/core/dist/bin.js roll --subject "第四巷面包店" \
     --facts-file examples/fourth-lane-bakery/facts.md --seed fourth-lane-bakery \
     --out examples/fourth-lane-bakery
   ```

   MCP 等价调用是 `roll_designs { subject, facts, seed: "fourth-lane-bakery", out_dir }`，得到的 5 个 ref 完全相同。

2. **冻结**：生成 [roll.json](roll.json)、[ROLL.md](ROLL.md) 和 [briefs/](briefs)。

3. **渲染**：按 [Skill](../../skills/hash-design/SKILL.md) 第 3 步，5 个预览分别由 5 个**互相看不到对方**的子 Agent 完成。每个子 Agent 只读自己那一份 brief 加 facts.md，产出单文件 HTML（内联 CSS 和 SVG，没有图片也没有框架），并用 critique 加截图自检至少两轮。

4. **自检**：`hash-design critique previews/NN-*.html --roll roll.json --pick N`

   | # | 分支 | critique | brief 遵守度 | 剩余 minor |
   |---|---|---|---|---|
   | 1 | 公文表格 bureaucratic-form | 96 | 100 | 表单字段编号 10/13/14/15 与年份 2026，非事实数字 |
   | 2 | 包豪斯 bauhaus-primary | 96 | 100 | 章节编号 01–07、母题比例 10:8:6:4 |
   | 3 | 水墨印章 ink-and-seal | 100 | 100 | — |
   | 4 | Riso 双色套印 risograph-duotone | 100 | 100 | — |
   | 5 | 港式招牌 hk-shop-sign | 96 | 100 | 条款编号 1.1–4.2 |

5. **对比**：`hash-design compare --roll examples/fourth-lane-bakery/roll.json` 生成 [compare.html](compare.html)。

6. **选号**：Skill 规定在这里停下，等用户回复编号。示例到此为止。

## 文件

```
facts.md            事实清单（唯一允许出现在页面上的内容）
roll.json / ROLL.md 5 个哈希、映射、约束、每份 brief 的 JSON
briefs/             5 份冻结 brief
previews/           5 个预览页
compare.html        并排对比页
screenshots/        桌面首屏 / 整页 / 手机，#3 的横向滚动分段，对比页（桌面、手机）
```

截图用 `npm run screenshots` 生成（需要先 `npx playwright install chromium`）。
`packages/core/test/examples.test.ts` 保证这里的 roll 和 brief 与当前数据一致：库一旦改动，测试就会提醒你重新掷骰。
