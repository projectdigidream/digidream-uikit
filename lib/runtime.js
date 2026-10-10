// What a tool carries to wear a skin. No imports, so a tool can vendor this
// one file next to a baked skin bundle (build.js). It never compiles: it
// takes a compiled skin (skin.js compile(), or a baked bundle) and
//   - puts its CSS on the page (every mode and pointer at once, so switching
//     is an attribute change),
//   - marks a root with data-dnp-mode / data-dnp-pointer,
//   - answers canvas colours, palettes, tokens and icons for that root.
//
//   import { applySkin } from './runtime.js'
//   const skin = applySkin(bundle, { mode: 'auto', pointer: 'auto' })
//   ctx.strokeStyle = skin.canvas('common', 'playhead').color
//   skin.onChange(() => redrawEverything())

const STYLE_ID = 'dnp-skin-css';

/** Put a compiled skin's CSS on a page (replacing an earlier one). */
export function installCss (compiled, doc = document) {
  let el = doc.getElementById(STYLE_ID);
  if (!el) { el = doc.createElement('style'); el.id = STYLE_ID; doc.head.append(el); }
  el.textContent = [compiled.fontCss ?? '', ...Object.values(compiled.css)].join('\n');
}

/**
 * A read view of one mode/pointer of a compiled skin: what canvas code and
 * icon code ask for. Missing keys come back as a loud magenta so a tool that
 * asks for a key the skin lacks shows it rather than drawing nothing.
 */
export function skinView (compiled, mode, pointer) {
  const key = pick(compiled, mode, pointer);
  const canvas = compiled.canvas[key] ?? {};
  const MISSING = { color: '#ff00ff', fill: '#ff00ff', width: 1, dash: [], alpha: 1, size: 6, font: '11px sans-serif' };
  return {
    key, mode: key.split('/')[0], pointer: key.split('/')[1],
    canvas: (group, name) => canvas[group]?.[name] ?? (warnOnce(`canvas.${group}.${name}`), MISSING),
    palette: (name) => compiled.palettes[key]?.[name] ?? [],
    token: (name) => compiled.tokens[key]?.[name],
    iconUrl: (id) => compiled.icons?.urls?.[id] ?? null,
    iconTint: compiled.icons?.tint !== false,
    compiled,
  };
}

function pick (compiled, mode, pointer) {
  const m = compiled.modes.includes(mode) ? mode : compiled.modes[0];
  const p = compiled.pointers.includes(pointer) ? pointer : 'mouse';
  return `${m}/${p}`;
}

const warned = new Set();
function warnOnce (what) { if (!warned.has(what)) { warned.add(what); console.warn(`skin: no ${what}`); } }

/**
 * Wear a skin on a page. mode 'auto' follows prefers-color-scheme (when the
 * skin has a light mode); pointer 'auto' follows (pointer: coarse).
 */
export function applySkin (compiled, { root = document.documentElement, mode = 'auto', pointer = 'auto' } = {}) {
  installCss(compiled, root.ownerDocument);
  const listeners = new Set();
  const mqDark = matchMedia('(prefers-color-scheme: light)');
  const mqTouch = matchMedia('(pointer: coarse)');
  let want = { mode, pointer };
  let view;
  const set = () => {
    const m = want.mode === 'auto' ? (mqDark.matches && compiled.modes.includes('light') ? 'light' : compiled.modes[0]) : want.mode;
    const p = want.pointer === 'auto' ? (mqTouch.matches ? 'touch' : 'mouse') : want.pointer;
    view = skinView(compiled, m, p);
    root.dataset.dnpMode = view.mode;
    root.dataset.dnpPointer = view.pointer;
    for (const fn of listeners) fn(view);
  };
  mqDark.addEventListener?.('change', set);
  mqTouch.addEventListener?.('change', set);
  set();
  return {
    get view () { return view; },
    canvas: (g, k) => view.canvas(g, k),
    palette: (n) => view.palette(n),
    token: (n) => view.token(n),
    setMode (m) { want.mode = m; set(); },
    setPointer (p) { want.pointer = p; set(); },
    /** Take a new compiled skin (a host sent one, or the file changed). */
    replace (next) { compiled = next; installCss(compiled, root.ownerDocument); set(); },
    onChange (fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

// ---------- canvas helpers ----------

export function useStroke (ctx, spec, scale = 1) {
  ctx.strokeStyle = spec.color;
  ctx.lineWidth = (spec.width ?? 1) * scale;
  ctx.setLineDash((spec.dash ?? []).map((d) => d * scale));
  return ctx;
}
export function useFill (ctx, spec) { ctx.fillStyle = spec.fill ?? spec.color; return ctx; }
export function useText (ctx, spec) {
  ctx.fillStyle = spec.color;
  if (spec.font) ctx.font = spec.font;
  return ctx;
}
