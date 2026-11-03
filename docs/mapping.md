# Mapping specification: `hash-design/v2`

[中文](mapping.zh-CN.md) · [Back to README](../README.md)

This page specifies how a 256-bit hash becomes a design direction. In `hash-design/v2` **the hash is the direction**: there is no library of genres, styles or branches to pick from. Each byte drives one design parameter (or two, split into bits), either a continuous value (a hue, a lightness, a ratio, a size, a duration) or an index into a short list of primitives that combine freely. Everything here is implemented in [`packages/core/src/hash.ts`](../packages/core/src/hash.ts), [`packages/core/src/mapping.ts`](../packages/core/src/mapping.ts) and [`packages/core/src/palette.ts`](../packages/core/src/palette.ts), and covered by `packages/core/test/mapping.test.ts`.

## 1. Where hashes come from

| Mode                 | Source                                           | `source` field in `roll.json` |
| -------------------- | ------------------------------------------------ | ----------------------------- |
| Real use (default)   | `sha256(crypto.randomBytes(32))`, the OS CSPRNG  | `system-random`               |
| Examples and tests   | `sha256("hash-design/v2:<seed>:<index>")`        | `seed:<seed>`                 |
| Library callers only | `roll({ hashes: [...] })` with hashes you supply | `provided-hashes`             |

`seed` exists so that examples and tests are reproducible. The Skill, the MCP prompt and the server instructions all tell agents never to pass a seed for real work.

## 2. N directions

A roll of N (1–12, default 5) is N hashes mapped one by one. Each design depends only on its own hash and the constraints: nothing is shared between the designs of a roll, nothing is walked or de-duplicated, and there is no pool that can run out. A design's **ref is its 64-hex hash**, so any one design can be rebuilt on its own with `get_brief` / `hash-design brief <hash>`.

Seeded rolls are prefix-stable: design _i_ of a seeded roll is `sha256("hash-design/v2:<seed>:<i>")` whatever N is, so `--count 3` gives the first three designs of `--count 12`.

Two directions of the same roll differ the way two random hashes differ: independently in every byte. Nothing forces them apart; with 256 values per byte and dozens of parameters, two identical designs would need two identical hashes.

## 3. Bytes → parameters

A hash is 32 bytes, `b0` … `b31`. `hash-design/v2` reads them as follows (`BYTE_MAP` in `mapping.ts`; the same rules are printed in every brief's mapping trace with the hex value, the arithmetic and the result).

| Byte | Parameter                  | Rule                                                                                                    |
| ---- | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| 0–1  | hue                        | `uint16(b0, b1) / 65536 × 360°` (OKLCH hue of paper, ink and accent)                                    |
| 2    | polarity · paper lightness | `b < 77` → dark, L = 0.14 + b/76 × 0.12; else light, L = 0.90 + (b − 77)/178 × 0.085                    |
| 3    | paper chroma               | `b/255 × 0.045` (0 = neutral paper)                                                                     |
| 4    | accent chroma              | `0.07 + b/255 × 0.16`                                                                                   |
| 5    | accent2 hue offset         | `30° + b/255 × 300°` from the accent                                                                    |
| 6    | display face               | `b mod 98` into the display pool                                                                        |
| 7    | body face                  | `b mod 62` into the body pool                                                                           |
| 8    | display case · weight      | case `b mod 4` (as written, upper, lower, small caps); weight = the face's weights[`⌊b/4⌋ mod n`]       |
| 9    | display tracking           | `−0.04 + b/255 × 0.24` em                                                                               |
| 10   | type scale ratio           | `1.067 + b/255 × 0.551` (1.067 … 1.618)                                                                 |
| 11   | density                    | `t = b/255`, mapped into the scenario's range (§5)                                                      |
| 12   | grid columns · gutter      | `3 + (b mod 10)` columns; gutter = unit × (1 + `⌊b/10⌋ mod 4`)                                          |
| 13   | text block span · start    | span from `b & 15`, start column from `b >> 4` (formula below)                                          |
| 14   | first-screen height        | `45 + b/255 × 55` % of the viewport                                                                     |
| 15   | sections · separator       | `3 + (b mod 6)` sections; separator `⌊b/6⌋ mod 5` (rules, bands, numbers, space, boxes)                 |
| 16   | anchor subject · size      | subject `b mod 8`; size `25 + ⌊b/8⌋/31 × 75` % of the width                                             |
| 17   | anchor position · rotation | x = `(b & 15)/15` across the width; rotation `((b >> 4) − 7.5)/7.5 × 8°` (rounded to 0.5°)              |
| 18   | motif shape · size         | shape `b mod 12`; size = unit × (1 + `⌊b/12⌋ mod 8`)                                                    |
| 19   | motif placement · angle    | placement `b mod 4` (edges, dividers, behind the anchor, markers); angle `⌊b/4⌋ × 180/63°`              |
| 20   | radius · border            | radius `[0, 0, 0, 0, 2, 4, 8, 16][b mod 8]` px; border `⌊b/8⌋ mod 4` px; style `⌊b/32⌋ mod 4`           |
| 21   | shadow · texture           | shadow `[0, 0, 2, 6][b & 3]` px, hard (no blur); texture `(b >> 2) & 3`; opacity `3 + (b >> 4) × 0.6` % |
| 22   | motion property · duration | property `⌊b/64⌋` (opacity, transform, clip-path, colour); duration `(b mod 64)/63 × 600` ms            |
| 23   | easing                     | `b < 32` → `steps(2 + b mod 6, end)`; else `cubic-bezier` from the bits (below)                         |
| 24   | voice person · headline    | person `b mod 4` (I, we, you, none); headline form `⌊b/4⌋ mod 6`                                        |
| 25   | sentence length · register | `3 + (b & 15)` words; register `(b >> 4)/15` (0 plain … 1 formal)                                       |
| 26   | twist target               | `b mod n` over 9 targets, minus the scenario's                                                          |
| 27   | twist operation · amount   | `b mod n` over 10 operations, minus the scenario's; amount `⌊b/10⌋`                                     |
| 28   | scenario format            | `b mod n` over the scenario's formats; non-web scenarios only                                           |
| 29   | CJK display face           | `b mod 14` (used on Chinese pages)                                                                      |
| 30   | mono face                  | `b mod 8`                                                                                               |
| 31   | —                          | unused (28 is also unused on the web); both are printed in the trace                                    |

The few formulas that do not fit in a cell:

- **Text block (byte 13).** `span = max(min(2, columns), round(columns × (0.35 + 0.65 × (b & 15)/15)))`, `start = 1 + round((columns − span) × (b >> 4)/15)`. The block always fits the grid.
- **Easing (byte 23, b ≥ 32).** `cubic-bezier(((b >> 2) & 7)/7 × 0.9, (b >> 5)/7 × 1.4, (b & 3)/3 × 0.8 + 0.1, 1)`.
- **Duration (byte 22)** is rounded to 10 ms; 0 ms is possible and means the change is instant.
- **Twist amount (byte 27)** is read by the operation: rotate by `2 + amount × 0.5°`, oversize to `2 + amount × 0.1`×, undersize to `0.6 − amount × 0.012`×, repeat `2 + amount mod 4` times, push `1 + amount mod 3` columns off the grid; the other operations ignore it.
- **CJK body face** is not a byte: Noto Serif SC when the body face falls back to a serif, Noto Sans SC otherwise.
- **Display weight** comes from the weights the chosen display face actually has on Google Fonts, so it always loads.

A few values depend on a second byte: the weight (byte 8 indexes the weights of the face picked by byte 6), the text block (byte 13 is read against the column count from byte 12), the gutter and motif size (multiples of the density unit from byte 11) and the CJK body face (byte 7). `mapping.test.ts` flips each byte in turn and checks that nothing else in the trace moves.

## 4. Palette

The palette is computed, not looked up. Bytes 0–5 set the hue, polarity, paper lightness and chroma, the accent chroma and the second accent's hue offset; the lightness of every text colour is then **solved**, walking in OKLCH lightness steps of 0.005 away from the paper until the contrast floor holds:

| Colour    | Built from                                        | Contrast with paper |
| --------- | ------------------------------------------------- | ------------------- |
| `paper`   | L and C from bytes 2–3, hue from bytes 0–1        | —                   |
| `ink`     | same hue, chroma `min(0.035, paper C + 0.012)`    | ≥ 7.5               |
| `muted`   | same hue, chroma 0.02                             | ≥ 4.6               |
| `accent`  | same hue, chroma from byte 4                      | ≥ 3.2               |
| `accent2` | hue + offset from byte 5, 0.9 × the accent chroma | ≥ 3.0               |
| `rule`    | paper L ∓ 0.17, a little more chroma than paper   | —                   |
| `panel`   | paper L − 0.045 (light) or + 0.05 (dark)          | —                   |

Colours outside sRGB lose chroma until they fit; the hue never moves. 77 of the 256 values of byte 2 give a dark paper, so about 30% of hashes are dark.

## 5. Density

Byte 11 sets one position `t` from 0 (airy) to 1 (packed). Every density value is a linear function of `t`:

| Value        | Formula                         | t = 0   | t = 1   |
| ------------ | ------------------------------- | ------- | ------- |
| base size    | `18 − 4t` px, rounded to 0.5    | 18 px   | 14 px   |
| line height  | `1.65 − 0.3t`                   | 1.65    | 1.35    |
| spacing unit | `10 − 6t` px, rounded           | 10 px   | 4 px    |
| section gap  | `168 − 136t` px, rounded        | 168 px  | 32 px   |
| max width    | `1080 + 360t` px, rounded to 10 | 1080 px | 1440 px |

Scenarios narrow the range of `t` (§7).

## 6. Constraints

Constraints are applied before any byte is read. They are part of a design's identity: the same hash with different constraints is a different design, and you must pass the same constraints to `get_brief` / `hash-design brief` to reproduce it.

| MCP parameter    | CLI flag           | Effect                                                                                                                                  |
| ---------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `light_only`     | `--light-only`     | Light paper; byte 2 is read over its full range as the lightness, `0.90 + b/255 × 0.085`                                                |
| `dark_only`      | `--dark-only`      | Dark paper; byte 2 is read over its full range as the lightness, `0.14 + b/255 × 0.12`                                                  |
| `reduced_motion` | `--reduced-motion` | No motion: duration 0, easing `none` (bytes 22–23 are traced but not applied)                                                           |
| `brand_colors`   | `--brand <#hex>`   | Up to 2 colours: the first replaces `accent` and sets the hue (bytes 0–1 unused) if it has chroma ≥ 0.03; the second replaces `accent2` |
| `scenario`       | `--scenario <id>`  | What is designed: web (default), deck, app, dashboard, poster, email ([§7](#7-scenarios))                                               |

`light_only` and `dark_only` cannot be combined. Brand colours are used exactly as given, so their contrast is whatever it is: the brief's contrast table reports it.

## 7. Scenarios

`scenario` says what is being designed. It is a constraint like the others: recorded in `roll.json` and in every brief, and needed again to reproduce a ref. The data lives in [`packages/core/src/data/scenarios.ts`](../packages/core/src/data/scenarios.ts) and is covered by `packages/core/test/scenarios.test.ts`.

| Scenario        | Byte 28 picks a format                                                       | Canvas                   | Density `t` range | Base text size      | Twist targets / operations removed      |
| --------------- | ---------------------------------------------------------------------------- | ------------------------ | ----------------- | ------------------- | --------------------------------------- |
| `web` (default) | — (byte 28 unused)                                                           | responsive page          | 0–1               | density base        | —                                       |
| `deck`          | full-bleed · index-rail · document                                           | 1920×1080, fixed         | 0–0.7             | density base × 2    | navigation, links / —                   |
| `app`           | tab-bar · top-tabs · single-flow · sheet                                     | 390×844 phone screens    | 0–0.7             | clamped to 16–17 px | footer / —                              |
| `dashboard`     | sidebar · top-nav · wall                                                     | 1440×900 viewport        | 0.3–1             | clamped to 13–15 px | footer / —                              |
| `poster`        | portrait 1080×1350 · square 1080×1080 · story 1080×1920 · link-card 1200×630 | the format's size, fixed | 0–1               | density base × 1.75 | navigation, links, footer / —           |
| `email`         | single-600 · banded-640 · digest                                             | 600 or 640 px column     | 0–0.7             | clamped to 16–17 px | navigation / vertical, rotate, off-grid |

How the bytes apply:

- **Unchanged.** Bytes 0–10, 12–25, 29 and 30 are read exactly as on the web, so a hash keeps its colours, faces, case, tracking, scale ratio, grid, anchor, motif, surface and voice in every scenario. Changing the scenario of a roll keeps its directions.
- **Rescaled.** Byte 11 is mapped into the scenario's `t` range, so density values (and the gutter and motif size, which are multiples of the unit) can differ from the web design of the same hash.
- **Filtered.** Twist targets and operations that make no sense for the scenario are removed before bytes 26 and 27 are read; a shorter list can move the pick.
- **Replaced.** `email` is static: no motion, as with `reduced_motion`.
- **New.** Byte 28 picks the scenario's format.
- **Derived.** The base text size scales or clamps the density's base size (table above). `--max-width` becomes the format width and fixed formats add `--canvas-width` / `--canvas-height`.

The brief gains a **Scenario** section: the format and canvas, the file and structure contract, how many slides / screens / artboards, how the layout, anchor and motion translate, plus the scenario's rules and must-nots. With a scenario brief, `critique_page` adds static checks of that contract (rule `scenario-<id>`).

`scenario: "web"` normalises away, so a web design is the same with or without it. Scenario data has its own fingerprint, `scenarioFingerprint()` = the first 12 hex digits of `sha256(JSON.stringify({ ALGORITHM, SCENARIOS }))`, currently `4b8c484cc50e`, written into every non-web brief as `scenario data`.

## 8. Reproducibility and the library fingerprint

A design is a pure function of `(hash, constraints, library)` (plus the scenario data for a non-web scenario). Same ref + same constraints + same scenario → the same brief, as long as the fingerprints match. Every brief and every `roll.json` records:

- `algorithm`: `hash-design/v2`. It changes only if the byte assignment or a formula changes.
- `library`: the first 12 hex digits of `sha256(JSON.stringify({ ALGORITHM, fonts, primitive lists, BYTE_MAP }))`, currently `bd20321c36ab`. It covers the font pools ([`data/fonts.ts`](../packages/core/src/data/fonts.ts)), the primitive lists ([`data/space.ts`](../packages/core/src/data/space.ts)) and the byte map. `mapping.test.ts` pins it, so an edit to any of them is a visible, deliberate change.

An edit to a list changes the fingerprint: an old ref still parses, but it may now map to a different design, so reproduce old refs with the version of hash-design whose fingerprint matches.

## 9. Worked example

Hash `6ebe9acd06cbf4810ad2989965b22bc39bd527084bdda2964f9f0d49eb25562d` (`seededHash("readme-demo", 0)`), no constraints. This is the trace `hash-design brief` prints:

| Bytes  | Hex     | Parameter                  | Rule                                         | Result                           |
| ------ | ------- | -------------------------- | -------------------------------------------- | -------------------------------- |
| 0+1    | `6e be` | hue                        | 0x6ebe = 28350; 28350/65536 × 360            | 155.73°                          |
| 2      | `9a`    | polarity · paper lightness | 154 ≥ 77 → light; L = 0.90 + 77/178 × 0.085  | light, L 0.937                   |
| 3      | `cd`    | paper chroma               | 205/255 × 0.045                              | 0.036                            |
| 4      | `06`    | accent chroma              | 0.07 + 6/255 × 0.16                          | 0.074                            |
| 5      | `cb`    | accent2 hue offset         | 30 + 203/255 × 300                           | +268.82°                         |
| 6      | `f4`    | display face               | 244 mod 98 = 48                              | Libre Franklin                   |
| 7      | `81`    | body face                  | 129 mod 62 = 5                               | Atkinson Hyperlegible            |
| 8      | `0a`    | display case · weight      | 10 mod 4 = 2; ⌊10/4⌋ mod 2                   | lower, 700                       |
| 9      | `d2`    | display tracking           | −0.04 + 210/255 × 0.24                       | 0.158em                          |
| 10     | `98`    | type scale ratio           | 1.067 + 152/255 × 0.551                      | 1.395                            |
| 11     | `99`    | density                    | t = 153/255                                  | t 0.6: base 15.5px, unit 6px     |
| 12     | `65`    | grid columns · gutter      | 3 + 101 mod 10; unit × (1 + ⌊101/10⌋ mod 4)  | 4 columns, 18px gutter           |
| 13     | `b2`    | text block span · start    | span 2/15, start 11/15                       | columns 2–3 of 4                 |
| 14     | `2b`    | first-screen height        | 45 + 43/255 × 55                             | 54%                              |
| 15     | `c3`    | sections · separator       | 3 + 195 mod 6; ⌊195/6⌋ mod 5                 | 6 sections, numbers              |
| 16     | `9b`    | anchor subject · size      | 155 mod 8; 25 + ⌊155/8⌋/31 × 75              | colour-block, 71%                |
| 17     | `d5`    | anchor position · rotation | x 5/15; (13 − 7.5)/7.5 × 8                   | x 0.33, 6°                       |
| 18     | `27`    | motif shape · size         | 39 mod 12; unit × (1 + ⌊39/12⌋ mod 8)        | stripes, 24px                    |
| 19     | `08`    | motif placement · angle    | 8 mod 4; ⌊8/4⌋ × 180/63                      | edges, 6°                        |
| 20     | `4b`    | radius · border            | RADII[75 mod 8]; ⌊75/8⌋ mod 4; ⌊75/32⌋ mod 4 | 0px radius, 1px dashed border    |
| 21     | `dd`    | shadow · texture           | 221 & 3; (221 >> 2) & 3; 3 + 13 × 0.6        | no shadow, dot-screen 10.8%      |
| 22     | `a2`    | motion property · duration | ⌊162/64⌋; (162 mod 64)/63 × 600              | clip-path, 320ms                 |
| 23     | `96`    | easing                     | 150 ≥ 32 → cubic-bezier from bits            | cubic-bezier(0.64, 0.8, 0.63, 1) |
| 24     | `4f`    | voice person · headline    | 79 mod 4; ⌊79/4⌋ mod 6                       | none, question                   |
| 25     | `9f`    | sentence length · register | 3 + (159 & 15); (159 >> 4)/15                | 18 words, register 0.6           |
| 26     | `0d`    | twist target               | 13 mod 9                                     | section-heads                    |
| 27     | `49`    | twist operation · amount   | 73 mod 10; ⌊73/10⌋                           | undersize, 7                     |
| 29     | `25`    | CJK display face           | 37 mod 14                                    | Noto Serif TC                    |
| 30     | `56`    | mono face                  | 86 mod 8                                     | Red Hat Mono                     |
| 28, 31 | `eb 2d` | (unused)                   | recorded, not used                           | —                                |

The solved palette: paper `#d8f2e0`, ink `#293d30`, muted `#5f6b63`, accent `#598c6c`, accent2 `#a47f5d`. The twist reads "Set the section headings at 0.52× the size it would normally get."

```bash
node packages/core/dist/bin.js brief 6ebe9acd06cbf4810ad2989965b22bc39bd527084bdda2964f9f0d49eb25562d
```

The same hash in every scenario (byte 11 = 153, byte 26 = 13, byte 27 = 73, byte 28 = 235). Colours, faces, grid, anchor, motif, surface and voice stay as above; only these change:

| Scenario  | Format (byte 28)       | Density t          | Base text | Twist (bytes 26, 27)                 | Motion           |
| --------- | ---------------------- | ------------------ | --------- | ------------------------------------ | ---------------- |
| web       | —                      | 0.6                | 15.5 px   | 13 mod 9 → section-heads, undersize  | clip-path, 320ms |
| deck      | 235 mod 3 → index-rail | 0.42 (range 0–0.7) | 33 px     | 13 mod 7 → cta, undersize            | clip-path, 320ms |
| app       | 235 mod 4 → sheet      | 0.42               | 16.5 px   | 13 mod 8 → labels, undersize         | clip-path, 320ms |
| dashboard | 235 mod 3 → top-nav    | 0.72 (range 0.3–1) | 15 px     | 13 mod 8 → labels, undersize         | clip-path, 320ms |
| poster    | 235 mod 4 → link-card  | 0.6                | 27 px     | 13 mod 6 → numbers, undersize        | clip-path, 320ms |
| email     | 235 mod 3 → banded-640 | 0.42               | 16.5 px   | 13 mod 8 → labels; 73 mod 7 → repeat | none (static)    |

```bash
node packages/core/dist/bin.js brief 6ebe9acd06cbf4810ad2989965b22bc39bd527084bdda2964f9f0d49eb25562d --scenario deck
```

## 10. What changed from `hash-design/v1`

`hash-design/v1` used bytes 0–1 to pick one of 40 hand-written genre "branches" (in six families), then bytes 2–13 to pick among each branch's three layouts, type pairings, palettes and so on, with a collision walk (`<hash>+<probe>` refs) that kept a roll's branches and families apart. A direction was therefore one of 40 named looks plus small variations.

v2 removes that layer entirely: no branches, no families, no genre names, no collision walk, no `+probe` refs, no `families` / `include_branches` / `exclude_branches` constraints, no `list_branches` / `get_branch` tools. Every byte drives a parameter directly, so the space is the product of the parameters above rather than 40 looks. v1 refs do not reproduce under v2; `parseRef` rejects `<hash>+<n>` with a message saying so. The four runs under [`examples/`](../examples) were made with v1 and are kept as records of real runs (see their READMEs).

## 11. Changing the mapping

- Adding or removing a font or a list entry changes the fingerprint (and what some hashes map to). Update the pinned value in `mapping.test.ts` in the same commit, and run `node scripts/verify-fonts.mjs` after editing the font pools (it checks every family resolves on Google Fonts).
- Changing which byte drives which parameter, or any formula, is an algorithm change and must bump `ALGORITHM` (for example to `hash-design/v3`).
