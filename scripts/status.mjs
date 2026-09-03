// Prints on-chain state. First thing to run when something looks wrong.

import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  CLASSES, configPda, decodeConfig, decodeEngine, enginePda, fetchAllCeos,
  fetchCollectionCeos, owedFor, PROGRAM_ID,
} from '../src/chain.js';
import { connection, deployment, potWallet, wallet } from './shared.mjs';

const conn = connection();
const authority = wallet();
const pot = potWallet();

console.log('program   ', PROGRAM_ID.toBase58());
console.log('authority ', authority.publicKey.toBase58(), (await conn.getBalance(authority.publicKey)) / LAMPORTS_PER_SOL, 'SOL');
console.log('pot       ', pot.publicKey.toBase58(), (await conn.getBalance(pot.publicKey)) / LAMPORTS_PER_SOL, 'SOL');
console.log('deployed  ', (await conn.getAccountInfo(PROGRAM_ID)) ? 'yes' : 'NO — run anchor deploy');

const configAccount = await conn.getAccountInfo(configPda());
if (!configAccount) {
  console.log('config    : NOT initialized — run npm run collection && npm run init');
  process.exit(0);
}
const cfg = decodeConfig(configAccount.data);
console.log('\nconfig');
console.log('  collection', cfg.collection.toBase58());
console.log('  treasury  ', cfg.treasury.toBase58());
console.log('  price     ', Number(cfg.price) / LAMPORTS_PER_SOL, 'SOL');
console.log('  uriBase   ', cfg.uriBase);

const engineAccount = await conn.getAccountInfo(enginePda());
const eng = engineAccount ? decodeEngine(engineAccount.data) : null;
console.log('\nengine    ', eng ? `interval ${eng.minInterval}s  dustFloor ${eng.dustFloor}` : 'NOT initialized — run npm run engine');

const ceos = eng ? await fetchAllCeos(conn) : [];
console.log('\nclass   minted   registered  owed(raw)   stock');
CLASSES.forEach((c, i) => {
  const mine = ceos.filter((x) => x.classId === i);
  const owed = eng ? mine.reduce((s, x) => s + owedFor(eng, x), 0n) : 0n;
  console.log(
    `  ${c.ticker.padEnd(6)} ${String(cfg.minted[i]).padStart(3)}/${cfg.supply[i]}   `
    + `${String(eng?.classCount[i] ?? 0).padStart(4)}       ${String(owed).padStart(10)}  `
    + `${eng?.stocks[i].toBase58() ?? '-'}`,
  );
});

const minted = await fetchCollectionCeos(conn, cfg.collection);
const unregistered = minted.filter((a) => !ceos.some((c) => c.asset.equals(a.address)));
console.log(`\nminted ${minted.length}, unregistered ${unregistered.length}`);
for (const a of unregistered.slice(0, 10)) console.log(`  ${a.name.padEnd(16)} ${a.address.toBase58()}`);

console.log('\ndeploy manifest:', JSON.stringify(deployment()));
