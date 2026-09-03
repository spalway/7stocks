// The mint page.
//
// There is one product and one price, so this page has no chooser: the whole
// interaction is a single button. What it does have is an honest account of
// what happens after you press it, because "you do not pick which CEO you get"
// is the one thing a buyer must understand before paying rather than after.

import { useEffect, useState } from 'react';
import { CeoArt, Logo } from './CeoArt.jsx';
import Countdown from './Countdown.jsx';
import ContractPill from './ContractPill.jsx';
import { segment } from './PotAllocation.jsx';
import { explorer } from './cluster.js';
import {
  COMPANIES, MINT_PRICE_SOL, ALLOCATIONS_PER_CEO, TOTAL_SUPPLY,
} from './ceoData.js';
import { useLive } from './live.js';

/// How long each face holds on the reel while idle.
const REEL_PERIOD = 3600;

/// The reel beside the mint button. Idle, it fades through the seven the way
/// the landing slideshow does; while a mint is in flight it flicks through them
/// fast; on a result it stops on the CEO that was minted. The portrait fills
/// the frame edge to edge and the name plate sits directly under it.
function Reel({ playing, landed }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(
      () => setI((n) => (n + 1) % COMPANIES.length),
      playing === 'fast' ? 140 : REEL_PERIOD,
    );
    return () => clearInterval(id);
  }, [playing]);

  const c = landed ?? COMPANIES[i];
  const address = landed ? landed.address : `class-${c.ticker}`;
  const fading = playing === true;
  return (
    <div
      className="reel"
      style={{ '--brand': c.hue, '--brand-grad': c.grad, '--period': `${REEL_PERIOD}ms` }}
    >
      <div className={`reel-slide${fading ? ' is-fading' : ''}`} key={landed ? 'landed' : c.id}>
        <div className="reel-art">
          <CeoArt companyId={c.id} address={address} background={null} canonical={!landed} />
        </div>
        <div className="ceo-card-plate reel-plate">
          <Logo companyId={c.id} size={40} square />
          <span className="ceo-card-names">
            <b>{c.ticker}{landed ? ` · #${landed.serial}` : ''}</b>
            <em>{c.ceo}</em>
          </span>
        </div>
      </div>
    </div>
  );
}

/// What you might get: a donut of remaining supply per CEO. Equal odds by
/// what is left, which is the same thing as saying the slices start equal and
/// shrink as each CEO sells.
function OddsPie({ classes }) {
  const size = 220;
  const c = size / 2;
  const left = classes.map((k) => ({ ...k, left: Math.max(0, ALLOCATIONS_PER_CEO - k.minted) }));
  const total = left.reduce((a, k) => a + k.left, 0);
  let cursor = 0;
  const slices = left.map((k) => {
    const share = total ? k.left / total : 1 / left.length;
    const s = { ...k, share, from: cursor, to: cursor + share };
    cursor += share;
    return s;
  });

  return (
    <div className="odds-pie">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Odds by remaining supply">
        {slices.map((s) => (
          <path key={s.ticker} className="pot-slice" fill={s.hue} d={segment(c, c, 104, 66, s.from, s.to)}>
            <title>{`${s.ceo}: ${s.left} left, ${(s.share * 100).toFixed(1)}%`}</title>
          </path>
        ))}
        <text x={c} y={c - 4} className="pot-total">{total}</text>
        <text x={c} y={c + 16} className="pot-total-unit">left of {TOTAL_SUPPLY}</text>
      </svg>

      <ul className="odds-legend">
        {slices.map((s) => (
          <li key={s.ticker} style={{ '--brand': s.hue }}>
            <i className="odds-swatch" />
            <Logo companyId={s.id} size={18} />
            <b>{s.ceo}</b>
            <span>{s.left} left</span>
            <em>{(s.share * 100).toFixed(1)}%</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

/// Magic Eden's item page for a Core asset. The vault travels with the NFT,
/// so listing one is listing whatever it holds.
const magicEden = (asset) => `https://magiceden.io/item-details/solana/${asset}`;

/// The holder's CEOs, each with what its vault holds and a sweep.
function YourCollection({ chain }) {
  if (!chain?.connected) {
    return <p className="note">Connect a wallet to see your CEOs.</p>;
  }
  if (!chain.mine?.length) {
    return <p className="note">No CEOs yet. Mint one to open a vault.</p>;
  }
  return (
    <div className="mine">
      {chain.mine.map((m) => {
        const co = m.class ? COMPANIES[m.class.id] : COMPANIES[0];
        const asset = m.address.toBase58();
        const canSweep = m.total > 0 && !m.cached;
        return (
          <article className="mine-card" key={asset} style={{ '--brand': co.hue, '--brand-grad': co.grad }}>
            <div className="mine-well">
              <CeoArt companyId={co.id} address={asset} background={null} />
            </div>

            <div className="mine-body">
              <div className="mine-head">
                <h3>{co.ceo} <span>#{m.serial ?? '?'}</span></h3>
                <div className="mine-links">
                  <a href={explorer(asset)} target="_blank" rel="noreferrer">Explorer</a>
                  <a href={magicEden(asset)} target="_blank" rel="noreferrer">Magic Eden</a>
                </div>
              </div>

              <dl className="mine-holdings">
                <div>
                  <dt>In vault</dt>
                  <dd><b>{m.inVault.toFixed(4)}</b> {co.stock}</dd>
                </div>
                <div className={m.owed > 0 ? 'is-pending' : ''}>
                  <dt>Pending</dt>
                  <dd><b>{m.owed.toFixed(4)}</b> {co.stock}</dd>
                </div>
                <div>
                  <dt>Vault</dt>
                  <dd><a href={explorer(m.vault.toBase58())} target="_blank" rel="noreferrer">{short(m.vault.toBase58())}</a></dd>
                </div>
              </dl>

              <div className="mine-actions">
                {m.cached && <span className="mine-note">Balances unavailable while the RPC is down.</span>}
                <button
                  className="cta cta-ghost"
                  type="button"
                  disabled={!canSweep || chain.busy === 'sweep'}
                  onClick={() => chain.sweep(m)}
                >
                  {chain.busy === 'sweep' ? 'Sweeping…' : m.total > 0 ? `Sweep ${m.total.toFixed(4)} ${co.stock}` : 'Vault empty'}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

const short = (k) => `${k.slice(0, 4)}…${k.slice(-4)}`;

export default function Mint({ now }) {
  const { chain, mintedByCompany, totalMinted, secondsToNextDrop } = useLive();
  const remaining = secondsToNextDrop(now);
  const soldOut = totalMinted >= TOTAL_SUPPLY;
  const price = chain?.config ? chain.config.price / 1e9 : MINT_PRICE_SOL;
  const minting = chain?.busy === 'mint';
  const just = chain?.justMinted;
  const landed = just?.class
    ? { ...COMPANIES[just.class.id], address: just.asset.toBase58(), serial: just.serial }
    : null;

  const onMint = () => {
    if (!chain) return;
    if (!chain.connected) {
      const ready = chain.wallets?.filter((w) => w.readyState === 'Installed') ?? [];
      if (ready.length) chain.select(ready[0].adapter.name);
      else window.open('https://solana.com/solana-wallets', '_blank', 'noreferrer');
      return;
    }
    chain.clearMinted();
    chain.mint();
  };

  const label = soldOut ? 'Fully allocated'
    : minting ? 'Minting…'
    : !chain?.connected ? 'Connect to mint'
    : !chain?.config ? 'Not deployed here'
    : `Mint · ${price} SOL`;

  return (
    <>
      <section className="hero hero-mint">
        <h1>Mint a CEO</h1>
        <p className="lede">One price, one button, seven possible outcomes.</p>

        <ContractPill />

        <div className="mint-panel">
          <Reel playing={soldOut ? false : minting ? 'fast' : !landed} landed={landed} />

          {/* Price and facts at the top, the button at the bottom so it lines
              up with the reel's name plate beside it. */}
          <div className="mint-side">
            <div className="mint-price">
              <span className="mint-price-num">{price}</span>
              <span className="mint-price-unit">SOL</span>
            </div>

            <dl className="mint-facts">
              <div><dt>Supply</dt><dd>{TOTAL_SUPPLY}</dd></div>
              <div><dt>Minted</dt><dd>{totalMinted}</dd></div>
              <div><dt>Per CEO</dt><dd>{ALLOCATIONS_PER_CEO}</dd></div>
              <div><dt>Next drop</dt><dd><Countdown seconds={remaining} inline /></dd></div>
            </dl>

            <p className="mint-fine mint-fine-panel">
              Which CEO you receive is assigned at mint and cannot be chosen.
              Every class carries the same {ALLOCATIONS_PER_CEO} allocations and
              the same claim on each drop.
            </p>

            <button className="mint-cta ready" type="button" onClick={onMint}
              disabled={soldOut || minting || (chain?.connected && !chain?.config)}>
              {label}
            </button>
          </div>
        </div>

        {landed && (
          <p className="mint-fine mint-result">
            You got <b>{landed.ceo}</b> #{landed.serial}.{' '}
            <a href={explorer(landed.address)} target="_blank" rel="noreferrer">View the NFT</a>.
          </p>
        )}
        {/* "Not initialized" is a deployment state, not something a buyer can
            act on; the button already says "Not deployed here". Real failures
            (a rejected mint, a bad RPC) still show. */}
        {chain?.error && !/not initialized/i.test(chain.error) && (
          <p className="mint-fine mint-error">{chain.error}</p>
        )}
      </section>

      <section>
        <div className="shell shell-wide">
          <div className="label">
            <span>What you might get</span>
            <span>Equal odds by remaining supply</span>
          </div>
          <OddsPie classes={mintedByCompany} />
        </div>
      </section>

      <section>
        <div className="shell shell-wide">
          <div className="label">
            <span>Your collection</span>
            <span>{chain?.mine?.length ? `${chain.mine.length} held` : ''}</span>
          </div>
          <YourCollection chain={chain} />
        </div>
      </section>
    </>
  );
}
