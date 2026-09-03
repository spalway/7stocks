use anchor_lang::prelude::*;

pub const CONFIG_SEED: &[u8] = b"config";

/// The seven classes, in roster order. Index is the class id everywhere: in
/// `Config.minted`, `Engine.stocks`, the accumulators, and on each `Ceo`.
pub const CLASS_COUNT: usize = 7;

/// Surname is the NFT name prefix and is how `register_ceo` reads the class
/// back off the asset. No name here may be a prefix of another.
pub const CLASS_NAMES: [&str; CLASS_COUNT] = [
    "Jassy", "Pichai", "Zuckerberg", "Huang", "Nadella", "Ternus", "Musk",
];

/// URI path segment. Whatever serves metadata can answer from the URL alone.
pub const CLASS_SLUGS: [&str; CLASS_COUNT] = [
    "amzn", "googl", "meta", "nvda", "msft", "aapl", "tsla",
];

pub const CLASS_TICKERS: [&str; CLASS_COUNT] = [
    "AMZN", "GOOGL", "META", "NVDA", "MSFT", "AAPL", "TSLA",
];

pub const MAX_URI_BASE: usize = 96;

/// Single global account, PDA at `["config"]`.
///
/// It doubles as the update authority of the Core collection: the collection is
/// created off-chain with this PDA as its authority, so `mint_ceo` can sign the
/// Core CPI with the config seeds and nothing else can mint into the collection.
#[account]
#[derive(InitSpace)]
pub struct Config {
    /// Admin allowed to call `set_config`.
    pub authority: Pubkey,
    /// The Metaplex Core collection every CEO is minted into.
    pub collection: Pubkey,
    /// Destination for mint proceeds.
    pub treasury: Pubkey,
    /// One price. There is no tier to choose, so there is no price to compare.
    pub price: u64,
    /// Hard supply cap per class. Identical across all seven by design; kept as
    /// an array so a class can be capped independently if that ever changes.
    pub supply: [u32; CLASS_COUNT],
    /// Minted so far per class.
    pub minted: [u32; CLASS_COUNT],
    /// Metadata host, no trailing slash. Asset uri is `{uri_base}/{slug}/{asset}.json`.
    #[max_len(MAX_URI_BASE)]
    pub uri_base: String,
    pub bump: u8,
}

impl Config {
    pub fn total_remaining(&self) -> u64 {
        (0..CLASS_COUNT)
            .map(|c| self.supply[c].saturating_sub(self.minted[c]) as u64)
            .sum()
    }
}

// ---------------------------------------------------------------- drop engine

pub const ENGINE_SEED: &[u8] = b"engine";
pub const CEO_SEED: &[u8] = b"ceo";

/// Fixed-point scale for the per-NFT accumulator. Rounding dust stays in the
/// holding account and is swept into the next round for that class.
pub const ACC_SCALE: u128 = 1_000_000_000_000;

/// Global drop state, PDA at `["engine"]`.
///
/// Every class has its own slot: its own stock, its own accumulator, its own
/// count of registered NFTs. A round credits ONE class and is O(1) in NFT count
/// — it writes one number, not N transfers. A full cycle is seven rounds.
///
/// Every NFT has weight 1, so "per weight" is "per NFT". What a CEO is owed is
/// the distance between its class's accumulator and its own stamp.
///
/// The engine PDA owns the seven holding token accounts the bot swaps into, so
/// `run_round` only ever credits tokens it can see in its own balance.
#[account]
#[derive(InitSpace)]
pub struct Engine {
    pub authority: Pubkey,
    /// The xStock mint for each class.
    pub stocks: [Pubkey; CLASS_COUNT],
    /// Cumulative units of each class's stock owed per NFT, x ACC_SCALE.
    pub acc_per_nft: [u128; CLASS_COUNT],
    /// Credited to CEOs but not yet settled out of the holding account.
    pub outstanding: [u64; CLASS_COUNT],
    /// Registered NFTs in each class. This is the divisor for a round.
    pub class_count: [u32; CLASS_COUNT],
    /// When each class last ran. Per class, because a cycle runs all seven
    /// back to back and a single timestamp would block the second one.
    pub last_round: [i64; CLASS_COUNT],
    /// Seconds a class's round must wait behind its previous one.
    pub min_interval: i64,
    /// Smallest token delta worth crediting. Guards against dust rounds.
    pub dust_floor: u64,
    pub bump: u8,
}

/// Per-NFT drop state, PDA at `["ceo", asset]`.
///
/// One stamp, not seven: an NFT only ever accrues on its own class's slot, so
/// carrying stamps for the other six would be 96 bytes of rent for nothing.
#[account]
#[derive(InitSpace)]
pub struct Ceo {
    pub asset: Pubkey,
    pub class: u8,
    /// Where this NFT last stood against its class's accumulator.
    pub stamp: u128,
    pub bump: u8,
}

/// The Core asset signer PDA — the NFT's vault.
pub fn vault_for(asset: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"mpl-core-execute", asset.as_ref()], &mpl_core::ID).0
}
