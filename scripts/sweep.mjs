// Devnet test sweep from the dev wallet: `npm run sweep -- <asset>` moves
// everything that CEO's vault holds into the dev wallet, settling first if a
// round credited it but delivery has not landed. Same instructions the site's
// Sweep button sends. Devnet only, for the same reason mint.mjs is.

import { PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { connection, deployment, IS_MAINNET, wallet } from './shared.mjs';
import {
  ataFor, configPda, createAtaIdempotentIx, decodeConfig, decodeCoreAsset, decodeEngine,
  enginePda, fetchCeoStates, fetchVaultBalances, owedFor, settleIx, sweepIx, vaultPda,
  TOKEN_2022_PROGRAM_ID,
} from '../src/chain.js';

if (IS_MAINNET) throw new Error('sweep.mjs is devnet only');
const asset = new PublicKey(process.argv[2] ?? (() => { throw new Error('usage: npm run sweep -- <asset>'); })());

const conn = connection();
const owner = wallet();
const deploy = deployment();
const tokenProgram = new PublicKey(deploy.tokenProgram ?? TOKEN_2022_PROGRAM_ID);
const decimals = deploy.stockDecimals ?? 8;
const log = (...a) => process.stdout.write(`${a.join(' ')}\n`);

const cfg = decodeConfig((await conn.getAccountInfo(configPda())).data);
const eng = decodeEngine((await conn.getAccountInfo(enginePda())).data);
const info = await conn.getAccountInfo(asset);
const ceo = decodeCoreAsset(asset, info.data);
if (!ceo?.class) throw new Error('not a CEO asset');
if (!ceo.owner.equals(owner.publicKey)) throw new Error(`owned by ${ceo.owner.toBase58()}, not the dev wallet`);

const mint = eng.stocks[ceo.class.id];
const state = (await fetchCeoStates(conn, [asset])).get(asset.toBase58());
const owed = state ? owedFor(eng, state) : 0n;
const inVault = BigInt((await fetchVaultBalances(conn, [{ asset, classId: ceo.class.id }], eng, tokenProgram)).get(asset.toBase58()) ?? '0');
const total = owed + inVault;
log(`${ceo.name}  vault ${vaultPda(asset).toBase58()}`);
log(`  in vault ${Number(inVault) / 10 ** decimals}  owed ${Number(owed) / 10 ** decimals}  ${ceo.class.stock}`);
if (total === 0n) { log('  nothing to sweep'); process.exit(0); }

const tx = new Transaction();
if (!(await conn.getAccountInfo(ataFor(mint, owner.publicKey, tokenProgram)))) {
  tx.add(createAtaIdempotentIx({ payer: owner.publicKey, owner: owner.publicKey, mint, tokenProgram }));
}
if (owed > 0n) {
  tx.add(createAtaIdempotentIx({ payer: owner.publicKey, owner: vaultPda(asset), mint, tokenProgram }));
  tx.add(settleIx({ cranker: owner.publicKey, asset, stockMint: mint, tokenProgram }));
}
tx.add(sweepIx({
  asset, collection: cfg.collection, owner: owner.publicKey, mint, amount: total, decimals, tokenProgram,
}));
const sig = await sendAndConfirmTransaction(conn, tx, [owner], { commitment: 'confirmed' });
log(`  swept ${Number(total) / 10 ** decimals} ${ceo.class.stock}  ${sig}`);
const after = await conn.getTokenAccountBalance(ataFor(mint, owner.publicKey, tokenProgram));
log(`  wallet now holds ${after.value.uiAmountString} ${ceo.class.stock}`);
