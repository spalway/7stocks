use anchor_lang::prelude::*;

use crate::errors::CeosError;
use crate::state::{Config, CLASS_COUNT, CONFIG_SEED, MAX_URI_BASE};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_handler(
    ctx: Context<Initialize>,
    collection: Pubkey,
    treasury: Pubkey,
    price: u64,
    supply: [u32; CLASS_COUNT],
    uri_base: String,
) -> Result<()> {
    require!(uri_base.len() <= MAX_URI_BASE, CeosError::UriBaseTooLong);

    ctx.accounts.config.set_inner(Config {
        authority: ctx.accounts.authority.key(),
        collection,
        treasury,
        price,
        supply,
        minted: [0; CLASS_COUNT],
        uri_base,
        bump: ctx.bumps.config,
    });

    Ok(())
}
