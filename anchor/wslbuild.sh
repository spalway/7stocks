#!/usr/bin/env bash
# Build the ceos program in WSL. Native Windows cannot build Solana programs.
#
# Run from the host:
#   wsl -d Ubuntu -- bash -lc "tr -d '\r' < /mnt/c/Users/skizp/crypto/new_projects/ceos/anchor/wslbuild.sh > ~/wslbuild-ceos.sh && bash ~/wslbuild-ceos.sh"
#
# The repo is copied into the WSL home first: cross-filesystem builds off
# /mnt/c are slow and break cargo's file watching.
set -e
SRC=/mnt/c/Users/skizp/crypto/new_projects/ceos/anchor
DST=~/dev/ceos

rm -rf "$DST"
mkdir -p "$DST"
cp -r "$SRC"/* "$DST"/
cd "$DST"

# The program keypair lives on the Windows side (gitignored) so the id survives
# this wipe. Without it anchor mints a fresh key every build and the id in
# lib.rs / chain.js stops matching the .so.
if [ ! -f "$SRC/ceos-keypair.json" ]; then
  echo "missing $SRC/ceos-keypair.json — the program id is pinned to it" >&2
  exit 1
fi
mkdir -p target/deploy
cp "$SRC/ceos-keypair.json" target/deploy/ceos-keypair.json

# Reuse the proven lockfile so this is a compile check, not a dependency
# resolution experiment. Same anchor/solana/mpl-core versions as Primates.
if [ -f ~/dev/primates/Cargo.lock ]; then cp ~/dev/primates/Cargo.lock .; fi

anchor build 2>&1 | tail -60
echo
echo "=== artifacts ==="
ls -la target/deploy/*.so target/idl/*.json 2>/dev/null || echo "(none)"
echo
echo "=== program id (must match declare_id! and chain.js) ==="
anchor keys list 2>/dev/null || true
grep -o 'declare_id!("[^"]*")' programs/ceos/src/lib.rs

# Export the IDL back to the Windows repo so the client check runs without WSL.
mkdir -p "$SRC/idl" && cp target/idl/ceos.json "$SRC/idl/ceos.json" && echo "idl -> anchor/idl/ceos.json"
