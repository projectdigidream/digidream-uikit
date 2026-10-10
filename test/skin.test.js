// node uikit/test/skin.test.js — the compiler: merge, tokens, alpha, modes,
// pointers, extends, validation, CSS for variants/states/parts, canvas, bake.
// Also compiles every shipped skin and requires it to be clean.

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { merge, flatten, makeResolver, parseColor, loadChain, compile, componentCss, declarations } from '../lib/skin.js';
import { bake } from '../lib/bake.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;
const test = async (name, fn) => { try { await fn(); n++; } catch (e) { console.error(`FAIL ${name}\n`, e); process.exitCode = 1; } };
const memSource = (skins) => ({ read: async (p) => { const m = /^skins\/([^/]+)\/skin\.json$/.exec(p); return m && skins[m[1]] ? JSON.stringify(skins[m[1]]) : null; } });

await test('merge: objects merge, arrays replace, null deletes', () => {
  assert.deepEqual(merge({ a: { b: 1, c: 2 }, d: [1, 2], e: 1 }, { a: { c: 3 }, d: [9], e: null }), { a: { b: 1, c: 3 }, d: [9] });
});

await test('tokens: refs, nested refs, alpha, type kept for bare refs', () => {
  const warn = [];
  const r = makeResolver(flatten({ color: { a: '#336699', b: '$color.a' }, radius: { r: 8 } }), (m) => warn.push(m));
  assert.equal(r.resolve('$color.b'), '#336699');
  assert.equal(r.resolve('$color.a/50'), 'rgba(51,102,153,0.5)');
  assert.equal(r.resolve('$radius.r'), 8);
  assert.equal(r.resolve('1px solid $color.b'), '1px solid #336699');
  assert.equal(r.resolve('0 0 0 3px $color.a/25'), '0 0 0 3px rgba(51,102,153,0.25)');
  assert.deepEqual(warn, []);
  r.resolve('$color.nope');
  assert.match(warn[0], /no token "color.nope"/);
});

await test('tokens: a loop is reported, not hung', () => {
  const warn = [];
  const r = makeResolver(flatten({ a: '$b', b: '$a' }), (m) => warn.push(m));
  r.resolve('$a');
  assert.ok(warn.some((m) => /refers to itself/.test(m)));
});

await test('colours: hex forms and rgba parse', () => {
  assert.deepEqual(parseColor('#fff'), [255, 255, 255, 1]);
  assert.deepEqual(parseColor('#00000080').slice(0, 3), [0, 0, 0]);
  assert.deepEqual(parseColor('rgba(1,2,3,.5)'), [1, 2, 3, 0.5]);
  assert.equal(parseColor('hsl(1,2%,3%)'), null);
});

await test('css: variants, states (pseudo + forced class), parts, part states', () => {
  const css = componentCss({
    button: { bg: '#111', hover: { bg: '#222' }, icon: { color: '#333' }, variants: { primary: { bg: '#444', hover: { bg: '#555' } } } },
    seg: { item: { on: { bg: '#666' } } },
  }, 'S');
  assert.match(css, /S \.ui-button \{ background: #111; \}/);
  assert.match(css, /S \.ui-button:hover,\nS \.ui-button\.is-hover \{ background: #222; \}/);
  assert.match(css, /S \.ui-button \.ui-button__icon \{ color: #333; \}/);
  assert.match(css, /S \.ui-button\.ui-button--primary:hover/);
  assert.match(css, /S \.ui-seg \.ui-seg__item\.is-on \{ background: #666; \}/);
  // variant rules come after base state rules, so a variant wins at equal specificity
  assert.ok(css.indexOf('ui-button--primary {') > css.indexOf('.ui-button.is-hover'));
});

await test('css: 9-slice image', () => {
  const d = declarations({ image: 'x.png', slice: [4, 6], radius: 2 }).join('; ');
  assert.match(d, /border-image-slice: 4 6 4 6 fill/);
  assert.match(d, /border-image-width: 4px 6px 4px 6px/);
  assert.match(d, /border-radius: 2px/);
});

await test('compile: modes and pointers override tokens; canvas follows', async () => {
  const skin = {
    tokens: { color: { a: '#000000' }, size: { hit: 30 } },
    modes: { dark: {}, light: { color: { a: '#ffffff' } } },
    pointers: { touch: { size: { hit: 44 } } },
    components: { button: { height: '$size.hit', bg: '$color.a' } },
    canvas: { common: { playhead: { color: '$color.a', width: 2 } } },
  };
  const c = compile(skin);
  assert.deepEqual(c.modes, ['dark', 'light']);
  assert.deepEqual(c.pointers, ['mouse', 'touch']);
  assert.match(c.css['light/touch'], /height: 44px; background: #ffffff/);
  assert.match(c.css['dark/mouse'], /height: 30px; background: #000000/);
  assert.equal(c.canvas['light/mouse'].common.playhead.color, '#ffffff');
  assert.equal(c.canvas['dark/mouse'].common.playhead.width, 2);
  assert.deepEqual(c.warnings, []);
});

await test('fonts: @font-face, and ligatures: false reaches the root rule', () => {
  const c = compile({ fonts: [{ family: 'Px', file: 'f.ttf', weight: '400 700', ligatures: false }] });
  assert.match(c.fontCss, /font-family: "Px"; src: url\("f.ttf"\); font-weight: 400 700/);
  assert.match(c.css["dark/mouse"], /\{ font-variant-ligatures: none; /);
  assert.doesNotMatch(compile({}).css['dark/mouse'], /ligatures/);
});

await test('validation names what is wrong', () => {
  const c = compile({ colour: {}, components: { buton: {}, button: { bgg: 1, variants: { huge: {} }, hover: { nope: 1 } } }, canvas: { map: { x: { colr: 1 } } } });
  const all = c.warnings.join('\n');
  for (const want of ['unknown top-level key "colour"', 'components.buton: no such component', 'components.button: unknown key "bgg"',
    'has no variant "huge"', 'components.button.hover: unknown key "nope"', 'canvas.map.x: unknown key "colr"']) assert.ok(all.includes(want), want);
  assert.match(compile({ canvas: { map: { x: '#ff0000/25' } } }).warnings.join(), /alpha \(\/NN\) needs a \$token/);
});

await test('extends: child over parent, files rebased to their own skin, loops caught', async () => {
  const src = memSource({
    base: { tokens: { color: { a: '#111111', b: '#222222' } }, components: { button: { image: 'img/b.png' } }, brand: { icons: { studio: 'brand/s.svg' } } },
    kid: { extends: 'base', tokens: { color: { a: '#999999' } }, icons: { files: { 'action.undo': 'my/undo.svg' } } },
    loop1: { extends: 'loop2' }, loop2: { extends: 'loop1' },
  });
  const { merged, chain } = await loadChain('kid', src);
  assert.deepEqual(chain.map((l) => l.name), ['kid', 'base']);
  assert.equal(merged.tokens.color.a, '#999999');
  assert.equal(merged.tokens.color.b, '#222222');
  assert.equal(merged.components.button.image, 'skins/base/img/b.png');
  assert.equal(merged.brand.icons.studio, 'skins/base/brand/s.svg');
  assert.equal(merged.icons.files['action.undo'], 'skins/kid/my/undo.svg');
  const w = [];
  await loadChain('loop1', src, w);
  assert.ok(w.some((m) => /makes a loop/.test(m)));
});

await test('modes: a child can replace its parent\'s modes with null', async () => {
  const src = memSource({ base: { modes: { dark: {}, light: { color: { a: '#fff' } } } }, kid: { extends: 'base', tokens: { color: { a: '#000' } }, modes: { dark: null, light: null, classic: {}, night: { color: { a: '#111' } } } } });
  const { merged } = await loadChain('kid', src);
  const c = compile(merged);
  assert.deepEqual(c.modes, ['classic', 'night']);
  assert.equal(c.tokens['classic/mouse']['color.a'], '#000');
});

await test('bake inlines every file and reports missing ones', async () => {
  const c = compile({ components: { button: { image: 'a.svg', slice: 2 } } });
  c.icons = { urls: { 'action.undo': 'u.svg', 'action.redo': 'gone.svg' } };
  const { bundle, missing } = await bake(c, async (url) => (url === 'gone.svg' ? null : new TextEncoder().encode('<svg/>')));
  assert.match(bundle.css['dark/mouse'], /url\("data:image\/svg\+xml;base64,/);
  assert.match(bundle.icons.urls['action.undo'], /^data:image\/svg\+xml;base64,/);
  assert.deepEqual(missing, ['gone.svg']);
});

await test('every shipped skin compiles clean', async () => {
  const { skins } = JSON.parse(await readFile(join(ROOT, 'skins/index.json'), 'utf8'));
  const dirs = (await readdir(join(ROOT, 'skins'), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  assert.deepEqual([...skins].sort(), [...dirs].sort(), 'skins/index.json lists every skin folder');
  const src = { read: (p) => readFile(join(ROOT, p), 'utf8').catch(() => null) };
  for (const name of skins) {
    const warnings = [];
    const { merged } = await loadChain(name, src, warnings);
    const c = compile(merged, { warnings });
    assert.deepEqual(c.warnings, [], `${name}: ${c.warnings.join('; ')}`);
  }
});

await test('the claude skin (the base) defines every canvas key the testbench draws', async () => {
  const scenes = await readFile(join(ROOT, 'testbench/scenes.js'), 'utf8') + await readFile(join(ROOT, 'testbench/screens.js'), 'utf8');
  const used = new Set([...scenes.matchAll(/C\(v, '(\w+)', '([\w.]+)'\)/g)].map((m) => `${m[1]}.${m[2]}`));
  const def = JSON.parse(await readFile(join(ROOT, 'skins/claude/skin.json'), 'utf8'));
  const missing = [...used].filter((k) => { const [g, ...rest] = k.split('.'); return !(rest.join('.') in (def.canvas[g] ?? {})); });
  assert.deepEqual(missing, []);
});

console.log(`${n} skin tests passed`);
