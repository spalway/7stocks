// One minted CEO per row: portrait, name in the company's colour, its number
// in that CEO's run of a hundred, the holding wallet, and a link to the asset
// on-chain. Shared by the collection page and the landing page's recent
// mints so the two can never drift apart.
//
// "Holder" rather than "minter": Core assets carry their current owner and no
// history, so the chain can only say who holds it now.

import { CeoArt, Logo } from './CeoArt.jsx';
import { COMPANIES, ALLOCATIONS_PER_CEO } from './ceoData.js';
import { explorer } from './cluster.js';

export default function MintList({ rows }) {
  return (
    <ol className="mint-list">
      {rows.map((g) => {
        const c = COMPANIES[g.companyId];
        return (
          <li
            className="mint-row"
            key={g.id}
            style={{ '--brand': c.hue, '--brand-grad': c.grad }}
          >
            <span className="mint-row-art">
              <CeoArt companyId={g.companyId} address={g.address} size={44} />
            </span>
            <span className="mint-row-name">
              <b>{c.ceo}</b>
              <em>
                <Logo companyId={c.id} size={12} square />
                {c.ticker} · #{g.serial} / {ALLOCATIONS_PER_CEO}
              </em>
            </span>
            <span className="mint-row-holder">
              <i>Holder</i>
              <a href={explorer(g.owner)} target="_blank" rel="noreferrer" title={g.owner}>{g.who}</a>
            </span>
            <a
              className="mint-row-link"
              href={explorer(g.address)}
              target="_blank"
              rel="noreferrer"
              title="View the NFT on-chain"
            >
              View on-chain →
            </a>
          </li>
        );
      })}
    </ol>
  );
}
