use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::errors::CeosError;
use crate::events::RoundRun;
use crate::state::{Engine, ACC_SCALE, CLASS_COUNT, ENGINE_SEED};

/// One round for one class. Permissionless.
///
/// The bot buys the class's xStock off-chain and sends it to the engine's
/// holding account for that class; this credits whatever new balance actually
/// arrived. That is the whole trust model — the program never takes the bot's
/// word for the amount, it reads its own balance. Overstating is not possible.
///
/// Cost is constant in the number of NFTs: one accumulator write, not N
/// transfers. A full cycle is seven of these, one per class, back to back.
/// Delivery happens afterwards in `settle`.
#[derive(Accounts)]
#[instruction(class: u8)]
pub struct RunRound<'info> {
    pub cranker: Signer<'info>,

    #[account(mut, seeds = [ENGINE_SEED], bump = engine.bump)]
    pub engine: Box<Account<'info, Engine>>,

    pub stock_mint: Box<InterfaceAccount<'info, Mint>>,

    // associated_token::token_program is not optional here. Without it Anchor
    // derives the address against the classic SPL Token program, so a
    // Token-2022 mint — which every xStock is — resolves to an account that
    // does not exist and the constraint fails with ConstraintAssociated.
    #[account(
        associated_token::mint = stock_mint,
        associated_token::authority = engine,
        associated_token::token_program = token_program,
    )]
    pub holding: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn run_round_handler(ctx: Context<RunRound>, class: u8) -> Result<()> {
    let slot = class as usize;
    require!(slot < CLASS_COUNT, CeosError::InvalidClass);

    let now = Clock::get()?.unix_timestamp;
    let engine = &mut ctx.accounts.engine;

    require_keys_eq!(
        ctx.accounts.stock_mint.key(),
        engine.stocks[slot],
        CeosError::WrongStock
    );
    require!(
        now.saturating_sub(engine.last_round[slot]) >= engine.min_interval,
        CeosError::RoundTooSoon
    );
    require!(engine.class_count[slot] > 0, CeosError::NoHolders);

    // Anything above what we still owe from earlier rounds is new money.
    let arrived = ctx
        .accounts
        .holding
        .amount
        .checked_sub(engine.outstanding[slot])
        .ok_or(CeosError::Overflow)?;
    require!(arrived >= engine.dust_floor, CeosError::NothingToDistribute);

    // Integer division leaves dust in the holding account. It is not added to
    // `outstanding`, so the next round for this class picks it up.
    let per_nft = (arrived as u128)
        .checked_mul(ACC_SCALE)
        .ok_or(CeosError::Overflow)?
        / engine.class_count[slot] as u128;

    engine.acc_per_nft[slot] = engine.acc_per_nft[slot]
        .checked_add(per_nft)
        .ok_or(CeosError::Overflow)?;
    engine.outstanding[slot] = engine.outstanding[slot]
        .checked_add(arrived)
        .ok_or(CeosError::Overflow)?;
    engine.last_round[slot] = now;

    emit!(RoundRun {
        class,
        stock: ctx.accounts.stock_mint.key(),
        amount: arrived,
        class_count: engine.class_count[slot],
    });

    Ok(())
}
