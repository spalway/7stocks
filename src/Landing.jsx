// The landing page.
//
// The opening section carries the whole pitch: what it is, what it costs, what
// holding one entitles you to, and which token each CEO pays in. The pot
// section below is the evidence for that pitch.

import { Link } from './router.jsx';
import { CeoArt, Logo } from './CeoArt.jsx';
import CeoCard from './CeoCard.jsx';
import PotAllocation from './PotAllocation.jsx';
import Countdown from './Countdown.jsx';
import CeoSlideshow from './CeoSlideshow.jsx';
import ContractPill from './ContractPill.jsx';
import {
  COMPANIES, MINT_PRICE_SOL, ALLOCATIONS_PER_CEO, TOTAL_SUPPLY, DROP_INTERVAL_MINUTES,
  contractUrl,
} from './ceoData.js';
import { useLive } from './live.js';

function Shell({ title, aside, children }) {
  return (
    <section>
      <div className="shell">
        {title && (
          <div className="label">
            <span>{title}</span>
            {aside && <span>{aside}</span>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export default function Landing({ now }) {
  const { mintedByCompany, totalMinted, GALLERY, secondsToNextDrop } = useLive();
  const remaining = secondsToNextDrop(now);

  return (
    <>
      <section className="hero">
        <div className="shell hero-shell">
          <h1>
            Mint &amp; Hold NFT CEOs
            <br />
            <span className="glow-word">Get Paid in xStocks</span>
          </h1>

          {/* Copy on the left, the slideshow on the right. The show cycles all
              seven classes and, for each, four colourways of the same face, so
              the range of a mint is shown rather than described. */}
          <div className="hero-body">
          <div className="hero-copy">
          <p className="lede">
            Every NFT CEO earns a share of the creator fees our token generates.
            Distributed every {DROP_INTERVAL_MINUTES} minutes in that CEO&apos;s
            xStock, straight into the NFT&apos;s vault.
          </p>

          <p>
            Each cycle the fee pot is swapped from SOL and split evenly across
            every NFT in the collection. Your share lands in the NFT&apos;s{' '}
            <b>Metaplex vault</b> as the xStock of that CEO&apos;s company: AMZNx
            for a Jassy, TSLAx for a Musk. The split is <b>per NFT, not per
            wallet</b>. Holding one CEO or ten of the same does not change what
            each is owed, but every NFT you mint is its own allocation, so the
            way to earn more is to hold more CEOs. Nothing is staked or locked;
            it accrues while it sits in your wallet.
          </p>

          <p>
            There are <b>{ALLOCATIONS_PER_CEO} of each CEO</b> and{' '}
            {TOTAL_SUPPLY} across the collection. No CEO is rarer than another
            and none earns more from a cycle. Which one you mint decides the
            stock you are paid in, not the amount. The first ten wallets to hold
            all seven CEOs get something extra. We are not saying what.
          </p>

          </div>

          <div className="hero-aside">
            <CeoSlideshow />
          </div>

          {/* Second row: the contract button under the copy and the mint
              button under the slideshow, on one line. */}
          <ContractPill />
          <Link to="/mint" className="cta cta-block hero-mint-cta">
            Mint for {MINT_PRICE_SOL} SOL →
          </Link>
          </div>

          {/* All seven at once rather than one at a time. A carousel shows one
              and implies the others are queued behind it; the whole claim is
              that they are equivalent, and seven side by side says so without
              needing a caption.

              One grid rather than three stacked rows, so a card can never drift
              out of alignment with the token it points at. */}
          <div className="ceo-grid">
            {mintedByCompany.map((c) => (
              <div className="ceo-col" key={c.ticker} style={{ '--brand': c.hue }}>
                <CeoCard company={c} minted={c.minted} />

                <span className="ceo-drop" aria-hidden>
                  <span className="ceo-drop-line" />
                  <span className="ceo-drop-head" />
                </span>

                <a
                  className="ceo-token"
                  href={contractUrl(c.mint)}
                  target="_blank"
                  rel="noreferrer"
                  title={`${c.stock} contract on Solscan`}
                >
                  <Logo companyId={c.id} size={36} />
                  <b className="ceo-token-name">{c.stock}</b>
                  <span className="ceo-token-elig">(eligible)</span>
                  <span className="ceo-token-alloc">
                    <i>{c.minted}</i>/{ALLOCATIONS_PER_CEO}
                  </span>
                </a>
              </div>
            ))}
          </div>

          <p className="ceo-grid-note">
            Every CEO pays out in the tokenised stock of the company they run.
            Supply is identical across all seven.
          </p>
        </div>
      </section>

      {/* --------------------------------------------- current pot allocation */}
      <Shell title="Current pot allocation" aside="This cycle">
        <PotAllocation seconds={remaining} />
      </Shell>

    </>
  );
}
