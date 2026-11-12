# Changelog

What changed in each release of uikit, fixes first. Kept as fixes land:
anything not released yet is under **Unreleased**.

## Unreleased

## 0.1.1 -- 2026-11-12

### Added

- **Every skin draws every icon that was a colour emoji** (flat glyphs only,
  in every tool). claude, the base, drew none,
  so every tool in its default look showed emoji; it and Paper draw them as
  lines now, 90s and PS1 as colour pixel art, Aero as glass -- each in its own
  look (tools/make_icons.mjs, from Paper's drawings and icons/lines.js).
- **Icons for a dark ground** (`icons-dark/`): an icon shown as drawn can have
  a second drawing the kit uses when the mode's ground is dark. 90s and PS1
  give their colour icons a white outline there, Aero its glass a white rim.
- `section.sync` in the catalog: the Sync plugin's icon.

- `map.cell.edge` (canvas): the edge of the open map's cell on a metamap,
  bright and 4 px; the accent in every skin, the guide magenta in 90s.

## 0.1.0 -- 2026-10-14

The first public release.
