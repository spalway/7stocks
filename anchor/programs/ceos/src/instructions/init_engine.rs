use anchor_lang::prelude::*;

use crate::state::{Engine, CLASS_COUNT, ENGINE_SEED};

#[derive(Accounts)]
pub struct InitEngine<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Engine::INIT_SPACE,
        seeds = [ENGINE_SEED],
        bump,
    )]
    pub engine: Account<'info, Engine>,

    pub system_program: Program<'info, System>,
}

pub fn init_engine_handler(
    ctx: Context<InitEngine>,
    stocks: [Pubkey; CLASS_COUNT],
    min_interval: i64,
    dust_floor: u64,
) -> Result<()> {
    ctx.accounts.engine.set_inner(Engine {
        authority: ctx.accounts.authority.key(),
        stocks,
        acc_per_nft: [0; CLASS_COUNT],
        outstanding: [0; CLASS_COUNT],
        class_count: [0; CLASS_COUNT],
        last_round: [0; CLASS_COUNT],
        min_interval,
        dust_floor,
        bump: ctx.bumps.engine,
    });

    Ok(())
}
