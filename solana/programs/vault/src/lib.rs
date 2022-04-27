pub mod constants;
pub mod shared;

use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak::{
  hash,
};
use constants::{
  ObjType,
};
use std::convert::TryInto;

declare_id!("VT2uRTAsYJRavhAVcvSjk9TzyNeP1ccA6KUUD5JxeHj");

#[program]
mod coin98_vault {
  use super::*;

  pub fn create_vault(
    ctx: Context<CreateVaultContext>,
    _vault_path: Vec<u8>,
    signer_nonce: u8,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_CreateVault");

    let owner = &ctx.accounts.owner;

    let vault = &mut ctx.accounts.vault;

    vault.obj_type = ObjType::Vault;
    vault.signer_nonce = signer_nonce;
    vault.owner = *owner.key;
    vault.new_owner = ctx.program_id;

    Ok(())
  }

  #[access_control(verify_owner(&ctx.accounts.owner.key, &ctx.accounts.vault))]
  pub fn set_vault(
    ctx: Context<SetVaultContext>,
    admins: Vec<Pubkey>,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_SetVault");

    let vault = &mut ctx.accounts.vault;

    vault.admins = admins;

    Ok(())
  }

  #[access_control(verify_admin(&ctx.accounts.admin.key, &ctx.accounts.vault))]
  pub fn create_schedule(
    ctx: Context<CreateScheduleContext>,
    user_count: u16,
    event_id: u64,
    timestamp: i64,
    merkle_root: [u8; 32],
    receiving_token_mint: Pubkey,
    receiving_token_account: Pubkey,
    sending_token_mint: Pubkey,
    sending_token_account: Pubkey,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_CreateSchedule");

    let vault = &ctx.accounts.vault;

    let schedule = &mut ctx.accounts.schedule;

    schedule.obj_type = ObjType::Distribution;
    schedule.event_id = event_id;
    schedule.vault_id = vault.key();
    schedule.timestamp = timestamp;
    schedule.merkle_root = merkle_root.try_to_vec().unwrap();
    schedule.receiving_token_mint = receiving_token_mint;
    schedule.receiving_token_account = receiving_token_account;
    schedule.sending_token_mint = sending_token_mint;
    schedule.sending_token_account = sending_token_account;
    schedule.is_active = true;
    schedule.redemptions = vec![false; user_count.into()];

    Ok(())
  }

  #[access_control(verify_admin(&ctx.accounts.admin.key, &ctx.accounts.vault))]
  pub fn set_schedule_status(
    ctx: Context<SetScheduleContext>,
    is_active: bool,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_SetScheduleStatus");

    let schedule = &mut ctx.accounts.schedule;

    schedule.is_active = is_active;

    Ok(())
  }

  #[access_control(verify_admin(&ctx.accounts.admin.key, &ctx.accounts.vault))]
  pub fn withdraw_sol(
    ctx: Context<WithdrawSolContext>,
    amount: u64,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_WithdrawSOL");

    let vault = &ctx.accounts.vault;
    let vault_signer = &ctx.accounts.vault_signer;
    let recipient = &ctx.accounts.recipient;

    let seeds: &[&[_]] = &[
      &[2, 151, 229, 53, 244,  77, 229,  7],
      vault.to_account_info().key.as_ref(),
      &[vault.signer_nonce],
    ];
    let result = shared::transfer_lamports(&vault_signer, &recipient, amount, &[&seeds]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    Ok(())
  }

  #[access_control(verify_admin(&ctx.accounts.admin.key, &ctx.accounts.vault))]
  pub fn withdraw_token(
    ctx: Context<WithdrawTokenContext>,
    amount: u64,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_WithdrawToken");

    let vault = &ctx.accounts.vault;
    let vault_signer = &ctx.accounts.vault_signer;
    let sender = &ctx.accounts.sender;
    let recipient = &ctx.accounts.recipient;

    let seeds: &[&[_]] = &[
      &[2, 151, 229, 53, 244,  77, 229,  7],
      vault.to_account_info().key.as_ref(),
      &[vault.signer_nonce],
    ];
    let result = shared::transfer_token(&vault_signer, &sender, &recipient, amount, &[&seeds]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    Ok(())
  }

  #[access_control(verify_schedule(&ctx.accounts.schedule))]
  #[access_control(verify_proof(
    index,
    &ctx.accounts.user.key,
    receiving_amount,
    sending_amount,
    &proofs,
    &ctx.accounts.schedule
  ))]
  pub fn redeem_token(
    ctx: Context<RedeemTokenContext>,
    index: u16,
    proofs: Vec<[u8; 32]>,
    receiving_amount: u64,
    sending_amount: u64,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_RedeemToken");

    let vault = &ctx.accounts.vault;
    let schedule = &ctx.accounts.schedule;
    let vault_signer = &ctx.accounts.vault_signer;
    let vault_token0 = &ctx.accounts.vault_token0;
    let user_token0 = &ctx.accounts.user_token0;

    if schedule.sending_token_mint != solana_program::system_program::ID && sending_amount > 0 {
      return Err(ErrorCode::FeeRequired.into());
    }

    let schedule = &mut ctx.accounts.schedule;
    let user_index: usize = index.into();
    schedule.redemptions[user_index] = true;

    let seeds: &[&[_]] = &[
      &[2, 151, 229, 53, 244,  77, 229,  7],
      vault.to_account_info().key.as_ref(),
      &[vault.signer_nonce],
    ];
    let result = shared::transfer_token(&vault_signer, &vault_token0, &user_token0, receiving_amount, &[&seeds]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    Ok(())
  }

  #[access_control(verify_schedule(&ctx.accounts.schedule))]
  #[access_control(verify_proof(
    index,
    &ctx.accounts.user.key,
    receiving_amount,
    sending_amount,
    &proofs,
    &ctx.accounts.schedule
  ))]
  pub fn redeem_token_with_fee(
    ctx: Context<RedeemTokenWithFeeContext>,
    index: u16,
    proofs: Vec<[u8; 32]>,
    receiving_amount: u64,
    sending_amount: u64,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_RedeemTokenWithFee");

    let vault = &ctx.accounts.vault;
    let vault_signer = &ctx.accounts.vault_signer;
    let vault_token0 = &ctx.accounts.vault_token0;
    let vault_token1 = &ctx.accounts.vault_token1;
    let user = &ctx.accounts.user;
    let user_token0 = &ctx.accounts.user_token0;
    let user_token1 = &ctx.accounts.user_token1;

    let schedule = &mut ctx.accounts.schedule;
    let user_index: usize = index.into();
    schedule.redemptions[user_index] = true;

    let result = shared::transfer_token(&user, &user_token1, &vault_token1, sending_amount, &[]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    let seeds: &[&[_]] = &[
      &[2, 151, 229, 53, 244,  77, 229,  7],
      vault.to_account_info().key.as_ref(),
      &[vault.signer_nonce],
    ];
    let result = shared::transfer_token(&vault_signer, &vault_token0, &user_token0, receiving_amount, &[&seeds]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    Ok(())
  }
}

#[derive(Accounts)]
#[instruction(vault_path: Vec<u8>)]
pub struct CreateVaultContext<'info> {

  /// CHECK: owner of newly vault
  #[account(signer, mut)]
  pub owner: AccountInfo<'info>,

  #[account(
    init,
    seeds = [
      &[93, 85, 196,  21, 227, 86, 221, 123],
      &*vault_path,
    ],
    bump,
    payer = owner,
    space = Vault::size(),
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
      &[244, 131, 10, 29, 174, 41, 128, 68],
      &shared::derive_event_id(event_id),
    ],
    bump,
    payer = admin,
    space = Schedule::size(user_count),
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
      &[2, 151, 229, 53, 244,  77, 229,  7],
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
      &[2, 151, 229, 53, 244,  77, 229,  7],
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
    constraint = shared::is_token_program(&token_program) @ErrorCode::InvalidAccount
  )]
  pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RedeemTokenContext<'info> {

  pub vault: Account<'info, Vault>,

  #[account(
    mut,
    constraint = schedule.vault_id == vault.key() @ErrorCode::InvalidAccount
  )]
  pub schedule: Account<'info, Schedule>,

  /// CHECK: PDA to hold vault's assets
  #[account(
    seeds = [
      &[2, 151, 229, 53, 244,  77, 229,  7],
      vault.to_account_info().key.as_ref(),
    ],
    bump = vault.signer_nonce
  )]
  pub vault_signer: AccountInfo<'info>,

  /// CHECK: Program's TokenAccount for distribution
  #[account(
    mut,
    constraint = *vault_token0.key == schedule.receiving_token_account @ErrorCode::InvalidTokenAccount
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
    constraint = shared::is_token_program(&token_program) @ErrorCode::InvalidAccount
  )]
  pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RedeemTokenWithFeeContext<'info> {

  pub vault: Account<'info, Vault>,

  #[account(
    mut,
    constraint = schedule.vault_id == vault.key() @ErrorCode::InvalidAccount
  )]
  pub schedule: Account<'info, Schedule>,

  /// CHECK: PDA to hold vault's assets
  #[account(
    seeds = [
      &[2, 151, 229, 53, 244,  77, 229,  7],
      vault.to_account_info().key.as_ref(),
    ],
    bump = vault.signer_nonce
  )]
  pub vault_signer: AccountInfo<'info>,

  /// CHECK: Program's TokenAccount for distribution
  #[account(
    mut,
    constraint = *vault_token0.key == schedule.receiving_token_account @ErrorCode::InvalidTokenAccount
  )]
  pub vault_token0: AccountInfo<'info>,

  /// CHECK: Program's TokenAccount for collecting fee
  #[account(
    mut,
    constraint = *vault_token1.key == schedule.sending_token_account @ErrorCode::InvalidTokenAccount
  )]
  pub vault_token1: AccountInfo<'info>,

  /// CHECK: User account eligible to redeem token. Must sign to provide proof of redemption
  #[account(signer)]
  pub user: AccountInfo<'info>,

  /// CHECK: User account to receive token
  #[account(mut)]
  pub user_token0: AccountInfo<'info>,

  /// CHECK: User account to send token
  #[account(mut)]
  pub user_token1: AccountInfo<'info>,

  /// CHECK: Solana native Token Program
  #[account(
    constraint = shared::is_token_program(&token_program) @ErrorCode::InvalidAccount
  )]
  pub token_program: AccountInfo<'info>,
}

#[account]
pub struct Schedule {
  pub obj_type: ObjType,
  pub event_id: u64,
  pub vault_id: Pubkey,
  pub timestamp: i64,
  pub merkle_root: Vec<u8>,
  // receiving_token: Type of the token user will redeem
  pub receiving_token_mint: Pubkey,
  pub receiving_token_account: Pubkey,
  // sending_token: Type of the token maybe required to send as a fee for redemption
  pub sending_token_mint: Pubkey,
  pub sending_token_account: Pubkey,
  pub is_active: bool,
  pub redemptions: Vec<bool>,
}

impl Schedule {
  pub fn size(user_count: u16) -> usize {
    16 + 1 + 8 + 32 + 8 + 36 + 32 + 32 + 32 + 32 + 1 + (4 + usize::from(user_count))
  }
}

#[account]
pub struct Vault {
  pub obj_type: ObjType,
  pub signer_nonce: u8,
  pub owner: Pubkey,
  pub new_owner: Pubkey,
  pub admins: Vec<Pubkey>,
}

impl Vault {
  pub fn size() -> usize {
    16 + 1 + 1 + 32 + 32 + 516
  }
}

#[derive(AnchorSerialize, AnchorDeserialize, Default)]
pub struct RedemptionParams {
  pub index: u16,
  pub address: Pubkey,
  pub receiving_amount: u64,
  pub sending_amount: u64,
}

#[error_code]
pub enum ErrorCode {

  #[msg("Coin98Vault: Fee required.")]
  FeeRequired,

  #[msg("Coin98Vault: Invalid account")]
  InvalidAccount,

  #[msg("Coin98Vault: Not an owner.")]
  InvalidOwner,

  #[msg("Coin98Vault: Invalid signer.")]
  InvalidSigner,

  #[msg("Coin98Vault: Invalid token account.")]
  InvalidTokenAccount,

  #[msg("Coin98Vault: Redeemed.")]
  Redeemed,

  #[msg("Coin98Vault: Schedule locked.")]
  ScheduleLocked,

  #[msg("Coin98Vault: Schedule unavailable.")]
  ScheduleUnavailable,

  #[msg("Coin98Vault: Transaction failed.")]
  TransactionFailed,

  #[msg("Coin98Vault: Unauthorized.")]
  Unauthorized,
}

/// Returns true if the user has root priviledge of the vault
pub fn verify_owner(user: &Pubkey, vault: &Vault) -> Result<()> {
  if *user != vault.owner {
    return Err(ErrorCode::InvalidOwner.into());
  }

  Ok(())
}


/// Returns true if the user is an admin of a specified vault
pub fn verify_admin(user: &Pubkey, vault: &Vault) -> Result<()> {
  if *user == vault.owner {
   return Ok(());
  }

  let result = vault.admins.iter().position(|&key| key == *user);
  if result == None {
    return Err(ErrorCode::InvalidOwner.into());
  }

  Ok(())
}

pub fn verify_schedule(schedule: &Schedule) -> Result<()> {
  let clock = Clock::get().unwrap();
  if !schedule.is_active {
    return Err(ErrorCode::ScheduleUnavailable.into());
  }
  if clock.unix_timestamp < schedule.timestamp {
    return Err(ErrorCode::ScheduleLocked.into());
  }

  Ok(())
}

pub fn verify_proof(index: u16, user: &Pubkey, receiving_amount: u64, sending_amount: u64, proofs: &Vec<[u8; 32]>, schedule: &Schedule) -> Result<()> {
  let redemption_params = RedemptionParams {
    index: index,
    address: *user,
    receiving_amount: receiving_amount,
    sending_amount: sending_amount,
  };
  let redemption_data = redemption_params.try_to_vec().unwrap();
  let root: [u8; 32] = schedule.merkle_root.clone().try_into().unwrap();
  let leaf = hash(&redemption_data[..]);
  if !shared::verify_proof(proofs.to_vec(), root, leaf.to_bytes()) {
    return Err(ErrorCode::Unauthorized.into());
  }

  let user_index: usize = index.into();
  if schedule.redemptions[user_index] {
    return Err(ErrorCode::Redeemed.into());
  }

  Ok(())
}
