# uikit: one look for every Digidream tool

`uikit/` holds the shared look of the seven tools:
- the skin format;
- the component kit;
- the base skin, `claude`, which every other skin extends;
- a testbench that shows every element wearing a skin.

The in-game UI is not part of this; modules style it themselves (`docs/UI_STYLES.md`).

```
node uikit/serve.js          # then open http://localhost:8960/testbench/
node uikit/test/skin.test.js # compiler tests + every shipped skin must be clean
node uikit/build.js claude   # bake a skin into dist/claude.skin.json (add --js for an ES module)
```

## Testbench

The testbench shows every token, every component in every state, all ~210 icons, every canvas overlay the editors draw, a mock-up of each tool's main screen, the brand marks, and the skin's problems.

**Top bar:**
- **skin:** pick one of `skins/index.json`.
- **Open folder…:** load a skin folder from anywhere on disk. It may `extend` the served skins.
- **mode:** dark, light, or side by side.
- **pointer:** mouse or touch.
- **Bake bundle:** download the file a tool ships.

**Live reload:** while it is served by `serve.js`, the page reloads the skin within a second of any file under `skins/` changing. That includes `skin.json`, an icon you just saved, or a 9-slice PNG.

## Making a skin

1. Copy `skins/sample/` to `skins/<name>/`, set `"id"`, and add the name to `skins/index.json`.
2. Keep `"extends": "claude"` and override only what you change.
3. Draw icons into `icons/<group>/<name>.svg`. The Icons section counts how many are drawn.
4. Watch the Problems count in the top bar.

The format is in [SKIN_FORMAT.md](SKIN_FORMAT.md). How the tools adopt it is in [UNIFICATION.md](UNIFICATION.md).

## Files

| Path | What |
|---|---|
| `lib/registry.js` | the components, their variants, states and parts; the style keys |
| `lib/skin.js` | the compiler: loads a skin and what it extends, validates, resolves tokens, writes CSS and canvas specs |
| `lib/runtime.js` | what a tool carries: applies a compiled skin or bundle, answers canvas colours, follows mode and pointer |
| `lib/bake.js` | inlines every file of a compiled skin (browser and node) |
| `lib/kit.js`, `lib/kit.css` | DOM builders and structural CSS for the components |
| `catalog/icons.json` | every icon id, its meaning, where it is used, today's glyph |
| `skins/claude/` | the base skin and the unified proposal; every other skin extends it |
| `skins/paper/` | modern and light-first: warm paper, ink text, terracotta accent, soft shadows, serif headings, line icons; modes day and night |
| `skins/90s/` | desktop software of the late 90s: bevels, title bars, pixel icons; modes classic and night |
| `skins/ps1/` | late-90s 3D console menus: blue gradient windows, hand cursor, dither, scanlines; modes dark and console |
| `skins/sample/` | how a skin is made: a few tokens, 14 icons, a 9-slice button |
| `testbench/` | the page |
| `serve.js`, `build.js`, `test/` | dev server, baker, tests |
