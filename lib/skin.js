// The skin compiler: a skin source (skin.json + the files it names) in, a
// compiled skin out. The compiled skin is plain data (CSS strings, resolved
// canvas specs, icon and font URLs) that runtime.js applies to a page. The
// testbench compiles in the browser on every change; build.js compiles in
// node and inlines the files, giving the one-file bundle a tool ships.
// SKIN_FORMAT.md is the format; this file must agree with it.

import { COMPONENTS, STATES, STYLE_KEYS, PX_KEYS } from './registry.js';

export const FORMAT = 'dnp-skin';
export const VERSION = 1;
const TOP_KEYS = new Set(['format', 'version', 'id', 'name', 'about', 'author', 'extends', 'fonts', 'tokens', 'modes',
  'pointers', 'components', 'icons', 'canvas', 'palettes', 'brand']);
const CANVAS_KEYS = new Set(['color', 'fill', 'width', 'dash', 'size', 'radius', 'font', 'alpha', 'text']);
const REF = /\$([A-Za-z][\w]*(?:\.[\w]+)*)(?:\/(\d{1,3}))?/g;

// ---------- small helpers ----------

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Deep merge: objects merge, everything else replaces, null deletes. */
export function merge (base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (v === null) delete out[k];
    else out[k] = isObj(v) && isObj(out[k]) ? merge(out[k], v) : v;
  }
  return out;
}

/** Flatten a token tree to 'color.bg.app' -> value. */
export function flatten (tree, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(tree ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (isObj(v)) flatten(v, key, out); else out[key] = v;
  }
  return out;
}

/** '#rgb', '#rrggbb(aa)', 'rgb(a)(…)' -> [r,g,b,a] or null. */
export function parseColor (str) {
  if (typeof str !== 'string') return null;
  const s = str.trim();
  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((ch) => ch + ch).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  m = /^rgba?\(([^)]+)\)$/i.exec(s);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  if (s === 'transparent') return [0, 0, 0, 0];
  if (s === 'white') return [255, 255, 255, 1];
  if (s === 'black') return [0, 0, 0, 1];
  return null;
}

export function colorString ([r, g, b, a]) {
  const round = (x) => Math.round(x * 1000) / 1000;
  if (a >= 1) return '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${round(a)})`;
}

const px = (key, v) => (typeof v === 'number' && PX_KEYS.has(key) ? `${v}px` : v);

// ---------- token resolution ----------

/**
 * Build a resolver over a flat token map. resolve(value) substitutes every
 * $ref (and $ref/NN alpha) in a string, recursively; a value that is a single
 * bare $ref keeps the token's type (a number stays a number).
 */
export function makeResolver (flat, warn, where = '') {
  const done = new Map();
  const stack = new Set();
  function token (name, at) {
    if (done.has(name)) return done.get(name);
    if (!(name in flat)) { warn(`${at}: no token "${name}"`); return undefined; }
    if (stack.has(name)) { warn(`${at}: token "${name}" refers to itself`); return undefined; }
    stack.add(name);
    const v = resolve(flat[name], `tokens.${name}`);
    stack.delete(name);
    done.set(name, v);
    return v;
  }
  function withAlpha (v, pct, at) {
    const c = parseColor(String(v));
    if (!c) { warn(`${at}: "/${pct}" needs a colour, got "${v}"`); return v; }
    c[3] *= Math.min(100, +pct) / 100;
    return colorString(c);
  }
  function resolve (v, at = where) {
    if (typeof v !== 'string' || !v.includes('$')) return v;
    const whole = /^\$([A-Za-z][\w]*(?:\.[\w]+)*)(?:\/(\d{1,3}))?$/.exec(v);
    if (whole) {
      const t = token(whole[1], at);
      return whole[2] ? withAlpha(t, whole[2], at) : t;
    }
    return v.replace(REF, (_, name, pct) => {
      const t = token(name, at);
      if (t === undefined) return 'transparent';
      return pct ? withAlpha(t, pct, at) : String(px('size', t));
    });
  }
  return { resolve, token };
}

/** Walk any tree, resolving every string leaf. */
function resolveTree (tree, r, at) {
  if (Array.isArray(tree)) return tree.map((v, i) => resolveTree(v, r, `${at}[${i}]`));
  if (isObj(tree)) return Object.fromEntries(Object.entries(tree).map(([k, v]) => [k, resolveTree(v, r, `${at}.${k}`)]));
  return r.resolve(tree, at);
}

// ---------- loading a chain of skins ----------

// Keys whose string values are file paths, relative to the skin that wrote them.
const FILE_KEYS = new Set(['image', 'file']);

function rebase (tree, base, toUrl, inBrand = false) {
  if (Array.isArray(tree)) return tree.map((v) => rebase(v, base, toUrl, inBrand));
  if (!isObj(tree)) return tree;
  const out = {};
  for (const [k, v] of Object.entries(tree)) {
    if (typeof v === 'string' && (FILE_KEYS.has(k) || inBrand) && !/^(data:|blob:|https?:|\/)/.test(v) && !v.startsWith('$')) out[k] = toUrl(base + v);
    else out[k] = rebase(v, base, toUrl, inBrand || k === 'brand');
  }
  return out;
}

/**
 * Load a skin and the skins it extends. `source.read(path)` returns text or
 * null; paths are 'skins/<name>/skin.json'. `source.url(path)` turns a path
 * into what the page loads (default: the path). Returns the merged source,
 * the chain (child first) and the warnings.
 */
export async function loadChain (name, source, warnings = []) {
  const chain = [];
  const seen = new Set();
  let cur = name;
  while (cur) {
    if (seen.has(cur)) { warnings.push(`extends: "${cur}" makes a loop`); break; }
    seen.add(cur);
    const path = `skins/${cur}/skin.json`;
    const text = await source.read(path);
    if (text == null) { warnings.push(`${path}: not found`); break; }
    let json;
    try { json = JSON.parse(text); } catch (e) { warnings.push(`${path}: not JSON (${e.message})`); break; }
    chain.push({ name: cur, base: `skins/${cur}/`, json, text });
    cur = json.extends ?? null;
  }
  let merged = {};
  for (const link of [...chain].reverse()) {
    const toUrl = source.url ?? ((p) => p);
    const own = rebase(link.json, link.base, toUrl);
    if (own.icons) delete own.icons.dir; // dirs are per skin, kept in the chain
    if (isObj(own.icons?.files)) {
      own.icons.files = Object.fromEntries(Object.entries(own.icons.files)
        .map(([id, f]) => [id, /^(data:|blob:|https?:|\/)/.test(f) ? f : toUrl(link.base + f)]));
    }
    merged = merge(merged, own);
  }
  merged.id = chain[0]?.json.id ?? name;
  return { merged, chain, warnings };
}

// ---------- validation ----------

function validate (skin, warn) {
  for (const k of Object.keys(skin)) if (!TOP_KEYS.has(k)) warn(`unknown top-level key "${k}"`);
  if (skin.format !== undefined && skin.format !== FORMAT) warn(`format is "${skin.format}", expected "${FORMAT}"`);
  if (skin.version !== undefined && skin.version > VERSION) warn(`version ${skin.version} is newer than this kit (${VERSION})`);
  for (const [name, def] of Object.entries(skin.components ?? {})) {
    const comp = COMPONENTS[name];
    if (!comp) { warn(`components.${name}: no such component`); continue; }
    checkBlock(def, comp, null, `components.${name}`, warn, true);
  }
  for (const [g, specs] of Object.entries(skin.canvas ?? {})) {
    if (!isObj(specs)) { warn(`canvas.${g}: must be an object`); continue; }
    for (const [k, v] of Object.entries(specs)) {
      if (isObj(v)) for (const kk of Object.keys(v)) if (!CANVAS_KEYS.has(kk)) warn(`canvas.${g}.${k}: unknown key "${kk}"`);
    }
  }
}

function checkBlock (block, comp, part, at, warn, root) {
  if (!isObj(block)) { warn(`${at}: must be an object`); return; }
  const states = part ? comp.parts[part].states : comp.states;
  for (const [k, v] of Object.entries(block)) {
    if (k in STYLE_KEYS) continue;
    if (states.includes(k)) { checkBlock(v, comp, part, `${at}.${k}`, warn, false); continue; }
    if (!part && k in comp.parts) { checkBlock(v, comp, k, `${at}.${k}`, warn, false); continue; }
    if (root && !part && k === 'variants') {
      for (const [vn, vb] of Object.entries(v ?? {})) {
        if (!comp.variants.includes(vn)) warn(`${at}.variants.${vn}: ${comp.name} has no variant "${vn}" (has: ${comp.variants.join(', ') || 'none'})`);
        else checkBlock(vb, comp, null, `${at}.variants.${vn}`, warn, false);
      }
      continue;
    }
    warn(`${at}: unknown key "${k}"`);
  }
}

// ---------- CSS ----------

/** One style block -> CSS declarations. */
export function declarations (style) {
  const out = [];
  for (const [k, raw] of Object.entries(style)) {
    const prop = STYLE_KEYS[k];
    if (prop === undefined || prop === null || isObj(raw)) continue;
    let v = raw;
    if (Array.isArray(v)) v = v.map((x) => px(k, x)).join(' ');
    else v = px(k, v);
    if (k === 'blur') v = `blur(${v})`;
    if (k === 'case' && v === 'small-caps') { out.push('font-variant: small-caps'); continue; }
    if (k === 'italic') v = raw ? 'italic' : 'normal';
    if (k === 'tracking' && typeof raw === 'number') v = `${raw}em`;
    out.push(`${prop}: ${v}`);
  }
  if (style.image) {
    const sl = [].concat(style.slice ?? 0);
    const four = sl.length === 1 ? [sl[0], sl[0], sl[0], sl[0]] : sl.length === 2 ? [sl[0], sl[1], sl[0], sl[1]] : sl;
    const edge = [].concat(style.edge ?? four);
    out.push(`border-style: solid`, `border-color: transparent`,
      `border-width: ${edge.map((x) => `${x}px`).join(' ')}`,
      `border-image-source: url("${style.image}")`,
      `border-image-slice: ${four.join(' ')} fill`,
      `border-image-width: ${edge.map((x) => `${x}px`).join(' ')}`,
      `border-image-repeat: ${style.repeat ?? 'stretch'}`);
  }
  return out;
}

const variantCls = (comp, v) => `.ui-${comp.name}--${v}`;
const partCls = (comp, p) => `.ui-${comp.name}__${p}`;
const withState = (sel, state) => STATES[state].map((suf) => sel + suf);

/** CSS rules for every component, under `scope` (a selector prefix). */
export function componentCss (components, scope) {
  const rules = [];
  const emit = (selectors, style) => {
    const d = declarations(style);
    if (d.length) rules.push(`${selectors.map((s) => `${scope} ${s}`).join(',\n')} { ${d.join('; ')}; }`);
  };
  // a block at `sels` (selectors of the element the block styles); parts and
  // states nest, variants only at the root.
  function block (comp, def, rootSels, part) {
    const sels = part ? rootSels.map((s) => `${s} ${partCls(comp, part)}`) : rootSels;
    emit(sels, def);
    const states = part ? comp.parts[part].states : comp.states;
    for (const st of states) {
      if (!isObj(def[st])) continue;
      const stSels = sels.flatMap((s) => withState(s, st));
      emit(stSels, def[st]);
      if (!part) for (const p of Object.keys(comp.parts)) if (isObj(def[st][p])) partBlock(comp, def[st][p], stSels, p);
    }
    if (!part) for (const p of Object.keys(comp.parts)) if (isObj(def[p])) partBlock(comp, def[p], rootSels, p);
  }
  function partBlock (comp, def, rootSels, p) {
    const sels = rootSels.map((s) => `${s} ${partCls(comp, p)}`);
    emit(sels, def);
    for (const st of comp.parts[p].states) if (isObj(def[st])) emit(sels.flatMap((s) => withState(s, st)), def[st]);
  }
  for (const [name, def] of Object.entries(components ?? {})) {
    const comp = COMPONENTS[name];
    if (!comp || !isObj(def)) continue;
    const root = [`.ui-${name}`];
    block(comp, def, root, null);
    for (const [v, vdef] of Object.entries(def.variants ?? {})) {
      if (!comp.variants.includes(v) || !isObj(vdef)) continue;
      block(comp, vdef, [`.ui-${name}${variantCls(comp, v)}`], null);
    }
  }
  return rules.join('\n');
}

/** Every token as a CSS variable: color.bg.app -> --dnp-color-bg-app. */
export function tokenVars (flatResolved) {
  return Object.entries(flatResolved)
    .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
    .map(([k, v]) => `--dnp-${k.replace(/\./g, '-')}: ${typeof v === 'number' && /^(size|radius|space)\./.test(k) ? `${v}px` : v}`)
    .join('; ');
}

// ---------- canvas ----------

/** A canvas entry -> { color, fill, width, dash, size, radius, font, alpha, text }. */
export function normalizeCanvas (v) {
  if (typeof v === 'string') return { color: v, fill: v, width: 1, dash: [], alpha: 1 };
  if (typeof v === 'number') return { size: v, width: v, dash: [], alpha: 1 };
  const out = { width: 1, dash: [], alpha: 1, ...v };
  if (out.fill === undefined) out.fill = out.color;
  if (out.color === undefined) out.color = out.fill;
  return out;
}

// ---------- compile ----------

/**
 * Compile a merged skin source into what a page applies. Returns
 * { id, name, modes, pointers, fonts, css: {'<mode>/<pointer>': text},
 *   canvas: {'<mode>/<pointer>': {group: {key: spec}}}, tokens: {...},
 *   palettes: {...}, icons, brand, warnings }.
 * `scopeFor(mode, pointer)` gives the selector prefix of each variant's CSS.
 */
export function compile (merged, { warnings = [], scopeFor = defaultScope } = {}) {
  const warn = (m) => warnings.push(m);
  validate(merged, warn);
  const modes = Object.keys(merged.modes ?? { dark: {} });
  if (!modes.length) modes.push('dark');
  const pointers = ['mouse', ...Object.keys(merged.pointers ?? {}).filter((p) => p !== 'mouse')];
  const out = {
    format: FORMAT, version: VERSION, id: merged.id, name: merged.name ?? merged.id, about: merged.about ?? '',
    modes, pointers, fonts: merged.fonts ?? [], css: {}, canvas: {}, tokens: {}, palettes: {},
    icons: merged.icons ?? {}, brand: merged.brand ?? {}, warnings,
  };
  const seenWarn = new Set();
  for (const mode of modes) {
    for (const pointer of pointers) {
      const key = `${mode}/${pointer}`;
      let tree = merged.tokens ?? {};
      tree = merge(tree, merged.modes?.[mode] ?? {});
      if (pointer !== 'mouse') tree = merge(tree, merged.pointers?.[pointer] ?? {});
      const flat = flatten(tree);
      // warn once per message, not once per variant
      const w = (m) => { if (!seenWarn.has(m)) { seenWarn.add(m); warn(m); } };
      const r = makeResolver(flat, w);
      const toks = Object.fromEntries(Object.keys(flat).map((k) => [k, r.token(k, `tokens.${k}`)]));
      out.tokens[key] = toks;
      const comps = resolveTree(merged.components ?? {}, r, 'components');
      const scope = scopeFor(mode, pointer);
      out.css[key] = `${scope} { ${tokenVars(toks)}; }\n` + componentCss(comps, scope);
      const canvas = {};
      for (const [g, specs] of Object.entries(resolveTree(merged.canvas ?? {}, r, 'canvas'))) {
        canvas[g] = Object.fromEntries(Object.entries(specs).map(([k, v]) => [k, normalizeCanvas(v)]));
      }
      out.canvas[key] = canvas;
      out.palettes[key] = resolveTree(merged.palettes ?? {}, r, 'palettes');
    }
  }
  out.fontCss = (out.fonts ?? []).map((f) => `@font-face { font-family: "${f.family}"; src: url("${f.file}"); font-weight: ${f.weight ?? 400}; font-style: ${f.style ?? 'normal'}; font-display: swap; }`).join('\n');
  return out;
}

export function defaultScope (mode, pointer) {
  return `:where([data-dnp-mode="${mode}"][data-dnp-pointer="${pointer}"])`;
}

// ---------- icons ----------

/** Where icon `id` would live in each skin of the chain, child first. */
export function iconCandidates (id, chain, merged) {
  const files = merged.icons?.files ?? {};
  if (files[id]) return [files[id]];
  const rel = id.replace(/\./g, '/');
  return chain.map((link) => {
    const ic = link.json.icons ?? {};
    return `${link.base}${ic.dir ?? 'icons'}/${rel}.${ic.ext ?? 'svg'}`;
  });
}
