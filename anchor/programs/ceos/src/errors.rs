use anchor_lang::prelude::*;

#[error_code]
pub enum CeosError {
    #[msg("Class must be 0..6")]
    InvalidClass,
    #[msg("Every class is sold out")]
    SoldOut,
    #[msg("Metadata uri base is too long")]
    UriBaseTooLong,
    #[msg("Not enough time has passed since this class's last round")]
    RoundTooSoon,
    #[msg("No registered NFTs in this class to allocate to")]
    NoHolders,
    #[msg("Nothing new in the holding account to distribute")]
    NothingToDistribute,
    #[msg("This NFT is owed nothing")]
    NothingToSettle,
    #[msg("That mint is not this class's stock")]
    WrongStock,
    #[msg("That asset is not a CEO in our collection")]
    NotACeo,
    #[msg("Could not read the class from the asset name")]
    UnknownClass,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Settle this NFT before closing it")]
    NotSettled,
    #[msg("SlotHashes sysvar is empty")]
    NoSlotHash,
}
