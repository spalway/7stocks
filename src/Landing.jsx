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
      {/* Hero: splash line on top, then the slideshow beside a stat strip
          with the two actions. The explainer copy moves below the seven, where
          it is read after the picture has made the point. */}
      <section className="hero">
        <div className="shell hero-shell">
          <span className="eyebrow">Seven CEOs · one mint · paid in xStocks</span>
          <h1 className="splash">
            Mint &amp; Hold NFT CEOs
            <br />
            <span className="glow-word">Get Paid in xStocks</span>
          </h1>
          <p className="lede">
            Every NFT CEO earns a share of the creator fees our token generates.
            Distributed every {DROP_INTERVAL_MINUTES} minutes in that CEO&apos;s
            xStock, straight into the NFT&apos;s vault.
          </p>

          <div className="hero-body">
            <div className="hero-aside">
              <CeoSlideshow />
            </div>

            <div className="hero-side">
              <dl className="stat-strip">
                <div><dt>Minted</dt><dd>{totalMinted} <i>/ {TOTAL_SUPPLY}</i></dd></div>
                <div><dt>Per CEO</dt><dd>{ALLOCATIONS_PER_CEO}</dd></div>
                <div><dt>Next cycle</dt><dd><Countdown seconds={remaining} inline /></dd></div>
              </dl>
              <Link to="/mint" className="cta cta-block hero-mint-cta">
                Mint for {MINT_PRICE_SOL} SOL →
              </Link>
              <ContractPill />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="shell">
          <div className="label">
            <span>The seven</span>
            <span>{totalMinted} of {TOTAL_SUPPLY} minted</span>
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

      <Shell title="How it pays" aside={`Every ${DROP_INTERVAL_MINUTES} minutes`}>
        <div className="how">
          <div className="how-step">
            <b>01</b>
            <h3>Fees land in the pot</h3>
            <p>Each cycle the creator-fee pot is swapped from SOL and split evenly across every NFT in the collection.</p>
          </div>
          <div className="how-step">
            <b>02</b>
            <h3>Paid in the CEO&apos;s stock</h3>
            <p>Your share lands in the NFT&apos;s Metaplex vault as the xStock of that company: AMZNx for a Jassy, TSLAx for a Musk.</p>
          </div>
          <div className="how-step">
            <b>03</b>
            <h3>Per NFT, not per wallet</h3>
            <p>One CEO or ten of the same, each NFT is its own allocation. Nothing is staked or locked; it accrues while it sits in your wallet.</p>
          </div>
          <div className="how-step">
            <b>04</b>
            <h3>{ALLOCATIONS_PER_CEO} of each, {TOTAL_SUPPLY} total</h3>
            <p>No CEO is rarer or earns more. Which one you mint decides the stock you are paid in, not the amount. First ten wallets to hold all seven get something extra.</p>
          </div>
        </div>
      </Shell>

      {/* --------------------------------------------- current pot allocation */}
      <Shell title="Current pot allocation" aside="This cycle">
        <PotAllocation seconds={remaining} />
      </Shell>

    </>
  );
}
