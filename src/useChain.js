// All chain state and the two wallet actions (mint, sweep), in one hook so the
// pages stay presentational.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { DEPLOY_MANIFEST, IS_MAINNET, RPC } from './cluster.js';
import {
  ataFor, CLASSES, configPda, createAtaIdempotentIx, decodeConfig, decodeCoreAsset,
  decodeEngine, enginePda, fetchCeosByOwner, fetchCeoStates, fetchCollectionCeos,
  fetchVaultBalances, mintCeoIx, owedFor, registerCeoIx, settleIx, sweepIx,
  TOKEN_2022_PROGRAM_ID, vaultPda,
} from './chain.js';
import { dbEnabled, loadMints, loadSnapshot, recordMint, recordWallet } from './db.js';

export const connection = new Connection(RPC, 'confirmed');

/// A second connection, used only for sending through the adapter.
///
/// The wallet adapter decides which chain to ask the wallet to sign for by
/// pattern-matching `connection.rpcEndpoint` — and our same-origin /rpc proxy
/// tells it nothing; on a dev server it even matches the localnet rule, so the
/// wallet simulates against a chain that does not exist and flags the
/// transaction as unsafe. Naming the chain in an inert query parameter
/// satisfies the classifier while the request still goes through the proxy.
const CHAIN_HINT = IS_MAINNET
  ? 'https://api.mainnet-beta.solana.com'
  : 'https://api.devnet.solana.com';
export const signingConnection = new Connection(`${RPC}?chain=${CHAIN_HINT}`, 'confirmed');

/// Wait for a signature by polling, not by subscribing. `confirmTransaction`
/// opens a websocket derived from the HTTP endpoint — wss://<site>/rpc — which
/// the proxy does not implement, so the await never returns.
async function confirmed(signature, timeoutMs = 90_000) {
  const started = Date.now();
  for (;;) {
    const { value } = await connection.getSignatureStatuses([signature]);
    const status = value[0];
    if (status?.err) throw new Error(`transaction failed on-chain: ${JSON.stringify(status.err)}`);
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
      return signature;
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error(`not confirmed after ${Math.round(timeoutMs / 1000)}s · ${signature}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
}

/// Simulate before asking for a signature. `sigVerify: false` because the
/// transaction is still unsigned; a failure here is a better error for the
/// holder and one fewer reason for the wallet to warn.
async function preflight(transaction) {
  const wire = transaction
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString('base64');
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'simulateTransaction',
      params: [wire, { sigVerify: false, replaceRecentBlockhash: true, encoding: 'base64', commitment: 'confirmed' }],
    }),
  }).then((r) => r.json());
  const err = res?.result?.value?.err;
  if (err) {
    const logs = res.result.value.logs ?? [];
    const reason = logs.filter((l) => l.includes('Error Message:')).pop() ?? logs.slice(-1)[0] ?? JSON.stringify(err);
    const why = /AccountNotFound/.test(reason)
      ? 'the paying wallet has no SOL on this cluster'
      : reason;
    throw new Error(`would fail on-chain: ${why}`);
  }
}

/// Fallback only; deploy.json carries the real value. Every xStock is 8.
const FALLBACK_DECIMALS = 8;

export function useChain() {
  const {
    publicKey: wallet, sendTransaction, signTransaction,
    connected, disconnect, connect, select, wallets,
  } = useWallet();

  const [balance, setBalance] = useState(null);
  const [config, setConfig] = useState(null);
  const [engine, setEngine] = useState(null);
  /// Every CEO in the collection, for the public gallery.
  const [minted, setMinted] = useState([]);
  /// What this wallet holds, with owed + vaulted amounts.
  const [mine, setMine] = useState([]);
  /// SOL sitting in the pot wallet, waiting for the next cycle.
  const [potSol, setPotSol] = useState(null);
  const [deploy, setDeploy] = useState({
    decimals: FALLBACK_DECIMALS,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    potWallet: null,
  });
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  // True while the page is drawn from the Supabase mirror instead of the chain.
  const [stale, setStale] = useState(false);
  const [justMinted, setJustMinted] = useState(null);
  const engineRef = useRef(null);

  // Per-cluster facts the chain cannot tell us: which token program the
  // stocks live under (devnet mocks vs mainnet xStocks), decimals, the pot.
  useEffect(() => {
    fetch(DEPLOY_MANIFEST)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setDeploy({
          decimals: d.stockDecimals ?? FALLBACK_DECIMALS,
          tokenProgram: d.tokenProgram ? new PublicKey(d.tokenProgram) : TOKEN_2022_PROGRAM_ID,
          potWallet: d.potWallet ? new PublicKey(d.potWallet) : null,
        });
      })
      .catch(() => {});
  }, []);

  /// The RPC is down: draw the page from the last snapshot the cycle job
  /// wrote and the mints it mirrored. Vault balances are unknown here, so
  /// owned CEOs show with zero totals and a cached flag — the mirror is for
  /// reading the collection, not for settling it.
  const fallback = useCallback(async (why) => {
    if (!dbEnabled) throw why;
    const [snap, mints] = await Promise.all([loadSnapshot(), loadMints()]);
    if (!snap) throw why;
    const cfg = snap.config;
    setConfig({
      collection: new PublicKey(cfg.collection), treasury: new PublicKey(cfg.treasury),
      price: Number(cfg.price), supply: cfg.supply, minted: cfg.minted,
    });
    setEngine(snap.engine ?? null);
    setPotSol(snap.pot_sol == null ? null : Number(snap.pot_sol));
    // Rows are user-written until the cycle verifies them, so a malformed key
    // is a row to skip, not a reason to lose the whole fallback.
    const all = (mints ?? []).flatMap((m) => {
      try {
        return [{
          address: new PublicKey(m.asset), owner: new PublicKey(m.owner),
          class: CLASSES[m.class_id] ?? null, serial: m.serial, name: CLASSES[m.class_id]?.name ?? 'CEO',
        }];
      } catch { return []; }
    });
    setMinted(all);
    const me = wallet ? wallet.toBase58() : null;
    setMine(all.filter((a) => a.owner.toBase58() === me).map((a) => ({
      ...a, vault: vaultPda(a.address), registered: true, cached: true,
      owedRaw: '0', owed: 0, vaultRaw: '0', inVault: 0, total: 0,
    })));
    setStale(true);
    setError('RPC unreachable. Showing the last mirrored state.');
    return null;
  }, [wallet]);

  const refresh = useCallback(async () => {
    try {
      setBalance(wallet ? await connection.getBalance(wallet) : null);

      const configAccount = await connection.getAccountInfo(configPda());
      if (!configAccount) {
        setError('Program not initialized on this cluster.');
        return null;
      }
      setStale(false);
      const cfg = decodeConfig(configAccount.data);
      // Never put BigInts in React state: React's dev-mode commit serialises
      // state and throws on them. Arithmetic stays in chain.js.
      setConfig({ ...cfg, price: Number(cfg.price) });

      const engineAccount = await connection.getAccountInfo(enginePda());
      const eng = engineAccount ? decodeEngine(engineAccount.data) : null;
      engineRef.current = eng;
      setEngine(eng && {
        stocks: eng.stocks.map((k) => k.toBase58()),
        classCount: eng.classCount,
        lastRound: eng.lastRound.map(Number),
        minInterval: Number(eng.minInterval),
      });

      setMinted(await fetchCollectionCeos(connection, cfg.collection));

      if (deploy.potWallet) {
        setPotSol((await connection.getBalance(deploy.potWallet)) / 1e9);
      }

      if (!wallet) {
        setMine([]);
        setError(null);
        return 0;
      }

      const held = await fetchCeosByOwner(connection, wallet, cfg.collection);
      const states = await fetchCeoStates(connection, held.map((a) => a.address));
      const withClass = held.filter((a) => a.class);
      const vaults = eng
        ? await fetchVaultBalances(
            connection,
            withClass.map((a) => ({ asset: a.address, classId: a.class.id })),
            eng, deploy.tokenProgram,
          )
        : new Map();

      const scale = 10 ** deploy.decimals;
      setMine(held.map((a) => {
        const key = a.address.toBase58();
        const registered = states.get(key) ?? null;
        const owedRaw = eng && registered ? owedFor(eng, registered) : 0n;
        const vaultRaw = BigInt(vaults.get(key) ?? '0');
        return {
          ...a,
          registered: !!registered,
          owedRaw: owedRaw.toString(),
          owed: Number(owedRaw) / scale,
          vaultRaw: vaultRaw.toString(),
          inVault: Number(vaultRaw) / scale,
          total: Number(vaultRaw + owedRaw) / scale,
        };
      }));
      setError(null);
      return held.length;
    } catch (e) {
      try {
        return await fallback(e);
      } catch {
        setError(e.message);
        return null;
      }
    }
  }, [wallet, deploy, fallback]);

  useEffect(() => { refresh(); }, [refresh]);

  // Count the wallet as connected, once per connection.
  useEffect(() => { if (wallet) recordWallet(wallet.toBase58()); }, [wallet]);

  /// One mint. The class is rolled on-chain; the caller learns it afterwards.
  const mint = useCallback(async () => {
    if (!wallet || !config) return;
    setBusy('mint');
    setError(null);
    try {
      // Say the real reason before the simulator says "AccountNotFound": a
      // wallet with no SOL on this cluster does not exist as an account yet.
      const need = config.price + 0.02 * 1e9;
      const have = await connection.getBalance(wallet);
      if (have < need) {
        throw new Error(`This wallet has ${(have / 1e9).toFixed(3)} SOL on ${IS_MAINNET ? 'mainnet' : 'devnet'}; minting needs about ${(need / 1e9).toFixed(2)} SOL (price plus fees).`);
      }
      // Core requires the asset address to sign its own creation, so each mint
      // needs a throwaway keypair. Discarded immediately — the NFT belongs to
      // the minter, the account to the Core program.
      const asset = Keypair.generate();

      // Mint and register in one transaction. As two, a holder who dismissed
      // the second prompt would own a CEO no cycle ever credits.
      const tx = new Transaction().add(mintCeoIx({
        minter: wallet, asset: asset.publicKey,
        collection: config.collection, treasury: config.treasury,
      }));
      if (engine) tx.add(registerCeoIx({ payer: wallet, asset: asset.publicKey }));

      tx.feePayer = wallet;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      await preflight(tx);

      // Phantom signs first, then the asset key. Multi-signer transactions must
      // go through signTransaction, not the adapter's sendTransaction; signing
      // first and adding the throwaway key after gives the wallet something
      // complete to simulate.
      const signed = await signTransaction(tx);
      signed.partialSign(asset);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await confirmed(sig);

      // Read the class straight off the asset rather than waiting for the
      // collection scan, which lags a confirmed transaction by a second or two.
      let decoded = null;
      try {
        const info = await connection.getAccountInfo(asset.publicKey);
        decoded = info && decodeCoreAsset(asset.publicKey, info.data);
      } catch { /* the scan below catches up */ }
      setJustMinted({
        asset: asset.publicKey,
        vault: vaultPda(asset.publicKey),
        class: decoded?.class ?? null,
        name: decoded?.name ?? 'CEO',
        serial: decoded?.serial ?? 0,
        signature: sig,
      });
      if (decoded?.class) {
        recordMint({
          asset: asset.publicKey.toBase58(), classId: decoded.class.id, serial: decoded.serial,
          owner: wallet.toBase58(), signature: sig,
        });
      }

      const before = mine.length;
      for (let attempt = 0; attempt < 6; attempt++) {
        const count = await refresh();
        if (count === null || count > before) break;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (e) {
      setError(`${e.message}${e.logs ? `\n${e.logs.slice(-6).join('\n')}` : ''}`);
    } finally {
      setBusy(null);
    }
  }, [wallet, config, engine, mine.length, refresh, signTransaction]);

  /// Move everything a CEO has earned out of its vault into the holder's
  /// wallet. Settles first if a cycle credited it but delivery has not landed,
  /// so the transfer never comes up short. Nothing of ours authorises this:
  /// Core checks that the signer owns the NFT and signs as the vault.
  const sweep = useCallback(async (ceo) => {
    if (!wallet || !config || !ceo.class) return;
    const eng = engineRef.current;
    if (!eng) return;
    setBusy('sweep');
    setError(null);
    try {
      const mint = eng.stocks[ceo.class.id];
      const total = BigInt(ceo.vaultRaw) + BigInt(ceo.owedRaw);
      if (total === 0n) return;
      const tx = new Transaction();
      if (!(await connection.getAccountInfo(ataFor(mint, wallet, deploy.tokenProgram)))) {
        tx.add(createAtaIdempotentIx({ payer: wallet, owner: wallet, mint, tokenProgram: deploy.tokenProgram }));
      }
      if (BigInt(ceo.owedRaw) > 0n) {
        tx.add(createAtaIdempotentIx({ payer: wallet, owner: ceo.vault, mint, tokenProgram: deploy.tokenProgram }));
        tx.add(settleIx({ cranker: wallet, asset: ceo.address, stockMint: mint, tokenProgram: deploy.tokenProgram }));
      }
      tx.add(sweepIx({
        asset: ceo.address, collection: config.collection, owner: wallet, mint,
        amount: total, decimals: deploy.decimals, tokenProgram: deploy.tokenProgram,
      }));
      tx.feePayer = wallet;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      await preflight(tx);
      const sig = await sendTransaction(tx, signingConnection);
      await confirmed(sig);
      await refresh();
    } catch (e) {
      setError(`${e.message}${e.logs ? `\n${e.logs.slice(-6).join('\n')}` : ''}`);
    } finally {
      setBusy(null);
    }
  }, [wallet, config, deploy, refresh, sendTransaction]);

  // Derived, plain numbers for the pages.
  const mintedByClass = CLASSES.map((c, i) => ({
    ...c,
    minted: config?.minted[i] ?? 0,
    supply: config?.supply[i] ?? 0,
    holders: engine?.classCount[i] ?? 0,
    soldOut: !!config && config.minted[i] >= config.supply[i],
  }));

  return {
    wallet, balance, config, engine, minted, mine, potSol, deploy, mintedByClass,
    busy, error, stale, justMinted, clearMinted: () => setJustMinted(null),
    mint, sweep, refresh,
    connected, connect, disconnect, select, wallets,
  };
}
