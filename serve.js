#!/usr/bin/env node
// Serves uikit/ for the testbench, never cached, plus two helpers:
//   /__files?dir=skins/x   every file under a folder (relative paths)
//   /__stamp?dir=skins     a number that changes when anything under it does
// so the testbench can see which icons exist and reload when a skin changes.
//   node uikit/serve.js [port]      (default 8960)

import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, normalize, extname, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = +(process.argv[2] ?? process.env.PORT ?? 8960);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.md': 'text/markdown; charset=utf-8',
};

function inside (rel) {
  const p = normalize(join(ROOT, rel));
  return p === ROOT || p.startsWith(ROOT + '/') ? p : null;
}

async function walk (dir, out = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (code, body, type = 'text/plain; charset=utf-8') => {
    res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(body);
  };
  try {
    if (url.pathname === '/__files' || url.pathname === '/__stamp') {
      const dir = inside(url.searchParams.get('dir') ?? '');
      if (!dir) return send(403, 'no');
      const files = await walk(dir);
      if (url.pathname === '/__files') return send(200, JSON.stringify(files.map((f) => relative(dir, f))), TYPES['.json']);
      let stamp = files.length;
      for (const f of files) { const s = await stat(f); stamp = (stamp * 31 + Math.floor(s.mtimeMs) + s.size) % 2147483647; }
      return send(200, String(stamp));
    }
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') { res.writeHead(302, { location: '/testbench/' }); return res.end(); }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = inside(rel);
    if (!file) return send(403, 'no');
    send(200, await readFile(file), TYPES[extname(file)] ?? 'application/octet-stream');
  } catch (e) {
    send(e.code === 'ENOENT' ? 404 : 500, String(e.message));
  }
}).listen(PORT, () => console.log(`uikit testbench: http://localhost:${PORT}/testbench/`));
