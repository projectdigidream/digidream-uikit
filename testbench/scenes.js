// Canvas scenes: small stand-ins for what each editor draws, coloured only
// from the skin (view.canvas(group, key)). Each scene is (ctx, w, h, view).
// They are look tests, not the editors: geometry is made up.

import { useStroke } from '../lib/runtime.js';

const C = (v, g, k) => v.canvas(g, k);

// ---------- drawing helpers ----------

function bg (ctx, w, h, color) { ctx.fillStyle = color; ctx.fillRect(0, 0, w, h); }
function line (ctx, spec, pts, close = false) {
  ctx.save(); useStroke(ctx, spec); ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (close) ctx.closePath();
  ctx.stroke(); ctx.restore();
}
function poly (ctx, fill, pts) {
  ctx.save(); ctx.fillStyle = fill; ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function rect (ctx, x, y, w, h, { fill, stroke, r = 0 } = {}) {
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { useStroke(ctx, stroke); ctx.stroke(); }
  ctx.restore();
}
function circle (ctx, x, y, r, { fill, stroke } = {}) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { useStroke(ctx, stroke); ctx.stroke(); }
  ctx.restore();
}
function text (ctx, spec, str, x, y, { align = 'left', base = 'alphabetic', color } = {}) {
  ctx.save(); ctx.font = spec.font ?? '11px sans-serif'; ctx.fillStyle = color ?? spec.color; ctx.textAlign = align; ctx.textBaseline = base;
  ctx.fillText(str, x, y); ctx.restore();
}
/** A rounded badge with a coloured border: the map editor's marker look. */
function badge (ctx, v, str, x, y, color, specKey = ['map', 'marker']) {
  const s = C(v, ...specKey);
  ctx.save(); ctx.font = s.font ?? C(v, 'common', 'label').font;
  const w = ctx.measureText(str).width + 14;
  rect(ctx, x - w / 2, y - 10, w, 20, { fill: s.fill, stroke: { color, width: s.width ?? 2 }, r: s.radius ?? 6 });
  ctx.fillStyle = s.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, x, y + 0.5);
  ctx.restore();
}
function handle (ctx, spec, x, y) {
  const r = (spec.size ?? 6) / 2;
  rect(ctx, x - r, y - r, r * 2, r * 2, { fill: spec.fill, stroke: { color: spec.color, width: 1 } });
}
function checker (ctx, v, x, y, w, h) {
  const a = C(v, 'common', 'checker.a'); const b = C(v, 'common', 'checker.b');
  const s = a.size ?? 8;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let j = 0; j * s < h; j++) for (let i = 0; i * s < w; i++) { ctx.fillStyle = (i + j) % 2 ? b.fill : a.fill; ctx.fillRect(x + i * s, y + j * s, s, s); }
  ctx.restore();
}
function marquee (ctx, v, x, y, w, h) {
  rect(ctx, x + 0.5, y + 0.5, w, h, { stroke: { ...C(v, 'common', 'marquee.shadow'), dash: C(v, 'common', 'marquee.shadow').dash } });
  ctx.save(); ctx.lineDashOffset = (C(v, 'common', 'marquee').dash[0] ?? 4); rect(ctx, x + 0.5, y + 0.5, w, h, { stroke: C(v, 'common', 'marquee') }); ctx.restore();
}
function grid (ctx, v, w, h, step, majorEvery, group = 'common') {
  const mi = C(v, group, 'grid.minor'); const ma = C(v, group, 'grid.major');
  for (let i = 0, x = 0; x < w; i++, x += step) line(ctx, i % majorEvery ? mi : ma, [[x + 0.5, 0], [x + 0.5, h]]);
  for (let i = 0, y = 0; y < h; i++, y += step) line(ctx, i % majorEvery ? mi : ma, [[0, y + 0.5], [w, y + 0.5]]);
}
function sprite (ctx, x, y, s, palette) {
  // a tiny made-up pixel figure, 8 wide x 12 tall, drawn at scale s
  const rows = ['..1111..', '.122221.', '.123321.', '.122221.', '..1221..', '.111111.', '1.1221.1', '1.1221.1', '..1..1..', '..1..1..', '.11..11.', '........'];
  rows.forEach((r, j) => [...r].forEach((c, i) => { if (c !== '.') { ctx.fillStyle = palette[+c - 1]; ctx.fillRect(x + i * s, y + j * s, s, s); } }));
}
const FIG = ['#2b2b3a', '#c9784a', '#f2d0a4'];

// ---------- patterns (foundations) ----------

function patterns (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'common', 'stage').color);
  checker(ctx, v, 14, 14, 120, 120);
  sprite(ctx, 30, 24, 8, FIG);
  for (let x = 14; x <= 134; x += 8) line(ctx, { color: C(v, 'common', 'pixelGrid').color, width: 1 }, [[x + 0.5, 14], [x + 0.5, 134]]);
  for (let y = 14; y <= 134; y += 8) line(ctx, { color: C(v, 'common', 'pixelGrid').color, width: 1 }, [[14, y + 0.5], [134, y + 0.5]]);
  rect(ctx, 14.5, 14.5, 120, 120, { stroke: { color: C(v, 'common', 'imageBorder').color } });
  marquee(ctx, v, 38, 38, 48, 56);
  circle(ctx, 112, 112, 9, { stroke: { color: C(v, 'common', 'cursor').color, width: 1 } });
  // handles and labels
  const hx = 170;
  handle(ctx, C(v, 'common', 'handle.idle'), hx, 30); handle(ctx, C(v, 'common', 'handle'), hx + 30, 30); handle(ctx, C(v, 'common', 'handle.hot'), hx + 60, 30);
  text(ctx, C(v, 'common', 'text'), 'idle · handle · hot', hx + 80, 34);
  line(ctx, C(v, 'common', 'guide'), [[hx - 6, 60], [w - 14, 60]]);
  text(ctx, C(v, 'common', 'text'), 'guide', w - 50, 74);
  line(ctx, C(v, 'common', 'selected'), [[hx - 6, 88], [hx + 100, 88]]);
  text(ctx, C(v, 'common', 'text'), 'selected', hx + 108, 92);
  rect(ctx, hx - 6, 104, 60, 26, { fill: C(v, 'common', 'problem').fill, stroke: C(v, 'common', 'problem') });
  rect(ctx, hx + 64, 104, 60, 26, { fill: C(v, 'common', 'warning').fill, stroke: C(v, 'common', 'warning') });
  text(ctx, C(v, 'common', 'text'), 'problem', hx, 146); text(ctx, C(v, 'common', 'text'), 'warning', hx + 70, 146);
  badge(ctx, v, 'label', hx + 175, 117, C(v, 'common', 'label').color, ['common', 'label']);
}

// ---------- studio map ----------

function mapEditor (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'common', 'stage').color);
  grid(ctx, v, w, h, 14, 8);
  const room = (pts, sel) => { poly(ctx, C(v, 'map', 'room.fill').fill, pts); line(ctx, sel ? C(v, 'common', 'selected') : { color: C(v, 'map', 'room.line').color, width: 1.5 }, pts, true); };
  const A = [[40, 40], [210, 40], [210, 150], [40, 150]];
  const B = [[210, 70], [330, 70], [330, 200], [250, 230], [210, 200]];
  const P = [[60, 180], [170, 180], [170, 250], [60, 250]];
  room(A, false); room(B, true); room(P, false);
  poly(ctx, C(v, 'common', 'problem').fill, P); line(ctx, C(v, 'common', 'problem'), [[60, 250], [170, 250]]);
  badge(ctx, v, '✖ wrong', 115, 215, C(v, 'common', 'problem').color);
  B.forEach(([x, y], i) => handle(ctx, i === 1 ? C(v, 'common', 'handle.hot') : C(v, 'common', 'handle'), x, y));
  A.forEach(([x, y]) => handle(ctx, C(v, 'map', 'corner.snap'), x, y));
  line(ctx, C(v, 'map', 'wall.selected'), [[330, 74], [330, 196]]);
  line(ctx, C(v, 'map', 'climb'), [[44, 44], [206, 44]]);
  line(ctx, C(v, 'map', 'trigger.when'), [[210, 100], [210, 170]]);
  badge(ctx, v, 'WHEN', 210, 135, C(v, 'map', 'trigger.when').color);
  // drawing a new room
  const D = [[370, 50], [470, 50], [470, 120]];
  line(ctx, C(v, 'map', 'draw'), D); D.forEach(([x, y], i) => handle(ctx, i === 0 ? C(v, 'common', 'handle.hot') : C(v, 'common', 'handle'), x, y));
  // markers
  badge(ctx, v, '⚑ start', 100, 95, C(v, 'map', 'marker.spawn').color);
  badge(ctx, v, '☀ light', 170, 120, C(v, 'map', 'marker.light').color);
  badge(ctx, v, 'imp', 280, 120, C(v, 'map', 'marker.monster').color);
  badge(ctx, v, 'barrel', 280, 170, C(v, 'map', 'marker.prop').color);
  // camera path
  const path = [[380, 260], [420, 180], [490, 200], [520, 140]];
  line(ctx, C(v, 'map', 'path.chord'), path);
  ctx.save(); useStroke(ctx, C(v, 'map', 'path.active')); ctx.beginPath(); ctx.moveTo(...path[0]);
  ctx.bezierCurveTo(400, 210, 440, 170, 490, 200); ctx.quadraticCurveTo(515, 210, 520, 140); ctx.stroke(); ctx.restore();
  path.forEach(([x, y], i) => { circle(ctx, x, y, 5, { fill: C(v, 'map', 'path.active').color }); badge(ctx, v, String(i + 1), x + 16, y - 12, C(v, 'map', 'path').color); });
  line(ctx, C(v, 'map', 'path'), [[360, 300], [520, 300]]);
  text(ctx, C(v, 'common', 'text'), 'another camera path', 380, 292);
  // pick mode hint
  line(ctx, C(v, 'map', 'pick'), [[40, 280], [200, 280]]);
  text(ctx, C(v, 'common', 'text'), 'pickable edge', 40, 296);
}

function metamap (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'common', 'stage').color);
  const cw = 150; const ch = 110; const ox = 30; const oy = 30;
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) {
    const x = ox + i * cw; const y = oy + j * ch;
    rect(ctx, x + 6, y + 6, cw - 12, ch - 12, { fill: C(v, 'map', 'room.fill').fill });
    if (!(i === 1 && j === 0)) rect(ctx, x + 6, y + 6, cw - 12, ch - 12, { fill: C(v, 'map', 'neighbour').fill });
    rect(ctx, x + 0.5, y + 0.5, cw, ch, { stroke: C(v, 'map', 'cell') });
    badge(ctx, v, `map0${j * 3 + i + 1}`, x + cw / 2, y + 18, C(v, 'map', 'cell').color);
  }
  line(ctx, C(v, 'map', 'seam.joined'), [[ox + cw, oy + 40], [ox + cw, oy + 80]]);
  line(ctx, C(v, 'map', 'seam.oneway'), [[ox + 2 * cw, oy + 30], [ox + 2 * cw, oy + 70]]);
  line(ctx, C(v, 'map', 'seam.walls'), [[ox + cw + 30, oy + ch], [ox + cw + 110, oy + ch]]);
  line(ctx, C(v, 'map', 'seam.loose'), [[ox + 2 * cw + 30, oy + ch], [ox + 2 * cw + 90, oy + ch]]);
  const lab = C(v, 'common', 'text');
  text(ctx, lab, 'seams: joined · one-way · walls · loose (current map undimmed)', ox, oy + 2 * ch + 22);
}

// ---------- graphs ----------

function graphEditor (ctx, w, h, v) {
  const board = C(v, 'graph', 'board'); const dot = C(v, 'graph', 'dot');
  bg(ctx, w, h, board.color);
  const step = (dot.size ?? 24) / 1.5;
  for (let y = step; y < h; y += step) for (let x = step; x < w; x += step) { ctx.fillStyle = dot.fill; ctx.fillRect(x, y, 1.5, 1.5); }
  // a note behind
  const notes = v.palette('notes');
  const noteCol = notes.amber ?? '#b5892f';
  ctx.save(); ctx.globalAlpha = C(v, 'graph', 'note.alpha').alpha; rect(ctx, 300, 160, 200, 110, { fill: noteCol, r: 8 }); ctx.restore();
  rect(ctx, 300, 160, 200, 110, { stroke: { color: noteCol, width: 1 }, r: 8 });
  text(ctx, C(v, 'graph', 'node.title'), 'note: the east wing', 310, 178);
  const node = (x, y, kind, title, rows, sel) => {
    const nw = 170; const nh = 34 + rows.length * 22;
    const n = C(v, 'graph', 'node');
    rect(ctx, x, y, nw, nh, { fill: n.fill, stroke: sel ? C(v, 'graph', 'node.selected') : { color: n.color, width: 1 }, r: n.radius });
    ctx.save(); ctx.beginPath(); ctx.roundRect(x + 1, y + 1, nw - 2, 24, [Math.max(0, n.radius - 1), Math.max(0, n.radius - 1), 0, 0]); ctx.fillStyle = C(v, 'graph', `head.${kind}`).color; ctx.fill(); ctx.restore();
    text(ctx, C(v, 'graph', 'node.title'), title, x + 10, y + 17);
    const pin = C(v, 'graph', 'pin.exec');
    poly(ctx, pin.fill, [[x - 4, y + 7], [x + 2, y + 7], [x + 6, y + 12], [x + 2, y + 17], [x - 4, y + 17]]);
    poly(ctx, pin.fill, [[x + nw - 4, y + 7], [x + nw + 2, y + 7], [x + nw + 6, y + 12], [x + nw + 2, y + 17], [x + nw - 4, y + 17]]);
    rows.forEach((r, i) => {
      const ry = y + 34 + i * 22;
      const pd = C(v, 'graph', 'pin.data');
      circle(ctx, x, ry + 7, pd.size, { fill: n.fill, stroke: { color: pd.color, width: pd.width } });
      const f = C(v, 'graph', 'node.field');
      rect(ctx, x + 70, ry - 2, nw - 80, 18, { fill: f.fill, stroke: { color: f.color, width: 1 }, r: f.radius });
      text(ctx, C(v, 'graph', 'node.text'), r[0], x + 12, ry + 11);
      text(ctx, C(v, 'graph', 'node.text'), r[1], x + 76, ry + 11, { color: C(v, 'graph', 'node.title').color });
    });
    return { x, y, nw, nh };
  };
  const a = node(20, 30, 'event', '⚡ on cross', [['who', 'player']], false);
  const b = node(260, 20, 'condition', 'has item', [['item', 'red key']], true);
  const c = node(260, 300 - 120, 'action', 'open door', [['door', 'east'], ['speed', '2.0']], false);
  const d = node(40, 170, 'data', 'get variable', [['name', 'opened']], false);
  const e = node(40, 260, 'camera', 'camera to', [['path', 'intro']], false);
  const wire = (spec, x1, y1, x2, y2) => { ctx.save(); useStroke(ctx, spec); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(x1 + 60, y1, x2 - 60, y2, x2, y2); ctx.stroke(); ctx.restore(); };
  wire(C(v, 'graph', 'wire.exec'), a.x + a.nw + 6, a.y + 12, b.x - 4, b.y + 12);
  wire(C(v, 'graph', 'wire.selected'), b.x + b.nw + 6, b.y + 12, b.x + b.nw + 40, b.y + 140);
  wire(C(v, 'graph', 'wire.data'), d.x + d.nw, d.y + 41, c.x, c.y + 63);
  wire(C(v, 'graph', 'wire.drag'), e.x + e.nw + 6, e.y + 12, 300, 290);
  circle(ctx, 300, 290, 7, { stroke: C(v, 'graph', 'pin.valid') });
  circle(ctx, b.x + b.nw + 40, b.y + 140, C(v, 'graph', 'bend.selected').size, { fill: C(v, 'graph', 'bend.selected').fill });
  circle(ctx, 225, 120, C(v, 'graph', 'bend').size, { fill: C(v, 'graph', 'bend').fill });
}

function stateGraph (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'graph', 'board').color);
  const card = (x, y, name, l1, l2, st) => {
    const s = C(v, 'graph', 'state');
    rect(ctx, x, y, 140, 62, { fill: s.fill, stroke: st ? C(v, 'graph', `state.${st}`) : { color: s.color, width: s.width }, r: s.radius });
    text(ctx, C(v, 'graph', 'node.title'), name, x + 12, y + 20);
    if (st === 'initial' || name === 'idle') text(ctx, { font: '13px sans-serif', color: C(v, 'graph', 'state.initial').color }, '★', x + 122, y + 20);
    text(ctx, C(v, 'graph', 'node.text'), l1, x + 12, y + 38); text(ctx, C(v, 'graph', 'node.text'), l2, x + 12, y + 52);
    return [x, y];
  };
  card(30, 30, 'idle', 'anim stand', 'look every 10', null);
  card(250, 30, 'chase', 'anim walk', 'speed 1.2', 'selected');
  card(250, 170, 'attack', 'anim fire', 'tick 4: shoot', null);
  card(30, 170, 'pain', 'anim hurt', 'no next!', 'bad');
  const edge = (key, x1, y1, x2, y2, lab) => {
    const s = C(v, 'graph', key);
    ctx.save(); useStroke(ctx, s); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2 + (y2 - y1) * 0.15, (y1 + y2) / 2 - (x2 - x1) * 0.15, x2, y2); ctx.stroke(); ctx.restore();
    const ang = Math.atan2(y2 - y1, x2 - x1);
    poly(ctx, s.color, [[x2, y2], [x2 - 9 * Math.cos(ang - 0.4), y2 - 9 * Math.sin(ang - 0.4)], [x2 - 9 * Math.cos(ang + 0.4), y2 - 9 * Math.sin(ang + 0.4)]]);
    const el = C(v, 'graph', 'edge.label');
    ctx.save(); ctx.font = el.font; const tw = ctx.measureText(lab).width; ctx.restore();
    const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
    rect(ctx, mx - tw / 2 - 4, my - 9, tw + 8, 16, { fill: el.fill, r: 4 });
    text(ctx, el, lab, mx, my + 3, { align: 'center' });
  };
  edge('edge.transition', 170, 55, 250, 55, 'sees player');
  edge('edge.next', 320, 92, 320, 170, 'next');
  edge('edge.goto', 250, 210, 170, 210, 'goto pain');
  // self loop
  ctx.save(); useStroke(ctx, C(v, 'graph', 'edge.transition')); ctx.beginPath(); ctx.arc(390, 40, 16, Math.PI * 0.9, Math.PI * 2.4); ctx.stroke(); ctx.restore();
  text(ctx, C(v, 'common', 'text'), 'transition · next · goto · self-loop', 30, h - 14);
}

// ---------- previews ----------

function spritePreview (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'common', 'stage').color);
  const floorY = h - 40;
  const r = C(v, 'common', 'ruler');
  for (let i = 0; i <= 6; i++) {
    const y = floorY - i * 30;
    line(ctx, { color: C(v, 'common', 'grid.minor').color, width: 1 }, [[30, y], [w - 10, y]]);
    if (i % 2 === 0) text(ctx, r, String(i / 2), 12, y + 4);
  }
  line(ctx, C(v, 'preview', 'floor'), [[20, floorY], [w - 10, floorY]]);
  sprite(ctx, w / 2 - 40, floorY - 120, 10, FIG);
  text(ctx, C(v, 'common', 'text'), 'walk · frame 3/8 · view F · 12 fps · 1.8 u', 12, h - 14);
}

function swingPreview (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'common', 'stage').color);
  const cx = w / 4; const cy = h / 2 + 10;
  for (const r of [25, 50, 75]) circle(ctx, cx, cy, r, { stroke: { color: C(v, 'preview', 'swing.ring').color, width: 1 } });
  const wedge = (a0, a1, spec, r) => { ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath(); ctx.fillStyle = spec.fill; ctx.fill(); useStroke(ctx, { color: spec.color, width: 1.5 }); ctx.stroke(); ctx.restore(); };
  wedge(-2.2, -0.6, C(v, 'preview', 'swing.range'), 70);
  wedge(-1.3, -0.95, C(v, 'preview', 'swing.current'), 70);
  line(ctx, C(v, 'preview', 'swing.reach'), [[cx, cy], [cx + 75, cy - 5]]);
  circle(ctx, cx, cy, C(v, 'preview', 'swing.body').size, { fill: C(v, 'preview', 'swing.body').fill });
  text(ctx, C(v, 'common', 'text'), 'from above', 12, 18);
  const sx = w * 0.55; const fy = h - 30;
  line(ctx, C(v, 'preview', 'floor'), [[sx, fy], [w - 12, fy]]);
  rect(ctx, sx + 20, fy - 60, 18, 60, { fill: C(v, 'preview', 'figure').color, r: 4 });
  ctx.save(); ctx.beginPath(); ctx.moveTo(sx + 38, fy - 40); ctx.arc(sx + 38, fy - 40, 60, -0.9, 0.3); ctx.closePath(); ctx.fillStyle = C(v, 'preview', 'swing.range').fill; ctx.fill(); ctx.restore();
  text(ctx, C(v, 'common', 'text'), 'from the side · tick 3/8 · reach 1.6', sx, 18);
}

function mapThumb (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'common', 'stage').color);
  const rooms = [[[20, 20], [110, 20], [110, 80], [20, 80]], [[110, 30], [180, 30], [180, 120], [110, 120]], [[40, 80], [90, 80], [90, 140], [40, 140]]];
  rooms.forEach((r) => { poly(ctx, C(v, 'preview', 'thumb.room').color, r); line(ctx, { color: C(v, 'preview', 'thumb.line').color, width: 1 }, r, true); });
  [[60, 50, 'thumb.spawn'], [150, 70, 'thumb.monster'], [160, 100, 'thumb.monster'], [70, 120, 'thumb.prop']].forEach(([x, y, k]) => circle(ctx, x, y, 3.5, { fill: C(v, 'preview', k).color }));
}

function nineSlice (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'common', 'stage').color);
  checker(ctx, v, 20, 20, w - 40, h - 40);
  rect(ctx, 40, 36, w - 80, h - 72, { fill: '#8a6a3a', stroke: { color: '#5a3a1a', width: 6 }, r: 12 });
  const g = C(v, 'preview', 'slice.guide');
  [[64, 0], [w - 64, 0]].forEach(([x]) => line(ctx, g, [[x, 20], [x, h - 20]]));
  [[0, 56], [0, h - 56]].forEach(([, y]) => line(ctx, g, [[20, y], [w - 20, y]]));
}

function sheetCutter (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'common', 'stage').color);
  checker(ctx, v, 10, 10, w - 20, 100);
  for (let i = 0; i < 6; i++) sprite(ctx, 22 + i * 64, 22, 6, FIG);
  for (let i = 1; i < 6; i++) line(ctx, C(v, 'preview', 'cutter.divider'), [[10 + i * 64, 10], [10 + i * 64, 110]]);
  rect(ctx, 10 + 2 * 64 + 1, 11, 62, 98, { stroke: C(v, 'preview', 'cutter.current') });
  rect(ctx, 10 + 6 * 64, 10, w - 20 - 6 * 64, 100, { fill: C(v, 'preview', 'cutter.leftover').fill });
  text(ctx, C(v, 'common', 'text'), 'frames · current frame · leftover pixels', 10, 132);
}

// ---------- designers ----------

function device (ctx, v, x, y, w, h) {
  const f = C(v, 'designer', 'frame');
  rect(ctx, x, y, w, h, { fill: f.fill, stroke: { color: f.color, width: f.width }, r: f.radius });
  rect(ctx, x + 14, y + 14, w - 28, h - 28, { stroke: C(v, 'designer', 'safe'), r: 8 });
}
function panelsDesigner (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'common', 'stage').color);
  device(ctx, v, 20, 20, w - 40, h - 40);
  rect(ctx, 80, 50, 240, 180, { stroke: C(v, 'designer', 'panel.selected') });
  rect(ctx, 316, 120, 6, 40, { fill: C(v, 'designer', 'panel').color });
  const slot = (x, y, sw, sh, tag, st) => {
    const s = C(v, 'designer', st ? `slot.${st}` : 'slot');
    if (st === 'hidden') {
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, sw, sh); ctx.clip();
      for (let i = -sh; i < sw; i += 8) line(ctx, { color: s.color, width: 1 }, [[x + i, y + sh], [x + i + sh, y]]);
      ctx.restore();
    }
    rect(ctx, x, y, sw, sh, { fill: st === 'selected' ? s.fill : null, stroke: st === 'selected' ? s : C(v, 'designer', 'slot') });
    const t = C(v, 'designer', 'slot.tag');
    ctx.save(); ctx.font = t.font; const tw = ctx.measureText(tag).width; ctx.restore();
    rect(ctx, x, y - 14, tw + 8, 14, { fill: t.fill, r: 3 }); text(ctx, t, tag, x + 4, y - 3);
    handle(ctx, { fill: s.color, color: s.color, size: 6 }, x + sw, y + sh);
  };
  slot(100, 80, 200, 30, 'label title', null);
  slot(100, 135, 95, 36, 'button buy', 'selected');
  slot(205, 135, 95, 36, 'button sell', 'hidden');
  rect(ctx, 100, 190, 200, 24, { stroke: C(v, 'designer', 'decor') });
  text(ctx, C(v, 'common', 'text'), 'decor', 104, 206);
}
function screensDesigner (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'common', 'stage').color);
  device(ctx, v, 20, 20, w - 40, h - 40);
  rect(ctx, 40, 40, 120, 26, { stroke: C(v, 'designer', 'hit') });
  text(ctx, C(v, 'common', 'text'), 'health', 46, 58);
  rect(ctx, w - 170, 40, 120, 26, { stroke: { ...C(v, 'designer', 'hit'), dash: [], width: 2 } });
  text(ctx, C(v, 'common', 'text'), 'ammo (selected)', w - 164, 58);
  rect(ctx, 40, h - 150, 140, 110, { stroke: C(v, 'designer', 'stick'), r: 10 });
  circle(ctx, 110, h - 95, 30, { stroke: { color: C(v, 'designer', 'touchbtn').color, width: 2 }, fill: C(v, 'designer', 'touchbtn').fill });
  const tb = C(v, 'designer', 'touchbtn');
  [['JUMP', w - 80, h - 80, 30], ['ATK', w - 150, h - 60, 26], ['USE', w - 90, h - 150, 22]].forEach(([t, x, y, r]) => {
    circle(ctx, x, y, r, { fill: tb.fill, stroke: { color: tb.color, width: 1.5 } });
    text(ctx, { font: tb.font, color: C(v, 'common', 'label').color }, t, x, y + 4, { align: 'center' });
  });
}

// ---------- ThreeSprite ----------

function rigCanvas (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'common', 'stage').color);
  checker(ctx, v, 20, 20, 256, 256);
  ctx.save(); ctx.globalAlpha = C(v, 'common', 'onion').alpha; sprite(ctx, 92, 56, 18, FIG); ctx.restore();
  sprite(ctx, 76, 56, 18, FIG);
  line(ctx, C(v, 'rig', 'mirror'), [[148, 20], [148, 276]]);
  line(ctx, C(v, 'rig', 'ground'), [[12, 262], [284, 262]]);
  const bone = (x1, y1, x2, y2, sel, name) => {
    const s = C(v, 'rig', sel ? 'bone.selected' : 'bone');
    const ang = Math.atan2(y2 - y1, x2 - x1); const n = 6;
    const pts = [[x1 + Math.cos(ang + Math.PI / 2) * n, y1 + Math.sin(ang + Math.PI / 2) * n], [x2, y2], [x1 + Math.cos(ang - Math.PI / 2) * n, y1 + Math.sin(ang - Math.PI / 2) * n]];
    poly(ctx, s.fill, pts); line(ctx, { color: s.color, width: s.width }, pts, true);
    const rt = C(v, 'rig', 'root');
    circle(ctx, x1, y1, rt.size, { fill: rt.fill, stroke: { color: s.color, width: rt.width } });
    circle(ctx, x2, y2, C(v, 'rig', 'tip').size, { fill: s.color });
    text(ctx, C(v, 'rig', 'boneLabel'), name, x1 + 8, y1 - 8);
  };
  bone(148, 190, 148, 110, false, '');
  text(ctx, C(v, 'rig', 'boneLabel'), 'spine', 154, 150);
  bone(148, 110, 110, 160, true, 'arm.l');
  bone(148, 190, 170, 255, false, 'leg.r');
  const p = C(v, 'rig', 'pivot');
  line(ctx, { color: p.color, width: p.width }, [[200 - p.size, 140], [200 + p.size, 140]]); line(ctx, { color: p.color, width: p.width }, [[200, 140 - p.size], [200, 140 + p.size]]);
  circle(ctx, 200, 140, 4, { stroke: { color: p.color, width: p.width } });
  line(ctx, C(v, 'rig', 'rubber'), [[230, 220], [268, 160]]); circle(ctx, 230, 220, 4, { stroke: { color: C(v, 'rig', 'rubber').color, width: 2 } });
  rect(ctx, 76, 56, 144, 216, { stroke: { color: C(v, 'rig', 'bounds').color, width: 1 } });
  // view tabs to the right
  const tabs = [['1', 'F'], ['2', 'B'], ['3', 'L'], ['4', 'R'], ['5', '45°'], ['6', '⇄2']];
  tabs.forEach(([n, l], i) => {
    const x = 300; const y = 24 + i * 42;
    rect(ctx, x, y, 56, 36, { fill: C(v, 'graph', 'node').fill, stroke: i === 0 ? C(v, 'common', 'selected') : { color: C(v, 'graph', 'node').color, width: 1 }, r: 6 });
    ctx.save(); if (i === 5) ctx.globalAlpha = 0.6;
    text(ctx, { font: 'bold 14px sans-serif', color: i === 0 ? C(v, 'common', 'selected').color : C(v, 'graph', 'node.title').color }, n, x + 28, y + 17, { align: 'center' });
    text(ctx, C(v, 'graph', 'node.text'), l, x + 28, y + 30, { align: 'center' }); ctx.restore();
  });
  text(ctx, C(v, 'common', 'text'), 'onion · mirror · ground · bones · pivot · new bone · views', 20, h - 8);
}

function timeline (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'timeline', 'bg').color);
  const lw = 110; const cell = 22; const hh = 22; const rows = ['spine', 'arm.l', 'arm.r', 'head', 'part: hat'];
  const hd = C(v, 'timeline', 'header');
  rect(ctx, 0, 0, w, hh, { fill: hd.fill });
  const cur = 5;
  for (let f = 0; f * cell + lw < w; f++) {
    const x = lw + f * cell;
    if (f === cur) rect(ctx, x, 0, cell, h, { fill: C(v, 'timeline', 'current').fill });
    text(ctx, { ...hd, color: f === cur ? C(v, 'timeline', 'current').color : hd.color }, String(f + 1), x + cell / 2, 15, { align: 'center' });
  }
  rows.forEach((r, i) => {
    const y = hh + i * cell;
    rect(ctx, 0, y, w, cell, { fill: i % 2 ? C(v, 'timeline', 'row.alt').fill : C(v, 'timeline', 'row').fill });
    text(ctx, C(v, 'timeline', 'label'), r, 10, y + 15);
    [0, 3, 7, 11].filter((f) => (f + i) % 2 === 0 || f === 0).forEach((f) => {
      const x = lw + f * cell + cell / 2; const yy = y + cell / 2; const sel = i === 1 && f === 0;
      const k = C(v, 'timeline', sel ? 'key.selected' : 'key');
      poly(ctx, k.fill, [[x, yy - k.size], [x + k.size, yy], [x, yy + k.size], [x - k.size, yy]]);
      if (sel) line(ctx, { color: k.color, width: 1.5 }, [[x, yy - k.size - 2], [x + k.size + 2, yy], [x, yy + k.size + 2], [x - k.size - 2, yy]], true);
    });
  });
  const px = lw + cur * cell + cell / 2;
  line(ctx, { ...C(v, 'common', 'playhead'), width: 1 }, [[px, 0], [px, h]]);
}

function facing3d (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'common', 'stage').color);
  for (let i = -6; i <= 6; i++) {
    const s = i % 3 ? C(v, 'common', 'grid.minor') : C(v, 'common', 'grid.major');
    line(ctx, { color: s.color, width: 1 }, [[w / 2 + i * 24 - 60, h - 20], [w / 2 + i * 10, h / 2]]);
  }
  for (let j = 0; j < 5; j++) { const y = h / 2 + j * (h / 2 - 20) / 4; line(ctx, { color: C(v, 'common', 'grid.minor').color, width: 1 }, [[w / 2 - 60 - 150 * (j / 4), y], [w / 2 + 60 + 90 * (j / 4), y]]); }
  sprite(ctx, w / 2 - 24, h / 2 - 50, 6, FIG);
  const f = C(v, 'rig', 'facing');
  line(ctx, f, [[w / 2, h / 2 + 22], [w / 2 + 50, h / 2 + 40]]);
  poly(ctx, f.color, [[w / 2 + 56, h / 2 + 42], [w / 2 + 44, h / 2 + 44], [w / 2 + 48, h / 2 + 34]]);
  const lb = C(v, 'rig', 'viewLabel');
  ctx.save(); ctx.font = lb.font; const tw = ctx.measureText('Front').width; ctx.restore();
  rect(ctx, w / 2 - tw / 2 - 6, h / 2 - 78, tw + 12, 22, { fill: lb.fill, r: 4 }); text(ctx, lb, 'Front', w / 2, h / 2 - 62, { align: 'center' });
}

// ---------- qPainter ----------

function paintCanvas (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'common', 'stage').color);
  const s = 112; const ox = 20; const oy = 20;
  // wrap preview: 3x3 tile, outer dimmed
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    const x = ox + i * s; const y = oy + j * s;
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x, y, s, s);
    for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#6b5a48' : '#4a3a2c'; ctx.fillRect(x + (k * 37) % s, y + (k * 23) % s, 26, 14); }
    if (!(i === 1 && j === 1)) { ctx.fillStyle = C(v, 'paint', 'wrapDim').fill; ctx.fillRect(x, y, s, s); }
  }
  const cx = ox + s; const cy = oy + s;
  for (let g = 0; g <= s; g += s / 4) { line(ctx, { color: C(v, 'paint', 'tileGrid').color, width: 1 }, [[cx + g, cy], [cx + g, cy + s]]); line(ctx, { color: C(v, 'paint', 'tileGrid').color, width: 1 }, [[cx, cy + g], [cx + s, cy + g]]); }
  line(ctx, C(v, 'paint', 'symmetry'), [[cx + s / 2, oy], [cx + s / 2, oy + 3 * s]]);
  line(ctx, C(v, 'paint', 'symmetry'), [[ox, cy + s / 2], [ox + 3 * s, cy + s / 2]]);
  marquee(ctx, v, cx + 10, cy + 12, 40, 30);
  circle(ctx, cx + 80, cy + 76, 10, { stroke: { color: C(v, 'common', 'cursor').color, width: 1 } });
  rect(ctx, cx + 30, cy + 80, 4, 4, { stroke: { color: C(v, 'common', 'cursor').color, width: 1 } });
  text(ctx, C(v, 'common', 'text'), 'wrap 3×3 · tile grid · symmetry · marquee · brush cursors', ox, oy + 3 * s + 16);
}

function skyCube (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'common', 'stage').color);
  const s = 60; const ox = 20; const oy = 20;
  ctx.fillStyle = '#3a5a9a'; ctx.fillRect(ox, oy, s * 4, s * 3);
  ctx.fillStyle = C(v, 'paint', 'sky.dim').fill;
  [[0, 0], [2, 0], [3, 0], [0, 2], [2, 2], [3, 2]].forEach(([i, j]) => ctx.fillRect(ox + i * s, oy + j * s, s, s));
  const faces = [['UP', 1, 0], ['WEST', 0, 1], ['NORTH', 1, 1], ['EAST', 2, 1], ['SOUTH', 3, 1], ['DOWN', 1, 2]];
  const lab = C(v, 'paint', 'sky.label');
  faces.forEach(([n, i, j]) => {
    rect(ctx, ox + i * s, oy + j * s, s, s, { stroke: C(v, 'paint', 'sky.face') });
    ctx.save(); ctx.font = lab.font; const tw = ctx.measureText(n).width; ctx.restore();
    rect(ctx, ox + i * s + s / 2 - tw / 2 - 4, oy + j * s + s / 2 - 9, tw + 8, 17, { fill: lab.fill, r: 3 });
    text(ctx, lab, n, ox + i * s + s / 2, oy + j * s + s / 2 + 4, { align: 'center' });
  });
  // panorama strip with horizon
  const py = oy + 3 * s + 20; const pw = w - 40;
  const gr = ctx.createLinearGradient(0, py, 0, py + 70); gr.addColorStop(0, '#203a70'); gr.addColorStop(0.55, '#8ab0e0'); gr.addColorStop(0.56, '#4a3a2a'); gr.addColorStop(1, '#2a1a10');
  ctx.fillStyle = gr; ctx.fillRect(ox, py, pw, 70);
  line(ctx, C(v, 'paint', 'horizon'), [[ox, py + 38], [ox + pw, py + 38]]);
  ['N', 'E', 'S', 'W'].forEach((d, i) => { const x = ox + (i + 0.5) * pw / 4; line(ctx, { ...C(v, 'paint', 'horizon'), dash: [2, 3] }, [[x, py], [x, py + 70]]); text(ctx, lab, d, x + 4, py + 14); });
}

function patternEditor (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'common', 'stage').color);
  const s = 14; const pat = [1, 0, 0, 0, 1, 0, 0, 0];
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    ctx.fillStyle = ((i + j * 3) % 4 === 0) ? C(v, 'common', 'label').color : C(v, 'common', 'checker.a').fill;
    ctx.fillRect(20 + i * s, 20 + j * s, s - 1, s - 1);
  }
  rect(ctx, 20 + 2 * s - 1, 20 + 3 * s - 1, s + 1, s + 1, { stroke: C(v, 'common', 'selected') });
  void pat;
  text(ctx, C(v, 'common', 'text'), '8×8 pattern', 20, 20 + 8 * s + 16);
  text(ctx, { font: '12px sans-serif', color: C(v, 'common', 'warning').color }, '⚠ won\'t tile', 160, 40);
}

// ---------- audio ----------

function wave (ctx, x, y, w, h, spec, seed = 1, over = null) {
  ctx.save(); ctx.fillStyle = spec.color;
  for (let i = 0; i < w; i += 2) {
    const t = i / w;
    const env = Math.min(1, t * 30) * Math.exp(-t * 3.5) * (1 + 0.15 * Math.sin(t * 50 * seed));
    const a = env * (0.6 + 0.4 * Math.abs(Math.sin(i * 0.37 * seed) * Math.cos(i * 0.11)));
    const amp = a * h / 2;
    if (over && a > 0.92) ctx.fillStyle = over; else ctx.fillStyle = spec.color;
    ctx.fillRect(x + i, y - amp, 1.5, amp * 2);
  }
  ctx.restore();
}

function waveform (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'audio', 'bg').color);
  const mid = 70;
  line(ctx, { color: C(v, 'audio', 'mid').color, width: 1 }, [[0, mid], [w, mid]]);
  line(ctx, C(v, 'audio', 'wave.full'), [[0, mid - 56], [w, mid - 56]]); line(ctx, C(v, 'audio', 'wave.full'), [[0, mid + 56], [w, mid + 56]]);
  wave(ctx, 10, mid, w - 20, 118, C(v, 'audio', 'wave'), 1, C(v, 'audio', 'wave.over').color);
  const layers = v.palette('layers');
  layers.forEach((c, i) => {
    const y = 150 + i * 30;
    rect(ctx, 10, y, w - 20, 24, { fill: C(v, 'audio', i % 2 ? 'lane.alt' : 'lane').fill, r: 4 });
    wave(ctx, 14, y + 12, (w - 30) * (1 - i * 0.18), 20, { color: c }, i + 1.7);
  });
  line(ctx, C(v, 'common', 'playhead'), [[w * 0.38, 0], [w * 0.38, h]]);
}

function envelope (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'audio', 'bg').color);
  for (let i = 1; i < 6; i++) line(ctx, { color: C(v, 'audio', 'grid').color, width: 1 }, [[i * w / 6, 0], [i * w / 6, h]]);
  ['0', '100 ms', '200 ms', '300 ms', '400 ms', '500 ms'].forEach((t, i) => text(ctx, C(v, 'audio', 'grid.label'), t, i * w / 6 + 4, h - 6));
  const pts = [[10, h - 20], [50, 20], [110, 70], [w * 0.65, 70], [w - 20, h - 20]];
  const env = C(v, 'audio', 'envelope');
  poly(ctx, env.fill, [...pts, [10, h - 20]]);
  line(ctx, env, pts.slice(0, 3)); line(ctx, C(v, 'audio', 'envelope.sustain'), pts.slice(2, 4)); line(ctx, env, pts.slice(3));
  pts.forEach(([x, y]) => circle(ctx, x, y, C(v, 'audio', 'envelope.handle').size, { fill: C(v, 'audio', 'envelope.handle').fill }));
  text(ctx, C(v, 'audio', 'grid.label'), 'A 40 · D 60 · S 70% · R 120 ms', w - 190, 16);
}

function flow (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'audio', 'bg').color);
  const n = C(v, 'audio', 'flow.node'); const t = C(v, 'audio', 'flow.text');
  const layers = v.palette('layers');
  const box = (x, y, bw, label, color) => { rect(ctx, x, y, bw, 30, { fill: n.fill, stroke: { color: n.color, width: 1 }, r: n.radius }); if (color) rect(ctx, x + 8, y + 11, 8, 8, { fill: color, r: 2 }); text(ctx, t, label, x + (color ? 22 : 10), y + 19); };
  layers.slice(0, 3).forEach((c, i) => { box(10, 14 + i * 40, 140, `${i + 1} noise · 80%`, c); line(ctx, C(v, 'audio', 'flow.line'), [[150, 29 + i * 40], [190, 69]]); });
  circle(ctx, 200, 69, 12, { fill: n.fill, stroke: { color: n.color, width: 1 } }); text(ctx, t, '+', 200, 73, { align: 'center' });
  line(ctx, C(v, 'audio', 'flow.line'), [[212, 69], [240, 69]]);
  box(240, 54, 80, '2 rings'); line(ctx, C(v, 'audio', 'flow.line'), [[320, 69], [340, 69]]);
  box(340, 54, 90, 'vol −3 dB'); line(ctx, C(v, 'audio', 'flow.line'), [[430, 69], [450, 69]]);
  box(450, 54, 70, '🔊 game');
}

function engineField (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'audio', 'bg').color);
  const cx = w / 2; const cy = h / 2;
  [25, 55, 95].forEach((r, i) => { circle(ctx, cx, cy, r, { stroke: C(v, 'audio', 'field.ring') }); text(ctx, C(v, 'audio', 'grid.label'), ['3.3 u', '12.5 u', '25 u (silent)'][i], cx + r * 0.72 + 4, cy - r * 0.72); });
  ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 60, -2, -1.1); ctx.closePath(); ctx.fillStyle = C(v, 'audio', 'field.listener').color; ctx.globalAlpha = 0.25; ctx.fill(); ctx.restore();
  circle(ctx, cx, cy, 6, { fill: C(v, 'audio', 'field.listener').color });
  [[60, 40, 'played', 4], [150, 60, 'played', 7], [w - 70, 50, 'refused', 5], [w - 120, h - 40, 'played', 9]].forEach(([x, y, k, r]) => circle(ctx, x, y, r, { fill: C(v, 'audio', `field.${k}`).color }));
}

function matchRange (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'audio', 'bg').color);
  wave(ctx, 10, h / 2, w - 20, h - 20, C(v, 'audio', 'wave'), 2.3);
  ctx.fillStyle = C(v, 'audio', 'match.dim').fill; ctx.fillRect(0, 0, w * 0.3, h); ctx.fillRect(w * 0.62, 0, w * 0.38, h);
  line(ctx, C(v, 'audio', 'match.edge'), [[w * 0.3, 0], [w * 0.3, h]]); line(ctx, C(v, 'audio', 'match.edge'), [[w * 0.62, 0], [w * 0.62, h]]);
}

function scope (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'audio', 'bg').color);
  for (let i = 0; i < 64; i++) { const bh = (Math.exp(-i / 18) * 0.8 + 0.1 * Math.abs(Math.sin(i))) * h; ctx.fillStyle = C(v, 'audio', 'spectrum').color; ctx.fillRect(i * w / 64, h - bh, w / 64 - 1, bh); }
  line(ctx, { color: C(v, 'audio', 'mid').color, width: 1 }, [[0, h / 2], [w, h / 2]]);
  const pts = []; for (let x = 0; x < w; x += 2) pts.push([x, h / 2 - Math.sin(x / 22) * 30 - Math.sin(x / 7) * 8]);
  line(ctx, C(v, 'audio', 'scope'), pts);
}

function harmonics (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'audio', 'bg').color);
  for (let i = 0; i < 32; i++) {
    const bh = (h - 30) / (1 + i * 0.4) * (i % 3 === 1 ? 0.5 : 1);
    ctx.fillStyle = C(v, 'audio', i % 4 === 0 ? 'harmonic.strong' : 'harmonic').color;
    ctx.fillRect(10 + i * (w - 20) / 32, h - 16 - bh, (w - 20) / 32 - 2, bh);
  }
  [1, 8, 16, 24, 32].forEach((n) => text(ctx, C(v, 'audio', 'grid.label'), String(n), 10 + (n - 1) * (w - 20) / 32, h - 4));
}

function shaper (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'audio', 'bg').color);
  line(ctx, { color: C(v, 'audio', 'grid').color, width: 1 }, [[w / 2, 0], [w / 2, h]]); line(ctx, { color: C(v, 'audio', 'grid').color, width: 1 }, [[0, h / 2], [w, h / 2]]);
  const pts = []; for (let i = 0; i <= 8; i++) { const x = -1 + i / 4; pts.push([w / 2 + x * (w / 2 - 14), h / 2 - Math.tanh(x * 2.4) * (h / 2 - 14)]); }
  line(ctx, C(v, 'audio', 'shaper'), pts);
  pts.forEach(([x, y]) => circle(ctx, x, y, 4, { fill: C(v, 'audio', 'envelope.handle').fill }));
  text(ctx, C(v, 'audio', 'grid.label'), 'in → out (drag the points)', 8, 14);
}

function filterResponse (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'audio', 'bg').color);
  ctx.fillStyle = C(v, 'audio', 'filter.danger').fill; ctx.fillRect(w * 0.86, 0, w * 0.14, h);
  ['50', '200', '1k', '5k', '10k'].forEach((t, i) => { const x = 20 + i * (w - 40) / 4; line(ctx, { color: C(v, 'audio', 'grid').color, width: 1 }, [[x, 0], [x, h]]); text(ctx, C(v, 'audio', 'grid.label'), t, x + 3, h - 4); });
  const pts = []; for (let x = 0; x < w; x += 2) { const f = x / w; pts.push([x, h * 0.35 - (f > 0.5 && f < 0.56 ? 18 * Math.sin((f - 0.5) / 0.06 * Math.PI) : 0) + (f > 0.55 ? (f - 0.55) * h * 2.2 : 0)]); }
  line(ctx, C(v, 'audio', 'envelope'), pts);
}

function eq (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'audio', 'bg').color);
  [-12, -6, 0, 6, 12].forEach((db) => { const y = h / 2 - db * (h / 30); line(ctx, { color: db === 0 ? C(v, 'audio', 'bar').color : C(v, 'audio', 'grid').color, width: 1 }, [[0, y], [w, y]]); text(ctx, C(v, 'audio', 'grid.label'), `${db}`, 4, y - 2); });
  ctx.fillStyle = C(v, 'audio', 'filter.danger').fill; ctx.fillRect(w * 0.88, 0, w * 0.12, h);
  const pts = []; for (let x = 0; x < w; x += 2) { const f = x / w; pts.push([x, h / 2 - 30 * Math.exp(-((f - 0.12) ** 2) / 0.006) + 22 * Math.exp(-((f - 0.5) ** 2) / 0.01) - 26 * Math.exp(-((f - 0.82) ** 2) / 0.01)]); }
  line(ctx, C(v, 'audio', 'envelope'), pts);
  [[0.12, -30, 'eq.low'], [0.5, 22, 'eq.mid'], [0.82, -26, 'eq.high']].forEach(([f, g, k]) => circle(ctx, f * w, h / 2 - g, 7, { fill: C(v, 'audio', k).color, stroke: { color: '#000', width: 1 } }));
}

function arrange (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'audio', 'lane').color);
  const rh = 22; const tracks = v.palette('tracks');
  const r = C(v, 'common', 'ruler');
  rect(ctx, 0, 0, w, rh, { fill: r.fill });
  const lp = C(v, 'common', 'loop');
  rect(ctx, w * 0.25, 0, w * 0.375, rh, { fill: lp.fill });
  ctx.save(); ctx.globalAlpha = 0.4; rect(ctx, w * 0.25, rh, w * 0.375, h - rh, { fill: lp.fill }); ctx.restore();
  line(ctx, lp, [[w * 0.25, 0], [w * 0.25, h]]); line(ctx, lp, [[w * 0.625, 0], [w * 0.625, h]]);
  for (let b = 0; b < 16; b++) {
    const x = b * w / 16;
    line(ctx, { color: C(v, 'audio', 'bar').color, width: 1 }, [[x + 0.5, rh], [x + 0.5, h]]);
    for (let q = 1; q < 4; q++) line(ctx, { color: C(v, 'audio', 'beat').color, width: 1 }, [[x + q * w / 64 + 0.5, rh], [x + q * w / 64 + 0.5, h]]);
    text(ctx, r, String(b + 1), x + 3, 15);
  }
  for (let t = 0; t < 5; t++) {
    const y = rh + t * 36;
    rect(ctx, 0, y, w, 36, { fill: t % 2 ? C(v, 'audio', 'lane.alt').fill : null });
    for (let n = 0; n < 40; n++) { const x = (n * 37 + t * 13) % (w - 60); ctx.fillStyle = tracks[t]; ctx.fillRect(x, y + 6 + ((n * 7 + t * 3) % 24), 10 + (n % 3) * 6, 3); }
    circle(ctx, w - 12, y + 18, 3, { fill: t < 3 ? C(v, 'audio', 'activity').color : C(v, 'audio', 'mid').color });
  }
  ctx.fillStyle = C(v, 'audio', 'songEnd').fill; ctx.fillRect(w * 0.88, rh, w * 0.12, h - rh);
  line(ctx, C(v, 'common', 'playhead'), [[w * 0.41, 0], [w * 0.41, h]]);
}

function pianoRoll (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'audio', 'lane').color);
  const kw = 46; const rh = 12; const top = 20; const tracks = v.palette('tracks');
  for (let i = 0; top + i * rh < h - 50; i++) {
    const black = [1, 3, 6, 8, 10].includes((60 - i) % 12);
    rect(ctx, kw, top + i * rh, w - kw, rh, { fill: black ? C(v, 'audio', 'lane.alt').fill : null });
    rect(ctx, 0, top + i * rh, kw, rh - 1, { fill: C(v, 'audio', black ? 'key.black' : 'key.white').color });
    if (i === 6) rect(ctx, 0, top + i * rh, kw, rh - 1, { fill: C(v, 'audio', 'key.lit').color });
    if ((60 - i) % 12 === 0) text(ctx, { font: '9px sans-serif', color: '#333' }, `C${Math.floor((60 - i) / 12) - 1}`, 4, top + i * rh + 9);
  }
  for (let b = 0; b < 8; b++) line(ctx, { color: C(v, 'audio', b % 4 ? 'beat' : 'bar').color, width: 1 }, [[kw + b * (w - kw) / 8, top], [kw + b * (w - kw) / 8, h - 50]]);
  rect(ctx, kw, 0, w - kw, top, { fill: C(v, 'common', 'ruler').fill });
  rect(ctx, kw + (w - kw) * 0.25, 0, (w - kw) * 0.5, top, { fill: C(v, 'common', 'loop').fill });
  const notes = [[0, 6, 2], [2, 9, 1], [3, 4, 2], [5, 6, 1], [6, 11, 2]];
  ctx.save(); ctx.globalAlpha = C(v, 'audio', 'note.ghost').alpha;
  [[1, 14, 3], [4, 16, 2]].forEach(([s, n, l]) => rect(ctx, kw + s * (w - kw) / 8 + 1, top + n * rh + 1, l * (w - kw) / 8 - 2, rh - 2, { fill: tracks[3], r: 2 }));
  ctx.restore();
  notes.forEach(([s, n, l], i) => {
    rect(ctx, kw + s * (w - kw) / 8 + 1, top + n * rh + 1, l * (w - kw) / 8 - 2, rh - 2, { fill: i === 1 ? C(v, 'audio', 'note.playing').color : tracks[0], stroke: i === 3 ? C(v, 'audio', 'note.selected') : null, r: 2 });
  });
  // velocity / cc lane
  const ly = h - 46;
  rect(ctx, 0, ly, w, 46, { fill: C(v, 'audio', 'bg').color });
  notes.forEach(([s], i) => { const x = kw + s * (w - kw) / 8 + 4; const vh = 10 + i * 6; line(ctx, { color: tracks[0], width: 2 }, [[x, ly + 42], [x, ly + 42 - vh]]); circle(ctx, x, ly + 42 - vh, 2.5, { fill: tracks[0] }); });
  const cc = C(v, 'audio', 'cc');
  const ccp = [[kw + 200, ly + 30], [kw + 240, ly + 30], [kw + 240, ly + 12], [w - 10, ly + 12]];
  line(ctx, cc, ccp); ccp.forEach(([x, y]) => rect(ctx, x - cc.size / 2, y - cc.size / 2, cc.size, cc.size, { fill: cc.color }));
  line(ctx, C(v, 'common', 'playhead'), [[kw + (w - kw) * 0.33, 0], [kw + (w - kw) * 0.33, h - 46]]);
}

function cutterTimeline (ctx, w, h, v) {
  bg(ctx, w, h, C(v, 'audio', 'bg').color);
  for (let i = 0; i < w; i += 3) { const d = (0.3 + 0.7 * Math.abs(Math.sin(i / 40) * Math.cos(i / 13))) * (h - 30); ctx.fillStyle = C(v, 'audio', 'density').color; ctx.fillRect(i, h - 10 - d, 2, d); }
  for (let b = 0; b <= 16; b++) { const x = b * w / 16; line(ctx, { color: C(v, 'audio', b % 4 ? 'beat' : 'bar').color, width: 1 }, [[x, 0], [x, h]]); if (b % 4 === 0) text(ctx, C(v, 'audio', 'grid.label'), String(b + 1), x + 3, 12); }
  const lp = C(v, 'common', 'loop');
  rect(ctx, w * 0.25, 0, w * 0.25, h, { fill: lp.fill }); line(ctx, lp, [[w * 0.25, 0], [w * 0.25, h]]); line(ctx, lp, [[w * 0.5, 0], [w * 0.5, h]]);
  line(ctx, C(v, 'common', 'playhead'), [[w * 0.36, 0], [w * 0.36, h]]);
}

export const DRAW = { mapEditor, graphEditor, rigCanvas, timeline, paintCanvas, waveform, envelope, arrange, pianoRoll, facing3d, scope, stateGraph, spritePreview, eq };

export const SCENES = {
  patterns,
  groups: [
    { id: 'map', title: 'Studio: map editor', list: [
      ['map editor: rooms, corners, walls, markers, triggers, problems, camera paths', 540, 320, mapEditor],
      ['metamap: cells, neighbours, seams', 520, 290, metamap]] },
    { id: 'graph', title: 'Studio: graphs', list: [
      ['graph editor: board, nodes by kind, pins, wires, bends, note', 520, 330, graphEditor],
      ['monster / weapon state graph', 460, 270, stateGraph]] },
    { id: 'preview', title: 'Studio: previews', list: [
      ['sprite preview: ruler, floor', 320, 260, spritePreview],
      ['swing preview', 420, 190, swingPreview],
      ['map thumbnail', 200, 150, mapThumb],
      ['9-slice guides', 320, 180, nineSlice],
      ['sprite-sheet cutter', 440, 140, sheetCutter]] },
    { id: 'designer', title: 'Studio: panels and screens designers', list: [
      ['panels: device, safe area, panel, slots (selected, hidden), decor', 420, 280, panelsDesigner],
      ['screens: HUD hit-boxes, stick zone, touch buttons', 420, 280, screensDesigner]] },
    { id: 'sprite', title: 'ThreeSprite', list: [
      ['pixel canvas: onion, mirror, ground, rig, pivot, view tabs', 370, 300, rigCanvas],
      ['timeline: keys, current frame, playhead', 440, 134, timeline],
      ['3D preview: facing arrow, view label', 360, 220, facing3d]] },
    { id: 'paint', title: 'qPainter', list: [
      ['wrap, tile grid, symmetry, marquee, brush cursor', 380, 390, paintCanvas],
      ['skybox: cube cross, panorama horizon and compass', 380, 290, skyCube],
      ['pattern editor', 300, 160, patternEditor]] },
    { id: 'audio', title: 'DigidreamSound and DigidreamSynth', list: [
      ['waveform, layer lanes, over-full, playhead', 480, 270, waveform],
      ['envelope editor', 420, 170, envelope],
      ['signal flow (DigidreamSound)', 530, 140, flow],
      ['engine test field (DigidreamSound)', 360, 220, engineField],
      ['match a recording: range', 420, 110, matchRange],
      ['scope: spectrum + wave', 420, 130, scope],
      ['harmonics', 360, 140, harmonics],
      ['shaper curve', 220, 180, shaper],
      ['filter response', 380, 120, filterResponse],
      ['master EQ', 420, 180, eq],
      ['arrange lanes, loop, song end', 520, 210, arrange],
      ['piano roll: keys, notes, ghost, selected, velocity / CC lane', 520, 300, pianoRoll],
      ['track cutter timeline', 520, 110, cutterTimeline]] },
  ],
};
