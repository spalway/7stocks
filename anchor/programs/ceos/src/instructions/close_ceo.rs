use anchor_lang::prelude::*;

use crate::errors::CeosError;
use crate::state::{Ceo, Engine, ACC_SCALE, CEO_SEED, ENGINE_SEED};

/// Removes a CEO from the engine and refunds its rent.
///
/// Admin only, and refuses while the NFT is owed anything — closing it mid
/// claim would strand those tokens in `outstanding` with nothing left to deliver
/// them to. Settle first, then close.
#[derive(Accounts)]
pub struct CloseCeo<'info> {
    #[account(mut, address = engine.authority)]
    pub authority: Signer<'info>,

    #[account(mut, seeds = [ENGINE_SEED], bump = engine.bump)]
    pub engine: Box<Account<'info, Engine>>,

    #[account(
        mut,
        close = authority,
        seeds = [CEO_SEED, ceo.asset.as_ref()],
        bump = ceo.bump,
    )]
    pub ceo: Box<Account<'info, Ceo>>,
}

pub fn close_ceo_handler(ctx: Context<CloseCeo>) -> Result<()> {
    let slot = ctx.accounts.ceo.class as usize;

    let owed = ctx.accounts.engine.acc_per_nft[slot]
        .saturating_sub(ctx.accounts.ceo.stamp)
        / ACC_SCALE;
    require!(owed == 0, CeosError::NotSettled);

    ctx.accounts.engine.class_count[slot] = ctx
        .accounts
        .engine
        .class_count[slot]
        .checked_sub(1)
        .ok_or(CeosError::Overflow)?;

    Ok(())
}
