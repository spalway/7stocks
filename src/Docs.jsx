// The documentation page.
//
// A sticky contents rail that hangs outside the page column, chapters as
// shells, and a scroll spy marking where the reader is. Everything shown is
// drawn from the same modules the site runs on, so the docs cannot describe
// an art pipeline or a fee split the code does not actually have.

import { useEffect, useState } from 'react';
import {
  COMPANIES, ALLOCATIONS_PER_CEO, TOTAL_SUPPLY, MINT_PRICE_SOL, DROP_INTERVAL_MINUTES,
} from './ceoData.js';
import {
  CeoArt, Logo, renderQuadSvg, renderSvg, showcaseTraits, variantTraits,
} from './CeoArt.jsx';
import { SKIN_SURREAL, HAIR_SURREAL, SURREAL_SKIN_CHANCE, SURREAL_HAIR_CHANCE, VARIANT_CHANCE } from './ceoPalette.js';
import { useLive, HOLDER_SHARE } from './live.js';
import ContractPill from './ContractPill.jsx';

const CHAPTERS = [
  ['overview', 'Overview'],
  ['classes', 'The seven classes'],
  ['artwork', 'The artwork'],
  ['variants', 'Rare variants'],
  ['vaults', 'Vaults'],
  ['drop', 'The five-minute drop'],
  ['minting', 'Minting'],
  ['parody', 'Parody and likeness'],
];

const VARIANT_NAMES = ['Gold Standard', 'Sundar 2.0', 'Zombie', 'Evil', 'Cloud Native', 'Monochrome', 'Cyborg'];

/// Which chapter the reader is in: the topmost heading past the upper third
/// of the viewport, which is the one a reader would say they are looking at.
function useChapterSpy() {
  const [active, setActive] = useState(CHAPTERS[0][0]);
  useEffect(() => {
    const onScroll = () => {
      let current = CHAPTERS[0][0];
      for (const [id] of CHAPTERS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.33) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return active;
}

function Chapter({ id, title, aside, children }) {
  return (
    <section id={id} className="chapter">
      <div className="shell">
        <div className="label">
          <span>{title}</span>
          {aside && <span>{aside}</span>}
        </div>
        <div className="doc">{children}</div>
      </div>
    </section>
  );
}

/// Where the money goes, top to bottom. Each step is one thing the backend
/// actually does, in the order it does it.
function FeeFlow() {
  const holder = Math.round(HOLDER_SHARE * 100);
  return (
    <ol className="flow">
      <li className="flow-step" style={{ '--flow': '#ffffff' }}>
        <span className="flow-n">01</span>
        <div>
          <h4>The token trades</h4>
          <p>Every trade of the CEOs token on pump.fun pays a creator fee. That fee is the only revenue in the system; nothing is minted to fund it.</p>
        </div>
      </li>
      <li className="flow-step" style={{ '--flow': '#4285F4' }}>
        <span className="flow-n">02</span>
        <div>
          <h4>The fee splits on-chain</h4>
          <p>pump.fun&apos;s fee-sharing config routes creator fees the moment they are claimed. No operator key is in the loop.</p>
          <div className="flow-split">
            <div className="flow-share" style={{ '--share': '#34A853' }}><b>{holder}%</b><span>to the pot wallet, for holders</span></div>
            <div className="flow-share" style={{ '--share': '#8b8f96' }}><b>{100 - holder}%</b><span>to the protocol</span></div>
          </div>
        </div>
      </li>
      <li className="flow-step" style={{ '--flow': '#FBBC05' }}>
        <span className="flow-n">03</span>
        <div>
          <h4>Every {DROP_INTERVAL_MINUTES} minutes the pot is divided by class</h4>
          <p>The pot&apos;s SOL is split across the seven classes in proportion to how many CEOs of each exist. Forty NVDA out of three hundred minted means NVDA gets forty three-hundredths.</p>
        </div>
      </li>
      <li className="flow-step" style={{ '--flow': '#EA4335' }}>
        <span className="flow-n">04</span>
        <div>
          <h4>Each slice is swapped into that class&apos;s xStock</h4>
          <p>Seven Jupiter swaps: SOL into AMZNx, GOOGLx, METAx, NVDAx, MSFTx, AAPLx, TSLAx. The stock lands in the program&apos;s holding account and the round is credited on-chain.</p>
        </div>
      </li>
      <li className="flow-step" style={{ '--flow': '#76B900' }}>
        <span className="flow-n">05</span>
        <div>
          <h4>Every NFT is settled into its own vault</h4>
          <p>The program pushes each CEO&apos;s equal share into a vault derived from the NFT itself. Same amount for every NFT of a class; the class only decides which stock.</p>
        </div>
      </li>
      <li className="flow-step" style={{ '--flow': '#ffffff' }}>
        <span className="flow-n">06</span>
        <div>
          <h4>The holder sweeps whenever they like</h4>
          <p>Only the current owner can sign the vault out. Sell the NFT and the vault, with everything in it, goes to the buyer.</p>
        </div>
      </li>
    </ol>
  );
}

/// The four colourways of one grid, as the landing slideshow paints them.
function Quad({ companyId }) {
  return (
    <span
      className="fig-art"
      dangerouslySetInnerHTML={{ __html: renderQuadSvg({ companyId, ways: showcaseTraits(companyId), size: 200 }) }}
    />
  );
}

function Variant({ companyId }) {
  return (
    <span
      className="fig-art"
      dangerouslySetInnerHTML={{ __html: renderSvg({ companyId, traits: variantTraits(companyId), size: 200 }) }}
    />
  );
}

export default function Docs() {
  const { mintedByCompany, totalMinted, POT_SOL } = useLive();
  const active = useChapterSpy();

  return (
    <div className="docs-layout">
      <nav className="docs-rail" aria-label="Chapters">
        <span className="docs-rail-head">Contents</span>
        <ol>
          {CHAPTERS.map(([id, label], i) => (
            <li key={id} style={{ '--i': i }}>
              <a href={`#${id}`} className={active === id ? 'on' : ''}>
                <span className="docs-rail-n">{String(i + 1).padStart(2, '0')}</span>
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="docs-body">
        <section className="hero">
          <h1>How CEOs.fun works</h1>
          <p className="lede">
            One mint, seven classes, and a drop every five minutes split evenly
            across all of them. There is no rarity ladder and nothing to choose.
          </p>
        </section>

        <Chapter id="overview" title="01 · Overview" aside="Start here">
          <p>
            A CEO is a pixel portrait of one of seven people running one of the
            seven largest companies in tech, minted as a Metaplex Core NFT on
            Solana. Minting costs <b>{MINT_PRICE_SOL} SOL</b> and returns one
            CEO. Which of the seven you get is rolled on-chain at mint.
          </p>
          <p>
            Holding one earns a share of the creator fees the CEOs token
            generates, paid every {DROP_INTERVAL_MINUTES} minutes in the
            tokenised stock of that CEO&apos;s company and delivered to a vault
            the NFT owns. The token&apos;s contract:
          </p>

          <ContractPill />

          <dl className="doc-stats">
            <div style={{ '--brand': COMPANIES[0].hue }}><dt>Price</dt><dd>{MINT_PRICE_SOL} <i>SOL</i></dd></div>
            <div style={{ '--brand': COMPANIES[1].hue }}><dt>Supply</dt><dd>{TOTAL_SUPPLY}</dd></div>
            <div style={{ '--brand': COMPANIES[3].hue }}><dt>Per CEO</dt><dd>{ALLOCATIONS_PER_CEO}</dd></div>
            <div style={{ '--brand': COMPANIES[4].hue }}><dt>Cycle</dt><dd>{DROP_INTERVAL_MINUTES} <i>min</i></dd></div>
            <div style={{ '--brand': COMPANIES[6].hue }}><dt>To holders</dt><dd>{Math.round(HOLDER_SHARE * 100)}<i>%</i></dd></div>
          </dl>

          <p>Where the money goes, in the order it goes there:</p>
          <FeeFlow />
        </Chapter>

        <Chapter id="classes" title="02 · The seven classes" aside={`${COMPANIES.length} classes`}>
          <p>
            The classes differ in exactly two ways: whose face is on the NFT,
            and which xStock it is paid in. Supply, price, and share of every
            drop are identical. Which one you mint is rolled from the remaining
            supply, so the odds start equal and shift only as classes sell out.
          </p>

          <div className="doc-table">
            <div className="doc-table-head">
              <span>CEO</span><span>Company</span><span>Paid in</span><span>Minted</span>
            </div>
            {mintedByCompany.map((c) => (
              <div className="doc-table-row" key={c.ticker} style={{ '--brand': c.hue }}>
                <span className="doc-ceo"><Logo companyId={c.id} size={26} />{c.ceo}</span>
                <span>{c.company}</span>
                <span><b>{c.stock}</b></span>
                <span>{c.minted} / {ALLOCATIONS_PER_CEO}</span>
              </div>
            ))}
          </div>
          <p className="muted">
            xStocks are tokenised equities on Solana (Token-2022). Each class
            pays in the one for its company: a Jassy in AMZNx, a Musk in TSLAx.
          </p>
        </Chapter>

        <Chapter id="artwork" title="03 · The artwork" aside="48 × 48">
          <p>
            Every portrait is traced from a hand-made 48 × 48 reference, exactly
            twice the resolution of the collection that inspired it, so the
            original silhouette holds cell for cell while leaving room for the
            details that make seven specific people identifiable: a beard line,
            wire frames with a real bridge, a tie knot.
          </p>
          <p>
            The grid stores <b>slots, not colours</b>: a cell says &quot;skin&quot;
            or &quot;hair&quot; or &quot;jacket&quot;, and the colours are applied at
            render time from a palette rolled off the NFT&apos;s own address. The
            black outline and the face itself never change; skin, hair, jacket,
            shirt, tie, glasses and backdrop can. That is what lets one grid
            produce every token of a class while every token still looks like
            the CEO.
          </p>

          <div className="doc-figure">
            {COMPANIES.map((c) => (
              <figure key={c.ticker} style={{ '--brand': c.hue }}>
                <Quad companyId={c.id} />
                <figcaption><b>{c.ticker}</b><span>reference + 3 skins</span></figcaption>
              </figure>
            ))}
          </div>

          <p>
            Most mints are natural: the reference skin and hair with a rolled
            jacket, shirt, tie and backdrop. About {SURREAL_SKIN_CHANCE}% roll a
            surreal skin and about {SURREAL_HAIR_CHANCE}% a surreal hair, drawn
            from these:
          </p>
          <div className="doc-swatches">
            {Object.entries(SKIN_SURREAL).map(([name, r]) => (
              <span className="doc-swatch" key={name} style={{ '--sw': r.base }}><i />{name} skin</span>
            ))}
            {Object.entries(HAIR_SURREAL).map(([name, r]) => (
              <span className="doc-swatch" key={name} style={{ '--sw': r.base }}><i />{name} hair</span>
            ))}
          </div>
          <p>
            Each portrait is a pure function of its address. Nothing is uploaded
            or pinned; the same address always produces the same image, the
            metadata server draws it on request, and anyone holding the NFT can
            recompute the art themselves.
          </p>
        </Chapter>

        <Chapter id="variants" title="04 · Rare variants" aside={`~${VARIANT_CHANCE}% of mints`}>
          <p>
            About {VARIANT_CHANCE}% of every class mints as a full variant that
            abandons the likeness entirely: the one place a CEO stops looking
            like themselves, which is the point of it. Each class has exactly
            one.
          </p>
          <div className="doc-figure">
            {COMPANIES.map((c) => (
              <figure key={c.ticker} style={{ '--brand': c.hue }}>
                <Variant companyId={c.id} />
                <figcaption><b>{VARIANT_NAMES[c.id]}</b><span>{c.ceo.split(' ')[1]}</span></figcaption>
              </figure>
            ))}
          </div>
          <p>
            Variants are cosmetic. They carry no extra allocation and no
            different claim on a drop. The Monochrome Ternus also greys the
            frames, jacket, shirt and tie; the others keep whatever those rolled.
          </p>
        </Chapter>

        <Chapter id="vaults" title="05 · Vaults" aside="One per NFT">
          <p>
            Every CEO has a vault: a Metaplex Core <b>asset signer</b>, an
            address derived from the NFT itself that only the NFT can sign for.
            Drops are delivered there, not to your wallet, and there are two
            consequences worth knowing.
          </p>
          <p>
            First, nothing is staked or locked. The NFT sits in your wallet and
            the vault fills behind it. Second, the vault travels with the NFT:
            sell it on a marketplace and the buyer gets the vault and everything
            in it. A CEO with six months of unswept AMZNx is worth more than a
            fresh one, and the market can price that.
          </p>
          <p>
            Sweeping moves the vault&apos;s balance to your wallet in one
            transaction. Core checks that you own the NFT and signs as the
            vault; nothing of ours authorises it.
          </p>
        </Chapter>

        <Chapter id="drop" title="06 · The five-minute drop" aside={`Every ${DROP_INTERVAL_MINUTES}m`}>
          <p>
            A cycle runs every {DROP_INTERVAL_MINUTES} minutes on the clock.
            It claims whatever creator fees have accrued, splits the pot across
            the classes by headcount, swaps each slice into its xStock through
            Jupiter, credits the round on-chain, and settles every NFT&apos;s
            share into its vault. The countdown on the front page is that
            clock.
          </p>
          <dl className="doc-stats">
            <div><dt>Pot right now</dt><dd>{POT_SOL.toFixed(3)} <i>SOL</i></dd></div>
            <div><dt>Minted</dt><dd>{totalMinted} <i>/ {TOTAL_SUPPLY}</i></dd></div>
            <div><dt>Per NFT</dt><dd>equal <i>within a class</i></dd></div>
          </dl>
          <p>
            Per NFT, every class pays the same amount of SOL-equivalent, because
            each class&apos;s slice scales with how many of that CEO exist.
            Holding two CEOs is twice one CEO regardless of which they are; a
            Musk and a Nadella earn the same, in different stocks. A tick with
            too little in the pot to be worth a swap simply rolls to the next.
          </p>
        </Chapter>

        <Chapter id="minting" title="07 · Minting" aside={`${MINT_PRICE_SOL} SOL`}>
          <p>
            One price, one button. Connect a wallet, approve one transaction,
            and the NFT is created, its class rolled from the remaining supply
            using the chain&apos;s recent slot hashes, and the NFT registered
            with the distribution engine, all in that single transaction. There
            is no second step to forget.
          </p>
          <p>
            You cannot pick your CEO. The class is assigned at mint from
            whatever allocations remain, which is why the mint page shows how
            many are left in each. Currently {totalMinted} of {TOTAL_SUPPLY}
            have been minted.
          </p>
        </Chapter>

        <Chapter id="parody" title="08 · Parody and likeness" aside="Read this">
          <p>
            CEOs.fun is a parody project. The portraits are caricatures rendered
            at 48 pixels square and are not photographs, endorsements, or
            official likenesses.
          </p>
          <p>
            It is not affiliated with, sponsored by, or connected to Amazon,
            Alphabet, Meta, NVIDIA, Microsoft, Apple, Tesla, or any individual
            depicted. Company marks belong to their owners and appear here to
            identify the class, nothing more.
          </p>
        </Chapter>
      </div>
    </div>
  );
}
