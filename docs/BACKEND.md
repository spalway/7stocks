# CEOs.fun backend

One mint at 0.3 SOL. The class (one of seven CEOs) is rolled on-chain. Every
five minutes the pot is swapped into each class's xStock and pushed into every
NFT's vault. Nothing to claim.

## Pieces

| Piece | Where | What it does |
|---|---|---|
| Program | `anchor/programs/ceos` | `mint_ceo` (random class, weighted by remaining supply), `register_ceo`, `run_round(class)`, `settle`, config/engine admin |
| Client | `src/chain.js` | Hand-encoded instructions + decoders. `npm run idl-check` proves it against `anchor/idl/ceos.json` |
| Cycle | `scripts/cycle.mjs` | The 5-minute job: distribute pump.fun fees → register strays → per-class Jupiter swap → `run_round` → settle every NFT |
| Site | `src/useChain.js`, `src/live.js` | Mint + sweep from the wallet; live reads for the pages |
| Metadata | `server/index.mjs` | `/meta/<class>/<asset>.json`, `/img/<class>/<asset>.svg`, `/rpc` proxy |

## Keys

| File (gitignored) | Role |
|---|---|
| `anchor/ceos-keypair.json` | Program id `3A1sabNyVq3vjnYp3zt6nzr89wNAUJQQBgjwTezr6r7w`. Loses this = cannot upgrade |
| `public/dev-wallet.json` | Devnet authority AND pot. Also installed in WSL as `~/.config/solana/ceos-devnet.json` for `anchor deploy` |
| `mainnet-authority.json` | Mainnet authority (init config, engine, collection). Never on a server |
| `pot-wallet.json` / `POT_SECRET` | Mainnet pot: receives 90% of creator fees, runs the cycle. The only key Railway holds |

## Devnet bring-up

```
wsl build   anchor/wslbuild.sh      (WSL; exports anchor/idl/ceos.json)
npm run idl-check
wsl deploy  anchor/wsldeploy.sh     (needs ~3 SOL on 42ML3…; faucet.solana.com)
npm run collection && npm run init && npm run stocks && npm run engine
npm run cycle -- --simulate --send  (mints mock stock instead of swapping)
npm run status
```

Mint from the site with a devnet wallet, then run the cycle again and watch
`Your CEOs` on /mint show the vault balance. `Sweep to wallet` settles + moves it.

### Devnet state (deployed 2026-09-03)

Program `3A1sabNyVq3vjnYp3zt6nzr89wNAUJQQBgjwTezr6r7w`, collection
`BsNhgFLvMM1fA9gGvnCaLquNRnDuokiGo2qPLg3hYjw2`, mock xStocks and pot in
`public/deploy.json`. Proven end to end: 3 test mints (each rolled a different
class), one `cycle --simulate --send` credited every class and settled 3/3, each
vault held 21.717646 of its mock stock with 0 owed.

Test helpers, all devnet-only: `npm run airdrop`, `npm run mint -- <n>`,
`npm run vaults`, `npm run sweep -- <asset>`.

## Hosting

- Repo: https://github.com/spalway/7stocks — Railway deploys `main` on push.
- Railway project `ceos`, service `site` (`railway.json`: `npm run build`, `npm start`).
  Railway URL https://site-production-fa2d.up.railway.app, custom domain `ceos.fun`
  (CNAME to `6jdt0fli.up.railway.app`).
- Site vars: `VITE_CLUSTER`, `HELIUS_RPC`, `PUBLIC_URL=https://ceos.fun`,
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. `VITE_*` are baked at build: change
  one, redeploy.
- Cycle cron: second service on the same repo with config file `railway.cycle.json`
  (created at mainnet time; needs `POT_SECRET`, `HELIUS_RPC`, `CLUSTER=mainnet`,
  `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`).

## Mainnet

1. `CLUSTER=mainnet` for every script. Fill `ceos.config.json → pump.mint/creator`,
   `potWallet` = pot-wallet.json pubkey.
2. `npm run collection && npm run init && npm run engine` from `mainnet-authority.json`.
   Engine takes the real xStock mints from config (Token-2022, 8 decimals).
3. `npm run fees -- --setup --send` once, with `creator-wallet.json` present:
   creates the pump.fun fee-sharing config naming the pot (9000 bps) and the
   protocol wallet (1000 bps). After that `distribute` is permissionless and
   the cycle calls it itself; the creator key is never needed again.
4. Railway: second service on this repo, config file `railway.cycle.json`
   (cron `*/5 * * * *`, `npm run cycle -- --send`, never restart). Vars:
   `POT_SECRET`, `HELIUS_RPC`, `CLUSTER=mainnet`.

## Supabase mirror (RPC fallback)

Optional. When set, the cycle writes three tables every run — `mints` (every
CEO with owner and serial), `wallets` (every wallet that connected), and
`snapshots` (config, engine, pot, minted counts) — and the site reads them
whenever an RPC call fails, with a "showing the last mirrored state" banner.
Minting and sweeping stay off until the RPC is back; the mirror is for reading.

- Schema: `supabase/schema.sql` (apply once, via the MCP or the SQL editor).
- Site vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public, RLS-fenced).
- Cycle vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (server-side only).
- `npm run sync` refreshes the mirror without running a cycle.
- Browser-written rows are provisional (`verified=false`); the cycle rewrites
  them from the chain and prunes anything it cannot find after 15 minutes.

## Costs to know

- Push settlement is ~1 tx per 4 NFTs per cycle: 700 NFTs ≈ 175 tx / 5 min.
- First delivery to each vault creates its token account (~0.002 SOL, paid by the pot).
  `CYCLE_KEEP_SOL` (default 0.1) is the reserve the cycle never spends.
- Classes whose share is under `CYCLE_MIN_CLASS_SOL` (0.005) wait for the next cycle.
- On-chain `min_interval` is set to cycle − 60s so a cron that fires a few seconds
  early is not rejected.

## Randomness

The class roll hashes the latest SlotHash with the asset key and minter. A
validator can bias it, which is acceptable only because every class is worth
the same. If a class ever becomes rarer or pays more, move the roll to a VRF.
