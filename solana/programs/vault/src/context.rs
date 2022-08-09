use anchor_lang::prelude::*;

use crate::constant::{
  SCHEDULE_SEED_1,
  SIGNER_SEED_1,
  VAULT_SEED_1,
};
use crate::error::{
  ErrorCode,
};
use crate::state::{
  ObjType,
  Schedule,
  Vault,
};
use crate::shared;
use crate::external::spl_token::{
  is_token_program,
};

#[derive(Accounts)]
#[instruction(vault_path: Vec<u8>)]
pub struct CreateVaultContext<'info> {

  /// CHECK: owner of newly vault
  #[account(signer, mut)]
  pub owner: AccountInfo<'info>,

  #[account(
    init,
    seeds = [
      &VAULT_SEED_1,
      &*vault_path,
    ],
    bump,
    payer = owner,
    space = 16 + Vault::size(),
  )]
  pub vault: Account<'info, Vault>,

  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetVaultContext<'info> {

  /// CHECK: vault owner, verified using #access_control
  #[account(signer)]
  pub owner: AccountInfo<'info>,

  #[account(mut)]
  pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
#[instruction(user_count: u16, event_id: u64)]
pub struct CreateScheduleContext<'info> {

  /// CHECK: vault admin, verified using #access_control
  #[account(signer, mut)]
  pub admin: AccountInfo<'info>,

  pub vault: Account<'info, Vault>,

  #[account(
    init,
    seeds = [
      &SCHEDULE_SEED_1,
      &shared::derive_event_id(event_id).as_ref(),
    ],
    bump,
    payer = admin,
    space = 16 + Schedule::size(user_count),
  )]
  pub schedule: Account<'info, Schedule>,

  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetScheduleContext<'info> {

  /// CHECK: vault admin, verified using #access_control
  #[account(signer, mut)]
  pub admin: AccountInfo<'info>,

  pub vault: Account<'info, Vault>,

  #[account(
    mut,
    seeds = [
      &SCHEDULE_SEED_1,
      &shared::derive_event_id(schedule.event_id).as_ref(),
    ],
    bump = schedule.nonce,
    constraint = schedule.vault_id == vault.key() @ErrorCode::InvalidAccount
  )]
  pub schedule: Account<'info, Schedule>,
}

#[derive(Accounts)]
pub struct WithdrawSolContext<'info> {

  /// CHECK: vault admin, verified using #access_control
  #[account(signer, mut)]
  pub admin: AccountInfo<'info>,

  pub vault: Account<'info, Vault>,

  /// CHECK: PDA to hold vault's assets
  #[account(
    mut,
    seeds = [
      &SIGNER_SEED_1,
      vault.to_account_info().key.as_ref(),
    ],
    bump = vault.signer_nonce
  )]
  pub vault_signer: AccountInfo<'info>,

  /// CHECK: Destination SOL account
  #[account(mut)]
  pub recipient: AccountInfo<'info>,

  pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawTokenContext<'info> {

  /// CHECK: vault admin, verified using #access_control
  #[account(signer, mut)]
  pub admin: AccountInfo<'info>,

  pub vault: Account<'info, Vault>,

  /// CHECK: PDA to hold vault's assets
  #[account(
    seeds = [
      &SIGNER_SEED_1,
      vault.to_account_info().key.as_ref(),
    ],
    bump = vault.signer_nonce
  )]
  pub vault_signer: AccountInfo<'info>,

  /// CHECK: Vault's TokenAccount for distribution
  #[account(mut)]
  pub sender: AccountInfo<'info>,

  /// CHECK: Destination token account
  #[account(mut)]
  pub recipient: AccountInfo<'info>,

  /// CHECK: Solana native Token Program
  #[account(
    constraint = is_token_program(&token_program) @ErrorCode::InvalidAccount,
  )]
  pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RedeemTokenContext<'info> {

  pub vault: Account<'info, Vault>,

  #[account(
    mut,
    seeds = [
      &SCHEDULE_SEED_1,
      &shared::derive_event_id(schedule.event_id).as_ref(),
    ],
    bump = schedule.nonce,
    constraint = schedule.vault_id == vault.key() @ErrorCode::InvalidAccount,
    constraint = schedule.obj_type == ObjType::Distribution @ErrorCode::InvalidAccount,
  )]
  pub schedule: Account<'info, Schedule>,

  /// CHECK: PDA to hold vault's assets
  #[account(
    seeds = [
      &SIGNER_SEED_1,
      vault.to_account_info().key.as_ref(),
    ],
    bump = vault.signer_nonce
  )]
  pub vault_signer: AccountInfo<'info>,

  /// CHECK: Program's TokenAccount for distribution
  #[account(
    mut,
    constraint = *vault_token0.key == schedule.receiving_token_account @ErrorCode::InvalidAccount
  )]
  pub vault_token0: AccountInfo<'info>,

  /// CHECK: User account eligible to redeem token. Must sign to provide proof of redemption
  #[account(signer)]
  pub user: AccountInfo<'info>,

  /// CHECK: User account to receive token
  #[account(mut)]
  pub user_token0: AccountInfo<'info>,

  /// CHECK: Solana native Token Program
  #[account(
    constraint = is_token_program(&token_program) @ErrorCode::InvalidAccount
  )]
  pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RedeemTokenMultiContext<'info> {

  pub vault: Account<'info, Vault>,

  #[account(
    mut,
    seeds = [
      &SCHEDULE_SEED_1,
      &shared::derive_event_id(schedule.event_id).as_ref(),
    ],
    bump = schedule.nonce,
    constraint = schedule.vault_id == vault.key() @ErrorCode::InvalidAccount,
    constraint = schedule.obj_type == ObjType::DistributionMulti @ErrorCode::InvalidAccount,
  )]
  pub schedule: Account<'info, Schedule>,

  /// CHECK: PDA to hold vault's assets
  #[account(
    seeds = [
      &SIGNER_SEED_1,
      vault.to_account_info().key.as_ref(),
    ],
    bump = vault.signer_nonce
  )]
  pub vault_signer: AccountInfo<'info>,

  /// CHECK: Program's TokenAccount for distribution
  #[account(mut)]
  pub vault_token0: AccountInfo<'info>,

  /// CHECK: User account eligible to redeem token. Must sign to provide proof of redemption
  #[account(signer)]
  pub user: AccountInfo<'info>,

  /// CHECK: User account to receive token
  #[account(mut)]
  pub user_token0: AccountInfo<'info>,

  /// CHECK: Solana native Token Program
  #[account(
    constraint = is_token_program(&token_program) @ErrorCode::InvalidAccount
  )]
  pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct TransferOwnershipContext<'info> {

  /// CHECK: vault owner, verified using #access_control
    #[account(signer)]
    pub owner: AccountInfo<'info>,

    #[account(mut)]
    pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
pub struct AcceptOwnershipContext<'info> {

  /// CHECK: new vault owner, verified using #access_control
    #[account(signer)]
    pub new_owner: AccountInfo<'info>,

    #[account(mut)]
    pub vault: Account<'info, Vault>,
}
