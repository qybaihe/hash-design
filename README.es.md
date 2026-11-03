<div align="center">

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **Español**

# hash-design

**Un prompt, N direcciones de diseño elegidas por hashes SHA-256 verdaderamente aleatorios, no por el modelo. Cualquier dirección se reconstruye tal cual a partir de su ref.**

<p align="center"><a href="https://qybaihe.github.io/hash-design/"><picture><source media="(prefers-reduced-motion: reduce)" srcset="docs/assets/hero.png"><img src="docs/assets/hero.gif" width="960" alt="Animación: en un cuadro de texto se elige /hash-design y se pide una landing page; cinco refs SHA-256 giran y se fijan en los de una tirada real; sus cinco vistas previas aparecen una tras otra y luego se alinean para compararlas"></picture></a></p>

[![npm](https://img.shields.io/npm/v/hash-design?style=flat-square&color=151412)](https://www.npmjs.com/package/hash-design)
[![CI](https://img.shields.io/github/actions/workflow/status/qybaihe/hash-design/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/qybaihe/hash-design/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-151412?style=flat-square)](LICENSE)

</div>

> [!IMPORTANT]
> Esta es la versión corta. La documentación completa (flujo de trabajo, reglas de los bytes, escenarios, herramientas MCP, CLI y preguntas frecuentes) está en inglés: **[Lee el README completo en inglés →](README.md)**

## Instalación

Requiere Node.js ≥ 20.

```bash
npx -y hash-design skill install --dir .               # Skill → .claude/skills y .agents/skills
claude mcp add hash-design -- npx -y hash-design mcp   # servidor MCP para Claude Code
codex mcp add hash-design -- npx -y hash-design mcp    # servidor MCP para Codex
```

Después abre una sesión nueva y pide, por ejemplo: «Usa hash-design para hacer una web de una página para mi panadería, con 3 direcciones». La configuración para Cursor, VS Code Copilot, Windsurf y otros agentes está en el [README completo](README.md#install-by-hand).

## Qué hace

Pide a un LLM «una página bonita» y casi siempre acaba en el mismo aspecto: Inter, un degradado de morado a azul, un titular centrado con dos botones y tres tarjetas idénticas. hash-design no le pide al modelo mejor gusto: le quita la elección. Genera N hashes verdaderamente aleatorios (5 por defecto, de 1 a 12) y unas reglas fijas convierten los bytes de cada hash directamente en la paleta, las tipografías, la retícula, el ancla de la primera pantalla, el motivo, el movimiento, la voz del texto y un «giro». No hay biblioteca de estilos. Cada dirección queda congelada en un brief. El agente responde con una línea por dirección y se detiene; si dices «render», construye vistas previas independientes a partir de cada brief y las pone lado a lado, y construye la que elijas. Además de páginas web, cubre presentaciones, pantallas de apps móviles, dashboards, pósteres y correos HTML.

## Más

- [README completo en inglés](README.md) · [Ejemplos en vivo](https://qybaihe.github.io/hash-design/)
- Documentación (en inglés): [arquitectura](docs/architecture.md) · [especificación del mapeo](docs/mapping.md) · [herramientas MCP](docs/mcp-tools.md) · [publicación](docs/publishing.md) · [despliegue del sitio web](docs/deploy-cloudflare-pages.md)
- [Contribuir](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) · [Licencia MIT](LICENSE)
