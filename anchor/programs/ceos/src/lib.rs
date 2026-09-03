//! CEOs.fun — NFT CEOs that get paid in xStocks.
//!
//! Seven classes of Metaplex Core NFT, one per company, minted into one
//! collection whose update authority is this program's `["config"]` PDA. Which
//! class a mint receives is rolled on-chain. Each NFT owns a vault: the Core
//! asset signer PDA at `["mpl-core-execute", asset]`, which only the asset's
//! current owner can spend from.
//!
//! Every cycle the bot swaps the fee pot into seven xStocks — one per class, in
//! proportion to how many NFTs that class has — delivers each to the engine, and
//! runs a round per class. A round is O(1); settlement is one transfer per NFT
//! and is permissionless.

use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;
use state::CLASS_COUNT;

// PLACEHOLDER — Anchor's default. `anchor keys sync` replaces it after the
// first build with the id derived from target/deploy/ceos-keypair.json. The
// Primates id this was forked from is a CLOSED program and must not be reused.
declare_id!("3A1sabNyVq3vjnYp3zt6nzr89wNAUJQQBgjwTezr6r7w");

#[program]
pub mod ceos {
    use super::*;

    /// One-time setup. Run after the Core collection has been created off-chain
    /// with the `["config"]` PDA as its update authority.
    pub fn initialize(
        ctx: Context<Initialize>,
        collection: Pubkey,
        treasury: Pubkey,
        price: u64,
        supply: [u32; CLASS_COUNT],
        uri_base: String,
    ) -> Result<()> {
        initialize_handler(ctx, collection, treasury, price, supply, uri_base)
    }

    /// Admin-only. Any argument left as `None` is untouched.
    pub fn set_config(
        ctx: Context<SetConfig>,
        treasury: Option<Pubkey>,
        price: Option<u64>,
        supply: Option<[u32; CLASS_COUNT]>,
        uri_base: Option<String>,
    ) -> Result<()> {
        set_config_handler(ctx, treasury, price, supply, uri_base)
    }

    /// Mint one CEO. The class is rolled on-chain, weighted by remaining supply;
    /// the minter does not choose.
    pub fn mint_ceo(ctx: Context<MintCeo>) -> Result<()> {
        mint_ceo_handler(ctx)
    }

    // ------------------------------------------------------------ drop engine

    /// One-time setup for the allocation engine: the seven xStock mints, in
    /// class order.
    pub fn init_engine(
        ctx: Context<InitEngine>,
        stocks: [Pubkey; CLASS_COUNT],
        min_interval: i64,
        dust_floor: u64,
    ) -> Result<()> {
        init_engine_handler(ctx, stocks, min_interval, dust_floor)
    }

    /// Admin: change the round cadence or the dust floor.
    pub fn set_engine(
        ctx: Context<SetEngine>,
        min_interval: Option<i64>,
        dust_floor: Option<u64>,
    ) -> Result<()> {
        set_engine_handler(ctx, min_interval, dust_floor)
    }

    /// Puts a minted CEO into the engine so rounds start counting it.
    /// Permissionless; the class is read off the asset.
    pub fn register_ceo(ctx: Context<RegisterCeo>) -> Result<()> {
        register_ceo_handler(ctx)
    }

    /// Credit whatever stock has arrived in one class's holding account to every
    /// registered NFT of that class. Permissionless, and O(1) in NFT count.
    pub fn run_round(ctx: Context<RunRound>, class: u8) -> Result<()> {
        run_round_handler(ctx, class)
    }

    /// Admin: remove a fully-settled CEO from the engine and refund its rent.
    pub fn close_ceo(ctx: Context<CloseCeo>) -> Result<()> {
        close_ceo_handler(ctx)
    }

    /// Deliver one NFT's owed balance into its vault. Permissionless.
    pub fn settle(ctx: Context<Settle>) -> Result<()> {
        settle_handler(ctx)
    }
}
