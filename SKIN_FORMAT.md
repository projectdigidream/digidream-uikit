# Skin format (`dnp-skin`, version 1)

A skin is the whole look of the Digidream tools. It covers colours, type, shapes, every component in every state, every colour an editor draws on a canvas, the icons and the brand marks. Every tool wears the same skin. Making a new look means writing a new skin, not editing tools.

A skin is a folder:

```
skins/<name>/
  skin.json          the skin (this document)
  icons/<group>/<name>.svg   one file per icon, see "Icons"
  images/…           9-slice pictures, anything components point at
  fonts/…            font files
  brand/…            app icons and wordmarks
```

`skins/index.json` lists the skins the testbench offers.

There are two ways to use a skin:
- The testbench compiles it live from the folder.
- `node uikit/build.js <name>` **bakes** it into one self-contained file, which is what a tool ships (see [UNIFICATION.md](UNIFICATION.md)).

## Top level

```json
{
  "format": "dnp-skin",
  "version": 1,
  "id": "night",
  "name": "Night",
  "about": "One line for people choosing a skin.",
  "extends": "default",
  "fonts":      [ … ],
  "tokens":     { … },
  "modes":      { "dark": { … }, "light": { … } },
  "pointers":   { "touch": { … } },
  "palettes":   { … },
  "components": { … },
  "canvas":     { … },
  "icons":      { … },
  "brand":      { … }
}
```

Every key except `format` and `version` is optional. An unknown key is reported as a problem and ignored.

## `extends`: start from another skin

`"extends": "default"` names a sibling skin folder. The two are merged key by key:
- objects merge;
- anything else (strings, numbers, arrays) is replaced by the child's value;
- `null` deletes the inherited key.

Chains are allowed (`a` → `b` → `default`), loops are reported.

A file path is resolved against the skin that **wrote** it. A parent's 9-slice picture stays in the parent's folder.

The child looks for an icon in its own folder first, then in each parent in turn. A new skin can therefore draw ten icons and inherit the other two hundred.

Every shipped skin should extend `default`, which defines every key.

## `tokens`: named values

Tokens are a free tree of names and values. Everything else in the skin refers to them, so a token change shows up everywhere it is used.

```json
"tokens": {
  "color":  { "bg": { "app": "#0b0d12", "panel": "#12161e" }, "accent": "#5b8fd6" },
  "font":   { "ui": "Inter, system-ui, sans-serif", "mono": "ui-monospace, Menlo, monospace" },
  "size":   { "body": 14, "hit": 32 },
  "radius": { "control": 8 },
  "shadow": { "menu": "0 12px 40px rgba(0,0,0,.5)" }
}
```

### References: `$path` and `$path/NN`

Any string anywhere in the skin can contain references:

| Written | Becomes |
|---|---|
| `"$color.accent"` | the token's value; a bare reference keeps its type, so `"$size.hit"` is the number 32 |
| `"$color.accent/55"` | the colour at 55 % of its opacity (needs a `#hex` or `rgb()` colour) |
| `"1px solid $color.line.main"` | references inside a longer string |
| `"0 0 0 3px $color.accent/25"` | ditto, with alpha |

Tokens may refer to tokens. A missing token or a loop is reported as a problem, never a crash.

### The token names the default skin defines

Tools and canvases refer to these names, so a skin that extends `default` keeps them all. A skin can add its own names freely.

- **`color.bg.*`**: the surfaces, from back to front:
  - `app`, then `rail`, `panel`, `raised`, `hover`, `input`, `overlay`, `code`;
  - `sunken` is canvases and stages.
- **`color.line.*`**: `soft`, `main`, `strong`.
- **`color.text.*`**: `primary`, `secondary`, `dim`, `inverse` (text on a solid accent or a light chip).
- **Single colours:**
  - `color.accent`, `accentHover`, `accentInk`: the one "active / on / primary" colour, and the text that sits on it;
  - `color.select`: what is selected on a canvas or in a list;
  - `color.playhead`: "now", in every timeline;
  - `color.ok`, `warn`, `error`, `info`;
  - `color.guide` (symmetry lines, the pivot cross);
  - `color.wave`;
  - `color.scrim`.
- **Category colours:** `color.tone.{when,if,then}`, `color.node.{event,condition,action,flow,data,camera}`, `color.marker.{spawn,light,monster,prop}`, `color.path`, `color.pathActive`, `color.checker.{a,b}`, `color.keys.{white,black}`.
- **`font.ui`, `font.mono`**: UI text, and numbers/logs/code.
- **`size.*`**: `tiny small body large title hero`, plus `hit` and `hitSmall` (control heights) and `icon` and `iconSmall`.
- **Other scales:** `weight.{normal,strong,heavy}`, `radius.{small,control,card,dialog,sheet,pill}`, `space.{xs,sm,md,lg,xl}`, `shadow.{raised,menu,sheet,toast}`, `motion.fast`.

## `modes` and `pointers`: variants of the tokens

```json
"modes":    { "dark": {}, "light": { "color": { "bg": { "app": "#f4f5f8" }, "accent": "#2f6fdb" } } },
"pointers": { "touch": { "size": { "hit": 44, "body": 15 } } }
```

- **`modes`** lists the colour modes the skin offers. The **first one is the default**. Each value overrides tokens, and only tokens. Components and canvases follow because they refer to tokens.
  - To make a component or canvas colour differ between modes, give it a token.
  - A skin with only `dark` simply has no light mode.
- **`pointers`** works the same way for the input device: `mouse` is the base, and `touch` overrides tokens (bigger hit sizes, bigger text).
- The compiler produces every combination: `dark/mouse`, `dark/touch`, `light/mouse`, `light/touch`.
- A tool picks one, or follows the system with `auto` (`prefers-color-scheme`, `pointer: coarse`).

## `components`: the kit

Each key is a component from the registry (`lib/registry.js`). The testbench's Components section shows all of them with their variants and states.

| Group | Components |
|---|---|
| Buttons | `button` `chip` `seg` `switch` `mini` `help` |
| Fields | `field` `stepper` `slider` `colorwell` `key` |
| Containers | `card` `section` `fold` `heading` `row` `tile` `strip` |
| Navigation | `rail` `topbar` `tabs` `bottomtabs` `toolbar` `sheet` `drawer` |
| Overlays | `scrim` `dialog` `menu` `toast` `tooltip` |
| Feedback | `pill` `callout` `badge` `dot` `progress` `boot` `log` `empty` `kbd` |
| Audio | `transport` `meter` `keys` `pad` |
| Icons | `icon` |

A component block holds four kinds of key:

```json
"button": {
  "height": "$size.hit", "bg": "$color.bg.raised", "radius": "$radius.control",   ← style keys
  "hover":    { "bg": "$color.bg.hover" },                                          ← states
  "disabled": { "opacity": 0.4 },
  "icon":     { "color": "$color.text.secondary" },                                 ← parts
  "variants": {                                                                     ← variants
    "primary": { "bg": "$color.accent", "hover": { "bg": "$color.accentHover" } }
  }
}
```

- **Style keys:** the look of the element itself.
- **States:**
  - a state's block applies while the element is in that state;
  - the states a component has are listed in the registry, and the problems list names them when one is wrong;
  - `hover`, `pressed`, `focus` and `disabled` follow the real pointer and keyboard;
  - the others (`on`, `selected`, `open`, `error`, `bad`, `waiting`, `lit`, `idle`, `dirty`) are set by the tool.
- **Parts:**
  - named pieces inside the component, e.g. `slider` has `label track fill thumb value`, and `seg` has `item`;
  - a part can have states of its own (`"item": { "on": { … } }`);
  - a root state can restyle a part: `"open": { "head": { … } }` styles the head while the fold is open.
- **`variants`:**
  - named kinds of the component (`primary`, `danger`, `small`, …);
  - a variant block has the same shape as the component block (style keys, states, parts), but no variants of its own;
  - **a variant overrides the base**: the base's values still apply where the variant sets nothing.
  - So a variant that changes `bg` should also give its `hover` a `bg`, or hovering it keeps the variant colour.

### Style keys

The names are the ones `docs/UI_STYLES.md` uses for in-game panels, so there is one vocabulary to learn.

| Key | Meaning | Numbers are |
|---|---|---|
| `bg` | background: a colour or any CSS background (gradients allowed) | |
| `color` | text and icon colour | |
| `border`, `borderTop`, `borderRight`, `borderBottom`, `borderLeft` | CSS border shorthand, e.g. `"1px solid $color.line.main"` | |
| `borderColor`, `borderWidth` | one aspect of the border | px |
| `radius` | corner radius; an array of 4 is top-left, top-right, bottom-right, bottom-left | px |
| `padding`, `margin` | one number, `[vertical, horizontal]` or `[top, right, bottom, left]` | px |
| `gap` | space between children | px |
| `height`, `minHeight`, `width`, `minWidth`, `maxWidth` | size | px |
| `font` | font family (usually `$font.ui` or `$font.mono`) | |
| `size`, `weight`, `lineHeight` | text size, weight, line height | size in px |
| `case` | `uppercase`, `lowercase`, `none`, `small-caps` | |
| `tracking` | letter spacing | em |
| `align` | text alignment | |
| `italic` | `true` / `false` | |
| `opacity` | 0..1 | |
| `shadow`, `textShadow` | CSS shadows | |
| `outline`, `outlineOffset` | focus and selection rings | offset in px |
| `blur` | blur what is behind (frosted glass) | px |
| `iconSize` | size of icons inside, inherited | px |
| `transition` | CSS transition, e.g. `"background $motion.fast"` | |
| `image`, `slice`, `edge`, `repeat` | a **9-slice picture**, see below | |

There is no raw-CSS escape hatch on purpose: everything a skin says must also make sense to a tool that is not a web page.

### 9-slice pictures

```json
"variants": { "primary": { "image": "images/button-primary.png", "slice": 6, "bg": "transparent" } }
```

- **`image`:** a PNG or SVG in the skin folder.
- **`slice`:** the insets in the picture's pixels, given as one number, `[vertical, horizontal]` or `[top, right, bottom, left]`.
  - The corners stay as drawn, the edges stretch along their length, and the middle fills the box.
- **`edge`:** how wide the drawn border is on screen, in px. It defaults to `slice`.
- **`repeat`:** `stretch` (default), `repeat` or `round`.
- A state can swap the picture, e.g. `"pressed": { "image": "images/button-primary-down.png", "slice": 6 }`.

## `canvas`: what editors draw

Everything an editor paints itself is listed here, grouped **by idea, not by tool**: one playhead, one marquee, one checker, one loop region for every tool.

```json
"canvas": {
  "common":   { "playhead": { "color": "$color.playhead", "width": 2 }, "checker.a": { "fill": "$color.checker.a", "size": 8 }, … },
  "map":      { … },  "graph":    { … },  "preview": { … },  "designer": { … },
  "rig":      { … },  "timeline": { … },  "paint":   { … },  "audio":    { … }
}
```

**Groups:**

| Group | What it holds | Used by |
|---|---|---|
| `common` | stage, checker, pixel grid, image border, marquee, onion skin, cursors, handles, labels, grids, guides, selection, playhead, loop region, ruler, problem and warning fills | every tool |
| `map` | rooms, corners, walls, markers, triggers, camera paths, metamap seams | the studio's map editor |
| `graph` | nodes and their headers, pins, wires, bend points, and state cards with their edges | the studio's graph and state graph |
| `preview` | the studio's small previews: floor, swing, thumbnails, 9-slice guides, sheet cutter | the studio |
| `designer` | device frame, safe area, panels, slots, HUD hit-boxes, touch buttons | the studio's panels and screens designers |
| `rig` | ground line, mirror axis, bones, pivot cross, facing arrow | ThreeSprite |
| `timeline` | keyframe rows, the current frame, keys | ThreeSprite |
| `paint` | tile grid, symmetry guides, wrap dimming, skybox guides | qPainter |
| `audio` | waveforms, envelopes, scope, spectrum, EQ, lanes, notes, piano keys, the engine field, the signal flow | DigidreamSound and DigidreamSynth |

**Entries:**
- An entry is a colour string, a number, or an object with any of these keys:
  - `color` (stroke or text), `fill`, `width` (line width), `dash` (e.g. `[5, 3]`);
  - `size` (handle or dot size), `radius`, `font` (a CSS font, e.g. `"600 11px $font.ui"`), `alpha` (0..1, for things drawn faded).
- A plain colour string sets both `color` and `fill`.
- The default skin's `canvas` section is the complete list of keys. The testbench's Canvas section draws every one of them.
- A tool that asks for a key the skin lacks gets bright magenta, so a gap is seen, not hidden.

## `palettes`: lists of colours

```json
"palettes": { "tracks": ["#64b5f6", …16], "layers": [ … 4 ], "notes": { "slate": "#5d6b82", "blue": "#3f6fb5", … } }
```

- **`tracks`:** DAW track colours, 16.
- **`layers`:** sound and patch layers, 4. This is the same list in DigidreamSound and DigidreamSynth.
- **`notes`:** the graph editor's note colours, by name.

Values can be token references.

## `icons`

```json
"icons": { "dir": "icons", "ext": "svg", "tint": true, "grid": 24, "stroke": 1.75, "files": { "action.undo": "special/undo.svg" } }
```

- **Ids:** every icon a tool needs is listed in `catalog/icons.json`, about 210 of them in 17 groups. An id is `<group>.<name>`, e.g. `action.undo`, `section.maps` or `sfx.explosion`.
- **Where the file goes:** icon `group.name` is drawn at `<dir>/<group>/<name>.<ext>`, so `icons/action/undo.svg`. `files` can point one id at another path.
- **Undrawn icons:** an icon that is drawn nowhere in the chain shows the glyph the tools use today, with a dashed ring in the testbench.
- **`tint: true`** (default): the icon is used as a mask and painted in the text colour.
  - Draw it in one colour on a transparent background; the colour you draw in does not matter.
  - Icons then follow every state (hover, on, disabled) and both modes.
- **`tint: false`:** the picture is shown as drawn, multi-colour. This suits pixel-art icons.
- **`grid`, `stroke`:** what the set is drawn at, for people drawing new icons. A 24×24 viewBox and a 1.75 stroke keep the set even.

SVG is preferred. PNG works too (`"ext": "png"`); draw it at least 2× the largest size it is shown at (`size.icon` × 2).

## `fonts`

```json
"fonts": [ { "family": "Inter", "file": "fonts/inter-var.woff2", "weight": "100 900" } ]
```

Same shape as `docs/UI_STYLES.md`.
- `family`: what `font.*` tokens name.
- `file`: relative to the skin.
- `weight` and `style`: optional.

Formats: woff2, woff, ttf, otf. A font that fails to load falls back to the next family in the token's list.

## `brand`

```json
"brand": {
  "icons":     { "studio": "brand/studio.svg", "threesprite": "brand/threesprite.svg", "qpainter": "…", "sound": "…", "synth": "…", "packager": "…", "game": "…" },
  "wordmarks": { "studio": "brand/studio-word.svg", … }
}
```

- **`icons`:** the app icons, one per tool plus `game` (the icon a packaged game gets when its module has none).
- **`wordmarks`:** for start screens.

The testbench shows both on the app background and on white.

## Problems

The compiler never refuses a skin: it draws what it can and lists the problems. The testbench shows them in its Problems section and as a count in its top bar. `build.js` refuses to bake a skin that has any. Each problem names its path, for example:

```
components.button.variants.huge: button has no variant "huge" (has: primary, ghost, danger, icon, small)
tokens.color.panel: no token "color.bg.panle"
canvas.map.marker: unknown key "colr"
```

## What a compiled skin is

`lib/skin.js` `compile()` turns the source into plain data:
- a CSS text for each mode/pointer pair, plus the token CSS variables (`--dnp-color-bg-app` …);
- the resolved canvas specs, palettes and tokens;
- the icon URLs and the brand.

`build.js` inlines every file as a `data:` URL; that is the **bundle**. `lib/runtime.js` applies a compiled skin or a bundle to a page. A tool needs nothing else.
