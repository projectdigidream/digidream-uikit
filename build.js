#!/usr/bin/env node
// Bake a skin into the one file a tool ships: compiled CSS for every mode and
// pointer, canvas specs, palettes, tokens, and every icon, image and font
// inlined. A tool loads it with lib/runtime.js applySkin().
//
//   node uikit/build.js <skin> [out.json]      e.g. node uikit/build.js default
//   node uikit/build.js <skin> --js out.js      as an ES module (export default)
//
// Fails (exit 1) when the skin has problems, so a broken skin never ships.

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChain, compile, iconCandidates } from './lib/skin.js';
import { bake } from './lib/bake.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const asJs = args.includes('--js');
const [name, outArg] = args.filter((a) => a !== '--js');
if (!name) { console.error('usage: node uikit/build.js <skin> [out] [--js]'); process.exit(2); }

const source = { read: (p) => readFile(join(ROOT, p), 'utf8').catch(() => null) };

async function walk (dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out); else out.push(p);
  }
  return out;
}

const warnings = [];
const { merged, chain } = await loadChain(name, source, warnings);
const compiled = compile(merged, { warnings });
if (warnings.length) {
  console.error(`skin "${name}" has ${warnings.length} problem(s):\n  ${warnings.join('\n  ')}`);
  process.exit(1);
}

// which icons exist, child skin first
const catalog = JSON.parse(await readFile(join(ROOT, 'catalog/icons.json'), 'utf8'));
const files = await Promise.all(chain.map(async (l) => new Set((await walk(join(ROOT, l.base))).map((f) => relative(ROOT, f)))));
const urls = {};
for (const g of catalog.groups) {
  for (const [n] of g.icons) {
    const id = `${g.id}.${n}`;
    const cands = iconCandidates(id, chain, merged);
    if (merged.icons?.files?.[id]) { urls[id] = cands[0]; continue; }
    const hit = cands.find((c, i) => files[i].has(c));
    if (hit) urls[id] = hit;
  }
}
compiled.icons = { ...compiled.icons, urls };

const { bundle, missing } = await bake(compiled, (url) => readFile(join(ROOT, url)).then((b) => new Uint8Array(b)).catch(() => null));
if (missing.length) { console.error(`missing files:\n  ${missing.join('\n  ')}`); process.exit(1); }

const out = outArg ?? join(ROOT, 'dist', `${name}.skin.${asJs ? 'js' : 'json'}`);
await import('node:fs').then((fs) => fs.mkdirSync(dirname(out), { recursive: true }));
const json = JSON.stringify(bundle);
await writeFile(out, asJs ? `// baked from uikit/skins/${name} — do not edit, rebuild\nexport default ${json};\n` : json);
const total = catalog.groups.reduce((n, g) => n + g.icons.length, 0);
console.log(`${out}: ${(json.length / 1024).toFixed(1)} KB, ${compiled.modes.join('+')} × ${compiled.pointers.join('+')}, ${Object.keys(urls).length}/${total} icons drawn`);
