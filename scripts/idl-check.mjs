// Checks src/chain.js against anchor/idl/ceos.json. Run after every build: npm run idl-check
// Compare src/chain.js against the IDL anchor generated: every instruction
// discriminator, account count, and the Ceo account discriminator filter.
import { readFileSync } from 'node:fs';
import bs58 from 'bs58';
import { PublicKey, Keypair } from '@solana/web3.js';
import * as chain from '../src/chain.js';

const idl = JSON.parse(readFileSync(new URL('../anchor/idl/ceos.json', import.meta.url), 'utf8'));
const k = () => Keypair.generate().publicKey;
const built = {
  initialize: chain.initializeIx({ authority: k(), collection: k(), treasury: k(), price: 1, supply: [1,1,1,1,1,1,1], uriBase: 'x' }),
  set_config: chain.setConfigIx({ authority: k() }),
  mint_ceo: chain.mintCeoIx({ minter: k(), asset: k(), collection: k(), treasury: k() }),
  init_engine: chain.initEngineIx({ authority: k(), stocks: Array.from({ length: 7 }, k), minInterval: 1, dustFloor: 1 }),
  set_engine: chain.setEngineIx({ authority: k() }),
  register_ceo: chain.registerCeoIx({ payer: k(), asset: k() }),
  run_round: chain.runRoundIx({ cranker: k(), classId: 3, stockMint: k() }),
  close_ceo: chain.closeCeoIx({ authority: k(), asset: k() }),
  settle: chain.settleIx({ cranker: k(), asset: k(), stockMint: k() }),
};

let bad = 0;
for (const ix of idl.instructions) {
  const mine = built[ix.name];
  if (!mine) { console.log(`MISSING builder for ${ix.name}`); bad++; continue; }
  const disc = Buffer.from(ix.discriminator);
  const discOk = mine.data.subarray(0, 8).equals(disc);
  const countOk = mine.keys.length === ix.accounts.length;
  const flagsOk = ix.accounts.every((a, i) =>
    !!a.signer === mine.keys[i].isSigner && !!a.writable === mine.keys[i].isWritable);
  const ok = discOk && countOk && flagsOk;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${ix.name.padEnd(13)} disc ${discOk ? 'ok' : 'BAD'}  accounts ${mine.keys.length}/${ix.accounts.length}${flagsOk ? '' : '  FLAGS: ' + ix.accounts.map((a, i) => `${a.name}:${a.signer?'s':''}${a.writable?'w':''}/${mine.keys[i].isSigner?'s':''}${mine.keys[i].isWritable?'w':''}`).join(' ')}`);
}

// Account discriminator used as the getProgramAccounts filter.
const ceoAcc = idl.accounts.find((a) => a.name === 'Ceo');
const ceoFilter = bs58.encode(Buffer.from(ceoAcc.discriminator));
console.log(`${ceoFilter === chain.CEO_ACCOUNT_FILTER ? 'ok  ' : 'FAIL'} Ceo filter ${ceoFilter} vs ${chain.CEO_ACCOUNT_FILTER}`);
if (ceoFilter !== chain.CEO_ACCOUNT_FILTER) bad++;

// Decoder lengths vs the IDL type layout.
const sizes = { pubkey: 32, u8: 1, u32: 4, u64: 8, i64: 8, u128: 16 };
function sizeOf(t) {
  if (typeof t === 'string') return sizes[t] ?? (t === 'string' ? null : null);
  if (t.array) return sizeOf(t.array[0]) * t.array[1];
  return null;
}
for (const name of ['Config', 'Engine', 'Ceo']) {
  const ty = idl.types.find((t) => t.name === name).type.fields;
  const fixed = ty.map((f) => sizeOf(f.type)).map((s) => s ?? 4 + 1); // string: 4-byte len + 1 char below
  const total = 8 + fixed.reduce((a, b) => a + b, 0);
  const buf = Buffer.alloc(total);
  if (name === 'Config') buf.writeUInt32LE(1, 8 + 32 * 3 + 8 + 7 * 4 * 2); // uri_base len = 1
  const decoded = chain[`decode${name}`](buf);
  console.log(`ok   decode${name} consumed ${total} bytes: ${Object.keys(decoded).join(', ')}`);
}

console.log(bad ? `\n${bad} mismatch(es)` : '\nclient matches IDL');
process.exit(bad ? 1 : 0);
