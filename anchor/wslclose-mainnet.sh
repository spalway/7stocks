#!/usr/bin/env bash
# CLOSE the mainnet program and refund its rent to a wallet. IRREVERSIBLE: the
# program id can never be reused. Run from the host:
#   wsl -d Ubuntu -- bash -lc "tr -d '\r' < /mnt/c/Users/skizp/crypto/new_projects/ceos/anchor/wslclose-mainnet.sh > ~/wslclose-ceos.sh && RPC='<helius mainnet url>' RECIPIENT=<wallet> bash ~/wslclose-ceos.sh"
set -e
SRC=/mnt/c/Users/skizp/crypto/new_projects/ceos
KEY=~/.config/solana/ceos-mainnet.json
URL="${RPC:-https://api.mainnet-beta.solana.com}"
PROGRAM=3A1sabNyVq3vjnYp3zt6nzr89wNAUJQQBgjwTezr6r7w
[ -n "$RECIPIENT" ] || { echo "set RECIPIENT=<wallet that receives the rent>" >&2; exit 1; }
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
