// X article header: rooftops of the seven towers along the bottom, headline
// above. 1200x675 at 2x.
//
//   node tools/article.mjs docs/social/article.png
//
// Skyline is rasterised into a pixel buffer like banner.mjs; the text is
// rendered by resvg with system fonts and composited over it.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { Resvg } from '@resvg/resvg-js';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const OUT = process.argv[2] ?? `${ROOT}/docs/social/article.png`;
const { COMPANIES } = await import(`file:///${ROOT.replace(/\\/g, '/')}/src/ceoData.js`);

const W = 1200; const H = 675; const S = 2; const unit = 4;

function stream(seed) {
  let s = seed || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s >>> 0; };
}
function fillerBand({ seed, count, depth, baseY }) {
  const r = stream(seed); const out = []; let x = -unit * 3;
  for (let i = 0; i < count; i += 1) {
    const w = unit * (6 + (r() % 4));
    const h = unit * (depth === 0 ? 22 + (r() % 12) : depth === 1 ? 34 + (r() % 16) : 48 + (r() % 20));
    out.push({ x, y: baseY - h, w, h, depth, seed: r() });
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

// Bases sit well below the frame so only the upper storeys show: the towers'
// crowns come up to about a third of the height, the filler to a sixth.
const fillerBase = H + unit * 30;
const towerBase = H + unit * 70;
const far = fillerBand({ seed: 0xA11CE, count: Math.ceil(W / (unit * 4)) + 4, depth: 0, baseY: fillerBase - unit * 14 });
const mid = fillerBand({ seed: 0xB0B, count: Math.ceil(W / (unit * 5)) + 4, depth: 1, baseY: fillerBase - unit * 6 });
const near = fillerBand({ seed: 0xC0DE, count: Math.ceil(W / (unit * 6)) + 4, depth: 2, baseY: fillerBase });

const towerW = unit * 15;
const heights = [126, 108, 96, 84, 116, 120, 88];
const jitter = [-2, 2, -1, 2, -2, 1, -2];
const CLUSTER = 0.72;
const towers = COMPANIES.map((c, i) => {
  const span = W * CLUSTER; const left = (W - span) / 2; const slot = span / COMPANIES.length;
  const x = Math.round((left + slot * (i + 0.5) - towerW / 2 + jitter[i] * unit) / unit) * unit;
  const h = unit * heights[i];
  return { ...c, x, y: towerBase - h, w: towerW, h };
});

const fillerFill = ['#1c1d20', '#151618', '#0e0f11'];
const fillerLine = ['#3a3c41', '#2c2e33', '#222428'];
const winFill = ['#33353a', '#2a2c31', '#212327'];
const fillerPlate = ['#111214', '#0b0c0e', '#060607'];

const png = new PNG({ width: W * S, height: H * S });
for (let i = 0; i < png.data.length; i += 4) { png.data[i] = 0; png.data[i + 1] = 0; png.data[i + 2] = 0; png.data[i + 3] = 255; }
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
function blit(src, x, y, size) {
  const px0 = Math.round(x * S); const py0 = Math.round(y * S); const n = Math.round(size * S);
  for (let py = 0; py < n; py += 1) for (let px = 0; px < n; px += 1) {
    const sx = Math.floor(px / n * src.width); const sy = Math.floor(py / n * src.height);
    const si = (sy * src.width + sx) * 4; const a = src.data[si + 3] / 255;
    const X = px0 + px; const Y = py0 + py;
    if (X < 0 || Y < 0 || X >= W * S || Y >= H * S) continue;
    const di = (Y * W * S + X) * 4;
    for (let k = 0; k < 3; k += 1) png.data[di + k] = Math.round(png.data[di + k] * (1 - a) + src.data[si + k] * a);
  }
}

[far, mid, near].forEach((band, bi) => {
  for (const b of band) {
    rect(b.x, b.y, b.w, b.h, fillerFill[bi]);
    rect(b.x, b.y, b.w, unit * 2, fillerLine[bi]);
    for (const w of windows(b)) rect(w.x, w.y, unit, unit, winFill[bi]);
    rect(b.x + unit * 1.5, b.y + unit * 5, b.w - unit * 3, b.w - unit * 3, fillerPlate[bi]);
  }
});
towers.forEach((t, i) => {
  stroke(t.x - unit, t.y - unit, t.w + unit * 2, t.h + unit, unit / 2, t.hue, 0.75);
  rect(t.x, t.y, t.w, t.h, '#0a0a0a');
  rect(t.x, t.y, t.w, unit * 2, t.hue);
  for (const w of windows({ ...t, seed: 0x100 + i })) rect(w.x, w.y, unit, unit, t.hue, 0.28);
  const p = t.w - unit * 3;
  rect(t.x + unit * 1.5, t.y + unit * 5, p, p, '#000000');
  const logo = PNG.sync.read(new Resvg(readFileSync(`${ROOT}/public${t.logo}`, 'utf8'), { fitTo: { mode: 'width', value: 128 } }).render().asPng());
  blit(logo, t.x + unit * 1.5, t.y + unit * 5, p);
});

// ---- headline, rendered by resvg with system fonts, composited over the city
const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * S}" height="${H * S}" viewBox="0 0 ${W} ${H}">
  <g font-family="Inter, Segoe UI, Arial, sans-serif" font-weight="800" text-anchor="middle">
    <text x="${W / 2}" y="300" font-size="118" letter-spacing="-3">
      <tspan fill="#6b7078">Earn</tspan><tspan fill="#ffffff"> Own Yield</tspan>
    </text>
    <text x="${W / 2}" y="372" font-size="40" font-weight="600" fill="#8b8f96" letter-spacing="2">ceos.fun</text>
  </g>
</svg>`;
const text = PNG.sync.read(new Resvg(textSvg, { font: { loadSystemFonts: true } }).render().asPng());

// The cross-out: a thick red bar through "Earn". Its extent is measured off
// the rendered grey pixels rather than guessed from font metrics.
{
  let x0 = Infinity; let x1 = -1; let y0 = Infinity; let y1 = -1;
  for (let y = 0; y < text.height; y += 1) for (let x = 0; x < text.width; x += 1) {
    const i = (y * text.width + x) * 4;
    if (text.data[i + 3] > 128 && Math.abs(text.data[i] - 0x6b) < 12 && Math.abs(text.data[i + 1] - 0x70) < 12) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const h = y1 - y0;
  const bar = { x: x0 - h * 0.08, y: y0 + h * 0.5, w: (x1 - x0) + h * 0.16, h: h * 0.11 };
  const c = hexRgb('#E3262B');
  for (let y = Math.round(bar.y); y < Math.round(bar.y + bar.h); y += 1) for (let x = Math.round(bar.x); x < Math.round(bar.x + bar.w); x += 1) {
    const i = (y * text.width + x) * 4;
    text.data[i] = c[0]; text.data[i + 1] = c[1]; text.data[i + 2] = c[2]; text.data[i + 3] = 255;
  }
}
for (let i = 0; i < png.data.length; i += 4) {
  const a = text.data[i + 3] / 255;
  if (!a) continue;
  for (let k = 0; k < 3; k += 1) png.data[i + k] = Math.round(png.data[i + k] * (1 - a) + text.data[i + k] * a);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, PNG.sync.write(png));
console.log(`wrote ${OUT} (${W * S}x${H * S})`);
