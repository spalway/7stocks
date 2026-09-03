// pump.fun creator fees. MAINNET ONLY — pump.fun has no devnet presence.
//
// Dry run unless you pass --send. Nothing here moves money without that flag.
//
//   npm run fees -- --setup --send   ONE TIME, from the creator key: create the
//                                    fee-sharing config and name the shareholders
//                                    (pot 90%, protocol 10%). After this the
//                                    split is enforced on-chain and the creator
//                                    key leaves the loop.
//   npm run fees -- --send           distribute: pay the shareholders whatever
//                                    has accrued. PERMISSIONLESS — the pot signs.
//                                    The cycle does this itself every 5 minutes;
//                                    this is for doing it by hand.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as pumpSdk from '@pump-fun/pump-sdk';
import { config, potWallet, root, parseSecret } from './shared.mjs';

const { OnlinePumpSdk, PumpSdk, feeSharingConfigPda, canonicalPumpPoolPda } = pumpSdk;

const SEND = process.argv.includes('--send');
const SETUP = process.argv.includes('--setup');
const pump = config.pump ?? {};

if (!pump.mint || !pump.creator) {
  console.error('Set pump.mint and pump.creator in ceos.config.json first.');
  console.error('Both are mainnet values — there is no pump.fun on devnet.');
  process.exit(1);
}

const conn = new Connection(pump.rpc ?? 'https://api.mainnet-beta.solana.com', 'confirmed');
const online = new OnlinePumpSdk(conn);
const offline = new PumpSdk();
const mint = new PublicKey(pump.mint);
const creator = new PublicKey(pump.creator);
const sharingConfigAddress = feeSharingConfigPda(mint);

const sol = (lamports) => `${(Number(lamports.toString()) / LAMPORTS_PER_SOL).toFixed(6)} SOL`;

/// The pump.fun deployer key. When the same wallet is also the pot, the pot
/// key already on disk is it and no separate file is needed.
function creatorWallet() {
  const path = resolve(root, 'creator-wallet.json');
  const kp = existsSync(path) ? parseSecret(readFileSync(path, 'utf8')) : potWallet();
  if (!kp) throw new Error('creator-wallet.json is neither a JSON byte array nor a base58 private key');
  if (!kp.publicKey.equals(creator)) {
    throw new Error(`creator key is ${kp.publicKey.toBase58()} but pump.creator is ${creator.toBase58()}; put the deployer key in creator-wallet.json`);
  }
  return kp;
}

async function send(instructions, signers, label) {
  if (!SEND) {
    console.log(`  DRY RUN — would send ${instructions.length} ix (${label}). Re-run with --send.`);
    return null;
  }
  const sig = await sendAndConfirmTransaction(conn, new Transaction().add(...instructions), signers, {
    commitment: 'confirmed',
  });
  console.log(`  sent: https://solscan.io/tx/${sig}`);
  return sig;
}

/// One-time. Creates the sharing config and sets the shares. The creator is
/// the config's admin; pump.fun seeds it with the creator as sole shareholder,
/// which is what `currentShareholders` names when the shares are rewritten.
async function setup() {
  const pot = new PublicKey(pump.potWallet ?? potWallet().publicKey);
  const protocol = new PublicKey(pump.protocolWallet);
  const holderBps = pump.holderBps ?? 9000;

  console.log(`  pot       ${pot.toBase58()}  ${holderBps / 100}%`);
  console.log(`  protocol  ${protocol.toBase58()}  ${(10_000 - holderBps) / 100}%`);

  const wallet = creatorWallet();
  const exists = await conn.getAccountInfo(sharingConfigAddress);
  const ixs = [];
  if (exists) {
    console.log('  sharing config exists — only updating shares');
  } else {
    // Graduated means the canonical PumpSwap pool exists. Read that directly:
    // the SDK's fee helper throws on a graduated coin whose AMM creator vault
    // has not been touched yet, which is exactly the state of a fresh launch.
    const pool = canonicalPumpPoolPda(mint);
    const isGraduated = !!(await conn.getAccountInfo(pool));
    console.log(`  graduated ${isGraduated ? 'yes, pool ' + pool.toBase58() : 'no, still on the bonding curve'}`);
    ixs.push(await offline.createFeeSharingConfig({
      creator, mint, pool: isGraduated ? pool : null,
    }));
  }
  ixs.push(await offline.updateFeeShares({
    authority: creator,
    mint,
    currentShareholders: [creator],
    newShareholders: [
      { address: pot, shareBps: holderBps },
      { address: protocol, shareBps: 10_000 - holderBps },
    ],
  }));
  await send(ixs, [wallet], 'setup fee sharing');
}

/// Permissionless. Fees go straight to the shareholders named in the config.
async function distribute() {
  if (!(await conn.getAccountInfo(sharingConfigAddress))) {
    console.error('  No fee-sharing config for this mint. Run: npm run fees -- --setup --send');
    process.exit(1);
  }
  const min = await online.getMinimumDistributableFee(mint);
  console.log(`  distributable ${sol(min.distributableFees)}  (minimum ${sol(min.minimumRequired)})`);
  if (!min.canDistribute) {
    console.log('  under the minimum — nothing to do');
    return;
  }
  const { instructions } = await online.buildDistributeCreatorFeesInstructions(mint);
  await send(instructions, [potWallet()], 'distribute');
}

console.log('pump.fun creator fees');
console.log('  mint    ', mint.toBase58());
console.log('  creator ', creator.toBase58());
console.log('  config  ', sharingConfigAddress.toBase58());
console.log('  accrued ', sol(await online.getCreatorVaultBalanceBothPrograms(creator)));

if (SETUP) await setup();
else await distribute();
