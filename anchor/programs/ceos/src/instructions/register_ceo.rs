use anchor_lang::prelude::*;
use mpl_core::accounts::BaseAssetV1;
use mpl_core::types::UpdateAuthority;

use crate::errors::CeosError;
use crate::events::CeoRegistered;
use crate::state::{Ceo, Config, Engine, CEO_SEED, CLASS_NAMES, CONFIG_SEED, ENGINE_SEED};

/// Puts a minted CEO into the drop engine.
///
/// Permissionless and idempotent by construction — the `init` on the PDA means
/// an NFT can only be registered once, and anyone can pay to register anyone's.
/// The class is read off the asset itself rather than passed in, so there is
/// nothing here to lie about.
#[derive(Accounts)]
pub struct RegisterCeo<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,

    #[account(mut, seeds = [ENGINE_SEED], bump = engine.bump)]
    pub engine: Box<Account<'info, Engine>>,

    /// CHECK: owner-checked as an mpl-core account, then deserialized as a Core
    /// asset and matched against our collection.
    #[account(owner = mpl_core::ID)]
    pub asset: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + Ceo::INIT_SPACE,
        seeds = [CEO_SEED, asset.key().as_ref()],
        bump,
    )]
    pub ceo: Box<Account<'info, Ceo>>,

    pub system_program: Program<'info, System>,
}

pub fn register_ceo_handler(ctx: Context<RegisterCeo>) -> Result<()> {
    let class = {
        let data = ctx.accounts.asset.try_borrow_data()?;
        let base = BaseAssetV1::from_bytes(&data).map_err(|_| CeosError::NotACeo)?;

        // Only assets in our collection count. A Core asset carries its
        // collection in the update authority.
        match base.update_authority {
            UpdateAuthority::Collection(collection) => {
                require_keys_eq!(
                    collection,
                    ctx.accounts.config.collection,
                    CeosError::NotACeo
                );
            }
            _ => return err!(CeosError::NotACeo),
        }

        // Names are minted as "<Surname> #<serial>". No surname is a prefix of
        // another, so a prefix match is unambiguous.
        CLASS_NAMES
            .iter()
            .position(|name| base.name.starts_with(name))
            .ok_or(CeosError::UnknownClass)?
    };

    let engine = &mut ctx.accounts.engine;

    // Stamping at the current accumulator is what stops an NFT claiming rounds
    // that happened before it existed.
    ctx.accounts.ceo.set_inner(Ceo {
        asset: ctx.accounts.asset.key(),
        class: class as u8,
        stamp: engine.acc_per_nft[class],
        bump: ctx.bumps.ceo,
    });

    engine.class_count[class] = engine.class_count[class]
        .checked_add(1)
        .ok_or(CeosError::Overflow)?;

    emit!(CeoRegistered {
        asset: ctx.accounts.asset.key(),
        class: class as u8,
        class_count: engine.class_count[class],
    });

    Ok(())
}
