use anchor_lang::prelude::*;
use anchor_lang::solana_program;

declare_id!("VT1KksX3ZybQBZNU66FrnuX5MrWZit7Pj1hB9uVXwNL");

#[program]
mod coin98_vault {
  use super::*;

  pub fn create_vault(ctx: Context<CreateVaultContext>,
    _vault_path: Vec<u8>,
    _vault_nonce: u8,
    signer_nonce: u8,
    owner: Pubkey,
    members: Vec<Pubkey>,
  ) -> ProgramResult {
    msg!("Coin98Vault: Instruction_CreateVault");

    let vault = &mut ctx.accounts.vault;

    vault.nonce = signer_nonce;
    vault.owner = owner;
    vault.members = members;

    Ok(())
  }

  pub fn withdraw_sol(
    ctx: Context<WithdrawSolContext>,
    amount: u64,
  ) -> ProgramResult {
    msg!("Coin98Vault: Instruction_WithdrawSOL");

    let vault = &ctx.accounts.vault;
    let vault_signer = &ctx.accounts.vault_signer;
    let owner = &ctx.accounts.owner;
    let recipient = &ctx.accounts.recipient;

    let mut is_authorized = false;
    if vault.owner == *owner.key {
      is_authorized = true;
    }
    for (_i, member) in vault.members.iter().enumerate() {
      if member == owner.key {
        is_authorized = true;
      }
    }
    if !is_authorized {
      return Err(ErrorCode::InvalidOwner.into());
    }

    let instruction = &solana_program::system_instruction::transfer(vault_signer.key, recipient.key, amount);
    let seeds: &[&[_]] = &[
      &[2, 151, 229, 53, 244,  77, 229,  7],
      vault.to_account_info().key.as_ref(),
      &[vault.nonce],
    ];
    let result = solana_program::program::invoke_signed(&instruction, &[vault_signer.clone(), recipient.clone()], &[&seeds]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    Ok(())
  }

  pub fn withdraw_token(
    ctx: Context<WithdrawTokenContext>,
    amount: u64,
  ) -> ProgramResult {
    msg!("Coin98Vault: Instruction_WithdrawToken");

    let vault = &ctx.accounts.vault;
    let vault_signer = &ctx.accounts.vault_signer;
    let owner = &ctx.accounts.owner;
    let sender = &ctx.accounts.sender;
    let recipient = &ctx.accounts.recipient;
    let token_program = &ctx.accounts.token_program;

    let mut is_authorized = false;
    if vault.owner == *owner.key {
      is_authorized = true;
    }
    for (_i, member) in vault.members.iter().enumerate() {
      if member == owner.key {
        is_authorized = true;
      }
    }
    if !is_authorized {
      return Err(ErrorCode::InvalidOwner.into());
    }

    let data = TransferTokenParams {
      instruction: 3,
      amount: amount,
    };
    let instruction = solana_program::instruction::Instruction {
      program_id: *token_program.key,
      accounts: vec![
        solana_program::instruction::AccountMeta::new(*sender.key, false),
        solana_program::instruction::AccountMeta::new(*recipient.key, false),
        solana_program::instruction::AccountMeta::new_readonly(*vault_signer.key, true),
      ],
      data: data.try_to_vec().unwrap(),
    };
    let seeds: &[&[_]] = &[
      &[2, 151, 229, 53, 244,  77, 229,  7],
      vault.to_account_info().key.as_ref(),
      &[vault.nonce],
    ];
    let result = solana_program::program::invoke_signed(&instruction, &[sender.clone(), recipient.clone(), vault_signer.clone()], &[&seeds]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    Ok(())
  }

  pub fn transfer_ownership(ctx: Context<TransferOwnershipContext>,
    new_owner: Pubkey,
  ) -> ProgramResult {
    msg!("Coin98Vault: Instruction_TransferOwnership");

    let owner = &ctx.accounts.owner;
    let vault = &ctx.accounts.vault;

    if vault.owner != *owner.key {
      return Err(ErrorCode::InvalidOwner.into());
    }

    let vault = &mut ctx.accounts.vault;

    vault.new_owner = new_owner;

    Ok(())
  }

  pub fn accept_ownership(ctx: Context<AcceptOwnershipContext>,
  ) -> ProgramResult {
    msg!("Coin98Vault: Instruction_AcceptOwnership");

    let new_owner = &ctx.accounts.new_owner;
    let vault = &ctx.accounts.vault;

    if vault.new_owner != *new_owner.key {
      return Err(ErrorCode::InvalidNewOwner.into());
    }

    let vault = &mut ctx.accounts.vault;

    vault.owner = vault.new_owner;
    vault.new_owner = solana_program::system_program::ID;

    Ok(())
  }

  pub fn change_members(ctx: Context<ChangeMembersContext>,
    members: Vec<Pubkey>,
  ) -> ProgramResult {
    msg!("Coin98Vault: Instruction_ChangeMembers");

    let owner = &ctx.accounts.owner;
    let vault = &ctx.accounts.vault;

    if vault.owner != *owner.key {
      return Err(ErrorCode::InvalidOwner.into());
    }

    let vault = &mut ctx.accounts.vault;

    vault.members = members;

    Ok(())
  }
}

#[derive(Accounts)]
#[instruction(vault_path: Vec<u8>, vault_nonce: u8, _signer_nonce: u8)]
pub struct CreateVaultContext<'info> {

  #[account(signer)]
  pub payer: AccountInfo<'info>,

  #[account(init, seeds = [
    &[93, 85, 196,  21, 227, 86, 221, 123],
    &*vault_path,
  ], bump = vault_nonce, payer = payer, space = 589)]
  pub vault: Account<'info, Vault>,

  pub rent: Sysvar<'info, Rent>,

  pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct WithdrawSolContext<'info> {

  pub vault: Account<'info, Vault>,

  #[account(mut, seeds = [
    &[2, 151, 229, 53, 244,  77, 229,  7],
    vault.to_account_info().key.as_ref(),
  ], bump = vault.nonce)]
  pub vault_signer: AccountInfo<'info>,

  #[account(signer)]
  pub owner: AccountInfo<'info>,

  #[account(mut)]
  pub recipient: AccountInfo<'info>,

  pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct WithdrawTokenContext<'info> {

  pub vault: Account<'info, Vault>,

  #[account(seeds = [
    &[2, 151, 229, 53, 244,  77, 229,  7],
    vault.to_account_info().key.as_ref(),
  ], bump = vault.nonce)]
  pub vault_signer: AccountInfo<'info>,

  #[account(signer)]
  pub owner: AccountInfo<'info>,

  #[account(mut)]
  pub sender: AccountInfo<'info>,

  #[account(mut)]
  pub recipient: AccountInfo<'info>,

  pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct TransferOwnershipContext<'info> {

  #[account(mut)]
  pub vault: Account<'info, Vault>,

  #[account(signer)]
  pub owner: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct AcceptOwnershipContext<'info> {

  #[account(mut)]
  pub vault: Account<'info, Vault>,

  #[account(signer)]
  pub new_owner: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ChangeMembersContext<'info> {

  #[account(mut)]
  pub vault: Account<'info, Vault>,

  #[account(signer)]
  pub owner: AccountInfo<'info>,
}

#[account]
pub struct Vault {
  pub nonce: u8,
  pub owner: Pubkey,
  pub new_owner: Pubkey,
  pub members: Vec<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Default)]
pub struct TransferTokenParams {
  pub instruction: u8,
  pub amount: u64,
}

#[error]
pub enum ErrorCode {

  #[msg("Coin98Vault: Not an owner.")]
  InvalidOwner,

  #[msg("Coin98Vault: Not new owner.")]
  InvalidNewOwner,

  #[msg("Coin98Vault: Transaction failed.")]
  TransactionFailed,
}
