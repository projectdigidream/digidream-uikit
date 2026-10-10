// What the testbench shows, section by section. Each build(stage, view, ctx)
// fills one stage (one mode) with elements wearing the skin.

import * as k from '../lib/kit.js';
import { COMPONENTS, GROUP_ORDER } from '../lib/registry.js';
import { SCENES } from './scenes.js';
import { SCREENS } from './screens.js';

const { h } = k;
const cap = (t) => h('span', { class: 'tb-cap' }, t);
const hd = (t) => h('div', { class: 'tb-h' }, t);
const spec = (...kids) => h('div', { class: 'tb-spec' }, kids);
const col = (...kids) => h('div', { class: 'tb-spec col' }, kids);

/** A labelled grid: rows of [label, ...cells], with column headers. */
function matrix (cols, rows) {
  const m = h('div', { class: 'tb-matrix', style: { gridTemplateColumns: `max-content repeat(${cols.length}, max-content)` } });
  m.append(h('span'), ...cols.map(cap));
  for (const [label, ...cells] of rows) {
    m.append(cap(label), ...cells.map((c) => h('div', {}, c)));
    for (let i = cells.length; i < cols.length; i++) m.append(h('span'));
  }
  return m;
}

// ---------- canvases ----------

export function canvasCard (title, w, hgt, draw, view, note) {
  const c = h('canvas', { width: w * devicePixelRatio, height: hgt * devicePixelRatio, style: { aspectRatio: `${w} / ${hgt}`, maxWidth: `${w}px` } });
  const ctx = c.getContext('2d');
  ctx.scale(devicePixelRatio, devicePixelRatio);
  try { draw(ctx, w, hgt, view); } catch (e) { ctx.fillStyle = '#f0f'; ctx.fillText(String(e.message), 10, 20); console.error(title, e); }
  return h('div', { class: 'tb-canvas-card' }, h('div', { class: 'tb-cap', style: { fontSize: '11px' } }, title), c, note ? cap(note) : null);
}

// ---------- foundations ----------

function foundations (stage, v, { compiled }) {
  const toks = compiled.tokens[v.key];
  const colors = Object.entries(toks).filter(([n]) => n.startsWith('color.'));
  const groups = new Map();
  for (const [n, val] of colors) {
    const g = n.split('.').length > 2 ? n.split('.').slice(0, 2).join('.') : 'color';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push([n, val]);
  }
  for (const [g, list] of groups) {
    stage.append(hd(g === 'color' ? 'colour: singles' : g.replace('color.', 'colour: ')));
    stage.append(h('div', { class: 'tb-grid', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' } },
      list.map(([n, val]) => h('div', { class: 'tb-swatch' }, h('span', { style: { background: val } }), cap(n.replace('color.', '')), cap(String(val))))));
  }
  stage.append(hd('palettes'));
  const pals = compiled.palettes[v.key] ?? {};
  for (const [name, p] of Object.entries(pals)) {
    const list = Array.isArray(p) ? p.map((c, i) => [i, c]) : Object.entries(p);
    stage.append(h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' } }, h('span', { class: 'tb-cap', style: { width: '60px' } }, name),
      h('div', { style: { display: 'flex', flex: '1', borderRadius: '6px', overflow: 'hidden', height: '28px' } }, list.map(([n, c]) => h('span', { title: `${n} ${c}`, style: { flex: '1', background: c } })))));
  }
  stage.append(hd('type'));
  const sizes = Object.entries(toks).filter(([n]) => /^size\.(tiny|small|body|large|title|hero)$/.test(n));
  stage.append(col(
    ...sizes.map(([n, s]) => h('div', { style: { display: 'flex', gap: '16px', alignItems: 'baseline' } }, h('span', { class: 'tb-cap', style: { width: '80px' } }, `${n.slice(5)} ${s}`),
      h('span', { style: { fontFamily: toks['font.ui'], fontSize: `${s}px` } }, 'Room 3 · Door opens when crossed'),
      h('span', { style: { fontFamily: toks['font.mono'], fontSize: `${s}px`, color: toks['color.text.secondary'] } }, '1.2.480  −12.5 dB  64×64'))),
    h('div', { style: { display: 'flex', gap: '16px' } }, ...Object.entries(toks).filter(([n]) => n.startsWith('weight.')).map(([n, w]) => h('span', { style: { fontWeight: w } }, `${n.slice(7)} ${w}`)))));
  stage.append(hd('radii · shadows · spacing · hit sizes'));
  stage.append(spec(
    ...Object.entries(toks).filter(([n]) => n.startsWith('radius.')).map(([n, r]) => col(h('span', { style: { width: '64px', height: '44px', borderRadius: `${Math.min(r, 22)}px`, background: toks['color.bg.raised'], border: `1px solid ${toks['color.line.strong']}` } }), cap(`${n.slice(7)} ${r}`))),
    ...Object.entries(toks).filter(([n]) => n.startsWith('shadow.')).map(([n, s]) => col(h('span', { style: { width: '80px', height: '44px', borderRadius: '8px', background: toks['color.bg.overlay'], boxShadow: s } }), cap(n))),
  ));
  stage.append(spec(
    ...Object.entries(toks).filter(([n]) => n.startsWith('space.')).map(([n, s]) => col(h('span', { style: { width: `${s}px`, height: '16px', background: toks['color.accent'] } }), cap(`${n.slice(6)} ${s}`))),
    ...['size.hit', 'size.hitSmall', 'size.icon', 'size.iconSmall'].map((n) => col(h('span', { style: { width: `${toks[n]}px`, height: `${toks[n]}px`, border: `1px dashed ${toks['color.text.dim']}`, borderRadius: '4px' } }), cap(`${n.slice(5)} ${toks[n]}`)))));
  stage.append(hd('shared canvas patterns'));
  stage.append(h('div', { class: 'tb-canvas-grid' },
    canvasCard('checker · pixel grid · image border · marquee · cursor · handles', 420, 170, SCENES.patterns, v)));
}

// ---------- components ----------

const SPECIMENS = {
  button: () => matrix(['normal', 'hover', 'pressed', 'focus', 'on', 'disabled'],
    [[null, 'primary', 'ghost', 'danger', 'small'], ['icon']].flat().map((variant) => [variant ?? 'default',
      ...[null, 'hover', 'pressed', 'focus', 'on', 'disabled'].map((st) => variant === 'icon'
        ? k.iconButton('action.undo', { state: st }) : k.button('Save', { variant, state: st, icon: variant === 'small' ? 'action.add' : null }))])),
  chip: () => col(spec(k.chip('climbable'), k.chip('grapple', { state: 'hover' }), k.chip('blocking', { state: 'on' }), k.chip('trigger', { state: 'disabled' }), k.chip('impact', { remove: true }), k.chip('+ tag', { variant: 'small' }), k.chip('32', { variant: 'small', state: 'on' }))),
  seg: () => spec(k.seg(['Sounds', 'Mix & test'], 0), k.seg(['Noise', 'Tone', 'Metal'], 1), k.seg(['Quick', 'Good', 'Best'], 2)),
  switch: () => matrix(['off', 'on', 'focus', 'disabled'], [['switch', k.toggle(false), k.toggle(true), k.toggle(true, { state: 'focus' }), k.toggle(false, { state: 'disabled' })]]),
  mini: () => matrix(['off', 'hover', 'on'], ['solo', 'mute', 'arm', 'close'].map((vv) => [vv, ...[null, 'hover', 'on'].map((st) => k.mini({ solo: 'S', mute: 'M', arm: 'R', close: '✕' }[vv], vv, { state: st }))])),
  help: () => spec(k.help(), k.help({ state: 'hover' }), k.help({ state: 'on' })),
  field: () => col(
    matrix(['normal', 'hover', 'focus', 'error', 'disabled'], [
      ['text', ...[null, 'hover', 'focus', 'error', 'disabled'].map((st) => k.field({ value: 'door_east', state: st }))],
      ['search', ...[null, 'hover', 'focus'].map((st) => k.field({ placeholder: 'find a node: open, fog…', variant: 'search', icon: 'action.search', state: st }))],
      ['select', ...[null, 'hover', 'focus'].map((st) => k.field({ options: ['linear', 'ease in-out', 'step'], state: st }))],
      ['with unit', k.field({ value: '1200', unit: 'Hz' }), k.field({ value: '-6', unit: 'dB', state: 'focus' })],
    ]),
    (() => { const f = k.field({ variant: 'code', rows: 4 }); f.querySelector('textarea').value = 'function on_cross(p)\n  door.open("east")\nend'; return f; })()),
  stepper: () => spec(k.stepper('16', { unit: 'px' }), k.stepper('90', { unit: '°' }), k.stepper('1.5', { state: 'focus' })),
  slider: () => col(k.slider('Volume', 0.72), k.slider('Brightness', 0.5, { idle: true }), k.slider('Cutoff', 0.3, { fmt: (x) => `${Math.round(40 * 2 ** (x * 9))} Hz`, thumbState: 'hover' }), k.slider('Resonance', 0.1, { state: 'disabled' })),
  colorwell: () => spec(k.colorwell('#d65b5b'), k.colorwell('#5b8fd6', { state: 'hover' }), k.colorwell('#ffe066', { state: 'selected' }), k.colorwell('#7ad48a')),
  key: () => spec(k.key('SPACE'), k.key('E', { state: 'hover' }), k.key('', { state: 'waiting' }), k.kbd('⌘S'), k.kbd('Shift'), k.kbd('G')),

  card: () => h('div', { class: 'tb-grid', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' } },
    k.card('Snapshot · 14:02', [h('div', {}, 'before: bake textures'), spec(k.button('Restore', { variant: 'small' }), k.button('Delete', { variant: ['small', 'danger'] }))], { sub: '3 maps', actions: [k.iconButton('action.more', { variant: 'small' })] }),
    k.card('Flat card', [h('div', {}, 'No border, no background.')], { variant: 'flat' })),
  section: () => col(
    k.section('when', 'When · someone crosses', [h('div', {}, 'the line by the east door')]),
    k.section('if', 'If · they carry', [h('div', {}, 'the red key')]),
    k.section('then', 'Then · open door', [h('div', {}, 'east, slowly, then close after 4 s')])),
  fold: () => col(k.fold('Source', [k.slider('Level', 0.6), k.slider('Pitch', 0.4)], { sub: 'noise · white', open: true }), k.fold('Loudness over time', [h('div', {}, '…')], { sub: 'A 2 ms · D 180 ms' })),
  heading: () => col(k.heading('the module', 'section.home'), k.heading('to fix (2)', 'status.error')),
  row: () => col(
    k.row({ thumb: 'linear-gradient(135deg,#6b4a2a,#3a2a1a)', name: 'map01 · Entryway', sub: '24 rooms · 7 monsters' }),
    k.row({ mark: 'trigger.cross', name: 'Door east', sub: 'when crossed → open', state: 'hover' }),
    k.row({ mark: 'section.sounds', name: 'pistol_fire', sub: '0.42 s · 2 takes', state: 'selected' }),
    k.row({ mark: 'status.error', name: 'lift_b', sub: 'tag 7 has no sector', state: 'bad' })),
  tile: () => spec(k.tile('ROCKWALL1', 'repeating-linear-gradient(45deg,#5a4a3a 0 6px,#4a3a2a 6px 12px)'), k.tile('BRICK7', 'repeating-linear-gradient(0deg,#7a3a2a 0 8px,#3a1a10 8px 10px)', { state: 'hover' }), k.tile('SKY1', 'linear-gradient(#3a5a9a,#9ac0ff)', { state: 'selected' })),
  strip: () => k.strip(['#4a3a2a', '#5a4a3a', '#6a5a4a', '#5a4a3a', '#4a3a2a', '#3a2a1a'].map((c, i) => `linear-gradient(${i * 30}deg, ${c}, #222)`), 2),

  rail: () => spec(
    h('div', { style: { height: '330px', display: 'flex' } }, k.rail([{ icon: 'section.home', label: 'Starter' }, 'sep', { icon: 'section.maps', label: 'Maps', on: true }, { icon: 'section.monsters', label: 'Monsters', badge: 2 }, { icon: 'section.sounds', label: 'Sounds' }, { icon: 'section.music', label: 'Music' }, 'gap', { icon: 'maptool.play', label: 'Play' }])),
    h('div', { style: { height: '330px', display: 'flex' } }, k.rail([{ icon: 'section.home', label: 'Starter' }, 'sep', { icon: 'section.maps', label: 'Maps', on: true }, { icon: 'section.monsters', label: 'Monsters' }, { icon: 'section.sounds', label: 'Sounds' }, 'gap', { icon: 'maptool.play', label: 'Play' }], { variant: 'compact' }))),
  topbar: () => k.topbar('Monsters', { sub: 'imp · loads clean', left: [k.iconButton('action.back', { variant: 'ghost' })], right: [k.pill('saved', { variant: 'ok', i: 'status.ok' }), k.iconButton('action.undo', { variant: 'ghost' }), k.iconButton('action.redo', { variant: 'ghost' })] }),
  tabs: () => k.tabs(['Arrange', 'Track', 'Synth', 'Master', 'Cut & Loop', 'Cues'], 1),
  bottomtabs: () => h('div', { style: { width: '380px' } }, k.bottomtabs([{ icon: 'sprite.draw', label: 'Draw' }, { icon: 'sprite.rig', label: 'Rig' }, { icon: 'sprite.animate', label: 'Animate' }, { icon: 'sprite.view3d', label: '3D' }, { icon: 'sprite.export', label: 'Export' }], 0)),
  toolbar: () => k.toolbar(['select', 'room', 'place', 'triggers', 'camera', 'graph', 'play', 'more'].map((t) => ({ icon: `maptool.${t}`, label: t[0].toUpperCase() + t.slice(1) })), 1),
  sheet: () => h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' } },
    k.sheet('Wall', [k.slider('Thickness', 0.2), spec(k.chip('climbable', { state: 'on' }), k.chip('blocking'))]),
    k.sheet('Room 4', [k.slider('Floor', 0.3), k.slider('Ceiling', 0.7)], { variant: 'side' })),
  drawer: () => h('div', { style: { width: '360px' } }, k.drawer('Log', [k.log(['loaded bank (42 sounds)', '+baked in 120 ms', '!pistol_fire: too loud (-0.2 dB)'])])),

  scrim: () => h('div', { class: 'ui-scrim', style: { height: '260px', borderRadius: '10px' } }, k.dialog('Throw this map away?', 'map03 and its 2 snapshots go. This cannot be undone.', [k.button('Cancel'), k.button('Throw away', { variant: 'primary' })])),
  dialog: () => col(
    k.dialog('Name the new map', [k.field({ value: 'map04' })], [k.button('Cancel'), k.button('Create', { variant: 'primary' })]),
    k.dialog('Open textures with…', [h('div', {}, 'Wide variant: 720 px.')], [k.button('qPainter'), k.button('System editor')], { variant: 'wide' })),
  menu: () => spec(k.menu([{ group: 'file' }, { label: 'New', shortcut: '⌘N', icon: 'action.new' }, { label: 'Open…', shortcut: '⌘O', icon: 'action.open', state: 'hover' }, { label: 'Save', shortcut: '⌘S', icon: 'action.save' }, 'sep', { label: 'Export as WAV', icon: 'action.export', state: 'disabled' }, { label: 'Delete', icon: 'action.delete', danger: true }])),
  toast: () => h('div', { class: 'tb-spec col', style: { alignItems: 'flex-start' } }, k.toast('Rendering 4 of 12…'), k.toast('Saved to module', { variant: 'ok' }), k.toast('No kit for Windows', { variant: 'warn' }), k.toast('Build failed: see the log', { variant: 'error' })),
  tooltip: () => spec(k.tooltip('Undo (⌘Z)'), k.tooltip('Pick on map')),

  pill: () => spec(k.pill('3 rooms selected'), k.pill('baked', { variant: 'ok', i: 'status.ok' }), k.pill('2 warnings', { variant: 'warn', i: 'status.warning' }), k.pill('map rejected', { variant: 'error', i: 'status.error' })),
  callout: () => col(k.callout('error', 'Too loud', 'Peaks at +1.4 dB: it will clip in the game.', [k.button('Fix level', { variant: 'small' })]), k.callout('warn', null, 'Back up the signing key: without it, updates cannot install over this version.'), k.callout('info', null, 'Drag across the waveform to pick the part to match.')),
  badge: () => spec(k.badge(3), k.badge(12, { variant: 'error' }), k.badge('new', { variant: 'muted' })),
  dot: () => spec(k.dot(), cap('unsaved'), k.dot({ variant: 'ok' }), k.dot({ variant: 'warn' }), k.dot({ variant: 'error' })),
  progress: () => col(k.progress(0.62, { label: 'composing 25/40…' }), k.progress(0.3, { variant: 'loop', label: 'working…' })),
  boot: () => h('div', { style: { height: '300px', display: 'flex' } }, h('div', { style: { flex: '1', display: 'flex' } }, k.boot('Studio', 0.55, 'loading textures…', ['✓ core 120 ms', '✓ module 40 ms', '✓ maps 310 ms', 'textures…']))),
  log: () => k.log(['starting server on 8080', '+connected in 42 ms', 'map01 loaded (24 rooms)', '!script door.lua:12: attempt to index nil', 'exited']),
  empty: () => spec(h('div', { style: { width: '320px' } }, k.empty('section.panels', 'No panels yet. + new panel above.'))),
  kbd: () => spec(k.kbd('⌘'), k.kbd('Z'), k.kbd('Space'), k.kbd('Esc')),

  transport: () => col(k.transport({ display: '3.2.240' }), k.transport({ playing: true, rec: true, display: '12.1.000' })),
  meter: () => col(k.meter(0.42, { peak: 0.6, label: '−14.2 dB' }), k.meter(0.93, { peak: 0.97, label: '−0.6 dB' }), k.meter(0.25, { variant: 'reduction', label: 'GR −3 dB' })),
  keys: () => h('div', { style: { width: '420px' } }, k.keys(2, { pressed: [4, 7], lit: [0, 16] })),
  pad: () => spec(k.pad('Kick', '36'), k.pad('Snare', '38', { state: 'hover' }), k.pad('Hat', '42', { state: 'on' }), k.pad('Tom', '45', { state: 'selected' }), k.pad('Crash', '49', { state: 'lit' })),
  icon: () => spec(k.icon('action.undo'), k.icon('section.maps'), cap('an undrawn icon shows its fallback glyph with a dashed ring')),
};

function componentGroup (group) {
  return (stage, v) => {
    for (const comp of Object.values(COMPONENTS).filter((c) => c.group === group)) {
      stage.append(hd(`${comp.name}${comp.variants.length ? ` · variants: ${comp.variants.join(', ')}` : ''}`));
      stage.append((SPECIMENS[comp.name] ?? (() => cap('no specimen')))(v));
    }
  };
}

// ---------- icons ----------

function icons (stage, v, { catalog, compiled }) {
  const all = catalog.groups.flatMap((g) => g.icons.map(([n]) => `${g.id}.${n}`));
  const drawn = all.filter((id) => compiled.icons.urls?.[id]);
  stage.append(h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' } },
    h('strong', {}, `${drawn.length} of ${all.length} drawn`),
    h('div', { style: { flex: '1', maxWidth: '320px' } }, k.progress(drawn.length / all.length)),
    cap(`grid ${compiled.icons.grid ?? 24} · stroke ${compiled.icons.stroke ?? '—'} · ${compiled.icons.tint === false ? 'full colour' : 'tinted by text colour'}`)));
  for (const g of catalog.groups) {
    const n = g.icons.filter(([nm]) => compiled.icons.urls?.[`${g.id}.${nm}`]).length;
    stage.append(hd(`${g.label} · ${n}/${g.icons.length} · icons/${g.id}/ · used in ${g.used}`));
    stage.append(h('div', { class: 'tb-icons' }, g.icons.map(([nm, label]) => h('div', { class: 'tb-icon-cell', title: `${g.id}.${nm}` },
      h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } }, k.icon(`${g.id}.${nm}`, { size: 16 }), k.icon(`${g.id}.${nm}`, { size: 24 })),
      cap(label), cap(`${nm}.svg`)))));
  }
  stage.append(hd('in context'));
  stage.append(spec(k.button('Undo', { icon: 'action.undo' }), k.button('Play', { icon: 'transport.play', variant: 'primary' }), k.iconButton('action.settings'), k.iconButton('action.more', { variant: 'ghost' }), k.chip(h('span', { style: { display: 'inline-flex', gap: '6px', alignItems: 'center' } }, k.icon('weather.rain', { size: 14 }), 'rain'), { state: 'on' })));
}

// ---------- brand ----------

function brand (stage, v, { catalog, compiled }) {
  const b = compiled.brand ?? {};
  stage.append(hd('app icons (brand.icons.<app>) on the app background and on white'));
  stage.append(h('div', { class: 'tb-grid', style: { gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' } },
    catalog.brand.map(([id, label]) => {
      const url = b.icons?.[id];
      const pic = (bg) => h('div', { style: { width: '64px', height: '64px', borderRadius: '14px', background: url ? `${bg} url("${url}") center/contain no-repeat` : bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: url ? '' : '1px dashed #888', color: '#888', fontSize: '22px' } }, url ? null : label[0]);
      return col(spec(pic('var(--dnp-color-bg-app)'), pic('#ffffff')), cap(`${label}${url ? '' : ' · not drawn'}`));
    })));
  stage.append(hd('wordmarks (brand.wordmarks.<app>), as on a start screen'));
  stage.append(col(...catalog.brand.filter(([id]) => id !== 'game').map(([id, label]) => {
    const url = b.wordmarks?.[id];
    return h('div', { style: { height: '44px', display: 'flex', alignItems: 'center', gap: '12px' } },
      url ? h('img', { src: url, style: { height: '36px' } }) : h('span', { style: { fontSize: '22px', fontWeight: '700', opacity: '.35' } }, label), cap(url ? '' : 'not drawn'));
  })));
}

// ---------- problems ----------

function problems (stage, v, { compiled, chain }) {
  stage.append(hd(`skin chain: ${chain.map((l) => l.name).join(' → ')}`));
  if (!compiled.warnings.length) { stage.append(k.callout('info', 'No problems', 'Every key is known and every token resolves.')); return; }
  for (const w of compiled.warnings) stage.append(h('div', { class: 'tb-problem' }, w));
}

// ---------- canvases ----------

function canvasGroup (list) {
  return (stage, v) => stage.append(h('div', { class: 'tb-canvas-grid' }, list.map(([title, w, hh, fn, note]) => canvasCard(title, w, hh, fn, v, note))));
}

export const SECTIONS = [
  { id: 'foundations', title: 'Foundations', note: 'Tokens: every colour, palette, type size, radius, shadow and spacing step the skin defines. Components and canvases only refer to these.', build: foundations },
  { id: 'components', title: 'Components', note: 'Every component of the registry in its variants and states. States are forced with is-* classes; hover and press work live too.',
    parts: GROUP_ORDER.map((g) => ({ id: `comp-${g.toLowerCase()}`, title: g, build: componentGroup(g) })) },
  { id: 'icons', title: 'Icons', note: 'Every icon the tools need. Drop an SVG at skins/<skin>/icons/<group>/<name>.svg and it replaces the glyph here within a second.', build: icons },
  { id: 'canvas', title: 'Canvas overlays', note: 'What editors draw on their canvases, coloured from the skin\'s canvas section. Grouped by idea, not by tool: one playhead, one marquee, one checker for every tool.',
    parts: SCENES.groups.map((g) => ({ id: `cv-${g.id}`, title: g.title, build: canvasGroup(g.list) })) },
  { id: 'screens', title: 'Screens', note: 'Each tool\'s main screen built from the kit, to judge the elements together. Layouts are mock-ups, not the tools themselves.',
    parts: SCREENS.map((s) => ({ id: `sc-${s.id}`, title: s.title, build: s.build, stack: true })) },
  { id: 'brand', title: 'Brand', note: 'App icons and wordmarks: skin.brand.icons.<app> and skin.brand.wordmarks.<app>.', build: brand },
  { id: 'problems', title: 'Problems', note: 'What the compiler found wrong in the skin: unknown keys, missing tokens, bad references.', build: problems, pair: false },
];
