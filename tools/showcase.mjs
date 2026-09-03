// Renders the slideshow's quadrant slides to one PNG for review.
//
//   node tools/showcase.mjs out.png
//
// Same composition as CeoSlideshow.jsx: each traced class as one face in four
// skins — reference top-left, then cyan, pink, green.

import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { SPRITES, GRID, paletteFrom, showcaseTraits, TRACED } from '../src/ceoArt.js';

const SCALE = 5;
const out = process.argv[2] ?? 'showcase.png';
const ids = [...TRACED].sort((a, b) => a - b);
const png = new PNG({ width: ids.length * GRID * SCALE, height: GRID * SCALE });
const rgb = (hx) => [1, 3, 5].map((i) => parseInt(hx.slice(i, i + 2), 16));

ids.forEach((id, col) => {
  const pals = showcaseTraits(id).map((t) => ({ pal: paletteFrom(t), bg: t.backdrop.base }));
  const grid = SPRITES[id];
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      // Quadrant index: 0 TL, 1 TR, 2 BL, 3 BR.
      const q = (y < GRID / 2 ? 0 : 2) + (x < GRID / 2 ? 0 : 1);
      const ch = grid[y][x];
      const { pal, bg } = pals[q];
      const c = rgb(ch === '.' ? bg : (pal[ch] ?? '#FF00FF'));
      for (let sy = 0; sy < SCALE; sy += 1) for (let sx = 0; sx < SCALE; sx += 1) {
        const i = (((y * SCALE) + sy) * png.width + (col * GRID + x) * SCALE + sx) * 4;
        png.data[i] = c[0]; png.data[i + 1] = c[1]; png.data[i + 2] = c[2]; png.data[i + 3] = 255;
      }
    }
  }
});

writeFileSync(out, PNG.sync.write(png));
console.log(`wrote ${out} (${png.width}x${png.height})`);
