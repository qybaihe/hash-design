<div align="center">

[English](README.md) · **简体中文** · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

# hash-design

**一句需求，N 套设计方向：由真随机 SHA-256 哈希决定，而不是模型。任何一个方向都能凭 ref 原样重建。**

<p align="center"><a href="https://qybaihe.github.io/hash-design/"><picture><source media="(prefers-reduced-motion: reduce)" srcset="docs/assets/hero.png"><img src="docs/assets/hero.gif" width="960" alt="动画：在输入框里选中 /hash-design 并提出落地页需求；5 个 SHA-256 ref 跳动后锁定为一次真实掷骰的结果；它的 5 个预览依次弹出，再排成一行对比"></picture></a></p>

[![npm](https://img.shields.io/npm/v/hash-design?style=flat-square&color=151412)](https://www.npmjs.com/package/hash-design)
[![CI](https://img.shields.io/github/actions/workflow/status/qybaihe/hash-design/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/qybaihe/hash-design/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-151412?style=flat-square)](LICENSE)

</div>

> [!IMPORTANT]
> 这是精简版。完整说明（工作流、字节规则、场景、MCP 工具、CLI、常见问题）以英文 README 为准：**[阅读完整的英文 README →](README.md)**

## 安装

需要 Node.js ≥ 20。

```bash
npx -y hash-design skill install --dir .               # Skill → .claude/skills 和 .agents/skills
claude mcp add hash-design -- npx -y hash-design mcp   # Claude Code 的 MCP server
codex mcp add hash-design -- npx -y hash-design mcp    # Codex 的 MCP server
```

装好后开一个新会话，直接说："用 hash-design 给我的面包店做个一页站，给 3 个方向。"Cursor、VS Code Copilot、Windsurf 等其他 Agent 的配置见[完整 README](README.md#install-by-hand)。

## 它做什么

让 LLM 做"好看的页面"，结果几乎总是同一种默认审美：Inter、紫蓝渐变、居中标题加两个按钮、三张一样的卡片。hash-design 不要求模型有更好的品味，而是把选择权拿走：掷出 N 个真随机哈希（默认 5 个，可选 1–12），每个哈希的字节按固定规则直接决定配色、字体、栅格、首屏锚点、母题、动效、文案语气和一个"变数"，没有风格库可挑；每个方向冻结成一份 brief。Agent 每个方向回你一行就停下，你说"预览"才把它们各自独立渲染、并排对比，你挑中哪个就按哪份 brief 做正式页面。除了网页，也支持幻灯片、手机 App 界面、数据看板、海报和 HTML 邮件。

## 更多

- [完整的英文 README](README.md) · [在线示例](https://qybaihe.github.io/hash-design/)
- 中文文档：[架构](docs/architecture.zh-CN.md) · [映射规范](docs/mapping.zh-CN.md) · [MCP 工具](docs/mcp-tools.zh-CN.md) · [发布](docs/publishing.zh-CN.md)
- [参与贡献](CONTRIBUTING.md) · [更新日志](CHANGELOG.md) · [MIT 许可](LICENSE)
