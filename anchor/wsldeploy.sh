#!/usr/bin/env bash
# Deploy the built program to DEVNET. Run after wslbuild.sh, from the host:
#   wsl -d Ubuntu -- bash -lc "tr -d '\r' < /mnt/c/Users/skizp/crypto/new_projects/ceos/anchor/wsldeploy.sh > ~/wsldeploy-ceos.sh && bash ~/wsldeploy-ceos.sh"
#
# Cluster and wallet are passed explicitly, every time. The WSL solana CLI's
# default config points at MAINNET with another project's key; relying on it
# here would deploy the wrong program with the wrong money.
set -e
KEY=~/.config/solana/ceos-devnet.json
URL=https://api.devnet.solana.com
cd ~/dev/ceos

[ -f target/deploy/ceos.so ] || { echo "no target/deploy/ceos.so — run wslbuild.sh first" >&2; exit 1; }
echo "wallet  $(solana-keygen pubkey "$KEY")"
echo "balance $(solana balance -k "$KEY" -u "$URL")"
echo "program $(solana-keygen pubkey target/deploy/ceos-keypair.json)"

anchor deploy --provider.cluster devnet --provider.wallet "$KEY" 2>&1 | tail -8

echo
echo "next (from the ceos dir on Windows):"
echo "  npm run collection && npm run init && npm run stocks && npm run engine"
echo "  npm run cycle -- --simulate --send"
