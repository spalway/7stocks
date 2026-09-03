// Supabase, from the scripts: the cycle job writes the mirror the site falls
// back to. Service-role key, server-side only. Silent no-op when unconfigured
// so a devnet run without Supabase still works.

import { IS_MAINNET } from './shared.mjs';

const URL_ = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_KEY ?? '';
export const CLUSTER = IS_MAINNET ? 'mainnet-beta' : 'devnet';
export const dbEnabled = !!(URL_ && KEY);

async function rest(path, { method = 'GET', body, prefer } = {}) {
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
  return res.status === 204 ? null : res.json();
}

/// Every CEO currently on-chain, as the mirror should hold it. Upserts the
/// lot (owner moves on transfer), marks them verified, then prunes provisional
/// rows the chain does not know that are older than fifteen minutes.
export async function syncMints(ceos) {
  if (!dbEnabled) return;
  const rows = ceos.map((c) => ({
    asset: c.asset,
    class_id: c.classId,
    serial: c.serial,
    owner: c.owner,
    cluster: CLUSTER,
    verified: true,
    updated_at: new Date().toISOString(),
  }));
  for (let i = 0; i < rows.length; i += 200) {
    await rest('mints?on_conflict=asset', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: rows.slice(i, i + 200),
    });
  }
  const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
  await rest(`mints?cluster=eq.${CLUSTER}&verified=is.false&created_at=lt.${cutoff}`, { method: 'DELETE' });
}

/// One row per cycle: what the site needs to draw every page.
export async function saveSnapshot({ config, engine, potSol, totalMinted }) {
  if (!dbEnabled) return;
  await rest('snapshots', {
    method: 'POST',
    prefer: 'return=minimal',
    body: [{ cluster: CLUSTER, config, engine, pot_sol: potSol, total_minted: totalMinted }],
  });
}
