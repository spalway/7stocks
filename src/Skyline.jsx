// The pixel-city backdrop.
//
// Fixed behind everything and spanning the full viewport, so it reads as one
// continuous skyline rather than a strip repeated per section. It sits at the
// BOTTOM of the viewport, which is what keeps the centre of the page — where
// all the reading happens — clear of it: only the left and right flanks of the
// city are ever visible past the 760px content column.
//
// 2.5D comes from three depth bands rather than any perspective maths: a pale,
// low-contrast far row, a mid row, and a saturated near row with the seven
// company towers in it. Each band is offset and darkened differently, and that
// alone reads as depth at this level of abstraction.
//
// The sky is white and fades to the page's black through a gradient above the
// rooftops, so the buildings emerge out of the background instead of sitting on
// a hard seam.

import { useEffect, useRef, useState } from 'react';
import { COMPANIES } from './ceoData.js';

/// Deterministic stream — the skyline must be identical on every load, or the
/// page appears to rebuild itself whenever React remounts.
function stream(seed) {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s >>> 0;
  };
}

/// One band of anonymous filler buildings.
///
/// Built exactly like the seven towers — same width family, same crown band,
/// same window pitch, same plate — and different in only two ways: shorter, and
/// grey. That is what makes them read as the same city the towers stand in.
/// The earlier fillers were thin plain slabs, which read as a different
/// drawing pasted behind the real one.
///
/// `depth` drives height and tone. Far is shortest and lightest; near is
/// tallest and darkest, but still well under the shortest tower.
function fillerBand({ seed, count, depth, baseY, unit }) {
  const r = stream(seed);
  const out = [];
  let x = -unit * 3;
  for (let i = 0; i < count; i += 1) {
    // Tower widths are 9 units; fillers sit in the same family so the crown
    // bands and plates come out at a matching scale.
    const w = unit * (6 + (r() % 4));
    const h = unit * (depth === 0 ? 22 + (r() % 12) : depth === 1 ? 34 + (r() % 16) : 48 + (r() % 20));
    out.push({ x, y: baseY - h, w, h, depth, seed: r() });
    // A one-unit gap most of the time and a flush join sometimes, so the row
    // reads as a city block rather than a picket fence.
    x += w + (r() % 3 === 0 ? 0 : unit * 2);
  }
  return out;
}

/// Windows for one building, as a single path-free set of rects.
///
/// Lit windows are picked from the building's own seed so they never flicker
/// between renders — a skyline that reshuffles its lights on every paint is the
/// most distracting possible thing to put behind body copy.
function windows(b, unit) {
  const cols = Math.max(1, Math.floor(b.w / (unit * 2)) - 1);
  const rows = Math.max(1, Math.floor(b.h / (unit * 2)) - 1);
  const r = stream(b.seed || 1);
  const out = [];
  for (let cy = 0; cy < rows; cy += 1) {
    for (let cx = 0; cx < cols; cx += 1) {
      if (r() % 100 < 42) continue;
      out.push({
        x: b.x + unit + cx * unit * 2,
        y: b.y + unit * 2 + cy * unit * 2,
        w: unit,
        h: unit,
      });
    }
  }
  return out;
}

export default function Skyline() {
  // Read the real viewport on first render rather than guessing 1440 and
  // correcting a frame later — the correction was visible as a jump.
  const [w, setW] = useState(() => (typeof window === 'undefined' ? 1440 : Math.max(360, window.innerWidth)));
  const [H, setH] = useState(1000);
  const frame = useRef(null);

  // Scroll progress, 0 at the top of any page and 1 about one viewport down.
  // Drives the parallax: the seven grow taller and the grey filler sinks out of
  // the frame, so scrolling reads as the city rising around the content.
  // Throttled to one state write per animation frame.
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const span = Math.max(400, window.innerHeight * 0.9);
        setP(Math.max(0, Math.min(1, window.scrollY / span)));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  // Track BOTH dimensions of the container, so the viewBox is exactly the box
  // it is drawn into and the SVG maps 1:1 to the screen. Any mismatch means
  // `slice` scales the scene to cover, and the scale crops the outermost tower
  // on each flank off the edge of the frame.
  useEffect(() => {
    const measure = () => {
      setW(Math.max(360, window.innerWidth));
      if (frame.current) setH(Math.max(400, Math.round(frame.current.clientHeight)));
    };
    measure();
    window.addEventListener('resize', measure, { passive: true });
    return () => window.removeEventListener('resize', measure);
  }, []);

  // The content column the towers must stay clear of. There is no blackout any
  // more — the UI covers this band on its own — so the ONLY thing keeping the
  // towers out of the centre is where they are placed.
  const COLUMN = 1000;

  const unit = 8;           // one "pixel" of the pixel art
  // Bases sit BELOW the drawing, so every building runs off the bottom edge and
  // none of them shows a foundation. A skyline resting on a visible ground line
  // reads as a diagram of a city; one cropped by the frame reads as a view from
  // inside it.
  const baseY = H + unit * 12;

  // Filler bands, back to front.
  const far = fillerBand({ seed: 0xA11CE, count: Math.ceil(w / (unit * 4)) + 4, depth: 0, baseY: baseY - unit * 14, unit });
  const mid = fillerBand({ seed: 0xB0B, count: Math.ceil(w / (unit * 5)) + 4, depth: 1, baseY: baseY - unit * 6, unit });
  const near = fillerBand({ seed: 0xC0DE, count: Math.ceil(w / (unit * 6)) + 4, depth: 2, baseY, unit });

  // The seven towers, spread across the full width.
  //
  // Positioned by proportion rather than by pixel so they stay spread at every
  // viewport size. They are the tallest things in the scene by a clear margin —
  // if a filler building can rival them the whole point is lost.
  // Narrow and very tall. Width is what makes a tower read as a slab, height is
  // what makes it read as a tower.
  const towerW = unit * 9;

  // Heights assigned so the towers on each flank alternate tall / short, which
  // is what puts vertical air between neighbouring crowns. The previous set
  // stacked the four left-hand crowns within a few units of each other.
  const heights = [126, 108, 96, 84, 116, 120, 88];

  // Spread EVENLY through each flank rather than packed against the column.
  //
  // Tuned for 1920 x 1080: with a 1000px column that leaves a 460px flank each
  // side, which is enough for four towers on the left and three on the right
  // with clear ground between them. On narrower viewports the same arithmetic
  // compresses the spacing rather than dropping towers, so all seven stay on
  // screen down to the point where there is no flank at all.
  const margin = 40;                                   // clear of the shells' edge
  const flankW = Math.max(towerW, (w - COLUMN) / 2 - margin);
  const leftN = 4;
  const rightN = COMPANIES.length - leftN;

  const towers = COMPANIES.map((c, i) => {
    const left = i % 2 === 0;
    const rank = Math.floor(i / 2);
    const n = left ? leftN : rightN;
    // Centre of each tower's slot within its flank, then back off half a width.
    const slot = flankW / n;
    const centre = slot * (rank + 0.5);
    const raw = left
      ? centre - towerW / 2
      : (w - flankW) + centre - towerW / 2;
    const x = Math.max(0, Math.min(w - towerW, raw));
    // Grows with scroll, up to 45%. The crowns are allowed to climb out of
    // the top of the frame: a tower whose top you can no longer see reads as
    // taller than one whose growth was capped to fit.
    const h = unit * Math.round(heights[i] * (1 + 0.45 * p));
    return { ...c, x: Math.round(x / unit) * unit, y: baseY - h, w: towerW, h };
  });

  const fillerFill = ['#1c1d20', '#151618', '#0e0f11'];
  const fillerLine = ['#3a3c41', '#2c2e33', '#222428'];
  const winFill = ['#33353a', '#2a2c31', '#212327'];
  const fillerPlate = ['#111214', '#0b0c0e', '#060607'];

  return (
    <div className="skyline" aria-hidden ref={frame}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${w} ${H}`}
        preserveAspectRatio="xMidYMax slice"
        shapeRendering="crispEdges"
      >
        {/* No gradients here. The centre blackout and the sky wash are both
            gone: the shells are opaque and cover the middle on their own, and a
            black fade laid over a black page reads as a smear, not as depth. */}

        {/* Clouds. Chunky rectangles rather than curves — a smooth cloud in a
            pixel scene is the one element that gives the whole thing away. */}
        {[
          [0.06, 30, 5], [0.29, 16, 4], [0.5, 44, 6], [0.73, 24, 4], [0.93, 36, 5],
          [0.17, 62, 4], [0.63, 70, 5],
        ].map(([px, cy, cw], i) => (
          <g key={i} opacity="0.5">
            <rect x={Math.round(px * w)} y={cy} width={unit * cw} height={unit} fill="#fff" />
            <rect x={Math.round(px * w) + unit} y={cy - unit} width={unit * (cw - 2)} height={unit} fill="#fff" />
            <rect x={Math.round(px * w) - unit} y={cy + unit} width={unit * (cw + 1)} height={unit} fill="#fff" opacity="0.55" />
          </g>
        ))}

        {/* Filler sinks with scroll, nearer bands faster, until it is out of
            the frame and only the seven are left standing. */}
        {[far, mid, near].map((band, bi) => (
          <g key={bi} transform={`translate(0, ${Math.round(p * H * [0.45, 0.6, 0.8][bi])})`}>
            {band.map((b, i) => (
              <g key={i}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={fillerFill[bi]} />
                {/* Same anatomy as a tower: a two-unit crown band, a band near
                    the base, and a plate under the crown — just in grey. */}
                <rect x={b.x} y={b.y} width={b.w} height={unit * 2} fill={fillerLine[bi]} />
                <rect x={b.x} y={b.y + b.h - unit * 3} width={b.w} height={unit} fill={fillerLine[bi]} opacity="0.6" />
                {windows(b, unit).map((win, wi) => (
                  <rect key={wi} x={win.x} y={win.y} width={win.w} height={win.h} fill={winFill[bi]} />
                ))}
                <rect x={b.x + unit * 1.5} y={b.y + unit * 5} width={b.w - unit * 3} height={b.w - unit * 3} fill={fillerPlate[bi]} />
              </g>
            ))}
          </g>
        ))}

        {/* The seven. Drawn last so they sit in front of every filler band. */}
        {towers.map((t, i) => (
          <g key={t.ticker} className="tower" style={{ '--glow': t.hue, '--i': i }}>
            <rect
              className="tower-glow"
              x={t.x - unit}
              y={t.y - unit}
              width={t.w + unit * 2}
              height={t.h + unit}
              fill="none"
              stroke={t.hue}
              strokeWidth={unit / 2}
            />
            <rect x={t.x} y={t.y} width={t.w} height={t.h} fill="#0a0a0a" />
            {/* A band of the company colour at the crown, so the tower is
                identifiable even where the logo plate is too small to read. */}
            <rect x={t.x} y={t.y} width={t.w} height={unit * 2} fill={t.hue} />
            <rect x={t.x} y={t.y + t.h - unit * 3} width={t.w} height={unit} fill={t.hue} opacity="0.6" />
            {windows({ ...t, seed: 0x100 + i }, unit).map((win, wi) => (
              <rect key={wi} x={win.x} y={win.y} width={win.w} height={win.h} fill={t.hue} opacity="0.28" />
            ))}
            {/* Logo plate. */}
            <rect x={t.x + unit * 1.5} y={t.y + unit * 5} width={t.w - unit * 3} height={t.w - unit * 3} fill="#000" />
            <image
              href={t.logo}
              x={t.x + unit * 1.5}
              y={t.y + unit * 5}
              width={t.w - unit * 3}
              height={t.w - unit * 3}
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        ))}

      </svg>
    </div>
  );
}
