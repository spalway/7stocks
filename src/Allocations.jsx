// The site's headline metric: how the collection has actually been minted, and
// what share of each hourly drop that implies for every desk.
//
// This is the one number people will argue about, so the section is built to
// pre-empt the argument: identical supply is stated on the same screen as the
// uneven mint counts, because the spread between them is demand, not scarcity,
// and a pie chart without that caption invites exactly the wrong reading.

import { ALLOCATIONS_PER_CEO } from './ceoData.js';
import { useLive } from './live.js';
import { Logo } from './CeoArt.jsx';

const TAU = Math.PI * 2;

/// Cartesian point on the donut, with 12 o'clock as zero.
function polar(cx, cy, r, frac) {
  const a = frac * TAU - TAU / 4;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}

/// One donut segment as a path.
///
/// Drawn as an annulus rather than a filled wedge because the middle of the
/// chart is where the total goes — a solid pie leaves nowhere to put it and
/// forces the number into a caption nobody reads.
function segment(cx, cy, rOuter, rInner, from, to) {
  // A segment covering the whole circle cannot be expressed as a single arc
  // (start and end points coincide), so it is drawn as two half arcs.
  if (to - from >= 0.9999) {
    return `M ${cx} ${cy - rOuter} A ${rOuter} ${rOuter} 0 1 1 ${cx - 0.01} ${cy - rOuter} Z`
      + `M ${cx} ${cy - rInner} A ${rInner} ${rInner} 0 1 0 ${cx - 0.01} ${cy - rInner} Z`;
  }
  const [x1, y1] = polar(cx, cy, rOuter, from);
  const [x2, y2] = polar(cx, cy, rOuter, to);
  const [x3, y3] = polar(cx, cy, rInner, to);
  const [x4, y4] = polar(cx, cy, rInner, from);
  const large = to - from > 0.5 ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

export default function Allocations() {
  const { mintedByCompany, totalMinted, totalSupply } = useLive();
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;

  let cursor = 0;
  const slices = mintedByCompany.map((c) => {
    const frac = totalMinted ? c.minted / totalMinted : 0;
    const s = { ...c, from: cursor, to: cursor + frac, frac };
    cursor += frac;
    return s;
  });

  return (
    <div className="alloc">
      <div className="alloc-chart">
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img"
          aria-label="Share of mints by company">
          {slices.map((s) => (
            <path
              key={s.ticker}
              d={segment(cx, cy, 100, 62, s.from, s.to)}
              fill={s.hue}
              className="alloc-slice"
            >
              <title>{`${s.ticker}: ${s.minted} minted`}</title>
            </path>
          ))}
          <text x={cx} y={cy - 4} className="alloc-total">{totalMinted}</text>
          <text x={cx} y={cy + 14} className="alloc-sub">of {totalSupply}</text>
        </svg>
      </div>

      <div className="alloc-table">
        <div className="alloc-head">
          <span>Company</span>
          <span>Minted</span>
          <span>Share of drop</span>
        </div>

        {slices.map((s) => (
          <div className="alloc-row" key={s.ticker} style={{ '--brand': s.hue }}>
            <span className="alloc-name">
              <Logo companyId={s.id} size={28} />
              <b>{s.ticker}</b>
              <em>{s.ceo}</em>
            </span>

            <span className="alloc-count">
              {s.minted}<i>/{ALLOCATIONS_PER_CEO}</i>
            </span>

            <span className="alloc-bar-cell">
              <span className="alloc-bar">
                <span className="alloc-bar-fill" style={{ width: `${(s.frac * 100).toFixed(1)}%` }} />
              </span>
              <i>{(s.frac * 100).toFixed(1)}%</i>
            </span>
          </div>
        ))}

        <p className="alloc-note">
          Every company has the same <b>{ALLOCATIONS_PER_CEO}</b> allocations. No
          class is rarer or worth more than another. The spread above is what
          people minted, not what was made available. Share of drop is simply
          your CEO&apos;s slice of each five-minute distribution.
        </p>
      </div>
    </div>
  );
}
