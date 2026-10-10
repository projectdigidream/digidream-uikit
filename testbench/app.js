// The testbench: loads a skin (from the server, or a folder picked from
// disk), compiles it, and shows every element of the kit wearing it. It
// reloads by itself when anything under skins/ changes (served mode).

import { loadChain, compile, iconCandidates } from '../lib/skin.js';
import { installCss, skinView } from '../lib/runtime.js';
import { bake } from '../lib/bake.js';
import * as kit from '../lib/kit.js';
import { SECTIONS } from './sections.js';

const $ = (id) => document.getElementById(id);
const state = {
  skins: [], skin: 'default', mode: 'dark', pointer: 'mouse',
  folder: null, // { name, files: Map(relPath -> File), urls: Map(relPath -> blobUrl) }
  compiled: null, chain: [], catalog: null, stamp: null,
};
try { Object.assign(state, JSON.parse(localStorage.getItem('dnp-testbench') ?? '{}'), { folder: null, compiled: null, chain: [] }); } catch {}
const remember = () => { try { localStorage.setItem('dnp-testbench', JSON.stringify({ skin: state.skin, mode: state.mode, pointer: state.pointer })); } catch {} };

const ROOT = new URL('../', import.meta.url).href; // uikit/

// ---------- sources ----------

const served = {
  async read (path) {
    const r = await fetch(ROOT + path, { cache: 'no-store' });
    return r.ok ? r.text() : null;
  },
  url: (path) => ROOT + path,
};

function folderSource (folder) {
  const prefix = `skins/${folder.name}/`;
  const local = (path) => (path.startsWith(prefix) ? path.slice(prefix.length) : null);
  return {
    async read (path) {
      const rel = local(path);
      if (rel == null) return served.read(path);
      const f = folder.files.get(rel);
      return f ? f.text() : null;
    },
    url (path) {
      const rel = local(path);
      if (rel == null) return served.url(path);
      if (!folder.urls.has(rel) && folder.files.has(rel)) folder.urls.set(rel, URL.createObjectURL(folder.files.get(rel)));
      return folder.urls.get(rel) ?? served.url(path);
    },
  };
}

/** Which files exist in each skin of the chain (for icons). */
async function filesOf (link, source) {
  if (state.folder && link.name === state.folder.name) return new Set([...state.folder.files.keys()]);
  try {
    const r = await fetch(`${ROOT}__files?dir=${encodeURIComponent(link.base)}`, { cache: 'no-store' });
    if (r.ok) return new Set(await r.json());
  } catch {}
  return null; // unknown: probe instead
}

async function iconUrls (chain, merged, source) {
  const ids = state.catalog.groups.flatMap((g) => g.icons.map(([n]) => `${g.id}.${n}`));
  const lists = await Promise.all(chain.map((l) => filesOf(l, source)));
  const urls = {};
  for (const id of ids) {
    const cands = iconCandidates(id, chain, merged);
    if (merged.icons?.files?.[id]) { urls[id] = cands[0]; continue; }
    for (let i = 0; i < chain.length; i++) {
      const rel = cands[i].slice(chain[i].base.length);
      const list = lists[i];
      if (list ? list.has(rel) : await probe(source.url(cands[i]))) { urls[id] = source.url(cands[i]); break; }
    }
  }
  return urls;
}
const probe = (url) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(true); im.onerror = () => ok(false); im.src = url; });

// ---------- load ----------

async function load () {
  const source = state.folder ? folderSource(state.folder) : served;
  const name = state.folder ? state.folder.name : state.skin;
  const warnings = [];
  const { merged, chain } = await loadChain(name, source, warnings);
  const compiled = compile(merged, { warnings });
  compiled.icons = { ...compiled.icons, urls: await iconUrls(chain, merged, source) };
  state.compiled = compiled;
  state.chain = chain;
  installCss(compiled);
  kit.setIconSource({
    url: (id) => compiled.icons.urls[id] ?? null,
    tint: compiled.icons.tint !== false,
    glyph: (id) => glyphs.get(id) ?? '?',
  });
  if (state.mode !== 'both' && !compiled.modes.includes(state.mode)) state.mode = compiled.modes[0];
  buildBar();
  render();
}

const glyphs = new Map();

// ---------- chrome ----------

function segButtons (el, options, current, pick) {
  el.replaceChildren(...options.map(([v, label]) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = v === current ? 'on' : '';
    b.onclick = () => pick(v);
    return b;
  }));
}

function buildBar () {
  const sel = $('tb-skin');
  const names = state.folder ? [...new Set([...state.skins, state.folder.name])] : state.skins;
  sel.replaceChildren(...names.map((n) => new Option(state.folder?.name === n ? `${n} (folder)` : n, n)));
  sel.value = state.folder ? state.folder.name : state.skin;
  const c = state.compiled;
  const modes = [...c.modes.map((m) => [m, m]), ...(c.modes.length > 1 ? [['both', 'side by side']] : [])];
  segButtons($('tb-mode'), modes, state.mode, (m) => { state.mode = m; remember(); buildBar(); render(); });
  segButtons($('tb-pointer'), c.pointers.map((p) => [p, p]), state.pointer, (p) => { state.pointer = p; remember(); buildBar(); render(); });
  const n = c.warnings.length;
  const link = $('tb-problems-link');
  link.textContent = n ? `${n} problem${n > 1 ? 's' : ''}` : 'no problems';
  link.className = 'tb-problems' + (n ? ' bad' : '');
}

function stagesFor (sectionEl, build, { pair = true, stack = false } = {}) {
  const c = state.compiled;
  const modes = state.mode === 'both' && pair ? c.modes : [state.mode === 'both' ? c.modes[0] : state.mode];
  const wrap = kit.h('div', { class: ['tb-pair', modes.length > 1 && !stack ? 'two' : ''] });
  for (const mode of modes) {
    const stage = kit.h('div', { class: 'tb-stage', 'data-dnp-mode': mode, 'data-dnp-pointer': state.pointer });
    if (modes.length > 1) stage.append(kit.h('span', { class: 'tb-stage-tag' }, mode));
    wrap.append(stage);
    build(stage, skinView(c, mode, state.pointer), { catalog: state.catalog, compiled: c, chain: state.chain });
  }
  sectionEl.append(wrap);
}

function render () {
  const main = $('tb-main');
  const y = window.scrollY;
  main.replaceChildren();
  const nav = $('tb-nav');
  nav.replaceChildren();
  for (const s of SECTIONS) {
    const sec = kit.h('section', { class: 'tb-section', id: s.id }, kit.h('h2', {}, s.title), s.note ? kit.h('p', { class: 'tb-note' }, s.note) : null);
    nav.append(kit.h('a', { class: 'top', href: `#${s.id}` }, s.title));
    for (const part of s.parts ?? [{ build: s.build, pair: s.pair }]) {
      const box = part.title ? kit.h('div', { id: part.id }) : sec;
      if (part.title) {
        box.append(kit.h('h3', { class: 'tb-note', style: { margin: '18px 0 8px', fontSize: '14px', color: '#dcdde1' } }, part.title));
        nav.append(kit.h('a', { href: `#${part.id}` }, part.title));
        sec.append(box);
      }
      stagesFor(box, part.build, { pair: part.pair !== false, stack: !!part.stack });
    }
    main.append(sec);
  }
  window.scrollTo(0, y);
}

// ---------- live reload ----------

async function poll () {
  if (state.folder) return;
  try {
    const r = await fetch(`${ROOT}__stamp?dir=skins`, { cache: 'no-store' });
    if (!r.ok) return;
    $('tb-live').classList.add('on');
    const stamp = await r.text();
    if (state.stamp !== null && stamp !== state.stamp) {
      $('tb-live').classList.add('flash');
      await load();
      setTimeout(() => $('tb-live').classList.remove('flash'), 400);
    }
    state.stamp = stamp;
  } catch { $('tb-live').classList.remove('on'); }
}

// ---------- start ----------

async function start () {
  state.catalog = await (await fetch(ROOT + 'catalog/icons.json', { cache: 'no-store' })).json();
  for (const g of state.catalog.groups) for (const [n, , glyph] of g.icons) glyphs.set(`${g.id}.${n}`, glyph);
  try { state.skins = (await (await fetch(ROOT + 'skins/index.json', { cache: 'no-store' })).json()).skins; } catch { state.skins = ['default']; }
  if (!state.skins.includes(state.skin)) state.skin = state.skins[0];
  const q = new URLSearchParams(location.search);
  if (q.get('skin')) state.skin = q.get('skin');
  if (q.get('mode')) state.mode = q.get('mode');
  if (q.get('pointer')) state.pointer = q.get('pointer');

  $('tb-skin').onchange = (e) => {
    if (state.folder && e.target.value === state.folder.name) return;
    state.folder = null; state.skin = e.target.value; remember(); load();
  };
  $('tb-reload').onclick = () => load();
  $('tb-folder').onclick = () => $('tb-folder-input').click();
  $('tb-folder-input').onchange = (e) => {
    const list = [...e.target.files];
    if (!list.length) return;
    const top = list[0].webkitRelativePath.split('/')[0];
    const files = new Map(list.map((f) => [f.webkitRelativePath.slice(top.length + 1), f]));
    if (!files.has('skin.json')) { alert(`${top} has no skin.json at its top`); return; }
    state.folder = { name: top, files, urls: new Map() };
    load();
  };
  $('tb-bake').onclick = async () => {
    const { bundle, missing } = await bake(state.compiled, async (url) => {
      const r = await fetch(url);
      return r.ok ? new Uint8Array(await r.arrayBuffer()) : null;
    });
    if (missing.length) console.warn('bake: missing', missing);
    const a = kit.h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(bundle)], { type: 'application/json' })), download: `${bundle.id}.skin.json` });
    a.click();
  };
  await load();
  setInterval(poll, 1000);
}

start().catch((e) => {
  document.getElementById('tb-main').append(Object.assign(document.createElement('pre'), { className: 'tb-problem', textContent: String(e.stack ?? e) }));
});
