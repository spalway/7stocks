// One CEO class.
//
// No outer frame. The card is the portrait plus a name tag under it and nothing
// else — a bordered box wrapped around a bordered portrait reads as two frames
// fighting each other, and at seven-across there is no width to spend on chrome.
//
// The card body stays black. The company colour appears in exactly two places:
// as the portrait's outline, and as the gradient on the name tag — with a soft
// glow of the same colour bled behind the whole thing.

import { CeoArt, CeoPending, Logo, hasArt } from './CeoArt.jsx';
import { ALLOCATIONS_PER_CEO } from './ceoData.js';

export default function CeoCard({ company, minted }) {
  const soldOut = minted >= ALLOCATIONS_PER_CEO;

  return (
    <article
      className={`ceo-card${soldOut ? ' is-out' : ''}`}
      style={{ '--brand': company.hue, '--brand-2': company.hue2, '--brand-grad': company.grad }}
    >
      <div className="ceo-card-art">
        {hasArt(company.id)
          ? <CeoArt companyId={company.id} address={`class-${company.ticker}`} background={null} canonical />
          : <CeoPending companyId={company.id} />}
        {soldOut && <span className="ceo-card-out">Out</span>}
      </div>

      {/* The name tag is the only gradient on the card, and the logo sits in it
          square — a circle inside a rectangular tag puts two different radii
          side by side, which reads as sloppy at this size. */}
      <div className="ceo-card-plate">
        <Logo companyId={company.id} size={24} square />
        <span className="ceo-card-names">
          <b>{company.ticker}</b>
          <em>{company.ceo}</em>
        </span>
      </div>
    </article>
  );
}
