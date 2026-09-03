// Initializes the drop engine: one stock mint per class, the minimum gap
// between rounds, and the dust floor. Run once, after `npm run init`.
//
// Mainnet reads the real xStock mints from ceos.config.json. Devnet has no
// xStocks, so it reads the mock mints `npm run stocks` wrote to the manifest.

import { Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { CLASSES, decodeEngine, enginePda, initEngineIx } from '../src/chain.js';
import {
  config, connection, deployment, explorerTx, IS_MAINNET, potWallet, saveDeployment, wallet,
} from './shared.mjs';

const payer = wallet();
const conn = connection();
const deploy = deployment();

const stocks = IS_MAINNET ? config.stocks : deploy.stocks;
if (!stocks) {
  console.error('No stocks. Devnet: run `npm run stocks` first.');
  process.exit(1);
}
const mints = CLASSES.map((c) => {
  if (!stocks[c.slug]) throw new Error(`no stock mint for ${c.slug}`);
  return stocks[c.slug];
});

const engine = enginePda();
const decimals = deploy.stockDecimals ?? 8;
const dustFloor = Math.max(1, Math.round((config.dustFloorUnits ?? 0) * 10 ** decimals));
// A shade under the cron period. The cron fires every cycleSeconds, but not on
// the second; an on-chain gap equal to the period would reject every round
// that lands a few seconds early, and the fees would slide to the next one.
const minInterval = Math.max(30, (config.cycleSeconds ?? 300) - 60);

if (await conn.getAccountInfo(engine)) {
  const eng = decodeEngine((await conn.getAccountInfo(engine)).data);
  console.log('Engine already initialized at', engine.toBase58());
  console.log(`  interval ${eng.minInterval}s  dustFloor ${eng.dustFloor}`);
  CLASSES.forEach((c, i) => console.log(`  ${c.ticker.padEnd(6)} ${eng.stocks[i].toBase58()}  holders ${eng.classCount[i]}`));
  process.exit(0);
}

console.log('Initializing engine at', engine.toBase58());
CLASSES.forEach((c, i) => console.log(`  ${c.ticker.padEnd(6)} ${mints[i]}`));
console.log(`  interval  ${minInterval}s (cron every ${config.cycleSeconds}s)`);
console.log(`  dustFloor ${dustFloor} raw units`);

const sig = await sendAndConfirmTransaction(
  conn,
  new Transaction().add(initEngineIx({
    authority: payer.publicKey,
    stocks: mints,
    minInterval,
    dustFloor,
  })),
  [payer],
  { commitment: 'confirmed' },
);

// The site reads the pot's balance to show what the next cycle will split.
saveDeployment({ potWallet: potWallet().publicKey.toBase58() });

console.log('\nDone:', explorerTx(sig));
console.log('Next: npm run cycle   (dry run; add --send to move money)');
