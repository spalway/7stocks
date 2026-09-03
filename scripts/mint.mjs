// Devnet test mints from the dev wallet: `npm run mint -- 3` mints three.
//
// Exercises the same two instructions the site sends in one transaction
// (mint_ceo + register_ceo) without a browser wallet, so the whole loop can
// be proven from a terminal. Devnet only: the mint costs real SOL on mainnet
// and that is a decision for a person holding a wallet, not a script.

import { Keypair, LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { connection, IS_MAINNET, wallet } from './shared.mjs';
import {
  configPda, decodeConfig, decodeCoreAsset, enginePda, mintCeoIx, registerCeoIx,
} from '../src/chain.js';

if (IS_MAINNET) throw new Error('mint.mjs is devnet only');

const count = Math.max(1, Number(process.argv[2] ?? 1));
const conn = connection();
const minter = wallet();
const log = (...a) => process.stdout.write(`${a.join(' ')}\n`);

const configAccount = await conn.getAccountInfo(configPda());
if (!configAccount) throw new Error('config not initialized — run: npm run collection && npm run init');
const cfg = decodeConfig(configAccount.data);
const hasEngine = !!(await conn.getAccountInfo(enginePda()));

log(`minter   ${minter.publicKey.toBase58()}  ${(await conn.getBalance(minter.publicKey)) / LAMPORTS_PER_SOL} SOL`);
log(`price    ${Number(cfg.price) / LAMPORTS_PER_SOL} SOL  ·  engine ${hasEngine ? 'yes' : 'no (mint only)'}`);

for (let i = 0; i < count; i += 1) {
  const asset = Keypair.generate();
  const tx = new Transaction().add(mintCeoIx({
    minter: minter.publicKey, asset: asset.publicKey, collection: cfg.collection, treasury: cfg.treasury,
  }));
  if (hasEngine) tx.add(registerCeoIx({ payer: minter.publicKey, asset: asset.publicKey }));
  const sig = await sendAndConfirmTransaction(conn, tx, [minter, asset], { commitment: 'confirmed' });
  const info = await conn.getAccountInfo(asset.publicKey);
  const decoded = info && decodeCoreAsset(asset.publicKey, info.data);
  log(`minted   ${asset.publicKey.toBase58()}  ${decoded?.name ?? "?"}  (${decoded?.class?.ticker ?? "?"})  ${sig.slice(0, 12)}…`);
}
log(`balance  ${(await conn.getBalance(minter.publicKey)) / LAMPORTS_PER_SOL} SOL`);
