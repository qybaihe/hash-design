<div align="center">

[English](README.md) · [简体中文](README.zh-CN.md) · **日本語** · [한국어](README.ko.md) · [Español](README.es.md)

# hash-design

<p align="center"><a href="https://qybaihe.github.io/hash-design/causeway-festival/compare.html"><picture><source media="(prefers-reduced-motion: reduce)" srcset="docs/assets/hero.png"><img src="docs/assets/hero.gif" width="960" alt="アニメーション：入力欄で /hash-design を選び、Causeway のランディングページを頼む。5 つの SHA-256 ref が回ってから確定し、実際の 5 つのプレビュー（Engineering plate、Topographic map、Warm handmade、Editorial magazine、Memphis pop）が次々に現れ、比較用の 1 列に並ぶ。1 つ選べば、ref から再現できる"></picture></a></p>

<p align="center"><sub>モックアップではなく実際の出力です：<a href="examples/causeway-festival">examples/causeway-festival</a>。各プレビューは、凍結されたブリーフ 1 つだけを見た別々のサブエージェントが作りました。<br><a href="https://qybaihe.github.io/hash-design/"><b>4 つのライブサンプルをすべて見る →</b></a> · 40 ブランチのうち 20 · <a href="docs/assets/hero.png">静止画</a> · <a href="docs/assets/hero.mp4">MP4</a></sub></p>

### 1 つのプロンプトから 5 つのデザインの方向性。選ぶのはモデルではなく、真の乱数による SHA-256 ハッシュです。

**コーディングエージェントが毎回同じ「Inter と紫のグラデーション」のページを出してくるのを止めます。hash-design は 5 つの方向性をロールし、それぞれをデザインブリーフとして凍結し、5 つのプレビューを並べて表示してから、あなたが 1 つ選ぶのを待ちます。どの方向性も ref から作り直せます。**

[![CI](https://img.shields.io/github/actions/workflow/status/qybaihe/hash-design/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/qybaihe/hash-design/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/live_demo-4_examples-e2401c?style=flat-square)](https://qybaihe.github.io/hash-design/)
[![Agent Skill](https://img.shields.io/badge/Agent_Skill-Claude_Code_%C2%B7_Cursor-151412?style=flat-square)](#クイックスタート)
[![MCP server](https://img.shields.io/badge/MCP_server-6_tools_%C2%B7_stdio-151412?style=flat-square)](docs/mcp-tools.md)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520-151412?style=flat-square&logo=nodedotjs&logoColor=white)](.nvmrc)
[![npm](https://img.shields.io/npm/v/hash-design?style=flat-square&color=151412)](https://www.npmjs.com/package/hash-design)
[![MIT license](https://img.shields.io/badge/license-MIT-151412?style=flat-square)](LICENSE)

**[ライブサンプル](https://qybaihe.github.io/hash-design/) · [ブランチ一覧](docs/branches.md) · [MCP リファレンス](docs/mcp-tools.md) · [変更履歴](CHANGELOG.md)**

[クイックスタート](#クイックスタート) · [仕組み](#仕組み) · [ショーケース](#ショーケース) · [リファレンス](#リファレンス) · [よくある質問](#よくある質問)

**エージェントにこう伝える**（Claude Code、Cursor）：

```text
このエージェントに hash-design の skill を入れて：`npx -y hash-design skill install --dir .` を実行し、
`npx -y hash-design mcp` で MCP サーバーを登録して（hash-design が 0.1.0 なら
`npx -y hash-design-mcp@0.1.0` を使う）。手順は https://github.com/qybaihe/hash-design/blob/main/README.ja.md#クイックスタート 。
```

</div>

---

## hash-design でできること

LLM に「美しいページ」を頼むと、ほぼ必ず同じ「最頻値」の美学に収束します。Inter、紫から青へのグラデーション、中央寄せの見出しと 2 つのボタン、まったく同じ 3 枚の機能紹介カード、グラスモーフィズム、絵文字アイコン、そして _Unlock_、_Seamless_、_Supercharge_ のようなコピー。理由は単純で、モデルは選択を任されると、学習データの中で最もありふれたものを選ぶからです。

hash-design は、モデルに「もっとセンスを良くしろ」とは求めません。代わりに**選択そのものを取り上げます**。

| ステップ         | 何が起きるか                                                                                                                                                                                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ロール**       | システムの乱数から 5 つのハッシュを生成します（`crypto.randomBytes(32)` → SHA-256）。                                                                                                                                                                                                                 |
| **マッピング**   | 各ハッシュを**固定された再現可能な決定木**に通し、具体的な方向性に対応付けます。対象は、デザインのジャンル、レイアウト、フォントの組み合わせ、hex のカラーパレット、密度、モーション、モチーフ、ファーストビューのアンカー、タイプスケール、サーフェス、コピーの文体、そして 1 つの「ツイスト」です。 |
| **凍結**         | 各方向性を、そのまま貼り付けられるトークン（フォントのリンク、hex 値、`tokens.css`、グリッドの数値、角丸／影のポリシー）とグローバル禁止事項をまとめた**ブリーフ**として凍結します。                                                                                                                  |
| **レンダリング** | エージェントの仕事は、各ブリーフを忠実に**実行する**ことだけです。5 つの独立した HTML プレビューと、それらを並べた比較ページを作ります。そこで**いったん止まり、あなたが番号を選ぶのを待ちます**。                                                                                                    |
| **仕上げ**       | 番号を選ぶと、エージェントはそのブリーフをもとに最終ページを作り、`critique_page` でチェックします。                                                                                                                                                                                                  |

これは、モデルのデフォルトの美学を打ち破るための、外部からのランダムな制約です。KV キャッシュやサンプリング温度とは関係ありません。モデルのセンスはスタイル選びではなく、実装の質（揃え、リズム、ディテール、可読性）に使われます。

デフォルトの出力は Web ページです。**シナリオ**（`scenario`）を渡すと、同じロールの方向性がスライド、モバイルアプリの画面、ダッシュボード、ポスター／SNS カード、HTML メールになります（[シナリオ](#シナリオ)を参照）。

構成は **Agent Skill**（いつ、どの順でこの流れを回すか）、**MCP サーバー**（stdio、ツール 6 個）、**CLI**、**TypeScript ライブラリ** の 4 つで、まとめて npm の [`hash-design`](https://www.npmjs.com/package/hash-design) として公開しています（MCP サーバーは 0.2.0 からこのパッケージに入ります）。

## クイックスタート

### エージェントに任せる

デザインしたいプロジェクトで Claude Code か Cursor を開き、次を貼り付けます：

```text
このエージェントに hash-design の skill を入れて：`npx -y hash-design skill install --dir .` を実行し、
`npx -y hash-design mcp` で MCP サーバーを登録して（hash-design が 0.1.0 なら
`npx -y hash-design-mcp@0.1.0` を使う）。手順は https://github.com/qybaihe/hash-design/blob/main/README.ja.md#クイックスタート 。
```

エージェントが Skill をプロジェクトの `.claude/skills/` と `.cursor/skills/` にコピーし、MCP サーバーを登録します（Claude Code は `claude mcp add`、Cursor は `.cursor/mcp.json`）。clone やビルドは要りません。終わったら新しいセッションを始めて両方を読み込ませ、[使い方](#使い方)へ進んでください。自分でコマンドを打つ場合は、下の手順を使います。

### 手動でインストール

Node.js ≥ 20 と npm（`npx` 用）が必要です。

**Skill。** Skill は、いつ hash-design を使うか、どの順で MCP ツールを呼ぶか、プレビューをどう独立して作るか、どこで必ず止まるかをエージェントに伝えます。

```bash
npx -y hash-design skill install --target both --dir .      # このプロジェクト：.claude/skills と .cursor/skills
npx -y hash-design skill install --target claude --global   # またはホームディレクトリ（すべてのプロジェクト）
```

`--target` は `claude`、`cursor`、`both`（デフォルト）のいずれかです。[`skills/hash-design/SKILL.md`](skills/hash-design/SKILL.md) を手作業で `.claude/skills/hash-design/SKILL.md`（Claude Code）または `.cursor/skills/hash-design/SKILL.md`（Cursor）にコピーしてもかまいません。Skill の本文は中国語で書かれていますが、description には英語のトリガーフレーズも含まれています。

**MCP サーバー。** エージェントに `npx -y hash-design mcp` を登録します。stdio でサーバーが動きます。

> [!NOTE]
> `hash-design mcp` は次のリリース hash-design 0.2.0 から使えます。いま npm にある 0.1.0 では、代わりに `npx -y hash-design-mcp@0.1.0` を登録してください。以前に別パッケージとして公開したサーバーで、ツール 6 個は同じですが、今後は更新されません。

#### Claude Code

```bash
claude mcp add hash-design -- npx -y hash-design mcp
# hash-design 0.1.0 の場合：
claude mcp add hash-design -- npx -y hash-design-mcp@0.1.0
```

あるいはプロジェクト単位の `.mcp.json` をコミットします：

```json
{
  "mcpServers": {
    "hash-design": {
      "command": "npx",
      "args": ["-y", "hash-design", "mcp"]
    }
  }
}
```

0.1.0 では `args` を `["-y", "hash-design-mcp@0.1.0"]` にします。

#### Cursor

`.cursor/mcp.json`（プロジェクト）または `~/.cursor/mcp.json`（グローバル）に、上の `.mcp.json` と同じ構造で書きます。

#### Claude Desktop

macOS は `~/Library/Application Support/Claude/claude_desktop_config.json`、Windows は `%APPDATA%\Claude\claude_desktop_config.json` で、構造は同じです。Claude Desktop はプロジェクトのディレクトリでサーバーを起動しないので、`roll_designs` を呼ぶときは `out_dir` に**絶対パス**を渡してください。`npx` が見つからない場合は、`which npx` が表示するパスを `command` に書きます。

### ソースから使う

開発に参加するとき、またはまだリリースされていないコミットを動かすとき（[CONTRIBUTING.md](CONTRIBUTING.md) も参照）：

```bash
git clone https://github.com/qybaihe/hash-design.git ~/hash-design
cd ~/hash-design && npm install && npm run build
node ~/hash-design/packages/core/dist/bin.js skill install --target both --dir /path/to/your/project
claude mcp add hash-design -- node ~/hash-design/packages/core/dist/bin.js mcp
```

チェックアウトでは CLI は `packages/core/dist/bin.js` です。`packages/mcp/dist/bin.js` も同じ MCP サーバーを起動するので、そこを指している既存の設定はそのまま動きます。このリポジトリには Skill の `.claude/` と `.cursor/` のコピーが同梱されており、テストによってソースと同一に保たれています。

### 使い方

MCP サーバーと Skill をインストールしたら、エージェントにこう頼むだけです。

> hash-design を使って「Fourth Lane Bakery」のワンページサイトを作って。ファクト：火〜日 7:00〜19:00 営業、月曜定休。カンパーニュ ¥38。…

エージェントはロールを行い、ブリーフを凍結し、5 つのプレビューをレンダリングして `design/hash-design/compare.html` を書き出したあと、止まってあなたが番号で返答するのを待ちます。MCP プロンプトに対応したクライアントなら、`hash-design` プロンプト（引数：`subject`、`facts`、`count`、`scenario`）で同じワークフローを始めることもできます。スライド、アプリ画面、ダッシュボード、ポスター、メールを頼むと、エージェントは対応する `scenario` を渡します。

### CLI

```bash
hash-design roll --subject "Fourth Lane Bakery" --facts-file facts.md --out design/hash-design   # 真の乱数による 5 つの方向性
hash-design roll --subject "…" --light-only --brand "#c8102e" --format json                     # 制約付き
hash-design roll --subject "Q3 review" --facts-file facts.md --scenario deck --out design/deck   # ページではなくスライド
hash-design brief <ref> [constraints]                                                            # ブリーフを再現
hash-design branches [--family craft]                                                            # ブランチライブラリ
hash-design branch ink-and-seal                                                                  # 1 つのブランチの詳細
hash-design critique page.html --roll design/hash-design/roll.json --pick 3 --fail-under 80
hash-design compare --roll design/hash-design/roll.json                                          # compare.html を書き出す
hash-design skill install --target both                                                          # Skill をインストール
```

`npx -y hash-design …` で実行するか、`npm install -g hash-design` で一度インストールして `hash-design …` と打ちます。チェックアウトでは `node packages/core/dist/bin.js …` です。`hash-design --help` ですべてのコマンドが、`hash-design <command> --help`（例：`hash-design roll --help`）でそのコマンドのオプションが表示されます。制約フラグ `--light-only`、`--dark-only`、`--reduced-motion`、`--brand`、`--family`、`--include`、`--exclude`、`--scenario` も含まれます。

### ライブラリ

```ts
import { roll, renderBrief, critiquePage, reproduce, parseRef } from 'hash-design';

const r = roll({ content: { subject: 'Fourth Lane Bakery', facts: ['Closed Mondays', 'Country loaf ¥38'] } });
for (const [i, d] of r.designs.entries()) console.log(renderBrief(d, r.content, { number: i + 1 }));

const design = reproduce(parseRef(r.designs[0].ref), r.constraints);
const report = critiquePage({ html: '<!doctype html>…', design });
console.log(report.score, report.adherence, report.findings);
```

`npm install hash-design` でインストールします（ES モジュール、Node.js ≥ 20、型定義付き）。

### アップデート

```bash
npx -y hash-design@latest skill install --target both --dir .   # コピーした SKILL.md を更新
```

npx は以前にキャッシュしたコピーを使い続けることがあります。`@latest` を付けると最新のリリースを取得します（`hash-design@0.2.0` のようにバージョンを固定することもできます）。MCP サーバーはエージェントの起動時に npx で立ち上がるので、リリース後はエージェントを再起動し、古いコピーが動き続けるなら MCP のコマンドに `hash-design@latest` と書いてください。clone から使う場合は `git pull && npm install && npm run build`。アップデートでブランチのデータが変わった場合、古いバージョンでロールした ref の再現にはそのバージョンが必要です（[よくある質問](#よくある質問)を参照）。

## 仕組み

```mermaid
flowchart LR
  A[ファクトシート] --> B[roll_designs<br/>5 × SHA-256、真の乱数]
  B --> C[固定された決定木<br/>バイト → 次元]
  C --> D[凍結された 5 つのブリーフ<br/>briefs/01…05.md]
  D --> E[5 つの独立した HTML プレビュー<br/>それぞれ自分のブリーフだけを参照]
  E --> F[build_compare_page<br/>並べて比較]
  F --> G{ユーザーが選ぶ}
  G --> H[最終ページ<br/>選ばれたブリーフから作成]
  H --> I[critique_page<br/>禁止事項 + ブリーフ準拠]
```

### バイト → 次元（`hash-design/v1`）

| バイト | 次元                   | ルール                                                                                                                    |
| ------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 0–1    | ブランチ（branch）     | `uint16(b0, b1) mod N`（N = 40）。衝突した場合は前方へ進む（後述）                                                        |
| 2      | 文体（voice）          | 14 種類のコピー文体：店先の黒板、フィールドノート、技術マニュアル、私信、時刻表、暦…                                      |
| 3      | レイアウト（layout）   | ブランチの 3 つのレイアウトから 1 つ。グリッドの数値と、上から下へのセクション構成の略図付き                              |
| 4      | 書体（type）           | 3 つの組み合わせから 1 つ：ディスプレイ / 本文（/ 等幅）+ CJK フォント + 組版メモ                                         |
| 5      | パレット（palette）    | 3 つのパレットから 1 つ：7 つの hex 値（paper / ink / muted / accent / accent2 / rule / panel）                           |
| 6      | 密度（density）        | airy / regular / compact / packed のうち、ブランチが許可するもの                                                          |
| 7      | モーション（motion）   | 3 つから 1 つ：再生時間、イージング、reduced-motion 時のポリシー                                                          |
| 8      | モチーフ（motif）      | ブランチの 3 つのモチーフから 1 つ                                                                                        |
| 9      | アンカー（anchor）     | ブランチの 3 つのファーストビュー・アンカーから 1 つ                                                                      |
| 10     | スケール（scale）      | ブランチが許可するモジュラースケール（1.125〜1.618）                                                                      |
| 11     | サーフェス（surface）  | 3 つのサーフェスから 1 つ（CSS のヒント付き）                                                                             |
| 12     | ツイスト（twist）      | 16 種類。例：「数字をディスプレイ要素として使う」「1 つの要素だけがグリッドを破る」「ファーストビューにボタンを置かない」 |
| 13     | フォーマット（format） | Web 以外のシナリオのみ：シナリオの 3〜4 種類のフォーマットから 1 つ（例：スライドのマスター）                             |
| 13–31  | 未使用                 | ブリーフに記録され、将来の次元のために予約されている（シナリオがバイト 13 を使う場合は 14–31）                            |

- **衝突とファミリーの分散**：1 回のロールの中で、すでに使われたブランチに当たったハッシュは、空いている次のブランチまで前方へ進みます（+1、+2、…）。まだ使われていない**ファミリー**（print / document / signage / screen / craft / modernist）が残っている間は、使用済みのファミリーに当たった場合も衝突とみなします。そのため、5 方向のロールは必ず 5 つの異なるファミリーにまたがります。進んだステップ数が `probe` です。ref は `<hash>+<probe>` と表記され、それ単体で再現できます。
- **ブランチの順序**：ライブラリ内の順序が、そのままマッピングの順序です。各ファミリーのメンバーはリング上に均等に配置されているため、前方へ進んでも確率が 1 つのブランチに集中することはありません。5 方向のロールでは、どのブランチも 9〜17% の割合で出現します（一様分布なら 12.5%）。
- **制約は、バイトを適用する前に候補プールを絞り込みます**。そのため、制約もデザインの同一性の一部になります：`light_only`、`dark_only`、`reduced_motion`、`brand_colors`（ブランドカラーがアクセントを置き換え、アクセントの色相が最も近いパレットが選ばれ、コントラストが報告されます）、`families`、`include_branches`、`exclude_branches`、`scenario`。
- **再現可能**：同じ `ref`、同じ制約、同じライブラリ・フィンガープリントからは、常に同じブリーフが生成されます。すべてのブリーフには、アルゴリズム（`hash-design/v1`）とライブラリ・フィンガープリント（データ全体の SHA-256 の先頭 16 進 12 桁）が記録されます。
- **`seed` はサンプルとテストを再現するためだけのものです**。実際の利用では、常にシステムの乱数を使います。

具体例付きの完全な仕様は [docs/mapping.md](docs/mapping.md)（英語）にあります。

### シナリオ

`scenario` は何をデザインするかを指定します。デフォルトの `web` は上の Web ページのワークフローそのままで、何も変わりません。残りの 5 つはロールした方向性を保ったまま、各ブリーフにフォーマット、キャンバス、出力ルールを加えます。

| シナリオ            | 成果物                                                                                                  | フォーマット（バイト 13）                     | キャンバス                                |
| ------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------- |
| `web`（デフォルト） | レスポンシブな Web ページ、ランディングページ、1 ページサイト                                           | —                                             | レスポンシブ                              |
| `deck`              | HTML のスライド：1 枚ごとに固定キャンバス、キーボード操作、PDF に印刷可能                               | 全面、インデックスレール、文書マスター        | 1920×1080                                 |
| `app`               | 1 つのユーザー動線のスマホ画面を数枚、横に並べて表示                                                    | 下部タブバー、上部タブ、単一フロー、シート    | 390×844                                   |
| `dashboard`         | デスクトップ 1 画面：主要な数値、メインのグラフ 1 つ、補助パネル                                        | サイドバー、トップバー、ウォールディスプレイ  | 1440×900                                  |
| `poster`            | アートボード 1 枚：ポスターまたは SNS 画像、スクリーンショットで完成                                    | 縦 4:5、正方形、ストーリー 9:16、リンクカード | 1080×1350、1080×1080、1080×1920、1200×630 |
| `email`             | 実際のメールクライアントで崩れない HTML メール：テーブルレイアウト、インラインスタイル、JavaScript なし | 1 カラム、全幅バンド、ダイジェスト            | 600 または 640 px のカラム                |

- **方向性はそのまま引き継がれます。** シナリオはブランチのプールを絞り込まないので、同じハッシュはどのシナリオでも同じブランチ、文体、レイアウト、書体、パレット、モチーフ、アンカー、スケール、表面になります。
- **一部のプールは小さくなります。** バイト 6 と 12 を読む前に、そのシナリオで意味をなさない密度とツイストを取り除きます（スライドに `packed` は使わず、「ファーストビューにボタンを置かない」も使いません）。そのため密度とツイストは Web 版と異なることがあります。メールは常に最も静かなモーションを使います。
- **サイズは媒体に合わせます。** 基準の文字サイズは密度の値を拡大または範囲内に収めたものです（スライド ×2、ポスター ×1.75、アプリとメール 16〜17 px、ダッシュボード 13〜15 px）。`tokens.css` にはキャンバスのサイズが入ります。
- **デザインの同一性の一部です。** ほかの制約と同じく、ref を再現するときは同じ `scenario` を渡します。`web` は何も変えません。既存の ref、ブリーフ、サンプルはそのまま再現されます。

`critique_page` は各シナリオの出力の約束（スライド枚数とキャンバス、スマホの枠、等幅数字、アートボードのサイズ、メールのテーブル）を確認し、比較ページは固定キャンバスを実寸から縮小して表示します。シナリオの一覧とルールは [Open Design](https://github.com/nexu-io/open-design) のテンプレートを参考にしました。詳細は [docs/mapping.md §6](docs/mapping.md#6-scenarios)（英語）にあります。

### ブリーフに含まれるもの

サンプルの [#3 Ink and seal](examples/fourth-lane-bakery/briefs/03-ink-and-seal.md) を例にとると、ブリーフには次の内容が含まれます。

- マッピングの追跡記録（1 バイトずつ、計算式と結果付き）
- コンテンツ：ページに記載してよい事実（これ以外は書けません）
- コピーの文体とその表現技法、レイアウト（グリッドの数値とセクションの順序）、ファーストビューのアンカー
- 書体：Google Fonts の `<link>`（ページが中国語の場合は CJK フォントを含む）と、モジュラー比から計算したタイプスケール
- 7 つの hex 値、色の配分比率、WCAG コントラスト表（どの色が大きな文字や装飾にしか使えないか）
- 密度、角丸 / ボーダー / 影のポリシー、サーフェス（CSS スニペット付き）、モチーフ、モーション仕様
- ツイスト、ブランチの must / must-not リスト、14 項目すべてのグローバル禁止事項
- そのまま貼り付けられる `tokens.css` と、納品前チェックリスト
- Web 以外のシナリオでは「シナリオ」の節：フォーマット、キャンバス、ファイル構成、スライド／画面の枚数、レイアウト・アンカー・モーションの落とし込み方、シナリオのルールと禁止事項

ブリーフはエージェント向けに書かれており、2 言語に対応しています。見出しには中国語と英語のラベルが併記され、`language`（`zh` または `en`。主題とファクトから自動判定）によって、コンセプトの説明文、指示文、CJK の Web フォントを読み込むかどうかが切り替わります。一部のプールの説明（文体、ツイスト）は、現時点では中国語のみです。

## ショーケース

4 つの完全な実行例です。それぞれ独自のファクトシートと固定 seed を使っています（seed は再現のためだけのものです）。2 つのサンプルが同じブランチを使うことはなく、合わせて 40 ブランチのうち 20、6 つのファミリーすべてを見られます。各プレビューは自分のブリーフだけを見たサブエージェントが作り、どれも `critique_page` で 90/100 以上です。すべて[サンプル一覧](https://qybaihe.github.io/hash-design/)にあります。 下の各プレートは 1 回のロールで、5 つの方向性をブランチ名と ref 付きで並べています。

### Fourth Lane Bakery（第四巷面包店）— 街のベーカリー · 中国語ページ

[![Fourth Lane Bakery：ロールで出た 5 つの方向性を並べたもの — Bureaucratic form、Bauhaus primary、Ink and seal、Risograph duotone、Hong Kong shop sign](docs/assets/showcase/fourth-lane-bakery.png)](examples/fourth-lane-bakery)

seed `fourth-lane-bakery` · `critique_page` 96–100 · ブリーフ遵守度 100 · [サンプルのフォルダ](examples/fourth-lane-bakery)：ファクト、ブリーフ、プレビュー、制作過程

### Sluice — セルフホスト型の Webhook 受信箱 · 英語ページ

[![Sluice：ロールで出た 5 つの方向性を並べたもの — Record sleeve、Gallery catalogue、Terminal phosphor、Academic paper、Lab notebook](docs/assets/showcase/sluice.png)](examples/sluice)

seed `sluice` · `critique_page` 92–96 · ブリーフ遵守度 90–100 · [サンプルのフォルダ](examples/sluice)：ファクト、ブリーフ、プレビュー、制作過程

### Bridge No.2 Cycle Works（二号桥单车铺）— 橋の下の自転車修理店 · 中国語ページ

[![Bridge No.2 Cycle Works：ロールで出た 5 つの方向性を並べたもの — Swiss grid、Couture lookbook、Ticket stub、Game manual、Chinese almanac](docs/assets/showcase/bridge-two-bikes.png)](examples/bridge-two-bikes)

seed `bridge-two-bikes-5` · `critique_page` 96–100 · ブリーフ遵守度 100 · [サンプルのフォルダ](examples/bridge-two-bikes)：ファクト、ブリーフ、プレビュー、制作過程

### Causeway — 潮の引いた時だけ渡れる島の 1 日限りの音楽フェス · 英語ページ

[![Causeway：ロールで出た 5 つの方向性を並べたもの — Engineering plate、Topographic map、Warm handmade、Editorial magazine、Memphis pop](docs/assets/showcase/causeway-festival.png)](examples/causeway-festival)

seed `causeway-festival-6` · `critique_page` 96–100 · ブリーフ遵守度 100 · [サンプルのフォルダ](examples/causeway-festival)：ファクト、ブリーフ、プレビュー、制作過程

## リファレンス

6 つの MCP ツール、40 のブランチ、そしてすべてのブリーフに入る 14 の禁止事項。

### MCP ツール

| ツール               | 機能                                                                                                                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `roll_designs`       | `subject`、`facts`、`count`（デフォルト 5）と、任意の `seed`、`language`、`scenario`、制約を受け取ります。ハッシュ、マッピング、方向性ごとに 1 つのブリーフを返します。`out_dir` を指定すると、`roll.json`、`ROLL.md`、`briefs/*.md` をディスクに凍結します |
| `get_brief`          | `ref`（`<hash>` または `<hash>+<probe>`）と同じ制約からブリーフを再現し、Markdown または JSON で返します                                                                                                                                                    |
| `list_branches`      | 40 のデザインブランチを一覧表示します。ファミリーで絞り込むこともできます                                                                                                                                                                                   |
| `get_branch`         | 1 つのブランチのすべての選択肢とトークンを表示します                                                                                                                                                                                                        |
| `critique_page`      | HTML 文字列またはファイルを、禁止事項と AI テンプレート的なパターンのチェックリストに照らして採点します。`brief_ref`、または `roll_path` + `pick` を指定すると、ブリーフとシナリオの出力の約束への準拠度も採点します                                        |
| `build_compare_page` | `roll.json` から、方向性を並べて見比べる `compare.html` を生成します                                                                                                                                                                                        |

リソース：`hash-design://bans`、`hash-design://workflow`（Skill）、`hash-design://branches`、`hash-design://branch/{id}`。プロンプト：`hash-design`（`subject`、`facts`、`count`、`scenario`）。

すべてのパラメータ、戻り値の形、対応する CLI コマンドは [docs/mcp-tools.md](docs/mcp-tools.md)（英語）にまとめています。

### ブランチライブラリ（40）

どのブランチも「SaaS 風スタイル」ではなく、現実世界に実在するデザインジャンルです。各次元には 3 つの具体的な選択肢があります：フォントの組み合わせ（Google Fonts + CJK）、7 つの hex 値、グリッドの数値、角丸 / ボーダー / 影のポリシー、モーション仕様、モチーフ、サーフェス。全カタログは [docs/branches.md](docs/branches.md)（中国語・英語併記）にあり、`list_branches` / `get_branch` でその場で照会できます。

| ファミリー | ブランチ                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| print      | Supermarket circular · Letterpress wood type · Photocopy zine · Risograph duotone · Record sleeve · Varsity sports programme · Couture lookbook · Broadsheet newspaper · Editorial magazine |
| document   | Engineering plate · Ledger · Ticket stub · Academic paper · Apothecary label · Bureaucratic form · Thermal receipt · Herbarium specimen · Field guide plate                                 |
| signage    | Transit wayfinding · Hong Kong shop sign · Diner menu board · Gallery catalogue · Topographic map                                                                                           |
| screen     | Terminal phosphor · Web 1.0 homepage · Game manual · Instrument panel · Raw brutalist                                                                                                       |
| craft      | Recipe card · Warm handmade · Ink and seal · Chinese almanac · Ma whitespace · Lab notebook                                                                                                 |
| modernist  | Swiss grid · Bauhaus primary · Constructivist poster · Art Deco · 70s supergraphic · Memphis pop                                                                                            |

データは、テストとスクリプトによって次のルールが強制されています。

- 禁止フォントを使わない（フォールバックでも不可）
- ink/paper のコントラスト比 ≥ 7:1、muted/paper ≥ 4.5:1
- どのブランチにも明るいパレットが少なくとも 1 つある
- フレームワークのデフォルトの hex 値を使わない
- 1 つのディスプレイフォントが主役を務めるのは最大 3 ブランチまで
- 2 つのブランチが同じ代表パレット（paper + accent）を共有しない
- すべてのフォント URL が Google Fonts で解決できる：`node scripts/verify-fonts.mjs`（235/235 合格）

### グローバル禁止事項

すべてのブリーフにはこの 14 項目の禁止事項が含まれており、`critique_page` はそれぞれを自動で検出します。

| id                          | 禁止内容                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `generic-sans`              | Inter、Roboto、Poppins、Montserrat、DM Sans、Space Grotesk ほか 17 種類の定番サンセリフ。`system-ui` を「デザイン」として使うこと |
| `purple-blue-gradient`      | 紫 / インディゴ / 青のグラデーション、グラデーション文字、カラフルなブロブ                                                        |
| `centered-hero-two-buttons` | 中央寄せの見出し + サブタイトル + プライマリ / ゴーストのボタンペア                                                               |
| `identical-cards`           | 「アイコン + タイトル + 2 行の説明」というまったく同じカードが 3 / 4 / 6 枚並ぶ                                                   |
| `glassmorphism`             | `backdrop-filter` によるすりガラス効果                                                                                            |
| `emoji-icons`               | 絵文字をアイコンとして使う。汎用アイコンセットを装飾として使う                                                                    |
| `buzzword-copy`             | Unlock / Seamless / Supercharge / 赋能 / 一站式 / 极致体验 …                                                                      |
| `soft-shadow-rounded`       | あらゆる要素に 12〜24px の角丸 + 大きくぼかした影                                                                                 |
| `invented-facts`            | 「10K+ users」「Trusted by」、アバター付きの偽のお客様の声                                                                        |
| `tailwind-default-palette`  | `#6366f1`、`#8b5cf6`、`#0f172a` などのフレームワークのデフォルト色                                                                |
| `scroll-fade-everything`    | スクロールに合わせてすべてのセクションがフェードアップする                                                                        |
| `pill-badge-sparkle`        | 見出しの上に置かれた「New ✨」のピル型バッジ                                                                                      |
| `placeholder-content`       | Lorem ipsum、ストックの人物写真、適当な Unsplash 画像                                                                             |
| `template-sections`         | Hero → Features → Testimonials → Pricing → FAQ というお決まりの構成                                                               |

`critique_page` はこのほかに、文字のコントラスト（3:1 未満）、`viewport`、`lang`、`img alt`、モーションがあるのに `prefers-reduced-motion` がないこと、そしてブリーフへの準拠（フォント、hex 値、角丸と影のポリシー）もチェックします。これは静的解析です。ファーストビューが本当にブリーフのアンカーになっているか、文体が合っているかまでは判断できません。そこは依然として、人間か、ブリーフを読み直すエージェントが確認する必要があります。

## よくある質問

<details>
<summary><strong>どのエージェントで使えますか？</strong></summary>

Skill は Claude Code（`.claude/skills/`）と Cursor（`.cursor/skills/`）にインストールできます。MCP サーバーは stdio で動くので、どの MCP クライアントからでも起動できます。[手動でインストール](#手動でインストール)に Claude Code、Cursor、Claude Desktop の設定があります。Skill がなくてもツールは呼べますが、プレビューを独立して作ることや、選ぶまで止まることをエージェントに伝えるものがありません。

</details>

<details>
<summary><strong>npm で公開されていますか？</strong></summary>

はい。[`hash-design`](https://www.npmjs.com/package/hash-design) 0.1.0 にはライブラリ、CLI、Skill（`npx -y hash-design skill install`）が入っています。MCP サーバーは 0.2.0 で `hash-design mcp` としてこのパッケージに加わります。それまでは、以前の別パッケージで今後は更新されない `npx -y hash-design-mcp@0.1.0` を使ってください。リリースは GitHub Actions から npm Trusted Publishing で公開します（[docs/publishing.md](docs/publishing.md)、英語）。

</details>

<details>
<summary><strong>本当にランダムですか？同じブリーフをもう一度得るには？</strong></summary>

ロールのたびにシステムの乱数（`crypto.randomBytes(32)` → SHA-256）を使います。`seed` はサンプルとテストの再現専用です。各ブリーフには `ref`（`<hash>` または `<hash>+<probe>`）、制約、ライブラリのフィンガープリントが記録されていて、`get_brief` か `hash-design brief <ref>` でまったく同じブリーフを作り直せます。

</details>

<details>
<summary><strong>アップデート後も古い ref は再現できますか？</strong></summary>

ブランチのデータが変わっていなければ再現できます。ライブラリには 40 のブランチがあり、ブランチを追加・削除するとマッピングが変わります。すべてのブリーフにライブラリのフィンガープリントが記録されるので不一致は検出できますが、古い ref の再現には対応するバージョンが必要です。

</details>

<details>
<summary><strong><code>critique_page</code> は良いページを保証しますか？</strong></summary>

いいえ。ヒューリスティックな静的解析です。インラインの `<style>`、`style=""`、追加で渡した CSS を読みますが、ページのレンダリングやリンクされたスタイルシートの取得はしません。禁止パターンを検出し、フォント、16 進カラー、角丸、影をブリーフと照合しますが、結果が*良い*かどうかは、モデルとブリーフを実行する人次第です。このツールが解決するのは「どれも同じに見える」問題で、デザインの判断を置き換えるものではありません。

</details>

<details>
<summary><strong>ネットワーク接続は必要ですか？</strong></summary>

CLI と MCP サーバーはローカルで動き、ネットワークリクエストはしません。作られるページは Google Fonts（CJK フォントを含む）からフォントを読み込むので、オフラインや制限のあるネットワークでは、フォントをセルフホストするか、各ブリーフに書かれたフォールバックを使ってください。

</details>

<details>
<summary><strong>ブリーフの一部が中国語なのはなぜですか？</strong></summary>

ブリーフはバイリンガルです。見出しには中国語と英語のラベルがあり、`language`（`zh` または `en`）でコンセプトの文章と指示が切り替わります。プールの説明の一部（ボイス、ツイスト）と Skill の本文は今のところ中国語のみで、Skill の description には英語のトリガーフレーズが入っています。

</details>

## ドキュメント

- [docs/architecture.md](docs/architecture.md)（英語）：パッケージ構成、データフロー、設計上の判断、テスト
- [docs/mapping.md](docs/mapping.md)（英語）：`hash-design/v1` のマッピング、衝突、制約、再現性
- [docs/mcp-tools.md](docs/mcp-tools.md)（英語）：すべての MCP ツール、リソース、プロンプトと、対応する CLI コマンド
- [docs/branches.md](docs/branches.md)（中国語・英語併記）：40 ブランチのカタログ（自動生成）
- 中国語版：[アーキテクチャ](docs/architecture.zh-CN.md) · [マッピング仕様](docs/mapping.zh-CN.md) · [MCP ツール](docs/mcp-tools.zh-CN.md)

## コントリビューション

コントリビューションを歓迎します。特に新しいブランチは大歓迎です。まず [CONTRIBUTING.md](CONTRIBUTING.md)（英語）を読んでください。データのルール、`npm run sync`、そしてデータを変更するとなぜサンプルを振り直す必要があるのかを説明しています。[行動規範](CODE_OF_CONDUCT.md)（英語）に従い、脆弱性は [SECURITY.md](SECURITY.md)（英語）に記載された方法で報告してください。リリースノートは [CHANGELOG.md](CHANGELOG.md)（英語）にあります。

```bash
npm install
npm run build        # tsc -b（両パッケージ）
npm test             # vitest: core、CLI、MCP（インメモリ transport）、Skill/docs の整合性
npm run check        # 型チェック + lint + prettier + テスト
npm run sync         # データ変更後に実行: SKILL.md の禁止事項ブロック、.claude/.cursor のコピー、docs/branches.md を再生成
node scripts/smoke.mjs        # 実際の stdio 経由の MCP + CLI のスモークテスト（CI で実行）
node scripts/verify-fonts.mjs # すべてのフォント URL をオンラインで確認（CI では実行しない）
npm run example:critique      # すべてのサンプルのプレビューをブリーフに照らして critique（90 未満で失敗）
npm run screenshots           # すべてのサンプルの Playwright スクリーンショット（`npx playwright install chromium` が必要）
npm run hero                  # サンプルのスクリーンショットから docs/assets/hero.png と social-preview.png を作り直す
npm run hero:gif              # docs/assets/hero.gif と hero.mp4 を作り直す（ffmpeg が必要。gifski があればそちらを使う）
npm run showcase              # docs/assets/showcase/<サンプル>.png を作り直す（サンプルごとに 1 枚）
```

CI では Node 20、22、24 上で、ビルド、型チェック、lint、フォーマットチェック、テスト、stdio スモークテスト、`npm pack --dry-run` を実行します。

リポジトリ構成：

```
packages/core/           # npm: hash-design — data, mapping, briefs, critique, compare page, CLI
  src/data/bans.ts       #   global bans, banned fonts, buzzword lists
  src/data/pools.ts      #   densities, scales, 14 copy voices, 16 twists
  src/data/branches/     #   40 branches (index.ts defines the mapping order)
  src/mapping.ts         #   hash → design (decision tree, collisions, constraints)
  src/brief.ts           #   brief rendering (Markdown / JSON)
  src/critique.ts        #   static AI-template checks
  src/compare.ts         #   side-by-side compare page
  src/cli.ts             #   CLI
packages/mcp/            # npm: hash-design-mcp — stdio MCP server
skills/hash-design/      # Skill source (.claude/ and .cursor/ hold synced copies)
examples/                # 4 full runs: facts → roll → 5 briefs → 5 previews → compare page → screenshots
docs/                    # architecture, mapping spec, MCP reference, branch catalogue (generated)
scripts/                 # sync / smoke / verify-fonts / examples / screenshot / hero / hero-gif / prepack
```

## ライセンス

[MIT](LICENSE) © qybaihe
