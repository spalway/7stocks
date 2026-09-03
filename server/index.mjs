// Serves the built site, the RPC proxy, and the per-asset token metadata.
//
// Every CEO's artwork is rolled from its own address, so the image for an asset
// is a pure function of that address — no database, no pre-rendering, and no
// upload step when a CEO is minted. The program writes
// `<uri_base>/<class>/<asset>.json` into the NFT at mint time and this answers
// it. The class is in the path on purpose: a request is answered from the URL
// alone, with no RPC round trip to discover what the asset is.
//
// The art is the placeholder pixel pipeline for now. When final images land,
// `artFor` is the one function to swap.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PublicKey } from '@solana/web3.js';
import { CLASSES, vaultPda } from '../src/chain.js';
import { PNG } from 'pngjs';
import { ceoSvg, traitList, traitsFor, paletteFrom, SPRITES, GRID } from '../src/ceoArt.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT ?? 8080);

/// Where this deployment is reachable, for absolute URLs inside the metadata.
/// Token metadata is fetched by wallets and marketplaces, not by the page, so a
/// relative image path would resolve against *their* origin and 404.
const PUBLIC_URL = (process.env.PUBLIC_URL ?? `http://localhost:${PORT}`).replace(/\/$/, '');

const BY_SLUG = Object.fromEntries(CLASSES.map((c) => [c.slug, c]));
const SLUGS = CLASSES.map((c) => c.slug).join('|');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
};

/// Reject anything that is not a real address before it reaches the renderer:
/// the seed is derived from the decoded bytes, so a malformed key would either
/// throw or quietly produce art for an asset that cannot exist.
function parseAsset(raw) {
  try {
    return new PublicKey(raw);
  } catch {
    return null;
  }
}

function artFor(klass, asset) {
  return ceoSvg({ companyId: klass.id, address: asset.toBase58(), size: 480 });
}

/// The same portrait as a PNG. Wallets and marketplaces are inconsistent about
/// SVG (some render it, some proxy it through an image CDN that does not), so
/// the metadata's `image` is the PNG and the SVG stays available beside it.
/// Ten pixels per cell, 480 square, rendered straight from the grid. Cached
/// because the same few hundred assets get asked for over and over.
const PNG_SCALE = 10;
const pngCache = new Map();
function pngFor(klass, asset) {
  const key = `${klass.id}:${asset.toBase58()}`;
  const hit = pngCache.get(key);
  if (hit) return hit;
  const traits = traitsFor(asset.toBase58(), klass.id);
  const pal = paletteFrom(traits);
  const grid = SPRITES[klass.id];
  const rgb = (hx) => [1, 3, 5].map((i) => parseInt(hx.slice(i, i + 2), 16));
  const bg = rgb(traits.backdrop.base);
  const png = new PNG({ width: GRID * PNG_SCALE, height: GRID * PNG_SCALE });
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const ch = grid[y][x];
      const c = ch === '.' ? bg : rgb(pal[ch] ?? '#FF00FF');
      for (let sy = 0; sy < PNG_SCALE; sy += 1) {
        for (let sx = 0; sx < PNG_SCALE; sx += 1) {
          const i = (((y * PNG_SCALE) + sy) * png.width + (x * PNG_SCALE) + sx) * 4;
          png.data[i] = c[0]; png.data[i + 1] = c[1]; png.data[i + 2] = c[2]; png.data[i + 3] = 255;
        }
      }
    }
  }
  const out = PNG.sync.write(png);
  if (pngCache.size > 500) pngCache.delete(pngCache.keys().next().value);
  pngCache.set(key, out);
  return out;
}

function metadataFor(klass, asset) {
  const image = `${PUBLIC_URL}/img/${klass.slug}/${asset.toBase58()}.png`;
  const svg = `${PUBLIC_URL}/img/${klass.slug}/${asset.toBase58()}.svg`;
  return {
    name: klass.name,
    symbol: 'CEO',
    description:
      `${klass.name} of ${klass.ticker}. Every distribution cycle this CEO is paid its equal share ` +
      `of creator fees in ${klass.stock}, delivered to a vault derived from the NFT itself, ` +
      'spendable only by its current owner, and transferred with the NFT when it is sold.',
    image,
    external_url: 'https://ceos.fun',
    attributes: [
      { trait_type: 'CEO', value: klass.name },
      { trait_type: 'Ticker', value: klass.ticker },
      { trait_type: 'Paid in', value: klass.stock },
      ...traitList(asset.toBase58(), klass.id),
      { trait_type: 'Vault', value: vaultPda(asset).toBase58() },
    ],
    properties: {
      files: [{ uri: image, type: 'image/png' }, { uri: svg, type: 'image/svg+xml' }],
      category: 'image',
    },
  };
}

const send = (res, status, type, body, cache) => {
  res.writeHead(status, {
    'content-type': type,
    ...(cache ? { 'cache-control': cache } : {}),
  });
  res.end(body);
};

async function serveStatic(res, urlPath) {
  // normalize() collapses "..", and the prefix check is what stops a crafted
  // path from reading outside dist.
  const rel = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const file = join(DIST, rel);
  if (!file.startsWith(DIST)) return send(res, 403, 'text/plain', 'forbidden');

  try {
    const info = await stat(file);
    if (info.isDirectory()) throw new Error('dir');
    const body = await readFile(file);
    // Build output under /assets is content-hashed and cacheable forever.
    // index.html names the current bundle and must revalidate, or a deploy
    // silently does nothing for anyone holding the old copy.
    const immutable = rel.startsWith('assets/') || rel.startsWith('assets\\');
    const cache = immutable ? 'public, max-age=31536000, immutable' : 'no-cache';
    return send(res, 200, MIME[extname(file)] ?? 'application/octet-stream', body, cache);
  } catch {
    // Hash routing means every unknown path is a page, not a 404.
    try {
      return send(res, 200, MIME['.html'], await readFile(join(DIST, 'index.html')), 'no-cache');
    } catch {
      return send(res, 404, 'text/plain', 'not found');
    }
  }
}

/// Where JSON-RPC actually goes. Server-side so the provider's API key never
/// reaches a browser. A bare Helius key is accepted as well as a full URL.
function resolveUpstream(raw) {
  const value = (raw ?? '').trim();
  if (!value) return '';
  const net = (process.env.VITE_CLUSTER ?? 'devnet').toLowerCase().startsWith('main')
    ? 'mainnet'
    : 'devnet';
  if (/^[0-9a-f-]{32,40}$/i.test(value)) return `https://${net}.helius-rpc.com/?api-key=${value}`;
  // A full URL still has its Helius host rewritten to match the cluster, so a
  // mainnet URL pasted into a devnet deployment cannot quietly serve mainnet.
  return value.replace(/\b(mainnet|devnet)\.helius-rpc\.com/, `${net}.helius-rpc.com`);
}

const UPSTREAM_RPC = resolveUpstream(process.env.HELIUS_RPC ?? process.env.UPSTREAM_RPC);

async function proxyRpc(req, res) {
  if (!UPSTREAM_RPC) return send(res, 503, 'text/plain', 'no upstream rpc configured');

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);

  try {
    const upstream = await fetch(UPSTREAM_RPC, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: Buffer.concat(chunks),
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    return send(res, upstream.status, 'application/json', body);
  } catch (err) {
    // Say what actually went wrong; the key is stripped because this string
    // reaches the browser.
    const why = `${err?.cause?.code ?? err?.name ?? 'Error'}: ${err?.message ?? 'unknown'}`
      .replace(/api-key=[^&\s"']+/gi, 'api-key=***');
    process.stderr.write(`[rpc] upstream failed: ${why}\n`);
    return send(res, 502, 'text/plain', `rpc upstream failed: ${why}`);
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const path = decodeURIComponent(url.pathname);

  if (path === '/rpc') {
    if (req.method !== 'POST') return send(res, 405, 'text/plain', 'post only');
    return proxyRpc(req, res);
  }

  // Metadata and images are immutable for a given asset — the art is a pure
  // function of the address — so they can be cached hard.
  const IMMUTABLE = 'public, max-age=31536000, immutable';

  let m = new RegExp(`^/meta/(${SLUGS})/([1-9A-HJ-NP-Za-km-z]{32,44})\\.json$`).exec(path);
  if (m) {
    const asset = parseAsset(m[2]);
    if (!asset) return send(res, 400, 'text/plain', 'bad asset');
    return send(res, 200, MIME['.json'], JSON.stringify(metadataFor(BY_SLUG[m[1]], asset), null, 2), IMMUTABLE);
  }

  m = new RegExp(`^/img/(${SLUGS})/([1-9A-HJ-NP-Za-km-z]{32,44})\\.png$`).exec(path);
  if (m) {
    const asset = parseAsset(m[2]);
    if (!asset) return send(res, 400, 'text/plain', 'bad asset');
    return send(res, 200, MIME['.png'], pngFor(BY_SLUG[m[1]], asset), IMMUTABLE);
  }

  m = new RegExp(`^/img/(${SLUGS})/([1-9A-HJ-NP-Za-km-z]{32,44})\\.svg$`).exec(path);
  if (m) {
    const asset = parseAsset(m[2]);
    if (!asset) return send(res, 400, 'text/plain', 'bad asset');
    return send(res, 200, MIME['.svg'], artFor(BY_SLUG[m[1]], asset), IMMUTABLE);
  }

  // The collection's own metadata is fixed, so it stays a file in /public.
  return serveStatic(res, path === '/' ? '/index.html' : path);
});

server.listen(PORT, () => {
  process.stdout.write(`ceos on :${PORT} (public url ${PUBLIC_URL})\n`);
});
