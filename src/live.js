// Chain state in the shape the pages were built against.
//
// The pages were written against demoData.js, which exported plain arrays and
// numbers. This gives them the same names from the live hook, so switching a
// page over is one import — none of the rendering had to change.

import { createContext, useContext } from 'react';
import { COMPANIES, ALLOCATIONS_PER_CEO, TOTAL_SUPPLY, DROP_INTERVAL_MINUTES } from './ceoData.js';
import config from '../ceos.config.json';

/// The token's contract address, from the same config the cycle job reads —
/// one place to paste it. Null until launch, and the countdown waits on it:
/// there is nothing to count down to before there are fees to distribute.
export const TOKEN_CA = config?.pump?.mint || null;

export const ChainContext = createContext(null);

/// pump.fun splits creator fees on-chain: 90% to the pot, 10% to the protocol.
/// The pot wallet therefore only ever holds the holders' share.
export const HOLDER_SHARE = 0.9;
/// Indicative, for the dollar figure beside the payout. Not a quote.
export const SOL_USD = 182;

/// Seconds until the next cycle, or null before launch. The cron fires on
/// wall-clock five-minute marks (`*/5 * * * *`), so the clock is the source
/// of truth, not the chain.
export function secondsToNextDrop(now = Date.now()) {
  if (!TOKEN_CA) return null;
  const period = DROP_INTERVAL_MINUTES * 60 * 1000;
  return Math.floor((period - (now % period)) / 1000);
}

const short = (k) => `${k.slice(0, 4)}…${k.slice(-4)}`;

export function useLive() {
  const chain = useContext(ChainContext);
  const config = chain?.config ?? null;
  const engine = chain?.engine ?? null;

  const mintedByCompany = COMPANIES.map((c, i) => {
    const minted = config?.minted[i] ?? 0;
    return {
      ...c,
      minted,
      supply: config?.supply[i] ?? ALLOCATIONS_PER_CEO,
      // Registered with the engine — what the next cycle actually splits over.
      holders: engine?.classCount[i] ?? minted,
      soldOut: minted >= (config?.supply[i] ?? ALLOCATIONS_PER_CEO),
    };
  });
  const totalMinted = mintedByCompany.reduce((a, c) => a + c.minted, 0);
  const totalHolders = mintedByCompany.reduce((a, c) => a + c.holders, 0);

  // Every CEO in the collection. Core assets carry no timestamp, so "recent"
  // is approximated by serial: the highest serials are the latest mints.
  const GALLERY = (chain?.minted ?? [])
    .filter((a) => a.class)
    .map((a) => ({
      id: a.address.toBase58(),
      address: a.address.toBase58(),
      companyId: a.class.id,
      serial: a.serial,
      owner: a.owner.toBase58(),
      who: short(a.owner.toBase58()),
    }))
    .sort((a, b) => a.companyId - b.companyId || a.serial - b.serial);
  const RECENT = [...GALLERY].sort((a, b) => b.serial - a.serial).slice(0, 8);

  const POT_TO_HOLDERS = chain?.potSol ?? 0;
  const POT_SOL = POT_TO_HOLDERS / HOLDER_SHARE;
  const potByCompany = mintedByCompany.map((c) => {
    const share = totalHolders ? c.holders / totalHolders : 0;
    const pool = POT_TO_HOLDERS * share;
    return { ...c, share, pool, perNft: c.holders ? pool / c.holders : 0 };
  });

  return {
    chain,
    mintedByCompany, totalMinted, totalSupply: TOTAL_SUPPLY,
    GALLERY, RECENT,
    POT_SOL, POT_TO_HOLDERS, HOLDER_SHARE, SOL_USD, potByCompany,
    secondsToNextDrop, TOKEN_CA,
  };
}
