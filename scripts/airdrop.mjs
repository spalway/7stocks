// Devnet only: ask the RPC for SOL into the dev wallet, a few times, and
// print the balance. Faucets rate-limit hard, so this is best effort.

import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { connection, IS_MAINNET, wallet } from './shared.mjs';

if (IS_MAINNET) throw new Error('airdrop is devnet only');

const conn = connection();
const key = wallet().publicKey;
const want = Number(process.argv[2] ?? 2);
const log = (...a) => process.stdout.write(`${a.join(' ')}\n`);

log(`wallet ${key.toBase58()}`);
log(`before ${(await conn.getBalance(key)) / LAMPORTS_PER_SOL} SOL`);
for (const amount of [want, 1, 1, 0.5]) {
  try {
    const sig = await conn.requestAirdrop(key, Math.floor(amount * LAMPORTS_PER_SOL));
    log(`airdrop ${amount} SOL requested: ${sig}`);
    await new Promise((r) => setTimeout(r, 4000));
    const bal = await conn.getBalance(key);
    log(`balance ${bal / LAMPORTS_PER_SOL} SOL`);
    if (bal / LAMPORTS_PER_SOL >= want) break;
  } catch (e) {
    log(`airdrop ${amount} SOL refused: ${e.message.slice(0, 160)}`);
  }
}
log(`after  ${(await conn.getBalance(key)) / LAMPORTS_PER_SOL} SOL`);
