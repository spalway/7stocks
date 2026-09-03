use anchor_lang::prelude::*;

#[event]
pub struct CeoMinted {
    pub asset: Pubkey,
    pub owner: Pubkey,
    pub class: u8,
    pub serial: u32,
}

#[event]
pub struct CeoRegistered {
    pub asset: Pubkey,
    pub class: u8,
    pub class_count: u32,
}

#[event]
pub struct RoundRun {
    pub class: u8,
    pub stock: Pubkey,
    pub amount: u64,
    pub class_count: u32,
}

#[event]
pub struct Settled {
    /// The NFT that was settled.
    pub asset: Pubkey,
    /// Its class's stock, delivered to the vault.
    pub mint: Pubkey,
    pub amount: u64,
}
