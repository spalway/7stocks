// Supabase, from the browser: a mirror of chain state for when the RPC is down.
//
// Plain fetch against PostgREST — no SDK, so there is one URL and one header
// to look at when something fails. The anon key is public by design; what it
// can do is fenced by row-level security in supabase/schema.sql:
//
//   read      mints, wallets, snapshots
//   write     mints (unverified rows only), touch_wallet()
//
// Everything the site writes is provisional. The cycle job rewrites `mints`
// from the chain every five minutes and prunes unverified rows it cannot find,
// so a spoofed insert lives for at most one cycle and only ever during an RPC
// outage would anyone see it.

import { CLUSTER } from './cluster.js';

const URL_ = (import.meta.env?.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY ?? '';

export const dbEnabled = !!(URL_ && KEY);

async function rest(path, { method = 'GET', body, prefer } = {}) {
  if (!dbEnabled) throw new Error('supabase not configured');
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: KEY,
      // Legacy JWT keys also go in Authorization; the newer sb_* keys must not.
      ...(KEY.startsWith('eyJ') ? { authorization: `Bearer ${KEY}` } : {}),
      'content-type': 'application/json',
      ...(prefer ? { prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  // A minimal-return insert answers 201 with an empty body; only parse what is there.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/// Fire-and-forget writes. A mirror must never break the thing it mirrors,
/// so these swallow their errors and log them.
const quiet = (p) => p.catch((e) => console.warn('[db]', e.message));

/// A wallet connected. Upsert via a SQL function so anon needs no UPDATE grant.
export function recordWallet(address) {
  if (!dbEnabled || !address) return;
  quiet(rest('rpc/touch_wallet', { method: 'POST', body: { p_address: address, p_cluster: CLUSTER } }));
}

/// A mint just confirmed in this browser. Provisional until the cycle sees it.
export function recordMint({ asset, classId, serial, owner, signature }) {
  if (!dbEnabled) return;
  quiet(rest('mints', {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=minimal',
    body: [{ asset, class_id: classId, serial, owner, minter: owner, signature, cluster: CLUSTER, verified: false }],
  }));
}

/// The last snapshot the cycle job wrote: config, engine, pot, minted counts.
export async function loadSnapshot() {
  const rows = await rest(`snapshots?cluster=eq.${CLUSTER}&order=created_at.desc&limit=1`);
  return rows[0] ?? null;
}

/// Every mint the mirror knows about, newest first.
export function loadMints() {
  return rest(`mints?cluster=eq.${CLUSTER}&order=created_at.desc&limit=1000`);
}
