#!/usr/bin/env node
//
// EVERY SKIN'S OWN DRAWING of the icons it has none of, from one set of lines.
//
// The playtest of 2026-10-17 decided flat glyphs only, no colour emoji, in
// every tool -- and an icon a skin did not draw showed its catalog glyph,
// often a colour emoji (claude, the default, drew none at all). The lines are
// Paper's own files and icons/lines.js (the ones nobody had drawn); each skin
// gets them in its own look:
//
//   claude   lines at 1.75 -- every line there is (the base: every other
//            skin inherits what it does not draw)
//   paper    lines at 1.6
//   90s      16 px pixels, 1 px lines, the VGA colours  (rasterised in Chrome)
//   ps1      16 px pixels, bolder, the console's colours (rasterised in Chrome)
//
// IN COLOUR, the two pixel skins: what a drawing closes in is filled in a
// colour of its own, lit at the top left and shaded at the bottom right, its
// outline black, and the skin is told to show it as drawn (keepColor). A
// drawing that closes nothing in -- an arrow, a line -- stays one colour,
// tinted with the text, or it would vanish in a dark mode.
//   aero     glass: a dark rim, a blue gradient, a highlight
//
// A file this writes says so (<!-- make_icons -->), and only such files are
// written again: an icon drawn by hand is never replaced.
//
//   cd <a directory with puppeteer-core installed>
//   node /abs/path/uikit/tools/make_icons.mjs [--chrome <path>]
//
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { LINES } from '../icons/lines.js'

const UIKIT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SKINS = join(UIKIT, 'skins')
const MARK = '<!-- make_icons -->'
const chromeAt = process.argv.includes('--chrome') ? process.argv[process.argv.indexOf('--chrome') + 1]
  : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

/** A skin's icon files: id -> { path, generated }. */
function iconsOf (skin) {
  const out = new Map()
  const dir = join(SKINS, skin, 'icons')
  if (!existsSync(dir)) return out
  for (const g of readdirSync(dir)) {
    if (!statSync(join(dir, g)).isDirectory()) continue
    for (const f of readdirSync(join(dir, g))) {
      if (!f.endsWith('.svg')) continue
      const path = join(dir, g, f)
      out.set(`${g}.${f.slice(0, -4)}`, { path, generated: readFileSync(path, 'utf8').includes(MARK) })
    }
  }
  return out
}

// THE LINES: Paper's hand-drawn files (their inside), then the ones nobody had.
const lines = new Map()
for (const [id, f] of iconsOf('paper')) {
  if (f.generated) continue
  const svg = readFileSync(f.path, 'utf8')
  lines.set(id, svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim())
}
for (const [id, inner] of Object.entries(LINES)) if (!lines.has(id)) lines.set(id, inner)

const lineSvg = (inner, stroke) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${MARK}${inner}</svg>\n`

const glassSvg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">${MARK}` +
  '<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="3" x2="0" y2="21"><stop offset="0" stop-color="#7fd3f7"/><stop offset="1" stop-color="#1673b8"/></linearGradient></defs>' +
  // a filled part (Paper's dots, a play triangle) takes each layer's colour: rim, glass, none
  `<g stroke="#0d4a7a" stroke-width="3.1">${inner.replace(/fill="#000"/g, 'fill="#0d4a7a"')}</g>` +
  `<g stroke="url(#g)" stroke-width="1.9">${inner.replace(/fill="#000"/g, 'fill="url(#g)"')}</g>` +
  `<g stroke="#fff" stroke-opacity=".55" stroke-width=".55" transform="translate(-.3 -.35)">${inner.replace(/fill="#000"/g, 'fill="none"')}</g></svg>\n`

// [base, lit, shaded] per colour, and each icon's colour: by id, else by group.
const PALETTES = {
  '90s': {
    red: ['#ff0000', '#ff8080', '#800000'], yellow: ['#ffff00', '#ffffc0', '#808000'], green: ['#00c000', '#80ff80', '#008000'],
    blue: ['#0000ff', '#8080ff', '#000080'], cyan: ['#00ffff', '#c0ffff', '#008080'], magenta: ['#ff00ff', '#ff80ff', '#800080'],
    brown: ['#c08040', '#ffc080', '#804000'], grey: ['#c0c0c0', '#ffffff', '#808080']
  },
  ps1: {
    red: ['#d01e2e', '#f26b75', '#7a0d16'], yellow: ['#f2c230', '#fbe58f', '#8c6a0c'], green: ['#1fa055', '#7fdc9f', '#0c5a2c'],
    blue: ['#2e6bd8', '#8db3f2', '#101a62'], cyan: ['#2fb3c8', '#9be3ee', '#13606d'], magenta: ['#a34dd1', '#d6a2f0', '#55207a'],
    brown: ['#b07a3c', '#e2b47c', '#5e3a12'], grey: ['#9aa0b4', '#d8dce8', '#5a6078']
  }
}
const HUE_OF = {
  'workshop.health': 'red', 'workshop.hurt': 'red', 'sfx.explosion': 'red', 'sfx.monster': 'red', 'preset.ambush': 'grey', 'trigger.attack': 'grey',
  'trigger.event': 'yellow', 'marker.light': 'yellow', 'sfx.pickup': 'yellow', 'sfx.vary': 'yellow', 'sfx.bell': 'yellow', 'workshop.flinch': 'yellow', 'sfx.laser': 'red',
  'seam.joined': 'green', 'weather.rain': 'blue', 'weather.snow': 'cyan', 'weather.fog': 'grey', 'paint.fill': 'blue', 'paint.eyedropper': 'cyan',
  'action.scopegame': 'blue', 'action.scopemap': 'brown', 'action.pick': 'red', 'workshop.brain': 'magenta', 'sfx.voice': 'magenta', 'sfx.jingle': 'magenta',
  'preset.door': 'brown', 'sfx.door': 'brown', 'graphgroup.maps': 'brown', 'workshop.arsenal': 'brown', 'workshop.drops': 'red', 'workshop.ammo': 'yellow',
  'workshop.weapon': 'grey', 'sfx.gunshot': 'grey', 'sfx.engine': 'red', 'sfx.machine': 'grey', 'graphgroup.camera': 'grey', 'graphgroup.cutscene': 'grey',
  'graphgroup.note': 'yellow', 'graphgroup.panels': 'blue', 'workshop.state': 'cyan', 'sprite.view3d': 'cyan', 'sprite.solids': 'cyan', 'workshop.missiles': 'red',
  'sfx.randomize': 'grey', 'sfx.match': 'grey', 'sfx.unsure': 'yellow', 'trigger.use': 'red', 'workshop.body': 'brown', 'workshop.skin': 'brown'
}
const HUE_OF_GROUP = { section: 'blue', maptool: 'blue', action: 'blue', transport: 'green', status: 'yellow', trigger: 'yellow', preset: 'brown', workshop: 'brown', weather: 'cyan', widget: 'grey', graphgroup: 'grey', seam: 'green', marker: 'yellow', sfx: 'magenta', paint: 'cyan', sprite: 'green', platform: 'grey' }
const hueOf = (id) => HUE_OF[id] ?? HUE_OF_GROUP[id.split('.')[0]] ?? 'grey'

/**
 * A mask in colour: its outline, and what it closes in filled -- lit where the
 * outline is above or to the left, shaded where it is below or to the right.
 * Null when it closes nothing in (it stays one colour, tinted).
 */
function colourise (mask, [base, lit, shaded], outline, { rim = false } = {}) {
  const outside = new Uint8Array(256)
  const stack = []
  for (let i = 0; i < 16; i++) for (const p of [i, 240 + i, i * 16, i * 16 + 15]) if (!mask[p] && !outside[p]) { outside[p] = 1; stack.push(p) }
  while (stack.length) {
    const p = stack.pop(); const x = p % 16; const y = (p - x) / 16
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const ny = y + dy
      if (nx < 0 || ny < 0 || nx > 15 || ny > 15) continue
      const q = ny * 16 + nx
      if (!mask[q] && !outside[q]) { outside[q] = 1; stack.push(q) }
    }
  }
  const inside = (p) => !mask[p] && !outside[p]
  const at = (x, y) => (x < 0 || y < 0 || x > 15 || y > 15 ? 0 : mask[y * 16 + x])
  // A RIM (PS1, whose lines are two pixels): the inner half of the OUTER edge
  // takes the light tone, as the console's own icons have a metal rim -- so a
  // drawing reads on a dark ground too, where its black edge is lost. Lines
  // inside the drawing stay dark, or a globe's meridians melt into its fill.
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  const near = (x, y, test) => N4.some(([dx, dy]) => { const nx = x + dx; const ny = y + dy; return test(nx, ny) })
  const edge = new Uint8Array(256)
  for (let p = 0; p < 256; p++) if (mask[p] && near(p % 16, (p - p % 16) / 16, (nx, ny) => nx < 0 || ny < 0 || nx > 15 || ny > 15 || outside[ny * 16 + nx])) edge[p] = 1
  const isRim = (p) => rim && mask[p] && !edge[p] && near(p % 16, (p - p % 16) / 16, (nx, ny) => nx >= 0 && ny >= 0 && nx <= 15 && ny <= 15 && edge[ny * 16 + nx])
  let n = 0
  let rimmed = 0
  for (let p = 0; p < 256; p++) { if (inside(p)) n++; else if (isRim(p)) rimmed++ }
  if (n < 3 && rimmed < 3) return null
  const out = new Array(256).fill(null)
  for (let p = 0; p < 256; p++) {
    const x = p % 16; const y = (p - x) / 16
    if (mask[p]) out[p] = isRim(p) ? lit : outline
    else if (inside(p)) out[p] = at(x, y - 1) || at(x - 1, y) ? lit : at(x, y + 1) || at(x + 1, y) ? shaded : base
  }
  return out
}

/** Colour pixels as rows of runs. */
function colourSvg (px) {
  const rects = []
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16;) {
      const c = px[y * 16 + x]
      if (!c) { x++; continue }
      let w = 1
      while (x + w < 16 && px[y * 16 + x + w] === c) w++
      rects.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${c}"/>`)
      x += w
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges">${MARK}${rects.join('')}</svg>\n`
}

/** Pixels, as rows of runs: a 16 x 16 mask drawn as rects (crisp at any size, tinted by the kit). */
function pixelSvg (mask, colour) {
  const rects = []
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16;) {
      if (!mask[y * 16 + x]) { x++; continue }
      let w = 1
      while (x + w < 16 && mask[y * 16 + x + w]) w++
      rects.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${colour}"/>`)
      x += w
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges">${MARK}${rects.join('')}</svg>\n`
}

/** Each line drawing rasterised at 16 px in Chrome, its alpha thresholded: id -> Uint8Array(256). */
async function rasterise (ids, stroke, threshold) {
  const require = createRequire(join(process.cwd(), 'noop.js'))
  const puppeteer = require('puppeteer-core')
  const browser = await puppeteer.launch({ executablePath: chromeAt, headless: 'new', args: ['--mute-audio'] })
  try {
    const page = await browser.newPage()
    await page.setContent('<canvas width="16" height="16"></canvas>')
    const out = new Map()
    for (const id of ids) {
      const src = lineSvg(lines.get(id), stroke).replace(MARK, '')
      const alpha = await page.evaluate(async (svg) => {
        const img = new Image()
        img.src = 'data:image/svg+xml;base64,' + btoa(svg)
        await img.decode()
        const c = document.querySelector('canvas')
        const g = c.getContext('2d')
        g.clearRect(0, 0, 16, 16)
        g.drawImage(img, 0, 0, 16, 16)
        return [...g.getImageData(0, 0, 16, 16).data].filter((_, i) => i % 4 === 3)
      }, src)
      out.set(id, Uint8Array.from(alpha, (a) => (a >= threshold ? 1 : 0)))
    }
    return out
  } finally { await browser.close() }
}

const written = {}
function put (skin, id, text, dir = 'icons') {
  const [g, n] = id.split('.')
  const path = join(SKINS, skin, dir, g, `${n}.svg`)
  if (existsSync(path) && readFileSync(path, 'utf8') === text) return
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
  written[skin] = (written[skin] ?? 0) + 1
}
// FOR A DARK GROUND (a night mode): the outline that touches the outside is
// white, or a black edge is lost in the dark; lines inside the drawing keep
// their colour. Written to icons-dark/, which the kit uses on a dark ground.
const WHITE = '#ffffff'
function darkOf (px, outline) {
  const outside = new Uint8Array(256)
  const stack = []
  for (let i = 0; i < 16; i++) for (const p of [i, 240 + i, i * 16, i * 16 + 15]) if (!px[p] && !outside[p]) { outside[p] = 1; stack.push(p) }
  while (stack.length) {
    const p = stack.pop(); const x = p % 16; const y = (p - x) / 16
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const ny = y + dy
      if (nx < 0 || ny < 0 || nx > 15 || ny > 15) continue
      const q = ny * 16 + nx
      if (!px[q] && !outside[q]) { outside[q] = 1; stack.push(q) }
    }
  }
  const edge = (p) => { const x = p % 16; const y = (p - x) / 16; return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx; const ny = y + dy; return nx < 0 || ny < 0 || nx > 15 || ny > 15 || outside[ny * 16 + nx] }) }
  return px.map((c, p) => (c && c.toLowerCase() === outline && edge(p) ? WHITE : c))
}
/** A pixel icon drawn by hand (rects of one pixel row each), as 256 colours. */
function pixelsOf (svg) {
  const px = new Array(256).fill(null)
  for (const m of svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="(#[0-9a-fA-F]{6})"\/>/g)) {
    const [x, y, w, h] = m.slice(1, 5).map(Number)
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (xx < 16 && yy < 16) px[yy * 16 + xx] = m[5].toLowerCase()
  }
  return px
}

/** The ids a skin is to be given: every line, less what it draws by hand. */
const wanted = (skin) => { const own = iconsOf(skin); return [...lines.keys()].filter((id) => !own.get(id) || own.get(id).generated).sort() }

for (const id of wanted('claude')) put('claude', id, lineSvg(lines.get(id), 1.75))
for (const id of wanted('paper')) put('paper', id, lineSvg(lines.get(id), 1.6))
for (const id of wanted('aero')) {
  put('aero', id, glassSvg(lines.get(id)))
  put('aero', id, glassSvg(lines.get(id)).replace('stroke="#0d4a7a"', `stroke="${WHITE}"`).replace(/fill="#0d4a7a"/g, `fill="${WHITE}"`), 'icons-dark')
}
for (const [skin, stroke, threshold, colour] of [['90s', 1.6, 110, '#000000'], ['ps1', 2.2, 120, '#05060f']]) {
  const ids = wanted(skin)
  const masks = await rasterise(ids, stroke, threshold)
  const coloured = []
  for (const id of ids) {
    const px = colourise(masks.get(id), PALETTES[skin][hueOf(id)], colour, { rim: skin === 'ps1' })
    if (px) { coloured.push(id); put(skin, id, colourSvg(darkOf(px, colour)), 'icons-dark') }
    put(skin, id, px ? colourSvg(px) : pixelSvg(masks.get(id), colour))
  }
  // the colour icons drawn by hand, given their white edge too
  const keepHand = JSON.parse(readFileSync(join(SKINS, skin, 'skin.json'), 'utf8')).icons.keepColor ?? []
  const shownAsDrawn = (id) => keepHand.some((k) => k === id || (k.endsWith('.*') && id.startsWith(k.slice(0, -1))))
  for (const [id, f] of iconsOf(skin)) {
    if (f.generated || !shownAsDrawn(id)) continue
    const px = pixelsOf(readFileSync(f.path, 'utf8'))
    if (px.some(Boolean)) put(skin, id, colourSvg(darkOf(px, colour)), 'icons-dark')
  }
  // shown as drawn: the hand's own list, then the ones drawn in colour here
  const file = join(SKINS, skin, 'skin.json')
  const raw = readFileSync(file, 'utf8')
  const json = JSON.parse(raw)
  const made = new Set(ids)
  const hand = (json.icons.keepColor ?? []).filter((k) => !made.has(k))
  const next = [...hand, ...coloured.sort()]
  if (JSON.stringify(next) !== JSON.stringify(json.icons.keepColor ?? [])) {
    // only the list's own text is written again: the rest of the file keeps the layout it was given
    const m = /"keepColor"\s*:\s*\[[^\]]*\]/.exec(raw)
    if (!m) throw new Error(`${skin}/skin.json: no keepColor list to add to`)
    const text = raw.slice(0, m.index) + `"keepColor": ${JSON.stringify(next).replace(/","/g, '", "')}` + raw.slice(m.index + m[0].length)
    JSON.parse(text)
    writeFileSync(file, text)
    written[skin] = (written[skin] ?? 0) + 1
  }
  console.log(`${skin}: ${coloured.length} in colour, ${ids.length - coloured.length} tinted`)
}
console.log(`lines: ${lines.size} (${Object.keys(LINES).length} from icons/lines.js)`)
for (const s of ['claude', 'paper', '90s', 'ps1', 'aero']) console.log(`${s}: ${written[s] ?? 0} written, ${iconsOf(s).size} icons now`)
