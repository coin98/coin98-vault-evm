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

  #[access_control(verify_root(&ctx.accounts.root.key))]
  pub fn create_vault(
    ctx: Context<CreateVaultContext>,
    _vault_path: Vec<u8>,
    _vault_nonce: u8,
    signer_nonce: u8,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_CreateVault");

    let vault = &mut ctx.accounts.vault;

    vault.obj_type = ObjType::Vault;
    vault.nonce = signer_nonce;

    Ok(())
  }

  #[access_control(verify_root(&ctx.accounts.root.key))]
  pub fn set_vault(
    ctx: Context<SetVaultContext>,
    admins: Vec<Pubkey>,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_SetVault");

    let vault = &mut ctx.accounts.vault;

    vault.admins = admins;

    Ok(())
  }

  #[access_control(verify_root(&ctx.accounts.root.key))]
  pub fn create_schedule(
    ctx: Context<CreateScheduleContext>,
    _sched_path: Vec<u8>,
    _sched_nonce: u8,
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

    let schedule = &mut ctx.accounts.schedule;

    schedule.event_id = event_id;
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

  #[access_control(verify_root(&ctx.accounts.root.key))]
  pub fn set_schedule_status(
    ctx: Context<SetScheduleContext>,
    is_active: bool,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_SetScheduleStatus");

    let schedule = &mut ctx.accounts.schedule;

    schedule.is_active = is_active;

    Ok(())
  }

  #[access_control(verify_root(&ctx.accounts.root.key))]
  pub fn withdraw_sol(
    ctx: Context<WithdrawSolContext>,
    amount: u64,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_WithdrawSOL");

    let root_signer = &ctx.accounts.root_signer;
    let recipient = &ctx.accounts.recipient;

    let inner_seeds: &[&[u8]] = &[
      &[2, 151, 229, 53, 244, 77, 229, 7],
      &[128, 1, 194, 116, 57, 101, 12, 92],
    ];
    let (signer_address, signer_nonce) = Pubkey::find_program_address(
      &inner_seeds,
      ctx.program_id,
    );
    if *root_signer.key != signer_address {
      return Err(ErrorCode::InvalidSigner.into());
    }

    let seeds: &[&[_]] = &[
      &inner_seeds[0],
      &inner_seeds[1],
      &[signer_nonce],
    ];
    let result = shared::transfer_lamports(&root_signer, &recipient, amount, &[&seeds]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    Ok(())
  }

  #[access_control(verify_root(&ctx.accounts.root.key))]
  pub fn withdraw_token(
    ctx: Context<WithdrawTokenContext>,
    amount: u64,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_WithdrawToken");

    let root_signer = &ctx.accounts.root_signer;
    let sender = &ctx.accounts.sender;
    let recipient = &ctx.accounts.recipient;

    let inner_seeds: &[&[u8]] = &[
      &[2, 151, 229, 53, 244, 77, 229, 7],
      &[128, 1, 194, 116, 57, 101, 12, 92],
    ];
    let (signer_address, signer_nonce) = Pubkey::find_program_address(
      &inner_seeds,
      ctx.program_id,
    );
    if *root_signer.key != signer_address {
      return Err(ErrorCode::InvalidSigner.into());
    }

    let seeds: &[&[_]] = &[
      &inner_seeds[0],
      &inner_seeds[1],
      &[signer_nonce],
    ];
    let result = shared::transfer_token(&root_signer, &sender, &recipient, amount, &[&seeds]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    Ok(())
  }

  #[access_control(verify_admin(&ctx.accounts.owner.key, &ctx.accounts.vault))]
  pub fn withdraw_vault_sol(
    ctx: Context<WithdrawVaultSolContext>,
    amount: u64,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_WithdrawVaultSOL");

    let vault = &ctx.accounts.vault;
    let vault_signer = &ctx.accounts.vault_signer;
    let recipient = &ctx.accounts.recipient;

    let seeds: &[&[_]] = &[
      &[2, 151, 229, 53, 244,  77, 229,  7],
      vault.to_account_info().key.as_ref(),
      &[vault.nonce],
    ];
    let result = shared::transfer_lamports(&vault_signer, &recipient, amount, &[&seeds]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    Ok(())
  }

  #[access_control(verify_admin(&ctx.accounts.owner.key, &ctx.accounts.vault))]
  pub fn withdraw_vault_token(
    ctx: Context<WithdrawVaultTokenContext>,
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
      &[vault.nonce],
    ];
    let result = shared::transfer_token(&vault_signer, &sender, &recipient, amount, &[&seeds]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    Ok(())
  }

  pub fn redeem_token(
    ctx: Context<RedeemTokenContext>,
    index: u16,
    proofs: Vec<[u8; 32]>,
    receiving_amount: u64,
    sending_amount: u64,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_RedeemToken");

    let schedule = &ctx.accounts.schedule;
    let root_signer = &ctx.accounts.root_signer;
    let root_token0 = &ctx.accounts.root_token0;
    let user = &ctx.accounts.user;
    let user_token0 = &ctx.accounts.user_token0;
    let clock = Clock::get().unwrap();
    let user_index: usize = index.into();

    if !schedule.is_active {
      return Err(ErrorCode::ScheduleUnavailable.into());
    }
    if clock.unix_timestamp < schedule.timestamp {
      return Err(ErrorCode::ScheduleLocked.into());
    }

    let redemption_params = RedemptionParams {
      index: index,
      address: *user.key,
      receiving_amount: receiving_amount,
      sending_amount: sending_amount,
    };
    let redemption_data = redemption_params.try_to_vec().unwrap();
    let leaf = hash(&redemption_data[..]);
    let root: [u8; 32] = schedule.merkle_root.clone().try_into().unwrap();
    if !shared::verify_proof(proofs, root, leaf.to_bytes()) {
      return Err(ErrorCode::Unauthorized.into());
    }
    if schedule.redemptions[user_index] {
      return Err(ErrorCode::Redeemed.into());
    }
    let inner_seeds: &[&[u8]] = &[
      &[2, 151, 229, 53, 244, 77, 229, 7],
      &[128, 1, 194, 116, 57, 101, 12, 92],
    ];
    let (signer_address, signer_nonce) = Pubkey::find_program_address(
      &inner_seeds,
      ctx.program_id,
    );

    if *root_signer.key != signer_address {
      return Err(ErrorCode::InvalidSigner.into());
    }
    if *root_token0.key != schedule.receiving_token_account {
      return Err(ErrorCode::InvalidTokenAccount.into());
    }
    if schedule.sending_token_mint != solana_program::system_program::ID && sending_amount > 0 {
      return Err(ErrorCode::FeeRequired.into());
    }

    let schedule = &mut ctx.accounts.schedule;
    schedule.redemptions[user_index] = true;

    let seeds: &[&[_]] = &[
      &inner_seeds[0],
      &inner_seeds[1],
      &[signer_nonce],
    ];
    let result = shared::transfer_token(&root_signer, &root_token0, &user_token0, receiving_amount, &[&seeds]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    Ok(())
  }

  pub fn redeem_token_with_fee(
    ctx: Context<RedeemTokenWithFeeContext>,
    index: u16,
    proofs: Vec<[u8; 32]>,
    receiving_amount: u64,
    sending_amount: u64,
  ) -> Result<()> {
    msg!("Coin98Vault: Instruction_RedeemTokenWithFee");

    let schedule = &ctx.accounts.schedule;
    let root_signer = &ctx.accounts.root_signer;
    let root_token0 = &ctx.accounts.root_token0;
    let root_token1 = &ctx.accounts.root_token1;
    let user = &ctx.accounts.user;
    let user_token0 = &ctx.accounts.user_token0;
    let user_token1 = &ctx.accounts.user_token1;
    let clock = Clock::get().unwrap();
    let user_index: usize = index.into();

    if !schedule.is_active {
      return Err(ErrorCode::ScheduleUnavailable.into());
    }
    if clock.unix_timestamp < schedule.timestamp {
      return Err(ErrorCode::ScheduleLocked.into());
    }

    let redemption_params = RedemptionParams {
      index: index,
      address: *user.key,
      receiving_amount: receiving_amount,
      sending_amount: sending_amount,
    };
    let redemption_data = redemption_params.try_to_vec().unwrap();
    let leaf = hash(&redemption_data[..]);
    let root: [u8; 32] = schedule.merkle_root.clone().try_into().unwrap();
    if !shared::verify_proof(proofs, root, leaf.to_bytes()) {
      return Err(ErrorCode::Unauthorized.into());
    }
    if schedule.redemptions[user_index] {
      return Err(ErrorCode::Redeemed.into());
    }
    let inner_seeds: &[&[u8]] = &[
      &[2, 151, 229, 53, 244, 77, 229, 7],
      &[128, 1, 194, 116, 57, 101, 12, 92],
    ];
    let (signer_address, signer_nonce) = Pubkey::find_program_address(
      &inner_seeds,
      ctx.program_id,
    );
    if *root_signer.key != signer_address {
      return Err(ErrorCode::InvalidSigner.into());
    }
    if *root_token0.key != schedule.receiving_token_account {
      return Err(ErrorCode::InvalidTokenAccount.into());
    }
    if *root_token1.key != schedule.sending_token_account {
      return Err(ErrorCode::InvalidTokenAccount.into());
    }

    let schedule = &mut ctx.accounts.schedule;
    schedule.redemptions[user_index] = true;

    let result = shared::transfer_token(&user, &user_token1, &root_token1, sending_amount, &[]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    let seeds: &[&[_]] = &[
      &inner_seeds[0],
      &inner_seeds[1],
      &[signer_nonce],
    ];
    let result = shared::transfer_token(&root_signer, &root_token0, &user_token0, receiving_amount, &[&seeds]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    Ok(())
  }
}

#[derive(Accounts)]
#[instruction(vault_path: Vec<u8>, _vault_nonce: u8, _signer_nonce: u8)]
pub struct CreateVaultContext<'info> {

  /// CHECK: program owner, verified using #access_control
  #[account(signer, mut)]
  pub root: AccountInfo<'info>,

  #[account(
    init,
    seeds = [
      &[93, 85, 196,  21, 227, 86, 221, 123],
      &*vault_path,
    ],
    bump,
    payer = root,
    space = 535
  )]
  pub vault: Account<'info, Vault>,

  /// CHECK: Solana native System Program
  #[account(
    constraint = shared::is_system_program(&system_program)
  )]
  pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SetVaultContext<'info> {

  /// CHECK: program owner, verified using #access_control
  #[account(signer)]
  pub root: AccountInfo<'info>,

  #[account(mut)]
  pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
#[instruction(schedule_path: Vec<u8>, _schedule_nonce: u8, user_count: u16)]
pub struct CreateScheduleContext<'info> {

  /// CHECK: program owner, verified using #access_control
  #[account(signer, mut)]
  pub root: AccountInfo<'info>,

  #[account(
    init,
    seeds = [
      &[244, 131, 10, 29, 174, 41, 128, 68],
      &*schedule_path,
    ],
    bump,
    payer = root,
    space = 202usize + usize::from(user_count)
  )]
  pub schedule: Account<'info, Schedule>,

  /// CHECK: Solana native System Program
  #[account(
    constraint = shared::is_system_program(&system_program)
  )]
  pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SetScheduleContext<'info> {

  /// CHECK: program owner, verified using #access_control
  #[account(signer)]
  pub root: AccountInfo<'info>,

  #[account(mut)]
  pub schedule: Account<'info, Schedule>,
}

#[derive(Accounts)]
pub struct WithdrawSolContext<'info> {

  /// CHECK: program owner, verified using #access_control
  #[account(signer)]
  pub root: AccountInfo<'info>,

  /// CHECK: PDA to hold program's assets
  #[account(mut)]
  pub root_signer: AccountInfo<'info>,

  /// CHECK: User account to receive SOL
  #[account(mut)]
  pub recipient: AccountInfo<'info>,

  /// CHECK: Solana native System Program
  #[account(
    constraint = shared::is_system_program(&system_program)
  )]
  pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct WithdrawTokenContext<'info> {

  /// CHECK: program owner, verified using #access_control
  #[account(signer)]
  pub root: AccountInfo<'info>,

  /// CHECK: PDA to hold program's assets
  pub root_signer: AccountInfo<'info>,

  #[account(mut)]
  pub sender: AccountInfo<'info>,

  #[account(mut)]
  pub recipient: AccountInfo<'info>,

  /// CHECK: Solana native Token Program
  #[account(
    constraint = shared::is_token_program(&token_program)
  )]
  pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct WithdrawVaultSolContext<'info> {

  /// CHECK: program owner, verified using #access_control
  #[account(signer)]
  pub owner: AccountInfo<'info>,

  pub vault: Account<'info, Vault>,

  /// CHECK: PDA to hold vault's assets
  #[account(
    mut,
    seeds = [
      &[2, 151, 229, 53, 244,  77, 229,  7],
      vault.to_account_info().key.as_ref(),
    ],
    bump = vault.nonce
  )]
  pub vault_signer: AccountInfo<'info>,

  #[account(mut)]
  pub recipient: AccountInfo<'info>,

  /// CHECK: Solana native System Program
  #[account(
    constraint = shared::is_system_program(&system_program)
  )]
  pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct WithdrawVaultTokenContext<'info> {

  /// CHECK: program owner, verified using #access_control
  #[account(signer)]
  pub owner: AccountInfo<'info>,

  pub vault: Account<'info, Vault>,

  /// CHECK: PDA to hold vault's assets
  #[account(
    seeds = [
      &[2, 151, 229, 53, 244,  77, 229,  7],
      vault.to_account_info().key.as_ref(),
    ],
    bump = vault.nonce
  )]
  pub vault_signer: AccountInfo<'info>,

  #[account(mut)]
  pub sender: AccountInfo<'info>,

  #[account(mut)]
  pub recipient: AccountInfo<'info>,

  /// CHECK: Solana native Token Program
  #[account(
    constraint = shared::is_token_program(&token_program)
  )]
  pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RedeemTokenContext<'info> {

  #[account(mut)]
  pub schedule: Account<'info, Schedule>,

  /// CHECK: PDA to hold program's assets
  pub root_signer: AccountInfo<'info>,

  #[account(mut)]
  pub root_token0: AccountInfo<'info>,

  /// CHECK: User account eligible to redeem token
  pub user: AccountInfo<'info>,

  #[account(mut)]
  pub user_token0: AccountInfo<'info>,

  /// CHECK: Solana native Token Program
  #[account(
    constraint = shared::is_token_program(&token_program)
  )]
  pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RedeemTokenWithFeeContext<'info> {

  #[account(mut)]
  pub schedule: Account<'info, Schedule>,

  /// CHECK: PDA to hold program's assets
  pub root_signer: AccountInfo<'info>,

  #[account(mut)]
  pub root_token0: AccountInfo<'info>,

  #[account(mut)]
  pub root_token1: AccountInfo<'info>,

  /// CHECK: User account eligible to redeem token
  #[account(signer)]
  pub user: AccountInfo<'info>,

  #[account(mut)]
  pub user_token0: AccountInfo<'info>,

  #[account(mut)]
  pub user_token1: AccountInfo<'info>,

  /// CHECK: Solana native Token Program
  #[account(
    constraint = shared::is_token_program(&token_program)
  )]
  pub token_program: AccountInfo<'info>,
}

#[account]
pub struct Schedule {
  pub obj_type: ObjType,
  pub event_id: u64,
  pub timestamp: i64,
  pub merkle_root: Vec<u8>,
  pub receiving_token_mint: Pubkey,
  pub receiving_token_account: Pubkey,
  pub sending_token_mint: Pubkey,
  pub sending_token_account: Pubkey,
  pub is_active: bool,
  pub redemptions: Vec<bool>,
}

#[account]
pub struct Vault {
  pub obj_type: ObjType,
  pub nonce: u8,
  pub admins: Vec<Pubkey>,
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

/// Returns true if the user is an admin of a specified vault
pub fn verify_admin(user: &Pubkey, vault: &Vault) -> Result<()> {
  let user_key = user.to_string();
  let result = constants::ROOT_KEYS.iter().position(|&key| key == &user_key[..]);
  if result != None {
    return Ok(());
  }

  let result = vault.admins.iter().position(|&key| key == *user);
  if result == None {
    return Err(ErrorCode::InvalidOwner.into());
  }

  Ok(())
}

/// Returns true if the user has root priviledge of the contract
pub fn verify_root(user: &Pubkey) -> Result<()> {
  let user_key = user.to_string();
  let result = constants::ROOT_KEYS.iter().position(|&key| key == &user_key[..]);
  if result == None {
    return Err(ErrorCode::InvalidOwner.into());
  }

  Ok(())
}
