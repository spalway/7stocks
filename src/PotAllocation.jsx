// The current distribution cycle: what is in the pot, when it pays, and how it
// splits.
//
// Ordered clock → total → split, because that is the order the questions get
// asked in. The countdown is the largest thing on the page here; a pot with no
// visible deadline gives nobody a reason to act on it.
//
// The per-NFT figure is identical for every company by construction — the pool
// scales with holder count, so the quotient does not move. That is the whole
// claim of the project, and printing the same number seven times down a column
// is a more convincing way to make it than any sentence would be.

import Countdown from './Countdown.jsx';
import { Logo } from './CeoArt.jsx';
import MintList from './MintList.jsx';
import { COMPANIES } from './ceoData.js';
import { useLive } from './live.js';

const TAU = Math.PI * 2;

function polar(cx, cy, r, frac) {
  const a = frac * TAU - TAU / 4;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}

/// One donut segment.
///
/// An annulus rather than a filled wedge because the middle is where the total
/// goes — a solid pie leaves nowhere to put it and forces the number into a
/// caption nobody reads.
export function segment(cx, cy, rOuter, rInner, from, to) {
  // A full-circle segment cannot be one arc: start and end coincide and the
  // arc collapses. Draw it as two half rings instead, which keeps the hole.
  if (to - from >= 0.9999) {
    const mid = from + (to - from) / 2;
    return segment(cx, cy, rOuter, rInner, from, mid) + ' ' + segment(cx, cy, rOuter, rInner, mid, to);
  }
  const [x1, y1] = polar(cx, cy, rOuter, from);
  const [x2, y2] = polar(cx, cy, rOuter, to);
  const [x3, y3] = polar(cx, cy, rInner, to);
  const [x4, y4] = polar(cx, cy, rInner, from);
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} `
    + `L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`;
}

export default function PotAllocation({ seconds }) {
  const { potByCompany, POT_SOL, POT_TO_HOLDERS, HOLDER_SHARE, SOL_USD, totalMinted, RECENT } = useLive();
  const size = 300;
  const c = size / 2;

  let cursor = 0;
  const slices = potByCompany.map((co) => {
    const s = { ...co, from: cursor, to: cursor + co.share };
    cursor += co.share;
    return s;
  });

  return (
    <div className="pot">
      <div className="pot-clock">
        <span className="pot-clock-label">{seconds === null ? 'First distribution starts at launch' : 'Next distribution'}</span>
        <Countdown seconds={seconds} />
      </div>

      <div className="pot-headline">
        <div>
          <dt>Pot</dt>
          <dd>{POT_SOL.toFixed(2)} <i>SOL</i></dd>
        </div>
        <div>
          <dt>To holders</dt>
          <dd>{POT_TO_HOLDERS.toFixed(2)} <i>SOL</i></dd>
        </div>
        <div>
          <dt>Holder share</dt>
          <dd>{Math.round(HOLDER_SHARE * 100)}<i>%</i></dd>
        </div>
      </div>

      <div className="pot-body">
        <div className="pot-chart">
          <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}
            role="img" aria-label="Share of the pot by company">
            {slices.map((s) => (
              <path key={s.ticker} className="pot-slice" fill={s.hue}
                d={segment(c, c, 140, 88, s.from, s.to)}>
                <title>{`${s.ticker}: ${s.holders} holders, ${s.pool.toFixed(2)} SOL`}</title>
              </path>
            ))}
            <text x={c} y={c - 8} className="pot-total">{POT_TO_HOLDERS.toFixed(1)}</text>
            <text x={c} y={c + 16} className="pot-total-unit">SOL to holders</text>
            <text x={c} y={c + 38} className="pot-total-sub">{totalMinted} NFTs</text>
          </svg>
        </div>

        <div className="pot-table">
          <div className="pot-head">
            <span>Company</span>
            <span>In pot</span>
            <span>Pool</span>
            <span>Per NFT</span>
          </div>

          {slices.map((s) => (
            <div className="pot-row" key={s.ticker} style={{ '--brand': s.hue }}>
              <span className="pot-name">
                <Logo companyId={s.id} size={24} />
                <b>{s.ticker}</b>
                <em>{s.stock}</em>
              </span>
              <span className="pot-holders">{s.holders}</span>
              <span className="pot-pool">{s.pool.toFixed(2)}<i> SOL</i></span>
              <span className="pot-per">{s.perNft.toFixed(4)}</span>
            </div>
          ))}

          <p className="pot-note">
            Per-NFT payout is the same for every company. Each pool scales with
            how many of that CEO exist, so the quotient never moves. Paid in the
            company&apos;s own xStock. Roughly{' '}
            <b>${(slices[0].perNft * SOL_USD).toFixed(2)}</b> per NFT at an
            indicative {SOL_USD} SOL/USD.
          </p>
        </div>
      </div>

      {/* Recent mints belong here rather than in their own section: they are
          what changes the split above, so they are evidence for this table
          rather than a separate list of activity. */}
      <div className="pot-recent">
        <div className="label">
          <span>Recently minted</span>
          <span>{RECENT.length} shown</span>
        </div>

        {RECENT.length === 0
          ? <p className="note">Nothing minted yet.</p>
          : <MintList rows={RECENT} />}
      </div>
    </div>
  );
}
