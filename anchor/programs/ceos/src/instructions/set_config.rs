use anchor_lang::prelude::*;

use crate::errors::CeosError;
use crate::state::{Config, CLASS_COUNT, CONFIG_SEED, MAX_URI_BASE};

#[derive(Accounts)]
pub struct SetConfig<'info> {
    #[account(address = config.authority)]
    pub authority: Signer<'info>,

    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
}

pub fn set_config_handler(
    ctx: Context<SetConfig>,
    treasury: Option<Pubkey>,
    price: Option<u64>,
    supply: Option<[u32; CLASS_COUNT]>,
    uri_base: Option<String>,
) -> Result<()> {
    let config = &mut ctx.accounts.config;

    if let Some(treasury) = treasury {
        config.treasury = treasury;
    }
    if let Some(price) = price {
        config.price = price;
    }
    if let Some(supply) = supply {
        config.supply = supply;
    }
    if let Some(uri_base) = uri_base {
        require!(uri_base.len() <= MAX_URI_BASE, CeosError::UriBaseTooLong);
        config.uri_base = uri_base;
    }

    Ok(())
}
