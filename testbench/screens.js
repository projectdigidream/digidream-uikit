// Each tool's main screen, rebuilt from the kit to judge the elements
// together. Mock-ups: the layout follows the real tool closely enough to
// read, nothing more. Layout uses inline styles; colours only ever come from
// the skin (components, canvas specs, or --dnp-* token variables).

import * as k from '../lib/kit.js';
import { DRAW } from './scenes.js';

const { h } = k;
const T = (name) => `var(--dnp-${name.replace(/\./g, '-')})`;
// Only boxes that grow (flex: 1) may shrink below their content; everything
// else keeps its size inside scrolling sidebars.
const flex = (dir, style, ...kids) => h('div', { style: { display: 'flex', flexDirection: dir, minWidth: '0', ...(style.flex ? { minHeight: '0' } : { flexShrink: '0' }), ...style } }, kids);
const row = (style, ...kids) => flex('row', { alignItems: 'center', gap: '8px', ...style }, ...kids);
const colm = (style, ...kids) => flex('column', { gap: '8px', ...style }, ...kids);
const spacer = () => h('div', { style: { flex: '1' } });
const dim = (t) => h('span', { style: { color: T('color.text.dim'), fontSize: T('size.small') } }, t);
const screen = (height, ...kids) => h('div', { class: 'tb-screen', style: { height: `${height}px`, display: 'flex' } }, kids);

/** A canvas that fills its box and draws a scene once laid out. */
function cv (fn, v, style = {}) {
  const c = h('canvas', { style: { width: '100%', height: '100%', display: 'block', ...style } });
  const wrap = h('div', { style: { flex: '1', minWidth: '0', minHeight: '0', position: 'relative', overflow: 'hidden' } }, c);
  requestAnimationFrame(() => {
    const r = wrap.getBoundingClientRect();
    const w = Math.max(50, Math.round(r.width)); const hh = Math.max(50, Math.round(r.height));
    c.width = w * devicePixelRatio; c.height = hh * devicePixelRatio;
    const ctx = c.getContext('2d'); ctx.scale(devicePixelRatio, devicePixelRatio);
    fn(ctx, w, hh, v);
  });
  return wrap;
}
const over = (el, style) => h('div', { style: { position: 'absolute', ...style } }, el);

const RAIL = (on) => k.rail([
  { icon: 'section.home', label: 'Starter' }, 'sep',
  ...[['maps', 'Maps'], ['monsters', 'Monsters'], ['player', 'Player'], ['weapons', 'Weapons'], ['props', 'Props'], ['sprites', 'Sprites'],
    ['textures', 'Textures'], ['sounds', 'Sounds'], ['music', 'Music'], ['screens', 'Screens'], ['graphs', 'Graphs'], ['settings', 'Settings']]
    .map(([i, l]) => ({ icon: `section.${i}`, label: l, on: on === i, badge: i === 'monsters' ? 2 : null })),
  'gap', { icon: 'maptool.play', label: 'Play' }, { icon: 'action.export', label: 'Export' },
]);

// ---------- studio ----------

function studioHome (stage) {
  const tiles = [['maps', 'Maps', '6'], ['monsters', 'Monsters', '9'], ['player', 'Player', ''], ['weapons', 'Weapons', '4'], ['props', 'Props', '17'], ['sprites', 'Sprites', '31'], ['textures', 'Textures', '58'], ['sounds', 'Sounds', '42'], ['music', 'Music', '5'], ['screens', 'Screens', '2'], ['graphs', 'Graphs', '7']];
  stage.append(screen(620, RAIL('home'),
    colm({ flex: '1', overflow: 'auto', padding: '20px 24px', gap: '14px' },
      row({}, colm({ gap: '2px' }, h('div', { style: { fontSize: T('size.hero'), fontWeight: '700' } }, 'Starter'), dim('module 0.3 · 6 maps · last played 2 min ago')), spacer(),
        k.button('Play', { variant: 'primary', icon: 'transport.play' }), k.button('Export', { icon: 'action.export' }), k.iconButton('action.more', { variant: 'ghost' })),
      row({ flexWrap: 'wrap' }, k.button('Import pack', { variant: 'small', icon: 'action.import' }), k.button('Snapshots', { variant: 'small', icon: 'section.snapshots' }), k.button('Plugins (6)', { variant: 'small', icon: 'section.plugins' }), k.button('Play log', { variant: 'small', icon: 'section.playlog' })),
      k.heading('maps', 'section.maps'),
      row({ gap: '10px', overflowX: 'auto' }, ['Entryway', 'Underhalls', 'The Gantlet', 'The Focus'].map((n, i) => k.tile(n, `linear-gradient(${30 + i * 40}deg, #2a3a55, #1b2230 60%, #3a2a2a)`, { state: i === 0 ? 'selected' : null }))),
      k.heading('the module', 'section.home'),
      h('div', { style: { display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' } },
        tiles.map(([i, l, n]) => k.row({ mark: `section.${i}`, name: l, sub: n ? `${n}` : 'rules', end: '' }))),
      k.heading('to fix (2)', 'status.error'),
      k.row({ mark: 'status.error', name: 'imp: state "pain" has no next', sub: 'Monsters › imp', state: 'bad' }),
      k.row({ mark: 'status.warning', name: 'map03: 2 rooms overlap', sub: 'Maps › map03' }))));
}

function studioMap (stage, v) {
  const sheet = k.sheet('Room 4', [
    k.slider('Floor', 0.25, { fmt: (x) => `${Math.round(x * 256)}` }), k.slider('Ceiling', 0.62, { fmt: (x) => `${Math.round(x * 256)}` }), k.slider('Light', 0.8),
    row({}, dim('floor'), k.tile('FLAT5', 'repeating-linear-gradient(45deg,#4a4a52 0 5px,#3a3a42 5px 10px)'), dim('ceiling'), k.tile('CEIL3', 'repeating-linear-gradient(0deg,#5a5040 0 6px,#4a4030 6px 12px)')),
    row({ flexWrap: 'wrap' }, k.chip('sky'), k.chip('see-through'), k.chip('climbable', { state: 'on' })),
    k.section('when', 'When · crossed', [dim('the line by the east door')]),
    row({}, k.button('Duplicate', { variant: 'small' }), k.button('Delete', { variant: ['small', 'danger'] })),
  ], { variant: 'side' });
  sheet.style.width = '320px';
  const toolbar = k.toolbar(['select', 'room', 'place', 'triggers', 'camera', 'graph', 'play', 'more'].map((t) => ({ icon: `maptool.${t}`, label: t[0].toUpperCase() + t.slice(1) })), 0);
  stage.append(screen(560, RAIL('maps'),
    flex('column', { flex: '1', position: 'relative' },
      cv(DRAW.mapEditor, v),
      over(row({}, k.pill('map01 · saved', { variant: 'ok', i: 'status.ok' }), k.pill('3 rooms selected')), { top: '10px', left: '10px' }),
      over(row({}, k.iconButton('action.undo', { variant: 'small' }), k.iconButton('action.redo', { variant: 'small' }), k.seg(['PLAN', 'GAME'], 0)), { top: '10px', right: '10px' }),
      over(toolbar, { bottom: '12px', left: '50%', transform: 'translateX(-50%)' }),
      over(k.menu([{ label: 'Map settings…', icon: 'action.settings' }, { label: 'Play log…', icon: 'section.playlog', state: 'hover' }, { label: 'Import texture (PNG)', icon: 'action.import' }, 'sep', { label: 'Fit view', icon: 'action.fit' }]), { right: '10px', bottom: '84px' })),
    sheet));
}

function studioGraph (stage, v) {
  stage.append(screen(500, RAIL('graphs'),
    colm({ flex: '1', gap: '0' },
      k.topbar('◇ map01', { sub: '3 graphs · 1 problem', left: [k.iconButton('action.back', { variant: 'ghost' })], right: [k.field({ options: ['doors', 'intro', '+ new graph…'] }), k.button('+ node…', { variant: 'small' }), k.button('scene', { variant: 'small', icon: 'transport.play' })] }),
      row({ flex: '1', gap: '0', alignItems: 'stretch' },
        flex('column', { flex: '1', position: 'relative' }, cv(DRAW.graphEditor, v),
          over(row({ gap: '2px' }, k.iconButton('action.zoomout', { variant: 'small' }), k.pill('100%'), k.iconButton('action.zoomin', { variant: 'small' }), k.iconButton('action.fit', { variant: 'small' })), { right: '10px', bottom: '10px' })),
        colm({ width: '300px', padding: '12px', borderLeft: `1px solid ${T('color.line.main')}`, background: T('color.bg.panel'), overflow: 'auto' },
          k.tabs(['details', 'variables'], 0), k.heading('has item', 'trigger.if'),
          colm({}, dim('item'), k.field({ options: ['red key', 'blue key', 'skull'] }), dim('who'), k.field({ value: 'the one who crossed' })),
          k.callout('info', null, 'Runs the THEN branch only when the player carries the item.'))))));
}

// ---------- ThreeSprite ----------

function threesprite (stage, v) {
  const pal = ['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#257179', '#29366f', '#3b5dc9', '#41a6f6', '#73eff7', '#f4f4f4', '#94b0c2', '#566c86', '#333c57'];
  const tools = ['pencil', 'eraser', 'dither', 'fill', 'eyedropper', 'select', 'move', 'pan'];
  stage.append(screen(600,
    colm({ flex: '1', gap: '0' },
      k.topbar(h('span', {}, 'imp.tsprite ', k.dot()), { sub: '32px · 8 views · mirrored', left: [k.iconButton('action.menu', { variant: 'ghost' })],
        right: [k.iconButton('action.undo', { variant: 'ghost' }), k.iconButton('action.redo', { variant: 'ghost' }), k.tabs(['Draw', 'Rig', 'Animate', '3D', 'Export'], 1), k.iconButton('action.help', { variant: 'ghost' }), k.iconButton('action.settings', { variant: 'ghost' })] }),
      row({ flex: '1', gap: '0', alignItems: 'stretch' },
        colm({ width: '56px', padding: '8px 6px', gap: '4px', alignItems: 'center', background: T('color.bg.panel'), borderRight: `1px solid ${T('color.line.main')}` },
          tools.map((t, i) => k.iconButton(`paint.${t}`, { variant: 'ghost', state: i === 0 ? 'on' : null, title: t })), h('div', { style: { height: '1px', alignSelf: 'stretch', background: T('color.line.main') } }),
          k.iconButton('paint.mirror', { variant: 'ghost', state: 'on' }), k.iconButton('paint.dim', { variant: 'ghost' }), k.iconButton('paint.grid', { variant: 'ghost' })),
        flex('column', { flex: '1', position: 'relative' }, cv(DRAW.rigCanvas, v),
          over(k.toast('View 6 is mirrored from view 2', { close: false }), { bottom: '12px', left: '50%', transform: 'translateX(-50%)' })),
        colm({ width: '290px', padding: '10px', background: T('color.bg.panel'), borderLeft: `1px solid ${T('color.line.main')}`, overflow: 'auto' },
          k.heading('palette', 'action.edit'),
          row({}, k.colorwell(pal[3], { state: 'selected' }), k.colorwell(pal[10]), k.iconButton('action.swap', { variant: ['ghost', 'small'] }), k.field({ options: ['DawnBringer 16', 'PICO-8'] })),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px' } }, pal.map((c, i) => k.colorwell(c, { state: i === 3 ? 'selected' : null }))),
          k.heading('bones', 'sprite.bone'),
          ...['root', '  spine', '    arm.l', '    arm.r', '  leg.l'].map((b, i) => k.row({ mark: 'sprite.bone', name: b.trim(), sub: `${(i * 2) % 3} parts`, state: i === 2 ? 'selected' : null, end: '' })),
          k.heading('bone', 'sprite.rig'), row({}, k.stepper('12', { unit: '°' }), k.stepper('8', { unit: 'px' })))),
      h('div', { style: { height: '134px', display: 'flex', borderTop: `1px solid ${T('color.line.main')}` } }, cv(DRAW.timeline, v)))));
}

// ---------- qPainter ----------

function qpainter (stage, v) {
  const tools = ['pencil', 'brush', 'eraser', 'dither', 'ramp', 'noise', 'replace', 'smooth', 'line', 'rect', 'ellipse', 'fill', 'gradient', 'eyedropper', 'select', 'move'];
  stage.append(screen(600,
    colm({ flex: '1', gap: '0' },
      row({ padding: '6px 10px', background: T('color.bg.panel'), borderBottom: `1px solid ${T('color.line.main')}`, overflowX: 'auto' },
        k.button('New…', { variant: 'small', icon: 'action.new' }), k.button('Open', { variant: 'small', icon: 'action.open' }), k.chip(h('span', {}, 'rockwall.texproj ', k.dot()), { state: 'on' }),
        k.button('Save', { variant: 'small', icon: 'action.save' }), k.button('Export…', { variant: 'small', icon: 'action.export' }), k.iconButton('action.undo', { variant: ['ghost', 'small'] }), k.iconButton('action.redo', { variant: ['ghost', 'small'] }),
        k.chip('Wrap', { state: 'on' }), k.chip('Tiles'), k.field({ options: ['Symmetry: X', 'none', 'XY', 'radial'] }), k.chip('Grid', { state: 'on' }), k.iconButton('action.fit', { variant: ['ghost', 'small'] })),
      row({ flex: '1', gap: '0', alignItems: 'stretch' },
        colm({ width: '48px', padding: '6px', gap: '2px', alignItems: 'center', background: T('color.bg.panel'), borderRight: `1px solid ${T('color.line.main')}`, overflow: 'auto' },
          tools.map((t, i) => k.iconButton(`paint.${t}`, { variant: ['ghost', 'small'], state: i === 3 ? 'on' : null, title: t }))),
        cv(DRAW.paintCanvas, v),
        colm({ width: '290px', padding: '10px', background: T('color.bg.panel'), borderLeft: `1px solid ${T('color.line.main')}`, overflow: 'auto' },
          k.slider('Size', 0.1, { fmt: (x) => `${Math.max(1, Math.round(x * 64))}` }), k.slider('Density', 0.5), k.field({ options: ['Bayer 4×4', 'Checker 50%', 'Custom'] }),
          k.heading('palette'), h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px' } }, ['#2a1a10', '#4a3a2c', '#5a4a3a', '#6b5a48', '#8a7458', '#a89070', '#c9b08a', '#e8d4b0'].map((c, i) => k.colorwell(c, { state: i === 2 ? 'selected' : null }))),
          k.heading('frames'), k.strip(['#5a4a3a', '#6b5a48', '#4a3a2c', '#5a4a3a'].map((c) => `linear-gradient(135deg, ${c}, #222)`), 1),
          row({}, k.iconButton('action.back', { variant: ['ghost', 'small'] }), k.iconButton('transport.play', { variant: ['ghost', 'small'] }), k.iconButton('action.next', { variant: ['ghost', 'small'] }), dim('2/4 · 8 fps')),
          k.heading('layers'), k.row({ name: 'moss', sub: 'opacity 70%', state: 'selected', end: '' }), k.row({ name: 'bricks', sub: '100%', end: '' }))))));
}

// ---------- DigidreamSound ----------

function sound (stage, v) {
  const groups = [['weapons', ['pistol_fire', 'shotgun_fire', 'plasma']], ['monsters', ['imp_sight', 'imp_pain']], ['world', ['door_open', 'lift_start']]];
  stage.append(screen(640,
    colm({ flex: '1', gap: '0' },
      row({ padding: '6px 12px', background: T('color.bg.panel'), borderBottom: `1px solid ${T('color.line.main')}` },
        h('strong', {}, 'DigidreamSound'), k.chip(h('span', {}, 'doom_weapons ', k.dot())), k.seg(['Sounds', 'Mix & test'], 0),
        k.button(null, { variant: ['primary', 'icon'], icon: 'transport.play' }), dim('pistol_fire'), spacer(),
        k.iconButton('action.undo', { variant: 'ghost' }), k.iconButton('action.redo', { variant: 'ghost' }), k.button('Open'), k.button('Save', { variant: 'primary' }), k.iconButton('action.more', { variant: 'ghost' })),
      row({ flex: '1', gap: '0', alignItems: 'stretch' },
        colm({ width: '250px', padding: '10px', background: T('color.bg.panel'), borderRight: `1px solid ${T('color.line.main')}`, overflow: 'auto' },
          row({}, k.field({ placeholder: 'find', variant: 'search', icon: 'action.search' }), k.button('New', { variant: 'small', icon: 'action.add' })),
          groups.map(([g, list]) => [k.heading(`${g} · ${list.length}`), ...list.map((n, i) => k.row({ name: n, sub: i === 1 ? 'too loud' : '0.4 s · 2 takes', state: n === 'pistol_fire' ? 'selected' : i === 1 && g === 'weapons' ? 'bad' : null, end: '' }))])),
        colm({ flex: '1', padding: '14px', overflow: 'auto' },
          row({}, h('div', { style: { fontSize: T('size.title'), fontWeight: '700' } }, 'pistol_fire'), k.chip('impact', { remove: true }), k.chip('+ tag', { variant: 'small' }), spacer(), k.button('In the game ›', { variant: 'ghost' })),
          h('div', { style: { height: '230px', display: 'flex' } }, cv(DRAW.waveform, v, { borderRadius: '8px' })),
          row({}, k.pill('0.42 s'), k.pill('−0.4 dB peak', { variant: 'warn' }), k.button('Fix level', { variant: 'small' }), spacer(), k.chip('Repeat'), k.chip('Play on change', { state: 'on' })),
          k.callout('warn', null, 'Close to full scale: two of these at once will clip.'),
          row({}, ...['A', 'B', 'C'].map((t, i) => k.button(t, { variant: ['small', 'icon'], state: i === 0 ? 'on' : null })), k.iconButton('action.add', { variant: ['small', 'ghost'] }), dim('picked 50% of the time')),
          row({}, k.button('Randomize', { variant: 'primary', icon: 'sfx.randomize' }), k.button('Vary', { icon: 'sfx.vary' }), k.button('Match a recording…', { icon: 'sfx.match' })),
          k.fold('Shape', [k.slider('Volume', 0.8), k.slider('Pitch', 0.5, { idle: true }), k.slider('Brightness', 0.64)], { sub: 'gunshot recipe', open: true })),
        colm({ width: '270px', padding: '12px', background: T('color.bg.panel'), borderLeft: `1px solid ${T('color.line.main')}`, overflow: 'auto' },
          k.heading('in the game'), dim('where it plays'), k.seg(['World', 'UI', 'Music'], 0),
          dim('when triggered a lot'), k.field({ options: ['steal the oldest', 'refuse new'] }), k.slider('Limit', 0.25, { fmt: (x) => `${Math.round(x * 16)}` }),
          dim('distance'), row({}, k.toggle(true), dim('placed in the world')), k.slider('Fade', 0.5, { fmt: (x) => `${Math.round(x * 50)} u` }),
          h('div', { style: { height: '150px', display: 'flex' } }, cv(DRAW.envelope, v, { borderRadius: '8px' })))),
      row({ padding: '4px 12px', borderTop: `1px solid ${T('color.line.main')}`, background: T('color.bg.panel') }, k.dot({ variant: 'ok' }), dim('baked 42 sounds in 180 ms'), spacer(), k.pill('worker idle')))));
}

// ---------- DigidreamSynth (DAW) ----------

function daw (stage, v) {
  const tracks = v.palette('tracks');
  const header = (name, i, st = {}) => row({ height: '36px', padding: '0 8px', borderBottom: `1px solid ${T('color.line.soft')}`, background: i === 1 ? T('color.bg.hover') : T('color.bg.panel'), gap: '6px' },
    h('span', { style: { width: '5px', alignSelf: 'stretch', background: tracks[i] } }), h('span', { style: { flex: '1', fontSize: T('size.small'), fontWeight: '600' } }, name),
    k.mini('M', 'mute', { state: st.m ? 'on' : null }), k.mini('S', 'solo', { state: st.s ? 'on' : null }), k.mini('R', 'arm', { state: st.r ? 'on' : null }), k.mini('♪', null));
  stage.append(screen(620,
    colm({ flex: '1', gap: '0' },
      row({ padding: '6px 12px', background: T('color.bg.panel'), borderBottom: `1px solid ${T('color.line.main')}`, flexWrap: 'wrap' },
        h('strong', {}, 'DigidreamSynth'), k.button('File', { variant: ['ghost', 'small'] }), k.button('Edit', { variant: ['ghost', 'small'] }), k.field({ value: 'e1m1_remix' }),
        k.transport({ playing: true, display: '5.3.120' }), k.stepper('120', { unit: 'bpm' }), k.chip('loop', { state: 'on' }), k.chip('click'), spacer(),
        k.meter(0.55, { peak: 0.7, width: 90, label: '−9 dB' }), dim('voices 14/64')),
      k.tabs(['Arrange', 'Track', 'Synth', 'Master', 'Cut & Loop', 'Cues', 'Fit'], 1),
      row({ flex: '1', gap: '0', alignItems: 'stretch' },
        colm({ width: '230px', gap: '0', background: T('color.bg.panel'), borderRight: `1px solid ${T('color.line.main')}` },
          header('Lead', 0, { s: true }), header('Bass', 1, { r: true }), header('Drums', 2), header('Pad', 3, { m: true }), header('Arp', 4),
          colm({ padding: '10px' }, k.button('＋ track', { variant: 'small' }), k.keys(1, { pressed: [4], lit: [0, 7] }))),
        colm({ flex: '1', gap: '0' },
          row({ padding: '6px 10px', borderBottom: `1px solid ${T('color.line.main')}` }, k.seg(['✎ draw', '▭ select', '⌫ erase'], 0), k.field({ options: ['velocity', 'CC1 mod', 'pitch bend'] }), spacer(), dim('snap 1/16')),
          cv(DRAW.pianoRoll, v))),
      h('div', { style: { position: 'relative', height: '0' } }, over(k.toast('Baking .mstk… 62%', { close: true }), { right: '12px', bottom: '12px' })))));
}

// ---------- Packager ----------

function packager (stage) {
  const target = (name, sub, st) => h('button', { class: k.cls('row', { state: st }), style: { flexDirection: 'column', alignItems: 'flex-start', gap: '2px', height: 'auto', padding: '10px 12px' } },
    row({}, k.icon(`platform.${name.toLowerCase().replace(/[^a-z]/g, '')}`), h('strong', {}, name)), h('span', { class: 'ui-row__sub' }, sub));
  const step = (n, title, body) => k.card(h('span', {}, h('span', { style: { color: T('color.text.dim'), marginRight: '8px' } }, String(n)), title), body);
  stage.append(screen(760,
    colm({ flex: '1', overflow: 'auto', padding: '20px', alignItems: 'center' },
      colm({ width: '100%', maxWidth: '720px', gap: '12px' },
        h('div', { style: { fontSize: T('size.hero'), fontWeight: '700' } }, 'Packager'), dim('Turn a module into a game for each platform.'),
        step(1, 'Module', [row({}, k.button('Open module .zip', { icon: 'action.open' }), k.button('Open folder')), h('div', {}, h('strong', {}, 'Starter'), dim(' (starter) — 6 levels, 214 files, 18.4 MB'))]),
        step(2, 'Platform', [h('div', { style: { display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' } },
          target('Android', 'APK, arm64', 'selected'), target('Linux', 'x86-64, .tar.gz'), target('Windows', 'x86-64, .zip'), target('macOS', 'Apple silicon, .zip'), target('macOS Intel', 'no kit', 'bad'), target('iOS', 'later', null)),
          row({}, k.chip('kit android · engine 0.1.1', { remove: true }), k.chip('kit linux · engine 0.1.1', { remove: true }))]),
        step(3, 'The game', [h('div', { style: { display: 'grid', gap: '8px', gridTemplateColumns: '1fr 1fr' } },
          colm({ gap: '4px' }, dim('Name'), k.field({ value: 'Starter' })), colm({ gap: '4px' }, dim('Package id'), k.field({ value: 'fr.digidream.starter' })),
          colm({ gap: '4px' }, dim('Version'), k.field({ value: '1.0.0' })), colm({ gap: '4px' }, dim('Starts on'), k.field({ options: ['map01 · Entryway'] }))),
          row({}, h('span', { style: { width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg,#5b8fd6,#1b2230)' } }), k.button('Choose picture'), k.button('Use the engine\'s', { variant: 'ghost' }))]),
        step(4, 'Signing key', [row({}, k.pill('Key ready', { variant: 'ok', i: 'status.ok' }), dim('CN=Digidream · made 2026-10-01')), h('code', { style: { fontFamily: T('font.mono'), fontSize: T('size.tiny'), color: T('color.text.dim') } }, 'SHA-256 4F:9A:12:…:C3:7E'),
          row({}, k.button('New key', { variant: 'small' }), k.button('Back up key', { variant: 'small' }), k.button('Restore key', { variant: 'small' })), k.callout('warn', null, 'Keep the key: a game signed with another key cannot update this one.')]),
        step(5, 'Build', [row({}, k.button('Build', { variant: 'primary' }), k.button('Save Starter.apk (14.5 MB)', { icon: 'action.download' })), k.progress(0.7, { label: 'packing assets…' }),
          k.log(['fetching the android kit…', '+kit ok (engine 0.1.1)', 'assembling 214 files', '+done in 4.2 s'])])))));
}

// ---------- boot ----------

function bootScreen (stage) {
  stage.append(screen(300, k.boot('DigidreamSynth', 0.45, 'loading the bank…', ['✓ audio 12 ms', '✓ worklet 30 ms', 'bank…'])));
}

export const SCREENS = [
  { id: 'studio-home', title: 'Studio: home', build: studioHome },
  { id: 'studio-map', title: 'Studio: map editor', build: studioMap },
  { id: 'studio-graph', title: 'Studio: graph editor', build: studioGraph },
  { id: 'threesprite', title: 'ThreeSprite: rig mode', build: threesprite },
  { id: 'qpainter', title: 'qPainter', build: qpainter },
  { id: 'sound', title: 'DigidreamSound: a sound', build: sound },
  { id: 'daw', title: 'DigidreamSynth: DAW piano roll', build: daw },
  { id: 'packager', title: 'Packager', build: packager },
  { id: 'boot', title: 'Start screen (every tool)', build: bootScreen },
];
