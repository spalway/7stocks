#!/usr/bin/env bash
# Deploy the built program to MAINNET. Run from the host:
#   wsl -d Ubuntu -- bash -lc "tr -d '\r' < /mnt/c/Users/skizp/crypto/new_projects/ceos/anchor/wsldeploy-mainnet.sh > ~/wsldeploy-ceos-mainnet.sh && RPC='<helius mainnet url>' bash ~/wsldeploy-ceos-mainnet.sh"
#
# The authority key is copied in from the repo root (gitignored there) and the
# cluster URL is passed explicitly. Nothing here relies on the CLI's defaults.
set -e
SRC=/mnt/c/Users/skizp/crypto/new_projects/ceos
KEY=~/.config/solana/ceos-mainnet.json
URL="${RPC:-https://api.mainnet-beta.solana.com}"
mkdir -p ~/.config/solana
cp "$SRC/mainnet-authority.json" "$KEY"
chmod 600 "$KEY"
cd ~/dev/ceos

[ -f target/deploy/ceos.so ] || { echo "no target/deploy/ceos.so — run wslbuild.sh first" >&2; exit 1; }
echo "wallet  $(solana-keygen pubkey "$KEY")"
echo "balance $(solana balance -k "$KEY" -u "$URL")"
echo "program $(solana-keygen pubkey target/deploy/ceos-keypair.json)"
echo "cluster ${URL%%\?*}"

anchor deploy --provider.cluster "$URL" --provider.wallet "$KEY" 2>&1 | tail -8
echo
echo "balance after: $(solana balance -k "$KEY" -u "$URL")"
