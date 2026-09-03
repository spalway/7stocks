// Writes the program's ["config"] PDA. Run once, after `npm run collection`.

import { LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { CLASSES, configPda, initializeIx } from '../src/chain.js';
import { config, connection, deployment, explorerTx, saveDeployment, treasury, wallet } from './shared.mjs';

const payer = wallet();
const conn = connection();
const { collection } = deployment();

if (!collection) {
  console.error('No collection in the deploy manifest. Run: npm run collection');
  process.exit(1);
}

const pda = configPda();
if (await conn.getAccountInfo(pda)) {
  console.log('Config already initialized at', pda.toBase58());
  console.log('Use set_config to change the price, supply or uri base.');
  process.exit(0);
}

const price = Math.round(config.priceSol * LAMPORTS_PER_SOL);
const supply = CLASSES.map(() => config.supplyPerClass);
const to = treasury();

console.log('Initializing config at', pda.toBase58());
console.log(`  price    ${config.priceSol} SOL, one mint, class rolled on-chain`);
console.log(`  supply   ${config.supplyPerClass} x ${CLASSES.length} = ${supply.reduce((a, b) => a + b, 0)}`);
console.log('  uriBase ', config.uriBase);
console.log('  treasury', to);

const sig = await sendAndConfirmTransaction(
  conn,
  new Transaction().add(initializeIx({
    authority: payer.publicKey,
    collection,
    treasury: to,
    price,
    supply,
    uriBase: config.uriBase,
  })),
  [payer],
  { commitment: 'confirmed' },
);
saveDeployment({ treasury: to });

console.log('\nDone:', explorerTx(sig));
console.log('Next: npm run engine');
