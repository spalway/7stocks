// Renders a contact sheet of the portraits to a PNG for review.
//
//   node tools/preview.mjs out.png            canonical row + three rolled rows
//
// Rasterises the grid directly (one cell = SCALE px) rather than going through
// the SVG, so it needs nothing but pngjs.

import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { SPRITES, GRID, traitsFor, paletteFrom } from '../src/ceoArt.js';

const SCALE = 6;
const out = process.argv[2] ?? 'preview.png';
const rows = [
  { canonical: true, seed: 'canon' },
  { canonical: false, seed: 'AaBbCc11' },
  { canonical: false, seed: 'ZzYyXx22' },
  { canonical: false, seed: 'QqWwEe33' },
];
const cols = SPRITES.length;
const png = new PNG({ width: cols * GRID * SCALE, height: rows.length * GRID * SCALE });

const hexToRgb = (hx) => [1, 3, 5].map((i) => parseInt(hx.slice(i, i + 2), 16));

rows.forEach((r, ry) => {
  for (let ci = 0; ci < cols; ci += 1) {
    const t = traitsFor(`${r.seed}-${ci}`, ci, r.canonical);
    const pal = paletteFrom(t);
    const grid = SPRITES[ci];
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        const ch = grid[y][x];
        const rgb = hexToRgb(ch === '.' ? t.backdrop.base : (pal[ch] ?? '#FF00FF'));
        for (let sy = 0; sy < SCALE; sy += 1) {
          for (let sx = 0; sx < SCALE; sx += 1) {
            const px = (ci * GRID + x) * SCALE + sx;
            const py = (ry * GRID + y) * SCALE + sy;
            const i = (py * png.width + px) * 4;
            png.data[i] = rgb[0]; png.data[i + 1] = rgb[1]; png.data[i + 2] = rgb[2]; png.data[i + 3] = 255;
          }
        }
      }
    }
  }
});

writeFileSync(out, PNG.sync.write(png));
console.log(`wrote ${out} (${png.width}x${png.height})`);
