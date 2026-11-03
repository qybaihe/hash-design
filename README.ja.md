<div align="center">

[English](README.md) · [简体中文](README.zh-CN.md) · **日本語** · [한국어](README.ko.md) · [Español](README.es.md)

# hash-design

**1 つのプロンプトから N 通りのデザイン方向を。選ぶのはモデルではなく、真の乱数による SHA-256 ハッシュです。どの方向も ref からそのまま再現できます。**

<p align="center"><a href="https://qybaihe.github.io/hash-design/"><picture><source media="(prefers-reduced-motion: reduce)" srcset="docs/assets/hero.png"><img src="docs/assets/hero.gif" width="960" alt="アニメーション：プロンプト欄で /hash-design を選んでランディングページを依頼すると、5 つの SHA-256 ref が回転して実際のロールの値で止まり、その 5 つのプレビューが順に現れて比較用に一列に並ぶ"></picture></a></p>

[![npm](https://img.shields.io/npm/v/hash-design?style=flat-square&color=151412)](https://www.npmjs.com/package/hash-design)
[![CI](https://img.shields.io/github/actions/workflow/status/qybaihe/hash-design/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/qybaihe/hash-design/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-151412?style=flat-square)](LICENSE)

</div>

> [!IMPORTANT]
> これは短縮版です。ワークフロー、バイトの規則、シナリオ、MCP ツール、CLI、FAQ を含む完全なドキュメントは英語版にあります：**[英語の完全な README を読む →](README.md)**

## インストール

Node.js 20 以上が必要です。

```bash
npx -y hash-design skill install --dir .               # Skill → .claude/skills と .agents/skills
claude mcp add hash-design -- npx -y hash-design mcp   # Claude Code の MCP サーバー
codex mcp add hash-design -- npx -y hash-design mcp    # Codex の MCP サーバー
```

インストールしたら新しいセッションを開き、「hash-design でパン屋の 1 ページサイトを作って。方向は 3 つ」のように頼みます。Cursor、VS Code Copilot、Windsurf などほかのエージェントの設定は[完全な README](README.md#install-by-hand) にあります。

## できること

LLM に「きれいなページ」を頼むと、ほぼ毎回同じ見た目に収束します。Inter、紫から青へのグラデーション、中央の見出しとボタン 2 つ、同じ形のカード 3 枚。hash-design はモデルにもっと良いセンスを求めるのではなく、選択そのものを取り上げます。真の乱数で N 個のハッシュを生成し（デフォルト 5 個、1〜12 個）、各ハッシュのバイトを固定の規則で配色、書体、グリッド、ファーストビューのアンカー、モチーフ、モーション、文体、そして 1 つの「ひねり」に直接割り当てます。スタイルのライブラリはありません。各方向はブリーフとして固定されます。エージェントは方向ごとに 1 行ずつ返して止まり、「render」と言えば各ブリーフから独立にプレビューを作って並べ、選んだ 1 つを本番として仕上げます。Web ページのほか、スライド、スマホアプリの画面、ダッシュボード、ポスター、HTML メールにも対応します。

## 詳しく

- [英語の完全な README](README.md) · [ライブの例](https://qybaihe.github.io/hash-design/)
- ドキュメント（英語）：[アーキテクチャ](docs/architecture.md) · [マッピング仕様](docs/mapping.md) · [MCP ツール](docs/mcp-tools.md) · [公開手順](docs/publishing.md)
- [コントリビュート](CONTRIBUTING.md) · [変更履歴](CHANGELOG.md) · [MIT ライセンス](LICENSE)
