// Prints every minted CEO with what its vault holds and what it is still owed.
import { connection, deployment } from './shared.mjs';
import { PublicKey } from '@solana/web3.js';
import {
  configPda, decodeConfig, decodeEngine, enginePda, fetchCollectionCeos, fetchCeoStates,
  fetchVaultBalances, owedFor, vaultPda, TOKEN_2022_PROGRAM_ID,
} from '../src/chain.js';

const conn = connection();
const deploy = deployment();
const tokenProgram = new PublicKey(deploy.tokenProgram ?? TOKEN_2022_PROGRAM_ID);
const scale = 10 ** (deploy.stockDecimals ?? 8);
const cfg = decodeConfig((await conn.getAccountInfo(configPda())).data);
const engAcc = await conn.getAccountInfo(enginePda());
const eng = engAcc ? decodeEngine(engAcc.data) : null;
const all = (await fetchCollectionCeos(conn, cfg.collection)).filter((a) => a.class);
const states = await fetchCeoStates(conn, all.map((a) => a.address));
const vaults = eng ? await fetchVaultBalances(conn, all.map((a) => ({ asset: a.address, classId: a.class.id })), eng, tokenProgram) : new Map();
for (const a of all) {
  const key = a.address.toBase58();
  const st = states.get(key);
  const owed = eng && st ? Number(owedFor(eng, st)) / scale : 0;
  const inVault = Number(vaults.get(key) ?? 0) / scale;
  console.log(`${a.name.padEnd(12)} ${a.class.ticker.padEnd(6)} vault ${vaultPda(a.address).toBase58()}  holds ${inVault.toFixed(6)} ${a.class.stock}  owed ${owed.toFixed(6)}`);
}
