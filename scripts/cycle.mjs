// The 5-minute cycle. One run is one cycle; the hosted cron invokes it.
//
//   npm run cycle                   dry run: reads, quotes, prints, sends nothing
//   npm run cycle -- --send         for real
//   npm run cycle -- --loop         keep running every cycleSeconds (local dev)
//   npm run cycle -- --settle-only  skip the buying, just deliver what is owed
//   npm run cycle -- --simulate     devnet: mint mock stock instead of swapping
//
// Each cycle:
//   0. distribute        pump.fun pays the pot its 90% share (permissionless)
//   1. register          any CEO minted without a Ceo PDA gets one (fallback)
//   2. buy, per class    pot SOL x holders_c / holders_total -> Jupiter -> stock_c
//   3. credit, per class transfer to the engine's holding + run_round(c), one tx
//   4. settle            every CEO owed anything gets its stock in its vault
//
// The program only ever sees stock arriving in its holding accounts and divides
// it; nothing on-chain can buy. Steps 2-3 are the off-chain half. Step 4 is
// what "push settlement" means: nobody has to claim.

import {
  ComputeBudgetProgram, LAMPORTS_PER_SOL, PublicKey, Transaction, VersionedTransaction,
} from '@solana/web3.js';
import {
  ataFor, CLASSES, createAtaIdempotentIx, decodeEngine, enginePda, fetchAllCeos,
  fetchCollectionCeos, owedFor, registerCeoIx, runRoundIx, settleIx, TOKEN_2022_PROGRAM_ID,
  transferCheckedIx, vaultPda, configPda, decodeConfig, ceoPda,
} from '../src/chain.js';
import { config, connection, deployment, IS_MAINNET, potWallet, rpcUrl } from './shared.mjs';

const args = new Set(process.argv.slice(2));
const SEND = args.has('--send');
const LOOP = args.has('--loop');
const SETTLE_ONLY = args.has('--settle-only');
const SIMULATE = args.has('--simulate');
/// Only refresh the Supabase mirror — no fees, no swaps, no settles.
const SYNC_ONLY = args.has('--sync-only');

const WSOL = 'So11111111111111111111111111111111111111112';
/// Left behind for fees and vault-ATA rent. Each first delivery to a vault
/// creates its token account (~0.002 SOL), so this is not a nominal amount.
const KEEP_SOL = Number(process.env.CYCLE_KEEP_SOL ?? 0.1);
/// Below this per class the swap costs more than it delivers; that class's
/// share simply waits in the pot for the next cycle.
const MIN_CLASS_SOL = Number(process.env.CYCLE_MIN_CLASS_SOL ?? 0.005);
const SLIPPAGE_BPS = Number(process.env.CYCLE_SLIPPAGE_BPS ?? 200);
/// Settles per transaction: 4 stays inside the account limit comfortably.
const SETTLE_BATCH = 4;
const SETTLE_CONCURRENCY = 8;

import { dbEnabled, saveSnapshot, syncMints } from './db.mjs';

const pot = potWallet();
const conn = connection();
const engine = enginePda();
const deploy = deployment();
const tokenProgram = new PublicKey(deploy.tokenProgram ?? TOKEN_2022_PROGRAM_ID);
const log = (...a) => process.stdout.write(`${a.join(' ')}\n`);
const sol = (lamports) => (Number(lamports) / LAMPORTS_PER_SOL).toFixed(4);

// ------------------------------------------------------------------ helpers

async function loadEngine() {
  const account = await conn.getAccountInfo(engine);
  if (!account) throw new Error('engine not initialized — run: npm run engine');
  return decodeEngine(account.data);
}

const decimalsCache = new Map();
async function decimalsOf(mint) {
  const key = mint.toBase58();
  if (!decimalsCache.has(key)) {
    decimalsCache.set(key, (await conn.getTokenSupply(mint)).value.decimals);
  }
  return decimalsCache.get(key);
}
const units = (raw, decimals) => (Number(raw) / 10 ** decimals).toFixed(6);

async function holdingBalance(mint) {
  const info = await conn.getTokenAccountBalance(ataFor(mint, engine, tokenProgram)).catch(() => null);
  return BigInt(info?.value?.amount ?? 0);
}

/// Sign and send one legacy transaction from the pot. Dry runs return null.
async function send(ixs, label) {
  if (!SEND) {
    log(`  dry-run   ${label} (${ixs.length} ix)`);
    return null;
  }
  const tx = new Transaction().add(...ixs);
  tx.feePayer = pot.publicKey;
  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
  tx.sign(pot);
  const sig = await conn.sendRawTransaction(tx.serialize(), { maxRetries: 3 });
  await conn.confirmTransaction(sig, 'confirmed');
  log(`  sent      ${label}  ${sig.slice(0, 20)}…`);
  return sig;
}

/// Send many transactions with bounded concurrency. Sequential confirmation of
/// ~175 settle batches would overrun the cycle; eight at a time does not.
async function sendMany(txBuilders, label) {
  if (!SEND) {
    log(`  dry-run   ${label}: ${txBuilders.length} tx`);
    return;
  }
  let done = 0;
  let failed = 0;
  const queue = [...txBuilders];
  const worker = async () => {
    while (queue.length) {
      const build = queue.shift();
      try {
        const tx = new Transaction().add(...build());
        tx.feePayer = pot.publicKey;
        tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
        tx.sign(pot);
        const sig = await conn.sendRawTransaction(tx.serialize(), { maxRetries: 3 });
        await conn.confirmTransaction(sig, 'confirmed');
        done += 1;
      } catch (e) {
        failed += 1;
        log(`  failed    ${label}: ${e.message.slice(0, 160)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: SETTLE_CONCURRENCY }, worker));
  log(`  ${label}: ${done} tx confirmed${failed ? `, ${failed} failed (re-run picks them up)` : ''}`);
}

// -------------------------------------------------------------------- steps

/// 0. Ask pump.fun to pay out the fee-sharing config. Permissionless, so the
/// pot signs. Any failure here is logged and skipped: fees that did not arrive
/// this cycle arrive next cycle, and nothing downstream should wait on it.
async function distributeFees() {
  const pump = config.pump ?? {};
  if (!IS_MAINNET || !pump.mint || pump.mode !== 'share') return;
  try {
    const { OnlinePumpSdk, feeSharingConfigPda } = await import('@pump-fun/pump-sdk');
    const online = new OnlinePumpSdk(conn);
    const mint = new PublicKey(pump.mint);
    if (!(await conn.getAccountInfo(feeSharingConfigPda(mint)))) {
      log('  fees      no fee-sharing config yet — run: npm run fees -- --setup --send');
      return;
    }
    const min = await online.getMinimumDistributableFee(mint);
    log(`  fees      distributable ${sol(min.distributableFees.toString())} SOL (min ${sol(min.minimumRequired.toString())})`);
    if (!min.canDistribute) return;
    const { instructions } = await online.buildDistributeCreatorFeesInstructions(mint);
    await send(instructions, 'distribute');
  } catch (e) {
    log(`  fees      skipped: ${e.message.slice(0, 160)}`);
  }
}

/// What the last chain read saw, for the mirror.
let lastSeen = null;

/// 5. Mirror the chain into Supabase so the site has something to show when
/// the RPC is down. Never fatal: a mirror that can take the cycle down is
/// worse than no mirror.
async function mirror(eng) {
  if (!dbEnabled) { log('  mirror    off (no SUPABASE_URL / SUPABASE_SERVICE_KEY)'); return; }
  if (!lastSeen) return;
  try {
    const { cfg, all } = lastSeen;
    const ceos = all.filter((a) => a.class).map((a) => ({
      asset: a.address.toBase58(), classId: a.class.id, serial: a.serial, owner: a.owner.toBase58(),
    }));
    await syncMints(ceos);
    const potSol = (await conn.getBalance(pot.publicKey)) / LAMPORTS_PER_SOL;
    await saveSnapshot({
      config: {
        collection: cfg.collection.toBase58(), treasury: cfg.treasury.toBase58(),
        price: cfg.price.toString(), supply: cfg.supply, minted: cfg.minted,
      },
      engine: eng && {
        stocks: eng.stocks.map((k) => k.toBase58()), classCount: eng.classCount,
        lastRound: eng.lastRound.map(Number), minInterval: Number(eng.minInterval),
      },
      potSol,
      totalMinted: ceos.length,
    });
    log(`  mirror    ${ceos.length} mints, snapshot saved`);
  } catch (e) {
    log(`  mirror    failed: ${e.message}`);
  }
}

/// Read-only half of registerMissing, for --sync-only.
async function peekCollection() {
  const configAccount = await conn.getAccountInfo(configPda());
  if (!configAccount) throw new Error('config not initialized — run: npm run collection && npm run init');
  const cfg = decodeConfig(configAccount.data);
  const all = await fetchCollectionCeos(conn, cfg.collection);
  lastSeen = { cfg, all };
  log(`  ceos      ${all.length} minted`);
}

/// 1. Register any minted CEO the engine does not know about. The mint
/// transaction registers in the same tx normally; this catches anything that
/// slipped (a mint sent without the register ix, a partial failure).
async function registerMissing() {
  const configAccount = await conn.getAccountInfo(configPda());
  if (!configAccount) throw new Error('config not initialized — run: npm run collection && npm run init');
  const cfg = decodeConfig(configAccount.data);
  const all = await fetchCollectionCeos(conn, cfg.collection);
  lastSeen = { cfg, all };
  const known = new Set((await fetchAllCeos(conn)).map((c) => c.asset.toBase58()));
  const missing = all.filter((a) => a.class && !known.has(a.address.toBase58()));
  log(`  ceos      ${all.length} minted, ${missing.length} unregistered`);
  if (!missing.length) return;
  const builders = [];
  for (let i = 0; i < missing.length; i += 6) {
    const slice = missing.slice(i, i + 6);
    builders.push(() => slice.map((a) => registerCeoIx({ payer: pot.publicKey, asset: a.address })));
  }
  await sendMany(builders, 'register');
}

/// 2+3. For one class: swap its share of the pot into its stock, move the
/// result into the engine's holding account, run the round. Transfer and
/// run_round share a transaction because a transfer that lands without its
/// round leaves tokens uncredited until someone notices — and run_round is
/// idempotent about what it has already seen, so pairing them costs nothing.
async function allocateClass(eng, classId, lamports) {
  const c = CLASSES[classId];
  const mint = eng.stocks[classId];
  const decimals = await decimalsOf(mint);
  const holding = ataFor(mint, engine, tokenProgram);
  const now = Math.floor(Date.now() / 1000);
  const wait = Number(eng.lastRound[classId]) + Number(eng.minInterval) - now;

  if (wait > 0) {
    log(`  ${c.ticker.padEnd(6)} round allowed in ${wait}s — share stays in the pot`);
    return;
  }

  if (SIMULATE) {
    await simulateBuy(mint, holding, lamports, decimals, c.ticker);
  } else if (lamports >= MIN_CLASS_SOL * LAMPORTS_PER_SOL) {
    const quote = await fetch(
      `https://lite-api.jup.ag/swap/v1/quote?inputMint=${WSOL}&outputMint=${mint.toBase58()}`
      + `&amount=${lamports}&slippageBps=${SLIPPAGE_BPS}`,
    ).then((r) => r.json());
    if (!quote?.outAmount) throw new Error(`${c.ticker} quote failed: ${JSON.stringify(quote).slice(0, 200)}`);
    log(`  ${c.ticker.padEnd(6)} ${sol(lamports)} SOL -> ${units(quote.outAmount, decimals)} ${c.stock}`
      + ` (impact ${quote.priceImpactPct ?? '?'}%)`);

    if (SEND) {
      const built = await fetch('https://lite-api.jup.ag/swap/v1/swap', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: pot.publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
        }),
      }).then((r) => r.json());
      if (!built?.swapTransaction) throw new Error(`${c.ticker} swap build failed: ${JSON.stringify(built).slice(0, 200)}`);
      const swapTx = VersionedTransaction.deserialize(Buffer.from(built.swapTransaction, 'base64'));
      swapTx.sign([pot]);
      const sig = await conn.sendTransaction(swapTx, { maxRetries: 3 });
      await conn.confirmTransaction(sig, 'confirmed');
      log(`  sent      swap ${c.ticker}  ${sig.slice(0, 20)}…`);
    }

    // Deliver whatever the pot holds of this stock — this swap plus anything a
    // failed earlier cycle left behind.
    const potAta = ataFor(mint, pot.publicKey, tokenProgram);
    const held = BigInt((await conn.getTokenAccountBalance(potAta).catch(() => null))?.value?.amount ?? 0);
    if (held > 0n) {
      const ixs = [];
      if (!(await conn.getAccountInfo(holding))) {
        ixs.push(createAtaIdempotentIx({ payer: pot.publicKey, owner: engine, mint, tokenProgram }));
      }
      ixs.push(transferCheckedIx({
        source: potAta, mint, destination: holding, authority: pot.publicKey,
        amount: held, decimals, tokenProgram,
      }));
      ixs.push(runRoundIx({ cranker: pot.publicKey, classId, stockMint: mint, tokenProgram }));
      await send(ixs, `credit ${c.ticker} ${units(held, decimals)}`);
      return;
    }
  } else {
    log(`  ${c.ticker.padEnd(6)} ${sol(lamports)} SOL share is under the ${MIN_CLASS_SOL} floor — waits`);
  }

  // No swap this cycle, but the holding may still have uncredited stock (a
  // transfer whose run_round failed). Credit it if so.
  const uncredited = (await holdingBalance(mint)) - eng.outstanding[classId];
  if (uncredited >= eng.dustFloor && uncredited > 0n) {
    await send(
      [runRoundIx({ cranker: pot.publicKey, classId, stockMint: mint, tokenProgram })],
      `credit ${c.ticker} ${units(uncredited, decimals)} (uncredited)`,
    );
  }
}

/// Devnet stand-in for the swap: mint mock stock straight into the holding
/// account, which is exactly what a swap would deposit. 1 SOL buys 10 units.
async function simulateBuy(mint, holding, lamports, decimals, ticker) {
  const { createMintToInstruction } = await import('@solana/spl-token');
  const amount = BigInt(Math.floor((lamports / LAMPORTS_PER_SOL) * 10 * 10 ** decimals));
  if (amount === 0n) return;
  log(`  ${ticker.padEnd(6)} simulate ${sol(lamports)} SOL -> ${units(amount, decimals)} mock`);
  await send([
    createAtaIdempotentIx({ payer: pot.publicKey, owner: engine, mint, tokenProgram }),
    createMintToInstruction(mint, holding, pot.publicKey, amount, [], tokenProgram),
  ], `mint mock ${ticker}`);
}

/// 4. Push settlement: every registered CEO owed anything gets it delivered to
/// its vault. Idempotent — a CEO with nothing owed is skipped, so a re-run
/// after a partial failure only touches what is still outstanding.
async function settleAll() {
  const eng = await loadEngine();
  const ceos = await fetchAllCeos(conn);
  const owing = ceos.filter((c) => owedFor(eng, c) > 0n);
  const perClass = CLASSES.map((c, i) => owing.filter((x) => x.classId === i).length);
  log(`  settle    ${owing.length}/${ceos.length} owed  [${perClass.join(' ')}]`);
  if (!owing.length) return;

  const builders = [];
  for (let i = 0; i < owing.length; i += SETTLE_BATCH) {
    const slice = owing.slice(i, i + SETTLE_BATCH);
    builders.push(() => [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ...slice.flatMap((ceo) => {
        const mint = eng.stocks[ceo.classId];
        return [
          // Idempotent: the vault's token account may or may not exist yet, and
          // creating it here means a holder never has to "activate" anything.
          createAtaIdempotentIx({ payer: pot.publicKey, owner: vaultPda(ceo.asset), mint, tokenProgram }),
          settleIx({ cranker: pot.publicKey, asset: ceo.asset, stockMint: mint, tokenProgram }),
        ];
      }),
    ]);
  }
  await sendMany(builders, 'settle');
}

// -------------------------------------------------------------------- cycle

async function cycle() {
  log(`\n[${new Date().toISOString()}] ${SYNC_ONLY ? 'sync only' : SEND ? 'LIVE' : 'dry run'}`);
  if (SYNC_ONLY) {
    await peekCollection();
    await mirror(await loadEngine().catch(() => null));
    return;
  }
  await distributeFees();
  await registerMissing();

  const eng = await loadEngine();
  const total = eng.classCount.reduce((a, b) => a + b, 0);
  log(`  holders   ${total}  [${eng.classCount.join(' ')}]`);

  // Until the token exists there are no fees, so any SOL in the pot is gas or
  // launch money, not something to distribute. Register and settle still run.
  if (!config.pump?.mint && !SIMULATE) {
    log('  allocate  skipped: no token yet (pump.mint is null)');
  } else if (!SETTLE_ONLY && total > 0) {
    const balance = await conn.getBalance(pot.publicKey);
    const spend = balance - Math.floor(KEEP_SOL * LAMPORTS_PER_SOL);
    log(`  pot       ${sol(balance)} SOL, spendable ${sol(Math.max(0, spend))}`);
    for (let classId = 0; classId < CLASSES.length; classId++) {
      if (eng.classCount[classId] === 0) continue;
      const share = spend > 0 ? Math.floor((spend * eng.classCount[classId]) / total) : 0;
      await allocateClass(eng, classId, share);
    }
  }

  await settleAll();
  await mirror(eng);
}

log('CEOs cycle');
log(`  pot       ${pot.publicKey.toBase58()}`);
log(`  rpc       ${rpcUrl().replace(/api-key=.*/, 'api-key=***')}`);
log(`  engine    ${engine.toBase58()}`);
log(`  token pgm ${tokenProgram.toBase58()}`);

if (LOOP) {
  const period = (config.cycleSeconds ?? 300) * 1000;
  await cycle().catch((e) => log(`  cycle failed: ${e.message}`));
  setInterval(() => cycle().catch((e) => log(`  cycle failed: ${e.message}`)), period);
} else {
  await cycle().catch((e) => {
    log(`  cycle failed: ${e.message}`);
    // exitCode, not exit(): the RPC client still has sockets open and a hard
    // exit trips a libuv assertion on Windows.
    process.exitCode = 1;
  });
}
