import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Connection, Keypair } from '@solana/web3.js';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const read = (name) => JSON.parse(readFileSync(resolve(root, name), 'utf8'));

/// Load .env.local if it is there. Node does not do this, and having to paste
/// an RPC URL with a key in it onto every command line is how keys end up in
/// shell history.
try {
  for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch { /* no file, use the real environment */ }

export const config = read('ceos.config.json');

/// Which chain these scripts act on. `CLUSTER=mainnet npm run …`.
///
/// Devnet by default, and deliberately so: every script in here signs
/// transactions, and the one that costs real money should be the one you had to
/// ask for. The signing key and the deploy manifest both follow this, so there
/// is no combination where a mainnet RPC is driven by the devnet key.
const CLUSTER = (process.env.CLUSTER ?? 'devnet').toLowerCase();
export const IS_MAINNET = CLUSTER === 'mainnet' || CLUSTER === 'mainnet-beta';

const WALLET_FILE = IS_MAINNET ? 'mainnet-authority.json' : 'public/dev-wallet.json';
const DEPLOY_FILE = IS_MAINNET ? 'public/deploy.mainnet.json' : 'public/deploy.json';

/// A secret key as text, in either form a wallet hands out: the JSON byte
/// array the Solana CLI writes, or the base58 string Phantom exports under
/// "Show private key". Returns null if it is neither.
export function parseSecret(text) {
  const t = String(text ?? '').trim();
  if (!t) return null;
  if (t.startsWith('[')) {
    try { return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(t))); } catch { return null; }
  }
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const bytes = [0];
  for (const ch of t) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    let carry = v;
    for (let i = 0; i < bytes.length; i += 1) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  for (const ch of t) { if (ch !== '1') break; bytes.push(0); }
  const key = Uint8Array.from(bytes.reverse());
  if (key.length !== 64) return null;
  try { return Keypair.fromSecretKey(key); } catch { return null; }
}

const fromSecret = (text) => {
  const kp = parseSecret(text);
  if (!kp) throw new Error('secret key is neither a JSON byte array nor a base58 private key');
  return kp;
};

/// The program authority: initializes config and the engine, creates the
/// collection. Never needed by the 5-minute cycle.
export function wallet() {
  const path = resolve(root, WALLET_FILE);
  if (!existsSync(path)) {
    throw new Error(
      IS_MAINNET
        ? 'No mainnet-authority.json in the repo root.'
        : 'No dev-wallet.json. Run: npm run wallet',
    );
  }
  return fromSecret(readFileSync(path, 'utf8'));
}

/// The pot: receives the holder share of creator fees from pump.fun, swaps it,
/// and cranks rounds and settlement. This is the only key the hosted cycle job
/// holds. Env first, file second — a hosted cron has no gitignored file to
/// read. On devnet it falls back to the authority so one key does everything.
export function potWallet() {
  if (process.env.POT_SECRET) {
    // A placeholder left in the hosted variables is the expected state before
    // launch; say so instead of dying on a JSON parse.
    const kp = parseSecret(process.env.POT_SECRET);
    if (!kp) throw new Error('POT_SECRET is not set yet: paste the pot private key (Phantom base58 export or JSON byte array) into the cycle service variables');
    return kp;
  }
  // Locally, whichever key file IS the configured pot. When the pot is the
  // pump.fun creator, that is creator-wallet.json and no separate file exists.
  const want = IS_MAINNET ? config.pump?.potWallet : null;
  for (const name of ['pot-wallet.json', 'creator-wallet.json']) {
    const path = resolve(root, name);
    if (!existsSync(path)) continue;
    const kp = parseSecret(readFileSync(path, 'utf8'));
    if (kp && (!want || kp.publicKey.toBase58() === want)) return kp;
  }
  if (!IS_MAINNET) return wallet();
  throw new Error(`no pot key for ${want ?? 'the pot'}: set POT_SECRET or provide its key file`);
}

/// The endpoint every script talks to. Exported because umi builds its own
/// client and would otherwise reach for config.rpc directly — which is how a
/// mainnet key ends up pointed at devnet.
export function rpcUrl() {
  const rpc = process.env.HELIUS_RPC
    ?? process.env.RPC
    ?? (IS_MAINNET ? config.rpcMainnet : config.rpc);
  if (!rpc) throw new Error('No RPC configured. Set HELIUS_RPC.');
  return forCluster(rpc, IS_MAINNET);
}

/// One Helius key serves both clusters; only the host differs. The env holds a
/// single URL, so the host is rewritten to match CLUSTER rather than trusting
/// it — a devnet run against a mainnet endpoint was the first thing that
/// happened. A bare key becomes a full URL the same way.
export function forCluster(raw, mainnet) {
  const net = mainnet ? 'mainnet' : 'devnet';
  const value = raw.trim();
  if (/^[0-9a-f-]{32,40}$/i.test(value)) return `https://${net}.helius-rpc.com/?api-key=${value}`;
  return value.replace(/\b(mainnet|devnet)\.helius-rpc\.com/, `${net}.helius-rpc.com`);
}

export function connection() {
  return new Connection(rpcUrl(), 'confirmed');
}

export function deployment() {
  const path = resolve(root, DEPLOY_FILE);
  return existsSync(path) ? read(DEPLOY_FILE) : {};
}

export function saveDeployment(patch) {
  const next = { ...deployment(), ...patch };
  writeFileSync(resolve(root, DEPLOY_FILE), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

export function treasury() {
  return config.treasury ?? wallet().publicKey.toBase58();
}

export const explorerTx = (sig) =>
  IS_MAINNET ? `https://solscan.io/tx/${sig}` : `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
