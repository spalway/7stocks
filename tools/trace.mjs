// Traces public/CEOPIXELS/*.png onto 48x48 slot grids.
//
//   node tools/trace.mjs dump            print each image's grid size + cell palette
//   node tools/trace.mjs build           write src/ceoSpritesTraced.js from tools/trace-map.json
//
// The references are clean pixel art rendered at ~26px per cell, so a cell is
// read by sampling its interior rather than by clustering. Colours are then
// mapped to SLOTS (see docs/CEO-PIXEL-TEMPLATE.md §3) via trace-map.json, which
// is authored by hand from the `dump` output: one line per colour per CEO.
// Black is the one colour that cannot be mapped by value — it is outline, suit,
// tie and pupil at once — so it is split by position in `splitBlack`.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GRID = 48;

export const SOURCES = [
  { key: 'JASSY', file: 'ANDY_JASSY_2.png' },
  { key: 'PICHAI', file: 'sundar_pichai_2.png' },
  { key: 'ZUCK', file: 'MARK_ZUCKERBERG_2.png' },
  { key: 'HUANG', file: 'JENSEN_HUANG_2.png' },
  { key: 'NADELLA', file: 'SATYA_NADELLA_2.png' },
  { key: 'TERNUS', file: 'JOHN_TERNUS_2.png' },
  { key: 'MUSK', file: 'ELON_MUSK_2.png' },
];

function load(file) {
  const png = PNG.sync.read(readFileSync(resolve(root, 'public/CEOPIXELS', file)));
  const px = (x, y) => {
    const i = (y * png.width + x) * 4;
    return [png.data[i], png.data[i + 1], png.data[i + 2]];
  };
  return { w: png.width, h: png.height, px };
}

const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

/// The references are not all on a clean 48 grid: two are, the rest were drawn
/// at 23–26px cells with a partial margin. So the cell size is measured, not
/// assumed: the mode of one-cell-thick black runs (the outline) gives the
/// period, and edge energy along the axis pins the phase.
function detectAxis(img, axis) {
  const len = axis === 'x' ? img.w : img.h;
  const other = axis === 'x' ? img.h : img.w;
  const at = (i, j) => (axis === 'x' ? img.px(i, j) : img.px(j, i));
  const lum = (p) => (p[0] + p[1] + p[2]) / 3;
  const hist = {};
  const energy = new Float64Array(len);
  for (let j = 0; j < other; j += 1) {
    let run = 0;
    for (let i = 0; i < len; i += 1) {
      if (lum(at(i, j)) < 50) run += 1;
      else { if (run >= 12 && run <= 45) hist[run] = (hist[run] ?? 0) + 1; run = 0; }
      if (i) energy[i] += dist(at(i, j), at(i - 1, j));
    }
  }
  const mode = Number(Object.entries(hist).sort((a, b) => b[1] - a[1])[0][0]);
  let best = null;
  for (let p = mode - 1.5; p <= mode + 1.5; p += 0.05) {
    for (let o = 0; o < p; o += 0.5) {
      let s = 0; let k = 0;
      for (let x = o; x < len; x += p) { s += energy[Math.round(x)] ?? 0; k += 1; }
      s /= k;
      if (!best || s > best.s) best = { p, o, s };
    }
  }
  // Start on the first grid line at or before 0 so a partial margin cell is a cell.
  let o = best.o; while (o - best.p > -best.p * 0.5) o -= best.p;
  const n = Math.round((len - o) / best.p);
  return { p: best.p, o, n };
}

/// Cell colour = median of a 3x3 interior sample, snapped to a 4-level step so
/// upscaler wobble collapses to one value.
function cells(img) {
  const ax = detectAxis(img, 'x'); const ay = detectAxis(img, 'y');
  const out = [];
  for (let gy = 0; gy < ay.n; gy += 1) {
    const row = [];
    for (let gx = 0; gx < ax.n; gx += 1) {
      const samples = [];
      for (const fy of [0.3, 0.5, 0.7]) for (const fx of [0.3, 0.5, 0.7]) {
        const x = Math.min(img.w - 1, Math.max(0, Math.round(ax.o + (gx + fx) * ax.p)));
        const y = Math.min(img.h - 1, Math.max(0, Math.round(ay.o + (gy + fy) * ay.p)));
        samples.push(img.px(x, y));
      }
      const med = [0, 1, 2].map((c) => samples.map((s) => s[c]).sort((a, b) => a - b)[4]);
      row.push(med.map((v) => Math.min(255, Math.round(v / 4) * 4)));
    }
    out.push(row);
  }
  return { grid: out, n: `${ax.n}x${ay.n} (cell ${ax.p.toFixed(1)}px)` };
}

const hex = (p) => '#' + p.map((v) => v.toString(16).padStart(2, '0')).join('');

/// Merge near-identical colours so the palette printed is short enough to map.
function palette(grid) {
  const entries = [];
  grid.forEach((row, y) => row.forEach((p, x) => {
    let e = entries.find((q) => dist(q.p, p) <= 24);
    if (!e) { e = { p, n: 0, y0: y, y1: y, x0: x, x1: x }; entries.push(e); }
    e.n += 1; e.y0 = Math.min(e.y0, y); e.y1 = Math.max(e.y1, y);
    e.x0 = Math.min(e.x0, x); e.x1 = Math.max(e.x1, x);
  }));
  return entries.sort((a, b) => b.n - a.n);
}

function dump() {
  for (const s of SOURCES) {
    const img = load(s.file);
    const { grid, n } = cells(img);
    console.log(`\n== ${s.key}  ${s.file}  ${img.w}x${img.h}  grid ${n}`);
    for (const e of palette(grid)) {
      console.log(`  ${hex(e.p)}  n=${String(e.n).padStart(4)}  rows ${e.y0}-${e.y1}  cols ${e.x0}-${e.x1}`);
    }
  }
}

// ----------------------------------------------------------------- build

/// Black cells are outline by default. Inside the bust they become suit `C`,
/// and a black run bounded by shirt `N` on both sides is the tie `K`. The
/// pupil is black too, but it sits inside the face, so it is whatever black
/// cell touches eye-white `W` or is fully surrounded by skin.
function splitBlack(g) {
  const h = g.length; const n = g[0].length;
  // Off-canvas counts as "more of the same" — the bust runs off the bottom
  // and sides, and must not read as background there.
  const at = (x, y) => (y < 0 || y >= h || x < 0 || x >= n ? 'X' : g[y][x]);
  // White is eye in the upper two thirds and shirt below. Every reference puts
  // the eyes near row 22 of 48 and the collar past row 40, so the split is by
  // height, not by shape: a collar edge can be as narrow as an eye.
  g = g.map((r, y) => r.map((c) => (c === 'W' && y >= h * 0.68 ? 'N' : c)));
  let bustTop = h;
  for (let y = 0; y < h && bustTop === h; y += 1) if (g[y].includes('N')) bustTop = y;
  // The tie hangs under the chin, so only a black run near the face's centre
  // line is one; black between a collar tip and the shirt is suit.
  let sx0 = n; let sx1 = 0;
  g.forEach((r) => r.forEach((c, x) => { if (c === 'S') { sx0 = Math.min(sx0, x); sx1 = Math.max(sx1, x); } }));
  const cx = (sx0 + sx1) / 2;
  const out = g.map((r) => r.slice());

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (g[y][x] !== 'X') continue;
      const nb = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
      const skinish = (c) => 'SsW'.includes(c);
      if (y < bustTop) {
        if (nb.some((c) => c === 'W') || nb.every(skinish)) out[y][x] = 'P';
        continue;
      }
      // Tie: bounded left and right by shirt within this row.
      let l = x; while (l >= 0 && g[y][l] === 'X') l -= 1;
      let r = x; while (r < n && g[y][r] === 'X') r += 1;
      if (l >= 0 && r < n && g[y][l] === 'N' && g[y][r] === 'N' && Math.abs((l + r) / 2 - cx) <= 4) {
        out[y][x] = 'K'; continue;
      }
      // Suit: black not touching background or skin/neck.
      if (nb.some((c) => c === '.' || c === 'S' || c === 's')) continue;
      out[y][x] = 'C';
    }
  }
  return out;
}

/// Fit a native grid onto the 48 canvas without scaling. The head is centred
/// on the skin's bounding box; vertically the grids are aligned on the COLLAR
/// (the first shirt row), not the crown, so every bust is cut at the same
/// point at the bottom of the frame regardless of neck length. Rows below the
/// last drawn row are filled by repeating it, so the suit always runs off the
/// bottom edge instead of stopping short.
const COLLAR_ROW = 42;
function fit(g) {
  const h = g.length; const n = g[0].length;
  const out = Array.from({ length: GRID }, () => Array(GRID).fill('.'));
  let x0 = n; let x1 = 0; let top = h; let collar = -1;
  g.forEach((r, y) => {
    r.forEach((c, x) => {
      if (c === 'S') { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
      if (c !== '.' && y < top) top = y;
    });
    if (collar < 0 && r.includes('N')) collar = y;
  });
  const dx = Math.round(GRID / 2 - (x0 + x1 + 1) / 2);
  // Collar on its row, unless that would push the crown off the top.
  let dy = collar >= 0 ? COLLAR_ROW - collar : 2 - top;
  if (top + dy < 1) dy = 1 - top;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const X = x + dx; const Y = y + dy;
      if (X >= 0 && X < GRID && Y >= 0 && Y < GRID) out[Y][X] = g[y][x];
    }
  }
  let last = -1;
  out.forEach((r, y) => { if (r.some((c) => c !== '.')) last = y; });
  for (let y = last + 1; y < GRID; y += 1) out[y] = out[last].slice();
  return out;
}

function build() {
  const map = JSON.parse(readFileSync(resolve(root, 'tools/trace-map.json'), 'utf8'));
  let js = `// GENERATED by tools/trace.mjs from public/CEOPIXELS — do not hand-edit.\n`
    + `// Slots: . bg  X outline  S skin  s skin shade  H hair  D hair shade  B brow\n`
    + `//        F facial hair  W eye white  P pupil  M mouth  G frame  N shirt  C suit  K tie\n\n`;
  const ramps = {};
  for (const s of SOURCES) {
    const img = load(s.file);
    const { grid, n } = cells(img);
    const rules = Object.entries(map[s.key]).map(([h, slot]) => ({
      p: [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), slot,
    }));
    const unmapped = new Map();
    let g = grid.map((row) => row.map((p) => {
      let best = null;
      for (const r of rules) { const d = dist(r.p, p); if (!best || d < best.d) best = { d, slot: r.slot }; }
      if (best.d > 60) unmapped.set(hex(p), (unmapped.get(hex(p)) ?? 0) + 1);
      return best.slot;
    }));
    if (unmapped.size) console.log(`${s.key}: loosely mapped`, [...unmapped.entries()].slice(0, 8));
    g = fit(splitBlack(g));
    const counts = {};
    for (const r of g) for (const c of r) counts[c] = (counts[c] ?? 0) + 1;
    console.log(`${s.key}: grid ${n}`, counts);
    js += `export const ${s.key} = [\n${g.map((r) => `  '${r.join('')}',`).join('\n')}\n];\n\n`;
    // Measured ramps so the canonical colourway is the reference's own.
    const pick = (slot) => Object.entries(map[s.key]).find(([, v]) => v === slot)?.[0];
    ramps[s.key] = { skin: [pick('S'), pick('s')], hair: [pick('H'), pick('D') ?? pick('H')] };
  }
  js += `export const MEASURED = ${JSON.stringify(ramps, null, 2)};\n`;
  writeFileSync(resolve(root, 'src/ceoSpritesTraced.js'), js);
  console.log('wrote src/ceoSpritesTraced.js');
}

const cmd = process.argv[2];
if (cmd === 'build') build();
else dump();
