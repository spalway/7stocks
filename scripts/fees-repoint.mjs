// Re-point ALL of the token's creator fees to one wallet.
//
//   node scripts/fees-repoint.mjs <wallet>            dry run
//   node scripts/fees-repoint.mjs <wallet> --send     signs with creator-wallet.json
//
// A config change on pump.fun's fee-sharing program, not a transfer: nothing
// moves now, future fees simply land elsewhere. The current shareholders are
// whatever the last setup wrote, which the config records.

import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import * as pumpSdk from '@pump-fun/pump-sdk';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config, parseSecret, root, rpcUrl } from './shared.mjs';

const { PumpSdk, feeSharingConfigPda } = pumpSdk;
const args = process.argv.slice(2);
const SEND = args.includes('--send');
const dest = args.find((a) => !a.startsWith('--'));
if (!dest) { console.error('usage: node scripts/fees-repoint.mjs <wallet> [--send]'); process.exit(1); }

const to = new PublicKey(dest);
const mint = new PublicKey(config.pump.mint);
const creator = new PublicKey(config.pump.creator);
const conn = new Connection(rpcUrl(), 'confirmed');

// Current shareholders straight from the on-chain config, so this cannot
// disagree with what the last setup actually wrote.
const cfgAccount = await conn.getAccountInfo(feeSharingConfigPda(mint));
if (!cfgAccount) throw new Error('no fee-sharing config for this mint');
const onchain = new PumpSdk().decodeSharingConfig(cfgAccount);
const holders = onchain.shareholders ?? onchain.shareHolders ?? [];
const current = holders.map((h) => new PublicKey(h.address ?? h.pubkey ?? h));
console.log('on-chain  ' + holders.map((h) => `${(h.address ?? h.pubkey ?? h).toString()} ${h.shareBps ?? h.share_bps ?? '?'}bps`).join(', '));

const keyPath = resolve(root, 'creator-wallet.json');
if (!existsSync(keyPath)) throw new Error('creator-wallet.json missing');
const wallet = parseSecret(readFileSync(keyPath, 'utf8'));
if (!wallet || !wallet.publicKey.equals(creator)) throw new Error('creator-wallet.json is not the pump.creator key');

console.log(`mint      ${mint.toBase58()}`);
console.log(`config    ${feeSharingConfigPda(mint).toBase58()}`);
console.log(`current   ${current.map((k) => k.toBase58()).join(', ')}`);
console.log(`new       ${to.toBase58()}  100%`);

const ix = await new PumpSdk().updateFeeShares({
  authority: creator,
  mint,
  currentShareholders: current,
  newShareholders: [{ address: to, shareBps: 10_000 }],
});
if (!SEND) { console.log('DRY RUN. Re-run with --send.'); process.exit(0); }
const tx = new Transaction().add(ix);
const sig = await sendAndConfirmTransaction(conn, tx, [wallet], { commitment: 'confirmed' });
console.log(`sent      https://solscan.io/tx/${sig}`);
