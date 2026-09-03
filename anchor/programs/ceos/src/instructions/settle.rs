use anchor_lang::prelude::*;
use anchor_spl::token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked};

use crate::errors::CeosError;
use crate::events::Settled;
use crate::state::{vault_for, Ceo, Engine, ACC_SCALE, CEO_SEED, ENGINE_SEED};

/// Delivers one NFT's owed balance into its vault. Permissionless — anyone can
/// settle anyone's NFT, and several fit in a transaction.
///
/// The class is read off the `Ceo` account, not passed in: an NFT can only ever
/// be owed its own class's stock, so the stock mint is validated against the
/// engine's entry for that class rather than searched for.
///
/// Settling is only ever a delivery step. The claim exists from the moment the
/// round runs whether or not anybody cranks this, so an NFT that is never
/// settled loses nothing.
// Every sizeable account is boxed. Unboxed, this context deserialises Engine
// plus Ceo plus two token accounts and a mint into one SBF stack frame, which is
// only 4KB — it overruns during account validation and the program dies with a
// null read before the handler is ever reached.
#[derive(Accounts)]
pub struct Settle<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,

    #[account(mut, seeds = [ENGINE_SEED], bump = engine.bump)]
    pub engine: Box<Account<'info, Engine>>,

    #[account(mut, seeds = [CEO_SEED, ceo.asset.as_ref()], bump = ceo.bump)]
    pub ceo: Box<Account<'info, Ceo>>,

    pub stock_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = stock_mint,
        associated_token::authority = engine,
        associated_token::token_program = token_program,
    )]
    pub holding: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: matched against the Core asset signer PDA derived from the ceo.
    pub vault: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = stock_mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn settle_handler(ctx: Context<Settle>) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.vault.key(),
        vault_for(&ctx.accounts.ceo.asset),
        CeosError::NotACeo
    );

    let slot = ctx.accounts.ceo.class as usize;
    require_keys_eq!(
        ctx.accounts.stock_mint.key(),
        ctx.accounts.engine.stocks[slot],
        CeosError::WrongStock
    );

    // Weight is 1 for every NFT, so owed is just the accumulator distance.
    let acc = ctx.accounts.engine.acc_per_nft[slot];
    let owed = acc.saturating_sub(ctx.accounts.ceo.stamp) / ACC_SCALE;
    let owed = u64::try_from(owed).map_err(|_| CeosError::Overflow)?;
    require!(owed > 0, CeosError::NothingToSettle);

    ctx.accounts.ceo.stamp = acc;
    ctx.accounts.engine.outstanding[slot] = ctx.accounts.engine.outstanding[slot]
        .checked_sub(owed)
        .ok_or(CeosError::Overflow)?;

    let bump = ctx.accounts.engine.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[ENGINE_SEED, &[bump]]];

    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.holding.to_account_info(),
                mint: ctx.accounts.stock_mint.to_account_info(),
                to: ctx.accounts.vault_ata.to_account_info(),
                authority: ctx.accounts.engine.to_account_info(),
            },
            signer_seeds,
        ),
        owed,
        ctx.accounts.stock_mint.decimals,
    )?;

    emit!(Settled {
        asset: ctx.accounts.ceo.asset,
        mint: ctx.accounts.stock_mint.key(),
        amount: owed,
    });

    Ok(())
}
