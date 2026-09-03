// DEVNET ONLY. Creates seven mock "xStock" mints, one per class, so the engine
// and the cycle can be exercised where the real ones do not exist.
//
// Token-2022, 8 decimals, the dev wallet as mint authority — the same program
// and decimals as the real xStocks, so nothing about the path differs on
// mainnet except the mint addresses.

import { Keypair, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  createInitializeMint2Instruction, getMinimumBalanceForRentExemptMint, MINT_SIZE,
} from '@solana/spl-token';
import { CLASSES, TOKEN_2022_PROGRAM_ID } from '../src/chain.js';
import { connection, deployment, IS_MAINNET, saveDeployment, wallet } from './shared.mjs';

if (IS_MAINNET) {
  console.error('Mock stocks are devnet only. Mainnet uses the real xStock mints in ceos.config.json.');
  process.exit(1);
}

const payer = wallet();
const conn = connection();
const DECIMALS = 8;

const existing = deployment().stocks ?? {};
const stocks = { ...existing };
const rent = await getMinimumBalanceForRentExemptMint(conn, undefined, TOKEN_2022_PROGRAM_ID);

for (const c of CLASSES) {
  if (stocks[c.slug]) {
    console.log(`  ${c.stock.padEnd(7)} exists  ${stocks[c.slug]}`);
    continue;
  }
  const mint = Keypair.generate();
  await sendAndConfirmTransaction(
    conn,
    new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint.publicKey,
        space: MINT_SIZE,
        lamports: rent,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeMint2Instruction(mint.publicKey, DECIMALS, payer.publicKey, null, TOKEN_2022_PROGRAM_ID),
    ),
    [payer, mint],
    { commitment: 'confirmed' },
  );
  stocks[c.slug] = mint.publicKey.toBase58();
  console.log(`  ${c.stock.padEnd(7)} created ${stocks[c.slug]}`);
}

saveDeployment({ stocks, stockDecimals: DECIMALS, tokenProgram: TOKEN_2022_PROGRAM_ID.toBase58() });
console.log('\nSaved to public/deploy.json. Next: npm run engine');
