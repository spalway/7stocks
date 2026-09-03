#!/usr/bin/env bash
# Inspect the resolved dependency tree for the two crates mint_ceo.rs needs.
set -e
cd ~/dev/ceos

echo "=== pinned versions from Cargo.lock ==="
for c in solana-sha256-hasher solana-sdk-ids solana-slot-hashes solana-sysvar solana-program anchor-lang mpl-core; do
  v=$(grep -A1 "^name = \"$c\"$" Cargo.lock | grep '^version' | head -1 | sed 's/version = //; s/"//g')
  printf "%-22s %s\n" "$c" "${v:-NOT IN LOCK}"
done

echo
echo "=== registry source dirs ==="
REG=$(ls -d ~/.cargo/registry/src/*/ | head -1)
echo "$REG"
ls "$REG" | grep -E '^solana-(program|sysvar|sdk-ids|sha256-hasher|slot-hashes)-' | sort

echo
echo "=== solana-program: does it re-export sysvar / hash? ==="
P=$(ls -d "$REG"solana-program-3.* 2>/dev/null | sort -V | tail -1)
echo "dir: $P"
grep -nE 'pub (use|mod) ' "$P/src/lib.rs" | grep -iE 'sysvar|hash|slot' || echo "(no sysvar/hash re-exports)"

echo
echo "=== solana-sysvar: slot_hashes module? ==="
S=$(ls -d "$REG"solana-sysvar-3.* 2>/dev/null | sort -V | tail -1)
echo "dir: $S"
grep -nE 'slot_hashes' "$S/src/lib.rs" | head -5 || echo "(none)"
ls "$S/src/" | grep -i slot || true

echo
echo "=== solana-sdk-ids: slot_hashes id ==="
I=$(ls -d "$REG"solana-sdk-ids-* 2>/dev/null | sort -V | tail -1)
echo "dir: $I"
grep -rn 'slot_hashes' "$I/src/" | head -5 || echo "(none)"

echo
echo "=== solana-sha256-hasher: hashv signature ==="
H=$(ls -d "$REG"solana-sha256-hasher-* 2>/dev/null | sort -V | tail -1)
echo "dir: $H"
grep -n 'pub fn hashv' "$H/src/lib.rs" || echo "(none)"
