pub mod constant;
pub mod context;
pub mod error;
pub mod shared;
pub mod state;

use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak::{
  hash,
};
use std::{
  convert::{
    TryInto,
  },
};

use crate::context::*;
use crate::error::{
  ErrorCode,
};
use crate::state::{
  ObjType,
  RedemptionParams,
  Schedule,
  Vault,
};

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
    vault.new_owner = anchor_lang::system_program::ID; // Set to empty

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
    use_multi_token: bool,
    receiving_token_mint: Pubkey,
    receiving_token_account: Pubkey,
    sending_token_mint: Pubkey,
    sending_token_account: Pubkey,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_CreateSchedule");

    let vault = &ctx.accounts.vault;

    let schedule = &mut ctx.accounts.schedule;

    schedule.obj_type = if use_multi_token { ObjType::DistributionMulti } else { ObjType::Distribution };
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

  #[access_control(verify_schedule(&ctx.accounts.schedule, ObjType::Distribution))]
  #[access_control(verify_proof(
    index,
    &ctx.accounts.user.key,
    receiving_amount,
    sending_amount,
    &proofs,
    &ctx.accounts.schedule
  ))]
  pub fn redeem_token<'a>(
    ctx: Context<'_, '_, '_, 'a, RedeemTokenContext<'a>>,
    index: u16,
    proofs: Vec<[u8; 32]>,
    receiving_amount: u64,
    sending_amount: u64,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_RedeemToken");

    let vault = &ctx.accounts.vault;
    let vault_signer = &ctx.accounts.vault_signer;
    let vault_token0 = &ctx.accounts.vault_token0;
    let user_token0 = &ctx.accounts.user_token0;

    let schedule = &mut ctx.accounts.schedule;
    let user_index: usize = index.into();
    schedule.redemptions[user_index] = true;

    if schedule.sending_token_mint != solana_program::system_program::ID && sending_amount > 0 {
      let accounts = &ctx.remaining_accounts;
      let user = &ctx.accounts.user;
      let vault_token1 = &accounts[0];
      require_keys_eq!(*vault_token1.key, schedule.sending_token_account, ErrorCode::InvalidAccount);
      let user_token1 = &accounts[1];
      shared::transfer_token(
          &user,
          &user_token1,
          &vault_token1,
          sending_amount,
          &[]
        )
        .expect("Coin98Vault: CPI failed.");
    }

    let seeds: &[&[_]] = &[
      &[2, 151, 229, 53, 244,  77, 229,  7],
      vault.to_account_info().key.as_ref(),
      &[vault.signer_nonce],
    ];
    shared::transfer_token(
        &vault_signer,
        &vault_token0,
        &user_token0,
        receiving_amount,
        &[&seeds]
      )
      .expect("Coin98Vault: CPI failed.");

    Ok(())
  }

  #[access_control(verify_owner(&ctx.accounts.owner.key, &ctx.accounts.vault))]
  pub fn transfer_ownership(
    ctx: Context<TransferOwnershipContext>,
    new_owner: Pubkey,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_TransferOwnership");

    let vault = &mut ctx.accounts.vault;

    vault.new_owner = new_owner;

    Ok(())
  }

  #[access_control(verify_new_owner(&ctx.accounts.new_owner.key, &ctx.accounts.vault))]
  pub fn accept_ownership(
    ctx: Context<AcceptOwnershipContext>,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_AcceptOwnership");

    let vault = &mut ctx.accounts.vault;

    vault.owner = vault.new_owner;
    vault.new_owner = anchor_lang::system_program::ID; // Set to empty

    Ok(())
  }
}

/// Returns true if the user has root priviledge of the vault
pub fn verify_owner(user: &Pubkey, vault: &Vault) -> Result<()> {
  if *user != vault.owner {
    return Err(ErrorCode::InvalidOwner.into());
  }

  Ok(())
}

/// Returns true if the user is the newly apppointed owner of the vault
pub fn verify_new_owner(user: &Pubkey, vault: &Vault) -> Result<()> {
  if *user != vault.new_owner {
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

pub fn verify_schedule(schedule: &Schedule, expected_type: ObjType) -> Result<()> {

  let clock = Clock::get().unwrap();

  require!(schedule.obj_type == expected_type, ErrorCode::InvalidAccount);
  require!(schedule.is_active, ErrorCode::ScheduleUnavailable);
  require!(clock.unix_timestamp >= schedule.timestamp, ErrorCode::ScheduleLocked);

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
