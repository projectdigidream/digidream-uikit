// Bake a compiled skin into one self-contained object: every file it points
// at (icons, 9-slice images, fonts) inlined as a data: URL. A tool ships this
// one JSON file (or a .js that exports it) and needs nothing else of uikit
// except runtime.js. Works in the browser and in node: the caller says how to
// fetch a URL's bytes.

const MIME = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf' };

function base64 (bytes) {
  if (globalThis.Buffer) return globalThis.Buffer.from(bytes).toString('base64');
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/**
 * fetchBytes(url) -> Uint8Array (or null when missing). Returns
 * { bundle, missing: [urls] }. The bundle keeps every mode and pointer.
 */
export async function bake (compiled, fetchBytes) {
  const cache = new Map();
  const missing = [];
  async function inline (url) {
    if (!url || url.startsWith('data:')) return url;
    if (cache.has(url)) return cache.get(url);
    const bytes = await fetchBytes(url);
    let out = url;
    if (bytes) {
      const ext = url.split('?')[0].split('.').pop().toLowerCase();
      out = `data:${MIME[ext] ?? 'application/octet-stream'};base64,${base64(bytes)}`;
    } else missing.push(url);
    cache.set(url, out);
    return out;
  }
  async function inlineCss (css) {
    const urls = [...new Set([...css.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]))];
    for (const u of urls) css = css.split(`url("${u}")`).join(`url("${await inline(u)}")`);
    return css;
  }
  const bundle = structuredClone({ ...compiled, warnings: undefined });
  for (const k of Object.keys(bundle.css)) bundle.css[k] = await inlineCss(bundle.css[k]);
  bundle.fontCss = await inlineCss(bundle.fontCss ?? '');
  const urls = bundle.icons?.urls ?? {};
  for (const id of Object.keys(urls)) urls[id] = await inline(urls[id]);
  for (const [k, v] of Object.entries(bundle.brand ?? {})) {
    if (typeof v === 'string') bundle.brand[k] = await inline(v);
    else if (v && typeof v === 'object') for (const [kk, vv] of Object.entries(v)) if (typeof vv === 'string') v[kk] = await inline(vv);
  }
  bundle.baked = true;
  return { bundle, missing };
}
