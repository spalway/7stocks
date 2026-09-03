// Twitter avatar: one face made of four CEOs, one per quadrant, each on its
// own loud backdrop. Top-left is white-on-black; the rest keep their natural
// colours on deep blue, laser red and Amazon orange.
//
//   node tools/pfp.mjs docs/social/pfp.png

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { PNG } from 'pngjs';
import { SPRITES, GRID, traitsFor, paletteFrom } from '../src/ceoArt.js';

const out = process.argv[2] ?? 'pfp.png';
const SCALE = 25; // 1200 px

const mono = (name) => ({ name, base: '#F2F2F2', shade: '#BDBDBD' });
const QUADS = [
  { id: 3, bg: '#000000', mono: true },   // Huang, white on black
  { id: 2, bg: '#1F3FA6' },               // Zuckerberg, deep blue
  { id: 6, bg: '#E3262B' },               // Musk, laser red
  { id: 0, bg: '#FF9900' },               // Jassy, Amazon orange
];

const pals = QUADS.map((q) => {
  const t = traitsFor('canonical', q.id, true);
  const pal = paletteFrom(q.mono ? {
    ...t,
    skin: mono('White'), hair: { name: 'Grey', base: '#D9D9D9', shade: '#9A9A9A' },
    cloth: { name: 'Light', base: '#E6E6E6', shade: '#BFBFBF' },
    shirt: { name: 'White', base: '#FFFFFF', shade: '#FFFFFF' },
    tie: { name: 'Silver', base: '#C8C8C8', shade: '#C8C8C8' },
    frame: { name: 'Light', base: '#DADADA', shade: '#AAAAAA' },
  } : t);
  if (q.mono) { pal.M = '#8A8A8A'; pal.B = '#9A9A9A'; pal.F = '#BDBDBD'; }
  return { pal, bg: q.bg, grid: SPRITES[q.id] };
});

const rgb = (hx) => [1, 3, 5].map((i) => parseInt(hx.slice(i, i + 2), 16));
const png = new PNG({ width: GRID * SCALE, height: GRID * SCALE });
const half = GRID / 2;
for (let y = 0; y < GRID; y += 1) {
  for (let x = 0; x < GRID; x += 1) {
    const q = (y < half ? 0 : 2) + (x < half ? 0 : 1);
    const { pal, bg, grid } = pals[q];
    const ch = grid[y][x];
    const c = rgb(ch === '.' ? bg : (pal[ch] ?? '#FF00FF'));
    for (let sy = 0; sy < SCALE; sy += 1) for (let sx = 0; sx < SCALE; sx += 1) {
      const i = (((y * SCALE) + sy) * png.width + (x * SCALE) + sx) * 4;
      png.data[i] = c[0]; png.data[i + 1] = c[1]; png.data[i + 2] = c[2]; png.data[i + 3] = 255;
    }
  }
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, PNG.sync.write(png));
console.log(`wrote ${out} (${png.width}x${png.height})`);
