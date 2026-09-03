#!/usr/bin/env bash
# Devnet only. Installs the site's devnet key as the anchor deploy wallet and
# asks for airdrops. Run from the host:
#   wsl -d Ubuntu -- bash -lc "tr -d '\r' < /mnt/c/Users/skizp/crypto/new_projects/ceos/anchor/wslfund.sh > ~/wslfund-ceos.sh && bash ~/wslfund-ceos.sh"
set -e
ROOT=/mnt/c/Users/skizp/crypto/new_projects/ceos
KEY=~/.config/solana/ceos-devnet.json

cp "$ROOT/public/dev-wallet.json" "$KEY"
ADDR=$(solana-keygen pubkey "$KEY")
echo "devnet wallet: $ADDR"

# Helius devnet if the key is there (its faucet is separate from the public
# one), then the public faucet. Both rate-limit; whichever works, works.
RAW=$(grep -E '^HELIUS_RPC=' "$ROOT/.env.local" | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
case "$RAW" in
  http*) HELIUS=$(echo "$RAW" | sed 's#mainnet\.helius-rpc\.com#devnet.helius-rpc.com#') ;;
  "")    HELIUS="" ;;
  *)     HELIUS="https://devnet.helius-rpc.com/?api-key=$RAW" ;;
esac

for U in "$HELIUS" https://api.devnet.solana.com; do
  [ -z "$U" ] && continue
  for AMT in 5 2 1; do
    if solana airdrop "$AMT" "$ADDR" -u "$U" >/dev/null 2>&1; then
      echo "airdrop $AMT SOL ok via $(echo "$U" | sed 's#?api-key=.*##')"
      break
    fi
  done
done

echo "balance: $(solana balance "$ADDR" -u https://api.devnet.solana.com)"
echo "need ~2.8 SOL to deploy a 382KB program. If short: https://faucet.solana.com -> $ADDR"
