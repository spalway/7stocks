// ============================================================================
// CEO pixel art — palette, traits and SVG rendering.
// ============================================================================
//
// Plain JavaScript with no JSX, because server/index.mjs imports it to answer
// /img/:ticker/:asset.svg and Node cannot parse JSX. Anything that computes
// lives here; anything that renders lives in CeoArt.jsx. The grids themselves
// live in ceoSprites.js so this file stays readable.

import { JASSY, PICHAI, ZUCK, HUANG, NADELLA, TERNUS, MUSK, MEASURED } from './ceoSprites.js';

export const GRID = 48;

const RAW = [JASSY, PICHAI, ZUCK, HUANG, NADELLA, TERNUS, MUSK];

/// Normalise once at load: pad every row to GRID and every grid to GRID rows.
///
/// Outline weight is ONE CELL and is authored that way in the grids — there is
/// no thickening pass. An earlier version grew every outline to two cells on
/// load, arguing that one cell reads thin at 48x48. Measured against
/// public/CEOPIXELS/*.png that is simply not what the references do: their
/// outline is one cell, and doubling it costs a cell of face on every edge and
/// closes up the spectacle frames. See docs/CEO-PIXEL-TEMPLATE.md §2 rule 3.
///
/// The padding here is a safety net, not a licence. Author rows at full 48
/// width; a short row is silently backfilled with background and that is how
/// the detached-ear bug shipped. See the template §6.
export const SPRITES = RAW.map((rows) => {
  const out = rows.slice(0, GRID).map((r) => r.padEnd(GRID, '.').slice(0, GRID));
  while (out.length < GRID) out.push('.'.repeat(GRID));
  return out;
});

// ------------------------------------------------------------------- likeness
//
import {
  SKIN_NATURAL, SKIN_SURREAL, HAIR_NATURAL, HAIR_SURREAL,
  FRAME, LENS, CLOTH, BACKDROP, EYE, CANON, VARIANTS, pick,
  SKIN_SURREAL_SLOTS, HAIR_SURREAL_SLOTS, FRAME_SLOTS,
  LENS_SLOTS, CLOTH_SLOTS, BACKDROP_SLOTS, TIE, SHIRT, TIE_SLOTS, SHIRT_SLOTS,
  SURREAL_SKIN_CHANCE, SURREAL_HAIR_CHANCE, VARIANT_CHANCE,
} from './ceoPalette.js';

export { SURREAL_SKIN_CHANCE, SURREAL_HAIR_CHANCE, VARIANT_CHANCE };

/// Which classes have traced art. Only the FIRST_LAST_2 references in
/// public/CEOPIXELS are recoloured; a class without one (Ternus) shows a
/// pending tile instead of the old hand-drawn grid.
export const TRACED = new Set([0, 1, 2, 3, 4, 5, 6]);
export const hasArt = (companyId) => TRACED.has(companyId);

/// Four colourways for the preview quadrants: the reference, then the same
/// face in the three showcase skins. Only the skin moves — hair, clothes, tie
/// and backdrop stay on the reference values, so the four quarters meet
/// without a seam and the outline is the same black in all of them.
/// Louder than the mintable surreal ramps on purpose: this is a poster, not
/// a token. Skin, jacket and backdrop each change per quarter; the reference
/// quarter keeps its own backdrop.
export const SHOWCASE = [
  { skin: { name: 'Cyan', base: '#5CE0EC', shade: '#33A9B5' }, cloth: 'Navy', backdrop: { name: 'Deep Blue', base: '#1F3FA6' } },
  { skin: { name: 'Hot Pink', base: '#FF6BC1', shade: '#C9418F' }, cloth: 'Graphite', backdrop: { name: 'Laser Red', base: '#E3262B' } },
  { skin: { name: 'Neon Green', base: '#8CF25A', shade: '#57B532' }, cloth: 'Oxblood', backdrop: { name: 'Amazon Orange', base: '#FF9900' } },
];
export function showcaseTraits(companyId) {
  // The reference quarter sits on black, like the cards; the other three
  // carry their own colour.
  const base = { ...traitsFor('canonical', companyId, true), backdrop: { name: 'Black', base: '#000000', shade: '#000000' } };
  return [base, ...SHOWCASE.map((w) => ({
    ...base,
    skin: w.skin,
    cloth: { name: w.cloth, ...CLOTH[w.cloth] },
    backdrop: { ...w.backdrop, shade: w.backdrop.base },
  }))];
}

/// A class in its variant, for the docs. Same overrides traitsFor applies
/// when the variant roll wins, on top of the reference colourway.
export function variantTraits(companyId) {
  const base = traitsFor('canonical', companyId, true);
  const v = VARIANTS[companyId];
  if (!v) return base;
  const mono = { name: 'Monochrome', base: '#2B2B2B', shade: '#161616' };
  return {
    ...base,
    skin: { name: v.name, ...v.skin },
    hair: { name: v.name, ...v.hair },
    eye: v.eye,
    frame: v.mono ? mono : base.frame,
    cloth: v.mono ? mono : base.cloth,
    tie: v.mono ? { name: 'Monochrome', base: '#161616', shade: '#161616' } : base.tie,
    shirt: v.mono ? { name: 'Monochrome', base: '#D6D6D6', shade: '#D6D6D6' } : base.shirt,
    variant: v.name,
  };
}

/// One grid painted four ways in a single SVG: each cell takes the palette of
/// its quadrant, and each quadrant its own backdrop. One document, one
/// coordinate space, so the quarters cannot drift apart by a subpixel the way
/// four stacked images can.
export function renderQuadSvg({ companyId = 0, ways, size = 256 }) {
  const grid = SPRITES[companyId] ?? SPRITES[0];
  const pals = ways.map(paletteFrom);
  const half = GRID / 2;
  let rects = '';
  for (let y = 0; y < GRID; y += 1) {
    const row = grid[y];
    const qy = y < half ? 0 : 2;
    let x = 0;
    while (x < GRID) {
      const ch = row[x];
      if (ch === '.') { x += 1; continue; }
      const q = qy + (x < half ? 0 : 1);
      // A run stops at the quadrant boundary so its colour stays in one quarter.
      const limit = x < half ? half : GRID;
      let run = 1;
      while (x + run < limit && row[x + run] === ch) run += 1;
      rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${pals[q][ch] ?? '#FF00FF'}"/>`;
      x += run;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${GRID}" `
    + `width="${size}" height="${size}" shape-rendering="crispEdges" role="img">`
    + [[0, 0], [half, 0], [0, half], [half, half]]
      .map(([x, y], i) => `<rect x="${x}" y="${y}" width="${half}" height="${half}" fill="${ways[i].backdrop.base}"/>`)
      .join('')
    + rects + '</svg>';
}

/// The reference's own colours, measured by the tracer, are the canonical
/// colourway: that is what "the face looks like this" means. The named ramps
/// in ceoPalette are the fallback for a grid that was not traced (Ternus).
const MEASURED_KEYS = ['JASSY', 'PICHAI', 'ZUCK', 'HUANG', 'NADELLA', 'TERNUS', 'MUSK'];
function measuredRamp(companyId, part, fallback) {
  const m = MEASURED?.[MEASURED_KEYS[companyId]]?.[part];
  if (!m || !m[0]) return fallback;
  return { name: 'Natural', base: m[0], shade: m[1] ?? m[0] };
}

/// A stable 32-bit seed from any string. FNV-1a — not cryptographic, it only
/// needs to be deterministic and to give the same answer in the browser as it
/// does on the server.
export function seedFrom(input) {
  // Coerced, not defaulted: a default parameter only fires on undefined, and
  // callers legitimately pass null while chain data is still loading.
  const s = input == null ? '' : String(input);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/// A tiny deterministic stream, so each slot draws an independent-looking value
/// from one seed. Without it, related slots move together and every rare variant
/// would always arrive with the same jacket.
function stream(seed) {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s >>> 0;
  };
}

/// The full colourway for one asset.
///
/// Deterministic from the address, so anyone holding it can recompute the art
/// and nothing has to be stored. Draw order matters and must not be shuffled:
/// every slot pulls from the same stream in a fixed sequence, so changing the
/// order changes every existing token.
export function traitsFor(address, companyId = 0, canonical = false) {
  const canon = CANON[companyId] ?? CANON[0];
  const r = stream(seedFrom(`${companyId}:${address}`));

  // `canonical` forces the reference look: no surreal, no variant.
  //
  // The seven preview cards identify the classes rather than showing sample
  // tokens, and a random roll there teaches the wrong reference — a green
  // Pichai on the card that says "this is Sundar Pichai" is actively
  // misleading. Real tokens (gallery, recent mints) still roll normally.
  //
  // EXACTLY NINE DRAWS, ALWAYS, IN THIS ORDER. Nothing here is conditional.
  //
  // The picks run even when their roll lost and even when `canonical` discards
  // the result, because a skipped draw shifts every slot after it. That is what
  // keeps a canonical render and a rolled one walking the stream in lockstep,
  // so the preview card and the real token can never disagree about what comes
  // next.
  //
  // Resist the temptation to move a pick inside its own branch. It reads
  // tidier and silently re-rolls the rest of the collection.
  const skinRoll = r() % 100 < SURREAL_SKIN_CHANCE;
  const skinPick = pick(SKIN_SURREAL_SLOTS, SKIN_SURREAL, r);
  const hairRoll = r() % 100 < SURREAL_HAIR_CHANCE;
  const hairPick = pick(HAIR_SURREAL_SLOTS, HAIR_SURREAL, r);
  const frame = pick(FRAME_SLOTS, FRAME, r);
  const lens = pick(LENS_SLOTS, LENS, r);
  const cloth = pick(CLOTH_SLOTS, CLOTH, r);
  const backdrop = pick(BACKDROP_SLOTS, BACKDROP, r);
  const variantRoll = r() % 100 < VARIANT_CHANCE;
  // Draws 10 and 11, appended after the original nine — see the template §5.
  const tie = pick(TIE_SLOTS, TIE, r);
  const shirt = pick(SHIRT_SLOTS, SHIRT, r);

  const skinSurreal = skinRoll && !canonical;
  const skin = skinSurreal ? skinPick : measuredRamp(companyId, 'skin', { name: canon.skin, ...SKIN_NATURAL[canon.skin] });

  const hairSurreal = hairRoll && !canonical;
  const hair = hairSurreal ? hairPick : measuredRamp(companyId, 'hair', { name: canon.hair, ...HAIR_NATURAL[canon.hair] });

  const variant = variantRoll && !canonical ? (VARIANTS[companyId] ?? null) : null;

  return {
    skin: variant ? { name: variant.name, ...variant.skin } : skin,
    hair: variant ? { name: variant.name, ...variant.hair } : hair,
    // Pupils are black in every reference; only a variant recolours them.
    eye: variant ? variant.eye : '#101012',
    frame: variant?.mono ? { name: 'Monochrome', base: '#2B2B2B', shade: '#161616' } : frame,
    lens,
    cloth: variant?.mono ? { name: 'Monochrome', base: '#2B2B2B', shade: '#161616' } : cloth,
    backdrop,
    // The reference look wears the reference tie and shirt: black on white.
    // Only real tokens roll them.
    tie: variant?.mono ? { name: 'Monochrome', base: '#161616', shade: '#161616' }
      : canonical ? { name: 'Black', base: TIE.Black, shade: TIE.Black } : tie,
    shirt: variant?.mono ? { name: 'Monochrome', base: '#D6D6D6', shade: '#D6D6D6' }
      : canonical ? { name: 'White', base: SHIRT.White, shade: SHIRT.White } : shirt,
    variant: variant ? variant.name : null,
    surreal: !variant && (skinSurreal || hairSurreal),
  };
}

/// Slot character -> colour.
///
/// Fixed slots (outline, eye white, mouth) are constants; everything else
/// reads a ramp. A grid holds `H`, never a hex — that separation is what lets
/// one grid yield every variant.
export function paletteFrom(t) {
  return {
    X: '#0D0D0F',
    W: '#FFFFFF',
    T: '#FFFFFF',
    P: t.eye,
    E: t.eye,
    M: '#5D2A2A',
    R: '#A8615F',

    S: t.skin.base,
    s: t.skin.shade,
    n: t.skin.shade,

    H: t.hair.base,
    D: t.hair.shade,
    h: t.hair.base,
    // Brows keep a fixed dark so a bald face still has them after any roll.
    B: '#3A2A1C',
    // Facial hair sits over skin, so it is hair seen through skin: a blend of
    // the two, and it follows both rolls.
    F: mix(t.skin.base, t.hair.base, 0.6),

    G: t.frame.base,
    l: t.lens.base,

    C: t.cloth.base,
    c: t.cloth.shade,
    N: t.shirt?.base ?? '#F4F4F4',
    K: t.tie?.base ?? '#111114',
    A: t.frame.base,
  };
}

/// Linear blend of two hex colours, `k` toward the second.
function mix(a, b, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join('');
}

/// The portrait as an SVG string.
///
/// Runs of identical cells merge into one <rect>, cutting the element count by
/// roughly ten times against one rect per pixel. That is the difference between
/// an image small enough to sit in token metadata and one that has to be hosted.
///
/// `background` overrides the rolled backdrop, for the places on the site that
/// need the portrait on a known surface.
export function ceoSvg({ companyId = 0, address = '', size = 256, background, canonical = false }) {
  return renderSvg({ companyId, traits: traitsFor(address, companyId, canonical), size, background });
}

/// The same, from an explicit colourway. The preview quadrants use this to
/// paint one grid four ways without inventing addresses for them.
export function renderSvg({ companyId = 0, traits, size = 256, background }) {
  const grid = SPRITES[companyId] ?? SPRITES[0];
  const pal = paletteFrom(traits);

  let rects = '';
  for (let y = 0; y < GRID; y += 1) {
    const row = grid[y];
    let x = 0;
    while (x < GRID) {
      const ch = row[x];
      if (ch === '.') { x += 1; continue; }
      let run = 1;
      while (x + run < GRID && row[x + run] === ch) run += 1;
      rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${pal[ch] ?? '#FF00FF'}"/>`;
      x += run;
    }
  }

  const bg = background === null ? ''
    : `<rect width="${GRID}" height="${GRID}" fill="${background ?? traits.backdrop.base}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${GRID}" `
    + `width="${size}" height="${size}" shape-rendering="crispEdges" role="img">`
    + bg + rects + '</svg>';
}

/// Human-readable traits, for a token attribute list and the site trait row.
/// Kept beside the generator so the two can never disagree.
export function traitList(address, companyId = 0) {
  const t = traitsFor(address, companyId);
  const out = [
    { trait_type: 'Skin', value: t.skin.name },
    { trait_type: 'Hair', value: t.hair.name },
    { trait_type: 'Frame', value: t.frame.name },
    { trait_type: 'Attire', value: t.cloth.name },
    { trait_type: 'Shirt', value: t.shirt.name },
    { trait_type: 'Tie', value: t.tie.name },
    { trait_type: 'Backdrop', value: t.backdrop.name },
  ];
  if (t.variant) out.unshift({ trait_type: 'Variant', value: t.variant });
  return out;
}
