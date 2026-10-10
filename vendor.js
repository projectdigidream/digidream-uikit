#!/usr/bin/env node
// Put the skins into a tool: bake every skin in skins/index.json and copy what
// a tool needs beside them, so the tool ships them with no dependency on uikit/.
//
//   Skins are those in skins/index.json "ship".
//   node uikit/vendor.js <dir>            e.g. node uikit/vendor.js studio/vendor/uikit
//   node uikit/vendor.js <dir> --check    exit 1 when <dir> is not what a fresh vendor would write
//
// <dir> gets:
//   runtime.js, kit.css          from uikit/lib (kit.js too: DOM builders a tool may use)
//   skins/<id>.skin.js           one baked bundle per skin (ES module, export default)
//   skins/index.json             [{ id, name, about, modes, pointers, file }] in skins/index.json order
//   VENDORED.json                which uikit commit and skins this came from

import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadChain, compile, iconCandidates } from './lib/skin.js';
import { bake } from './lib/bake.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const check = args.includes('--check');
const dirArg = args.find((a) => !a.startsWith('--'));
if (!dirArg) { console.error('usage: node uikit/vendor.js <dir> [--check]'); process.exit(2); }
const OUT = resolve(dirArg);

const source = { read: (p) => readFile(join(ROOT, p), 'utf8').catch(() => null) };
async function walk (dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out); else out.push(p);
  }
  return out;
}

/** Bake one skin exactly as build.js does; throws on problems. */
async function bakeSkin (name, catalog) {
  const warnings = [];
  const { merged, chain } = await loadChain(name, source, warnings);
  const compiled = compile(merged, { warnings });
  if (warnings.length) throw new Error(`skin "${name}" has problems:\n  ${warnings.join('\n  ')}`);
  const files = await Promise.all(chain.map(async (l) => new Set((await walk(join(ROOT, l.base))).map((f) => relative(ROOT, f)))));
  const urls = {};
  for (const g of catalog.groups) for (const [n] of g.icons) {
    const id = `${g.id}.${n}`;
    const cands = iconCandidates(id, chain, merged);
    if (merged.icons?.files?.[id]) { urls[id] = cands[0]; continue; }
    const hit = cands.find((c, i) => files[i].has(c));
    if (hit) urls[id] = hit;
  }
  compiled.icons = { ...compiled.icons, urls };
  const { bundle, missing } = await bake(compiled, (u) => readFile(join(ROOT, u)).then((b) => new Uint8Array(b)).catch(() => null));
  if (missing.length) throw new Error(`skin "${name}" names missing files:\n  ${missing.join('\n  ')}`);
  return bundle;
}

const catalog = JSON.parse(await readFile(join(ROOT, 'catalog/icons.json'), 'utf8'));
// `ship` is what tools carry; `skins` (the testbench's list) also has the how-to sample
const listed = JSON.parse(await readFile(join(ROOT, 'skins/index.json'), 'utf8'));
const skins = listed.ship ?? listed.skins;
const want = new Map(); // relative path -> text
for (const f of ['runtime.js', 'kit.css', 'kit.js']) want.set(f, await readFile(join(ROOT, 'lib', f), 'utf8'));
want.set('catalog/icons.json', await readFile(join(ROOT, 'catalog/icons.json'), 'utf8'));
const index = [];
for (const name of skins) {
  const b = await bakeSkin(name, catalog);
  want.set(`skins/${name}.skin.js`, `// baked from uikit/skins/${name} by uikit/vendor.js -- do not edit, re-vendor\nexport default ${JSON.stringify(b)};\n`);
  index.push({ id: b.id, name: b.name, about: b.about, modes: b.modes, pointers: b.pointers, file: `${name}.skin.js` });
}
want.set('skins/index.json', JSON.stringify(index, null, 2) + '\n');
let commit = 'unknown';
try { commit = execFileSync('git', ['log', '-1', '--format=%h', '--', '.'], { cwd: ROOT }).toString().trim(); } catch {}
// VENDORED.json is informational and not compared: the commit moves with every uikit change
const stamp = JSON.stringify({ from: 'uikit', commit, skins }, null, 2) + '\n';

if (check) {
  const stale = [];
  for (const [rel, text] of want) {
    const p = join(OUT, rel);
    if (!existsSync(p) || (await readFile(p, 'utf8')) !== text) stale.push(rel);
  }
  const extra = (await walk(join(OUT, 'skins'))).map((f) => relative(OUT, f)).filter((r) => !want.has(r));
  if (stale.length || extra.length) {
    console.error(`${dirArg} is not as vendored (run: node uikit/vendor.js ${dirArg})`);
    for (const r of stale) console.error(`  stale or missing: ${r}`);
    for (const r of extra) console.error(`  not a skin any more: ${r}`);
    process.exit(1);
  }
  console.log(`${dirArg}: up to date (${skins.join(', ')})`);
} else {
  await rm(join(OUT, 'skins'), { recursive: true, force: true });
  for (const [rel, text] of want) { await mkdir(dirname(join(OUT, rel)), { recursive: true }); await writeFile(join(OUT, rel), text); }
  await writeFile(join(OUT, 'VENDORED.json'), stamp);
  const kb = [...want.values()].reduce((n, t) => n + t.length, 0) / 1024;
  console.log(`${dirArg}: ${skins.length} skins (${skins.join(', ')}), ${kb.toFixed(0)} KB`);
}
