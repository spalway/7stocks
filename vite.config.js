import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Loaded with an empty prefix so HELIUS_RPC is visible here, in the dev
  // server's own process. It is deliberately not VITE_-prefixed, so it is never
  // inlined into the client bundle — the browser only ever sees "/rpc".
  const env = loadEnv(mode, process.cwd(), '');
  // The Helius host is rewritten to match VITE_CLUSTER; a bare key becomes a
  // URL. Same rule as server/index.mjs and scripts/shared.mjs.
  const net = (env.VITE_CLUSTER ?? 'devnet').toLowerCase().startsWith('main') ? 'mainnet' : 'devnet';
  const raw = (env.HELIUS_RPC || env.UPSTREAM_RPC || '').trim();
  const upstream = !raw ? ''
    : /^[0-9a-f-]{32,40}$/i.test(raw) ? `https://${net}.helius-rpc.com/?api-key=${raw}`
    : raw.replace(/\b(mainnet|devnet)\.helius-rpc\.com/, `${net}.helius-rpc.com`);

  return {
    plugins: [react()],
    // @solana/web3.js v1 still expects a couple of Node globals in the browser.
    define: { global: 'globalThis' },
    resolve: { alias: { buffer: 'buffer' } },
    server: {
      // Mirrors what server/index.mjs does in production, so dev and prod talk
      // to the chain the same way and the key stays server-side in both.
      proxy: upstream
        ? {
            '/rpc': {
              target: upstream,
              changeOrigin: true,
              secure: true,
              // The upstream carries its key in the query string, so the whole
              // path+query of the target has to survive the rewrite.
              rewrite: () => new URL(upstream).pathname + new URL(upstream).search,
            },
          }
        : undefined,
    },
  };
});
