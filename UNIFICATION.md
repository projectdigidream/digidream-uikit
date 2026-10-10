# Unifying the seven tools under one skin

Status: **proposal**. The kit, the format, the default skin and the testbench exist in `uikit/`. No tool wears the skin yet.

## 1. Where the tools stand today

The seven tools were built one at a time and look like seven products:

| | Studio | ThreeSprite | qPainter | DigidreamSound | DigidreamSynth | Packager |
|---|---|---|---|---|---|---|
| Accent | blue `#5b8fd6` | amber `#ffb454` + cyan | blue `#4f8cff` | blue `#5aa9ff` | blue `#64b5f6` | blue `#2f6fdb` |
| Modes | dark | dark | dark + light | dark | dark | light + dark |
| UI font | monospace, all of it | system | system 13px | system 14px | system 13px | system 15px |
| Icons | emoji / Unicode | SVG stroke set | emoji / Unicode | emoji / Unicode | Unicode | none |
| Radii | 8 / 10 / 14 / 18 | 8 / 12 | 4 / 8 | 8 / 10–16 | 5 / 6 | 8 / 10 / 12 |
| Playhead | (none) | amber | (none) | text colour | green | (none) |
| Selection | yellow `#ffe066` | amber | blue | accent tint | white outline | accent ring |
| Colours in | hard-coded CSS + JS | CSS variables | CSS variables | CSS variables + JS | CSS variables (copied 3×) + JS | CSS variables |

Some ideas are drawn differently in each tool:
- the marquee dash: `[5,3]` in ThreeSprite, `[4,4]` in qPainter;
- the onion-skin alpha: 35 % in ThreeSprite, 30 % in qPainter;
- the primary/secondary swatch outlines;
- the layer colours, which differ between DigidreamSound and DigidreamSynth;
- the palette import/export menus, the recent-files lists, and the play/pause frame counters.

Most tools also use the browser's own `alert` / `prompt` / `confirm` somewhere.

## 2. The unified look: what the default skin proposes

`skins/default/skin.json` is the unified proposal. Each line below is one token or key in it, so changing a decision means changing that value and watching the testbench.

1. **One accent: blue.** It means "active, on, primary".
   - It is the studio's `#5b8fd6` in dark mode and `#2f6fdb` in light.
   - ThreeSprite's amber and the other blues go.
2. **One selection colour: yellow** (`color.select`). It marks the thing selected on a canvas or in a list, which is a different job from the accent.
3. **One playhead colour: green** (`color.playhead`). It is used by every timeline: the DAW, the cutter, sound, and ThreeSprite's frames.
4. **Text:** the UI is in a sans font (`font.ui`); numbers, readouts, logs and code are in monospace (`font.mono`).
   - This changes the studio, which is monospace everywhere today.
5. **Two modes, dark and light, in every tool.** Dark is the default.
6. **Two pointer sizes in every tool:** 32px controls for a mouse and 44px for touch (`pointers.touch`).
7. **One icon set** on a 24px grid with a 1.75 stroke, tinted by the text colour. The ~210 ids are in `catalog/icons.json`.
8. **Radii:** 8 for controls, 10 for cards and rows, 12 for dialogs, 14 for sheets, round for pills.
9. **One list of layer colours** (`palettes.layers`) for DigidreamSound and DigidreamSynth, and one list of 16 track colours.
10. **Shared ideas drawn once:**
    - checker, pixel grid, marquee (`[5,3]`, white over black), onion (35 %), handles, labels, guides;
    - loop region, ruler, problem fill and warning fill.
    - These all live in `canvas.common`.
11. **No browser dialogs.** Every ask, confirm or choice is the `dialog` component.

**Your calls.** Items 1, 4 and 5 change how a tool feels the most. The testbench shows each of them in both modes; change the token and look.

## 3. How a tool wears a skin

The rule: **a skin is a source; tools ship a baked bundle.** This is the same rule as every other asset: sources only, bake at packaging.

```
skins/<name>/  --build.js-->  <name>.skin.js (one file, ~250 KB)  --runtime.js-->  the page
```

### 3.1 Standalone (each tool as its own product)

A tool vendors three files:
- `runtime.js` (about 120 lines, no imports);
- `kit.css` (structure only);
- a baked bundle (`node uikit/build.js default --js tool/vendor/default.skin.js`).

It needs no build step and has no dependency on the repo.

```js
import { applySkin } from './vendor/runtime.js'
import bundle from './vendor/default.skin.js'

const skin = applySkin(bundle, { mode: 'auto', pointer: 'auto' })   // follows the system
// canvas code asks the skin, never a hex literal:
ctx.strokeStyle = skin.canvas('common', 'playhead').color
skin.onChange(() => redrawCanvases())                              // mode / skin changed
```

- **CSS:** components are styled by the bundle's CSS through `ui-*` classes.
- **Tokens:** they are available as CSS variables (`var(--dnp-color-accent)`) for the tool's own CSS.
- **Icons:** `bundle.icons.urls['action.undo']` is a data URL. `kit.js` `icon(id)` builds the element; a React tool builds the same `<span class="ui-icon" style="--icon:url(…)">`.

### 3.2 Inside the studio (editors in iframes)

The studio already talks to its editors over the suite protocol (`suite-sdk.js`). One more message keeps an embedded editor in the studio's skin and mode.

> **Proposed, not built:** host → editor `{ t: 'skin', bundle, mode, pointer }`, sent after `init` and again whenever the user changes skin or mode.
> - An editor that understands it lists `'skin'` in the `caps` of its `ready`.
> - On the message it calls `skin.replace(bundle)`, then `skin.setMode(mode)` and `skin.setPointer(pointer)`.
> - An editor that does not know the message keeps its own baked default, which is the same skin anyway.

This changes `studio/src/plugins/protocol.js` and `docs/PLUGINS.md`, and adds one handler to each `suite-sdk.js` copy.

### 3.3 The game

The in-game UI is **not** part of this. Modules customise it through `docs/UI_STYLES.md`.

The two formats deliberately share key names (`bg`, `color`, `radius`, `image` + `slice`, `pressed`). A later "default game look" could be derived from a skin, but nothing does that now.

## 4. Adopting it, tool by tool

Every step ships on its own and leaves the tool working. The steps are in order of cost.

| Step | What changes | Cost |
|---|---|---|
| **S1 tokens** | the tool's own CSS variables become `--dnp-*`, and hard-coded hex values in CSS become variables | small: one stylesheet per tool |
| **S2 canvas** | hard-coded colours in canvas code become `skin.canvas(group, key)`, and canvases redraw `onChange` | medium: the files listed below |
| **S3 icons** | glyphs and emoji become `icon(id)` with catalog ids | medium: mechanical |
| **S4 components** | markup moves to `ui-*` classes, and native dialogs become `dialog` | large: per screen |
| **S5 brand** | app icon, wordmark, and the start screen as the `boot` component | small, once the art exists |

### Where each tool's look lives today

| Tool | Styles | Canvas colours (S2) | Icons (S3) | Notes |
|---|---|---|---|---|
| **Studio** | injected CSS strings: `src/ui.js`, `app/shell.js`, `graphwin.js`, `panelwin.js`, `screens.js`, `scene.js`, `plugins/frame.js`, `sections/*.js` | `viewport.js` `COLORS`, `graph.js`, `swing.js`, `thumbs.js`, `vfxlib.js`, `sections/{style,textures,sky}.js`, `main.js` `redraw()` | `main.js` / `home.js` section icons, `cards.js` triggers, `ui.js` tools, `fxlib.js`, `panelwin.js` | the most hard-coded; S1 means gathering the colours first |
| **ThreeSprite** | `src/App.css` `:root` (other repo, `~/ThreeSprite`) | `canvas/PixelCanvas.tsx`, `canvas/rigOverlay.tsx`, `timeline/Timeline.tsx`, `core/preview/scene.ts` | already has an SVG set (`ui/Icon.tsx`): map its names to catalog ids | React: S4 is class names in JSX; re-vendor into `studio/plugins/threesprite/app` |
| **qPainter** | `src/style.css` (other repo, `~/textureeditor`) | `src/view.ts`, `palette.ts`, `preview3d.ts` | `main.ts` `TOOLS` table | has a light mode already; heavy `alert`/`prompt` use |
| **DigidreamSound** | `sound/tool/sfx.html` `:root` | `sfx/waveform.js`, `layers.js`, `stage.js`, `play-tab.js`, `match.js` | `recipes.js` kinds, `app.js`, `controls.js` | standalone MIT product; its baked default ships inside it |
| **DigidreamSynth** | `midisynth/tool/{index,daw,cutter}.html`, the same variables copied 3× | `lib/{patch-editor,scope,cutter-panel,fit-panel}.js`, `daw/{arrange,pianoroll,master}.js`, `daw/project.js` track colours | Unicode in the HTML and the panels | S1 also removes the triple copy |
| **Packager** | `packager/index.html` inline `:root` (light + dark) | none | none yet | smallest: a good first tool |

### Suggested order

1. **Packager:** S1–S4 in one go. It is small, has variables and no canvas, and is the cheapest proof that the bundle works in a shipped tool.
2. **DigidreamSound:** S1, S2, S3. It already has variables, and its canvases are few.
3. **DigidreamSynth:** S1 (merging the three copies), S2, S3.
4. **Studio:** S1 starts with gathering every hard-coded colour; then S2, S3, S4 section by section. This is the biggest piece.
5. **qPainter** and **ThreeSprite** (other repos): S1–S3, then re-vendor. ThreeSprite's SVG icons can seed the catalog's drawing.
6. **The `skin` message** (3.2), once two embedded editors wear the skin.

## 5. Keeping it unified

- **One skin for all tools.** A tool never adds a colour of its own. When it needs one, the colour becomes a token or a canvas key in the default skin, and the testbench shows it.
- **One catalog of icons.** A new icon gets an id in `catalog/icons.json` first.
- **Components come from the registry.** A tool that needs a new kind of control adds it to `lib/registry.js`, `lib/kit.js`, the default skin and the testbench, in that order.
- **`node uikit/test/skin.test.js`** fails when a shipped skin has problems. It also fails when the testbench draws a canvas key the default skin lacks.
- **`node uikit/build.js`** refuses to bake a skin with problems, so a broken skin cannot ship.

## 6. Known limits of version 1

- **Bundle size.** A bundle carries all four mode × pointer CSS variants, about 45 KB each before icons, so roughly 250 KB in total. It can shrink later by emitting only the declarations that differ per variant.
- **Mode overrides are tokens only.** A component cannot differ between modes except through a token. This keeps every skin consistent, at the cost of a few more tokens.
- **Testbench screens are mock-ups.** They show the elements together; they are not the tools. The real check is a tool wearing the bundle.
