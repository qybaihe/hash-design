<div align="center">

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · **한국어** · [Español](README.es.md)

# hash-design

**프롬프트 하나로 N가지 디자인 방향을. 고르는 건 모델이 아니라 진짜 난수로 만든 SHA-256 해시입니다. 어떤 방향이든 ref로 그대로 다시 만들 수 있습니다.**

<p align="center"><a href="https://qybaihe.github.io/hash-design/"><picture><source media="(prefers-reduced-motion: reduce)" srcset="docs/assets/hero.png"><img src="docs/assets/hero.gif" width="960" alt="애니메이션: 입력창에서 /hash-design을 골라 랜딩 페이지를 요청하면 SHA-256 ref 5개가 돌다가 실제 롤의 값으로 멈추고, 그 5개 미리보기가 차례로 나타난 뒤 비교용으로 한 줄로 늘어선다"></picture></a></p>

[![npm](https://img.shields.io/npm/v/hash-design?style=flat-square&color=151412)](https://www.npmjs.com/package/hash-design)
[![CI](https://img.shields.io/github/actions/workflow/status/qybaihe/hash-design/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/qybaihe/hash-design/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-151412?style=flat-square)](LICENSE)

</div>

> [!IMPORTANT]
> 이 문서는 요약본입니다. 워크플로, 바이트 규칙, 시나리오, MCP 도구, CLI, FAQ까지 담은 전체 문서는 영어로 되어 있습니다: **[영어 README 전체 읽기 →](README.md)**

## 설치

Node.js 20 이상이 필요합니다.

```bash
npx -y hash-design skill install --dir .               # Skill → .claude/skills 와 .agents/skills
claude mcp add hash-design -- npx -y hash-design mcp   # Claude Code용 MCP 서버
codex mcp add hash-design -- npx -y hash-design mcp    # Codex용 MCP 서버
```

설치한 뒤 새 세션을 열고 "hash-design으로 우리 빵집 원페이지 사이트를 만들어 줘, 방향은 3개"처럼 말하면 됩니다. Cursor, VS Code Copilot, Windsurf 같은 다른 에이전트 설정은 [전체 README](README.md#install-by-hand)에 있습니다.

## 하는 일

LLM에게 "예쁜 페이지"를 부탁하면 거의 매번 같은 모습으로 수렴합니다. Inter, 보라에서 파랑으로 가는 그라데이션, 가운데 제목과 버튼 두 개, 똑같은 카드 세 장. hash-design은 모델에게 더 나은 안목을 요구하지 않고, 선택 자체를 빼앗습니다. 진짜 난수로 해시 N개를 뽑고(기본 5개, 1–12개), 각 해시의 바이트를 고정된 규칙으로 색 구성, 서체, 그리드, 첫 화면 앵커, 모티프, 모션, 문체, 그리고 "트위스트" 하나에 바로 대응시킵니다. 스타일 라이브러리는 없습니다. 방향마다 브리프 하나로 고정됩니다. 에이전트는 방향마다 한 줄씩 답하고 멈추며, "render"라고 하면 브리프마다 독립적으로 미리보기를 만들어 나란히 보여 주고, 고른 하나를 실제 결과물로 만듭니다. 웹 페이지 말고도 슬라이드, 모바일 앱 화면, 대시보드, 포스터, HTML 이메일을 지원합니다.

## 더 보기

- [영어 README 전체](README.md) · [라이브 예시](https://qybaihe.github.io/hash-design/)
- 문서(영어): [아키텍처](docs/architecture.md) · [매핑 명세](docs/mapping.md) · [MCP 도구](docs/mcp-tools.md) · [배포 절차](docs/publishing.md) · [웹사이트 배포](docs/deploy-cloudflare-pages.md)
- [기여하기](CONTRIBUTING.md) · [변경 기록](CHANGELOG.md) · [MIT 라이선스](LICENSE)
