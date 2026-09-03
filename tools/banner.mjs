// Twitter banner, 1500x500 at 2x: the pixel skyline from the site with the
// seven brand towers spread across the full width and the grey city behind.
// Same construction as src/Skyline.jsx, at half the unit so the towers fit a
// 500-tall frame, rendered to PNG with resvg.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

// Needs @resvg/resvg-js (not a project dependency): run from a folder that has it,
// e.g. npm i @resvg/resvg-js in a scratch dir and node <that>/banner.mjs.
const ROOT = new URL('..', import.meta.url).pathname.replace(/^/([A-Za-z]:)/, '$1').replace(//$/, '');
const OUT = `${ROOT}/docs/social/banner.png`;
const { COMPANIES } = await import(`file:///${ROOT}/src/ceoData.js`);

const W = 1500; const H = 500; const unit = 4;
const baseY = H + unit * 12;

function stream(seed) {
  let s = seed || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s >>> 0; };
}
function fillerBand({ seed, count, depth, baseY: by }) {
  const r = stream(seed); const out = []; let x = -unit * 3;
  for (let i = 0; i < count; i += 1) {
    const w = unit * (6 + (r() % 4));
    const h = unit * (depth === 0 ? 22 + (r() % 12) : depth === 1 ? 34 + (r() % 16) : 48 + (r() % 20));
    out.push({ x, y: by - h, w, h, depth, seed: r() });
    x += w + (r() % 3 === 0 ? 0 : unit * 2);
  }
  return out;
}
function windows(b) {
  const cols = Math.max(1, Math.floor(b.w / (unit * 2)) - 1);
  const rows = Math.max(1, Math.floor(b.h / (unit * 2)) - 1);
  const r = stream(b.seed || 1); const out = [];
  for (let cy = 0; cy < rows; cy += 1) for (let cx = 0; cx < cols; cx += 1) {
    if (r() % 100 < 42) continue;
    out.push({ x: b.x + unit + cx * unit * 2, y: b.y + unit * 2 + cy * unit * 2 });
  }
  return out;
}

const far = fillerBand({ seed: 0xA11CE, count: Math.ceil(W / (unit * 4)) + 4, depth: 0, baseY: baseY - unit * 14 });
const mid = fillerBand({ seed: 0xB0B, count: Math.ceil(W / (unit * 5)) + 4, depth: 1, baseY: baseY - unit * 6 });
const near = fillerBand({ seed: 0xC0DE, count: Math.ceil(W / (unit * 6)) + 4, depth: 2, baseY });

const towerW = unit * 9;
const heights = [126, 108, 96, 84, 116, 120, 88];
// Spread across the whole width, in roster order, with a little jitter so
// the spacing does not read as a ruler.
const jitter = [-6, 4, -3, 5, -5, 3, -4];
const towers = COMPANIES.map((c, i) => {
  const slot = W / COMPANIES.length;
  const x = Math.round((slot * (i + 0.5) - towerW / 2 + jitter[i] * unit) / unit) * unit;
  const h = unit * heights[i];
  return { ...c, x, y: baseY - h, w: towerW, h };
});

const fillerFill = ['#1c1d20', '#151618', '#0e0f11'];
const fillerLine = ['#3a3c41', '#2c2e33', '#222428'];
const winFill = ['#33353a', '#2a2c31', '#212327'];
const fillerPlate = ['#111214', '#0b0c0e', '#060607'];


// ---- rasterise directly: every element is an axis-aligned rect, so a pixel
// buffer at 2x is simpler and more robust than an SVG round trip.
import { PNG } from 'pngjs';
const S = 2;
const png = new PNG({ width: W * S, height: H * S });
png.data.fill(0);
for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;
const hexRgb = (hx) => [1, 3, 5].map((k) => parseInt(hx.slice(k, k + 2), 16));
function rect(x, y, w, h, fill, opacity = 1) {
  const c = hexRgb(fill);
  const x0 = Math.max(0, Math.round(x * S)); const y0 = Math.max(0, Math.round(y * S));
  const x1 = Math.min(W * S, Math.round((x + w) * S)); const y1 = Math.min(H * S, Math.round((y + h) * S));
  for (let py = y0; py < y1; py += 1) for (let px = x0; px < x1; px += 1) {
    const i = (py * W * S + px) * 4;
    for (let k = 0; k < 3; k += 1) png.data[i + k] = Math.round(png.data[i + k] * (1 - opacity) + c[k] * opacity);
  }
}
function stroke(x, y, w, h, sw, fill, opacity) {
  rect(x, y, w, sw, fill, opacity); rect(x, y + h - sw, w, sw, fill, opacity);
  rect(x, y, sw, h, fill, opacity); rect(x + w - sw, y, sw, h, fill, opacity);
}
function blit(pngLogo, x, y, size) {
  // Nearest-neighbour scale of the 128px logo into the plate.
  const px0 = Math.round(x * S); const py0 = Math.round(y * S); const n = Math.round(size * S);
  for (let py = 0; py < n; py += 1) for (let px = 0; px < n; px += 1) {
    const sx = Math.floor(px / n * pngLogo.width); const sy = Math.floor(py / n * pngLogo.height);
    const si = (sy * pngLogo.width + sx) * 4; const a = pngLogo.data[si + 3] / 255;
    const X = px0 + px; const Y = py0 + py;
    if (X < 0 || Y < 0 || X >= W * S || Y >= H * S) continue;
    const di = (Y * W * S + X) * 4;
    for (let k = 0; k < 3; k += 1) png.data[di + k] = Math.round(png.data[di + k] * (1 - a) + pngLogo.data[si + k] * a);
  }
}

rect(0, 0, W, H, '#000000');
for (const [px, cy, cw] of [[0.06, 30, 5], [0.29, 16, 4], [0.5, 44, 6], [0.73, 24, 4], [0.93, 36, 5], [0.17, 62, 4], [0.63, 70, 5]]) {
  const x = Math.round(px * W);
  rect(x, cy, unit * cw, unit, '#ffffff', 0.5);
  rect(x + unit, cy - unit, unit * (cw - 2), unit, '#ffffff', 0.5);
  rect(x - unit, cy + unit, unit * (cw + 1), unit, '#ffffff', 0.27);
}
[far, mid, near].forEach((band, bi) => {
  for (const b of band) {
    rect(b.x, b.y, b.w, b.h, fillerFill[bi]);
    rect(b.x, b.y, b.w, unit * 2, fillerLine[bi]);
    rect(b.x, b.y + b.h - unit * 3, b.w, unit, fillerLine[bi], 0.6);
    for (const w of windows(b)) rect(w.x, w.y, unit, unit, winFill[bi]);
    rect(b.x + unit * 1.5, b.y + unit * 5, b.w - unit * 3, b.w - unit * 3, fillerPlate[bi]);
  }
});
towers.forEach((t, i) => {
  stroke(t.x - unit, t.y - unit, t.w + unit * 2, t.h + unit, unit / 2, t.hue, 0.75);
  rect(t.x, t.y, t.w, t.h, '#0a0a0a');
  rect(t.x, t.y, t.w, unit * 2, t.hue);
  rect(t.x, t.y + t.h - unit * 3, t.w, unit, t.hue, 0.6);
  for (const w of windows({ ...t, seed: 0x100 + i })) rect(w.x, w.y, unit, unit, t.hue, 0.28);
  const p = t.w - unit * 3;
  rect(t.x + unit * 1.5, t.y + unit * 5, p, p, '#000000');
  const logoPng = PNG.sync.read(new Resvg(readFileSync(`${ROOT}/public${t.logo}`, 'utf8'), { fitTo: { mode: 'width', value: 128 } }).render().asPng());
  blit(logoPng, t.x + unit * 1.5, t.y + unit * 5, p);
});
mkdirSync(`${ROOT}/docs/social`, { recursive: true });
writeFileSync(OUT, PNG.sync.write(png));
console.log(`wrote ${OUT} (${W * S}x${H * S})`);
