// The components a skin can style. Each entry names the root class, the
// variants, the states and the parts. The skin loader validates a skin's
// `components` against this and builds the CSS from it; kit.js builds the
// matching DOM. Class names: root `ui-<name>`, variant `ui-<name>--<v>`,
// part `ui-<name>__<part>`, state `is-<state>` (plus the native pseudo-class
// where there is one, so a live page reacts and the testbench can force it).

// state -> selector suffixes
export const STATES = {
  hover:    [':hover', '.is-hover'],
  pressed:  [':active', '.is-pressed'],
  focus:    [':focus-visible', '.is-focus'],
  disabled: [':disabled', '.is-disabled'],
  on:       ['.is-on'],
  selected: ['.is-selected'],
  open:     ['.is-open'],
  error:    ['.is-error'],
  bad:      ['.is-bad'],
  waiting:  ['.is-waiting'],
  lit:      ['.is-lit'],
  idle:     ['.is-idle'],
  dirty:    ['.is-dirty'],
};

const s = (str) => (str ? str.split(' ') : []);
const c = (name, { variants = '', states = '', parts = {} } = {}) => ({
  name, variants: s(variants), states: s(states),
  parts: Object.fromEntries(Object.entries(parts).map(([p, st]) => [p, { states: s(st) }])),
  group: null,
});

// group -> components. Order is the testbench's order.
const GROUPS = {
  Buttons: [
    c('button', { variants: 'primary ghost danger icon small', states: 'hover pressed focus disabled on', parts: { icon: '', label: '' } }),
    c('chip', { variants: 'small', states: 'hover on disabled', parts: { remove: 'hover' } }),
    c('seg', { parts: { item: 'hover on disabled' } }),
    c('switch', { states: 'on disabled focus', parts: { thumb: '' } }),
    c('mini', { variants: 'solo mute arm close', states: 'hover on' }),
    c('help', { states: 'hover on' }),
  ],
  Fields: [
    c('field', { variants: 'search code select', states: 'hover focus error disabled', parts: { icon: '', unit: '' } }),
    c('stepper', { states: 'focus', parts: { step: 'hover pressed', input: '', unit: '' } }),
    c('slider', { states: 'disabled', parts: { label: 'idle', track: '', fill: '', thumb: 'hover', value: 'hover' } }),
    c('colorwell', { states: 'hover selected' }),
    c('key', { states: 'hover waiting' }),
  ],
  Containers: [
    c('card', { variants: 'flat', parts: { head: '', title: '', sub: '', body: '' } }),
    c('section', { variants: 'when if then', parts: { head: '', body: '' } }),
    c('fold', { states: 'open', parts: { head: 'hover', chevron: '', title: '', sub: '', body: '' } }),
    c('heading', { parts: { icon: '' } }),
    c('row', { states: 'hover selected bad', parts: { thumb: '', mark: '', name: '', sub: '', end: '' } }),
    c('tile', { states: 'hover selected', parts: { pic: '', caption: '' } }),
    c('strip', { parts: { item: 'hover selected' } }),
  ],
  Navigation: [
    c('rail', { variants: 'compact', parts: { item: 'hover on', label: '', badge: '', sep: '' } }),
    c('topbar', { parts: { title: '', sub: '' } }),
    c('tabs', { parts: { tab: 'hover on' } }),
    c('bottomtabs', { parts: { tab: 'on', label: '' } }),
    c('toolbar', { parts: { tool: 'hover on', label: '' } }),
    c('sheet', { variants: 'side', parts: { head: '', title: '', body: '', grip: '' } }),
    c('drawer', { parts: { head: '', body: '' } }),
  ],
  Overlays: [
    c('scrim'),
    c('dialog', { variants: 'wide', parts: { head: '', title: '', body: '', foot: '' } }),
    c('menu', { parts: { item: 'hover disabled', shortcut: '', sep: '', group: '', danger: '' } }),
    c('toast', { variants: 'ok warn error', parts: { close: 'hover' } }),
    c('tooltip'),
  ],
  Feedback: [
    c('pill', { variants: 'ok warn error' }),
    c('callout', { variants: 'error warn info', parts: { icon: '', title: '' } }),
    c('badge', { variants: 'error muted' }),
    c('dot', { variants: 'ok warn error' }),
    c('progress', { variants: 'loop', parts: { track: '', fill: '', label: '' } }),
    c('boot', { parts: { title: '', track: '', fill: '', status: '', log: '', line: '' } }),
    c('log', { parts: { line: '', bad: '', ok: '' } }),
    c('empty', { parts: { icon: '', text: '' } }),
    c('kbd'),
  ],
  Audio: [
    c('transport', { parts: { button: 'hover on', display: '', rec: 'on' } }),
    c('meter', { variants: 'reduction', parts: { fill: '', peak: '', value: '' } }),
    c('keys', { parts: { white: 'pressed lit', black: 'pressed lit' } }),
    c('pad', { states: 'hover on selected lit', parts: { sub: '' } }),
  ],
  Icons: [
    c('icon', { variants: 'missing' }),
  ],
};

export const COMPONENTS = {};
for (const [group, list] of Object.entries(GROUPS)) for (const comp of list) { comp.group = group; COMPONENTS[comp.name] = comp; }
export const GROUP_ORDER = Object.keys(GROUPS);

// Style keys a skin may set on any element. Mirrors docs/UI_STYLES.md where
// the two overlap (bg, color, border, radius, padding, size, weight, image +
// slice), so a designer learns one vocabulary.
export const STYLE_KEYS = {
  bg: 'background', color: 'color', border: 'border', borderColor: 'border-color', borderWidth: 'border-width',
  borderBottom: 'border-bottom', borderTop: 'border-top', borderLeft: 'border-left', borderRight: 'border-right',
  radius: 'border-radius', padding: 'padding', margin: 'margin', gap: 'gap',
  height: 'height', minHeight: 'min-height', width: 'width', minWidth: 'min-width', maxWidth: 'max-width',
  font: 'font-family', size: 'font-size', weight: 'font-weight', lineHeight: 'line-height',
  case: 'text-transform', tracking: 'letter-spacing', align: 'text-align', italic: 'font-style',
  opacity: 'opacity', shadow: 'box-shadow', textShadow: 'text-shadow', outline: 'outline', outlineOffset: 'outline-offset',
  blur: 'backdrop-filter', iconSize: '--icon-size', transition: 'transition',
  image: null, slice: null, edge: null, repeat: null, // 9-slice, handled together
};
// Keys whose plain numbers are pixels.
export const PX_KEYS = new Set(['borderWidth', 'radius', 'padding', 'margin', 'gap', 'height', 'minHeight', 'width',
  'minWidth', 'maxWidth', 'size', 'outlineOffset', 'iconSize', 'blur']);
