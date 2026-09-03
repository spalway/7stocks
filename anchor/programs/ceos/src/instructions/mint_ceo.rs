use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
// Leaf crates, not the anchor_lang::solana_program facade — see Cargo.toml.
use solana_sdk_ids::sysvar::slot_hashes::ID as SLOT_HASHES_ID;
use solana_sha256_hasher::hashv;
use mpl_core::instructions::CreateV2CpiBuilder;
use mpl_core::types::{
    Attribute, Attributes, DataState, Plugin, PluginAuthority, PluginAuthorityPair,
};

use crate::errors::CeosError;
use crate::events::CeoMinted;
use crate::state::{
    Config, CLASS_COUNT, CLASS_NAMES, CLASS_SLUGS, CLASS_TICKERS, CONFIG_SEED,
};

#[derive(Accounts)]
pub struct MintCeo<'info> {
    #[account(mut)]
    pub minter: Signer<'info>,

    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// CHECK: pinned to `config.collection`; mpl-core validates the account body.
    #[account(mut, address = config.collection)]
    pub collection: UncheckedAccount<'info>,

    /// CHECK: a fresh keypair supplied by the client. mpl-core creates and owns it.
    #[account(mut)]
    pub asset: Signer<'info>,

    /// CHECK: pinned to `config.treasury`; only ever receives lamports.
    #[account(mut, address = config.treasury)]
    pub treasury: UncheckedAccount<'info>,

    /// CHECK: pinned to the SlotHashes sysvar id. Read directly rather than
    /// deserialised — the full sysvar is ~20KB and we only need the head.
    #[account(address = SLOT_HASHES_ID)]
    pub slot_hashes: UncheckedAccount<'info>,

    /// CHECK: pinned to the mpl-core program id.
    #[account(address = mpl_core::ID)]
    pub mpl_core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// The most recent slot hash, as the entropy source for the class roll.
///
/// Layout is `u64 len` then entries of `(u64 slot, [u8; 32] hash)`, newest
/// first, so the hash we want sits at bytes 16..48.
///
/// A validator can influence this by choosing what to include in a slot, so it
/// is NOT unpredictable to them. That is acceptable here for one reason only:
/// every class is worth the same, so there is nothing to gain by steering the
/// roll. If a class ever becomes rarer or pays more, this stops being true and
/// the roll must move to a VRF.
fn recent_slot_hash(info: &AccountInfo) -> Result<[u8; 32]> {
    let data = info.try_borrow_data()?;
    require!(data.len() >= 48, CeosError::NoSlotHash);
    let len = u64::from_le_bytes(data[0..8].try_into().unwrap());
    require!(len > 0, CeosError::NoSlotHash);
    let mut out = [0u8; 32];
    out.copy_from_slice(&data[16..48]);
    Ok(out)
}

/// Roll a class, weighted by remaining supply.
///
/// Weighting by what is left rather than a flat 1/7 is what keeps the roll
/// meaningful to the end: a flat roll would land on a sold-out class and have to
/// be re-rolled, and the odds would drift as classes filled at different rates.
fn roll_class(config: &Config, entropy: [u8; 32]) -> Result<usize> {
    let total = config.total_remaining();
    require!(total > 0, CeosError::SoldOut);

    let roll = u64::from_le_bytes(entropy[0..8].try_into().unwrap()) % total;

    // Cannot overflow — seven u32s sum to far under u64 — but checked to keep
    // every arithmetic line in this program the same shape.
    let mut acc = 0u64;
    for c in 0..CLASS_COUNT {
        acc = acc
            .checked_add(config.supply[c].saturating_sub(config.minted[c]) as u64)
            .ok_or(CeosError::Overflow)?;
        if roll < acc {
            return Ok(c);
        }
    }
    // Unreachable: `roll < total` and the sum of remaining is `total`.
    err!(CeosError::SoldOut)
}

/// Mints one CEO to the minter. The class is rolled, not chosen.
///
/// The asset's vault needs no account here: every Core asset has a signer PDA at
/// `["mpl-core-execute", asset]` under the Core program, and Core only lets the
/// asset's current owner spend from it. That is the vault, and it follows the
/// NFT on a sale without us tracking anything.
pub fn mint_ceo_handler(ctx: Context<MintCeo>) -> Result<()> {
    // Read what we need before the CPIs so the config borrow is released.
    let (class, price, serial, uri, bump) = {
        let config = &ctx.accounts.config;

        // Mix the slot hash with things unique to this mint, so two mints in
        // the same slot do not share a roll.
        let slot_hash = recent_slot_hash(&ctx.accounts.slot_hashes.to_account_info())?;
        let entropy = hashv(&[
            &slot_hash,
            ctx.accounts.asset.key().as_ref(),
            ctx.accounts.minter.key().as_ref(),
            &config.total_remaining().to_le_bytes(),
        ])
        .to_bytes();

        let class = roll_class(config, entropy)?;

        (
            class,
            config.price,
            config.minted[class] + 1,
            // Per asset, not per class. Each NFT's artwork is rolled from its
            // own address. The class stays in the path so whatever serves this
            // can answer from the URL alone.
            format!(
                "{}/{}/{}.json",
                config.uri_base,
                CLASS_SLUGS[class],
                ctx.accounts.asset.key()
            ),
            config.bump,
        )
    };

    if price > 0 {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.minter.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            price,
        )?;
    }

    let plugins = vec![PluginAuthorityPair {
        plugin: Plugin::Attributes(Attributes {
            attribute_list: vec![
                Attribute {
                    key: "ceo".to_string(),
                    value: CLASS_NAMES[class].to_string(),
                },
                Attribute {
                    key: "ticker".to_string(),
                    value: CLASS_TICKERS[class].to_string(),
                },
                Attribute {
                    key: "serial".to_string(),
                    value: serial.to_string(),
                },
            ],
        }),
        authority: Some(PluginAuthority::UpdateAuthority),
    }];

    // The config PDA is the collection's update authority, so it is what signs
    // the mint into the collection.
    let signer_seeds: &[&[&[u8]]] = &[&[CONFIG_SEED, &[bump]]];

    CreateV2CpiBuilder::new(&ctx.accounts.mpl_core_program.to_account_info())
        .asset(&ctx.accounts.asset.to_account_info())
        .collection(Some(&ctx.accounts.collection.to_account_info()))
        .authority(Some(&ctx.accounts.config.to_account_info()))
        .payer(&ctx.accounts.minter.to_account_info())
        .owner(Some(&ctx.accounts.minter.to_account_info()))
        .system_program(&ctx.accounts.system_program.to_account_info())
        .data_state(DataState::AccountState)
        // "<Surname> #<serial>" — register_ceo reads the class back off this
        // prefix, so the surname must come first and stay unique.
        .name(format!("{} #{}", CLASS_NAMES[class], serial))
        .uri(uri)
        .plugins(plugins)
        .invoke_signed(signer_seeds)?;

    ctx.accounts.config.minted[class] = serial;

    emit!(CeoMinted {
        asset: ctx.accounts.asset.key(),
        owner: ctx.accounts.minter.key(),
        class: class as u8,
        serial,
    });

    Ok(())
}
