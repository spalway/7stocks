#!/usr/bin/env bash
# CLOSE the mainnet program and refund its rent. IRREVERSIBLE.
# Nothing to pass in: the RPC comes from the repo's .env.local and the
# recipient is fixed below. Run from any PowerShell window:
#   wsl -d Ubuntu -- bash -lc "tr -d '' < /mnt/c/Users/skizp/crypto/new_projects/ceos/anchor/wslclose-mainnet.sh > ~/wslclose-ceos.sh && bash ~/wslclose-ceos.sh"
set -e
SRC=/mnt/c/Users/skizp/crypto/new_projects/ceos
KEY=~/.config/solana/ceos-mainnet.json
PROGRAM=3A1sabNyVq3vjnYp3zt6nzr89wNAUJQQBgjwTezr6r7w
RECIPIENT=BLumS6v9u56JrH6EH5heVpHHb956fkiYVxn4oL9BtBvm
# RPC: the HELIUS_RPC line of .env.local. A bare key or a full URL both work;
# the host is forced to mainnet either way.
RAW=$(tr -d '' < "$SRC/.env.local" | sed -n 's/^HELIUS_RPC=//p' | head -1 | tr -d '"'"'"' ')
case "$RAW" in
  http*) URL=$(echo "$RAW" | sed 's/devnet.helius-rpc.com/mainnet.helius-rpc.com/') ;;
  "")    URL=https://api.mainnet-beta.solana.com ;;
  *)     URL="https://mainnet.helius-rpc.com/?api-key=$RAW" ;;
esac
mkdir -p ~/.config/solana
cp "$SRC/mainnet-authority.json" "$KEY"; chmod 600 "$KEY"
cd ~/dev/ceos

echo "authority $(solana-keygen pubkey "$KEY")  balance $(solana balance -k "$KEY" -u "$URL")"
echo "program   $PROGRAM"
solana program show "$PROGRAM" -u "$URL" | grep -E "Balance|Authority|Data Length"
echo "recipient $RECIPIENT"
echo

# Any leftover deploy buffers first (they hold rent too), then the program.
solana program close --buffers -k "$KEY" -u "$URL" --recipient "$RECIPIENT" 2>/dev/null || true
solana program close "$PROGRAM" -k "$KEY" -u "$URL" --recipient "$RECIPIENT" --bypass-warning

echo
echo "program closed. authority balance now $(solana balance -k "$KEY" -u "$URL")"
echo "sweep the authority wallet next:"
echo "  node scripts/treasury-send.mjs $RECIPIENT --from authority --send"
