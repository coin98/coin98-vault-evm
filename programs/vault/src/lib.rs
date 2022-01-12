pub mod constants;

use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_lang::solana_program::keccak::{
  hash,
  hashv,
};
use constants::{
  ObjType,
};
use std::convert::TryInto;

declare_id!("VT1KksX3ZybQBZNU66FrnuX5MrWZit7Pj1hB9uVXwNL");

static TOKEN_PROGRAM_ID: Pubkey = Pubkey::new_from_array([6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121, 172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0, 169]);

#[program]
mod coin98_vault {
  use super::*;

  pub fn create_vault(
    ctx: Context<CreateVaultContext>,
    _vault_path: Vec<u8>,
    _vault_nonce: u8,
    signer_nonce: u8,
  ) -> ProgramResult {
    msg!("Coin98Vault: Instruction_CreateVault");

    let root = &ctx.accounts.root;
    if !verify_root(root.key) {
      return Err(ErrorCode::InvalidOwner.into());
    }

    let vault = &mut ctx.accounts.vault;

    vault.obj_type = ObjType::Vault;
    vault.nonce = signer_nonce;

    Ok(())
  }

  pub fn set_vault(
    ctx: Context<SetVaultContext>,
    admins: Vec<Pubkey>,
    is_active: bool,
  ) -> ProgramResult {
    msg!("Coin98Vault: Instruction_SetVault");

    let root = &ctx.accounts.root;
    if !verify_root(root.key) {
      return Err(ErrorCode::InvalidOwner.into());
    }

    let vault = &mut ctx.accounts.vault;

    vault.admins = admins;
    vault.is_active = is_active;

    Ok(())
  }

  pub fn create_distribution(
    ctx: Context<CreateDistributionContext>,
    _dist_path: Vec<u8>,
    _dist_nonce: u8,
    user_count: u16,
    event_id: u64,
    timestamp: i64,
    merkle_root: [u8; 32],
    receiving_token: Pubkey,
    receiving_token_account: Pubkey,
    sending_token: Pubkey,
    sending_token_account: Pubkey,
  ) -> ProgramResult {
    msg!("Coin98Vault: Instruction_CreateDistribution");

    let root = &ctx.accounts.root;
    if !verify_root(root.key) {
      return Err(ErrorCode::InvalidOwner.into());
    }

    let distribution = &mut ctx.accounts.distribution;

    distribution.event_id = event_id;
    distribution.timestamp = timestamp;
    distribution.merkle_root = merkle_root.try_to_vec().unwrap();
    distribution.receiving_token = receiving_token;
    distribution.receiving_token_account = receiving_token_account;
    distribution.sending_token = sending_token;
    distribution.sending_token_account = sending_token_account;
    distribution.is_active = true;
    distribution.redemptions = vec![false; user_count.into()];

    Ok(())
  }

  pub fn set_distribution_status(
    ctx: Context<SetDistributionContext>,
    is_active: bool,
  ) -> ProgramResult {
    msg!("Coin98Vault: Instruction_SetDistributionStatus");

    let root = &ctx.accounts.root;
    if !verify_root(root.key) {
      return Err(ErrorCode::InvalidOwner.into());
    }

    let distribution = &mut ctx.accounts.distribution;

    distribution.is_active = is_active;

    Ok(())
  }

  pub fn withdraw_sol(
    ctx: Context<WithdrawSolContext>,
    amount: u64,
  ) -> ProgramResult {
    msg!("Coin98Vault: Instruction_WithdrawSOL");

    let root = &ctx.accounts.root;
    let root_signer = &ctx.accounts.root_signer;
    let recipient = &ctx.accounts.recipient;

    if !verify_root(root.key) {
      return Err(ErrorCode::InvalidOwner.into());
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

    let instruction = &solana_program::system_instruction::transfer(root_signer.key, recipient.key, amount);
    let seeds: &[&[_]] = &[
      &inner_seeds[0],
      &inner_seeds[1],
      &[signer_nonce],
    ];
    let result = solana_program::program::invoke_signed(&instruction, &[root_signer.clone(), recipient.clone()], &[&seeds]);
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

    let root = &ctx.accounts.root;
    let root_signer = &ctx.accounts.root_signer;
    let sender = &ctx.accounts.sender;
    let recipient = &ctx.accounts.recipient;
    let token_program = &ctx.accounts.token_program;

    if !verify_root(root.key) {
      return Err(ErrorCode::InvalidOwner.into());
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

    let data = TransferTokenParams {
      instruction: 3,
      amount: amount,
    };
    let instruction = solana_program::instruction::Instruction {
      program_id: *token_program.key,
      accounts: vec![
        solana_program::instruction::AccountMeta::new(*sender.key, false),
        solana_program::instruction::AccountMeta::new(*recipient.key, false),
        solana_program::instruction::AccountMeta::new_readonly(*root_signer.key, true),
      ],
      data: data.try_to_vec().unwrap(),
    };
    let seeds: &[&[_]] = &[
      &inner_seeds[0],
      &inner_seeds[1],
      &[signer_nonce],
    ];
    let result = solana_program::program::invoke_signed(&instruction, &[sender.clone(), recipient.clone(), root_signer.clone()], &[&seeds]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    Ok(())
  }

  pub fn withdraw_vault_sol(
    ctx: Context<WithdrawVaultSolContext>,
    amount: u64,
  ) -> ProgramResult {
    msg!("Coin98Vault: Instruction_WithdrawVaultSOL");

    let owner = &ctx.accounts.owner;
    let vault = &ctx.accounts.vault;
    let vault_signer = &ctx.accounts.vault_signer;
    let recipient = &ctx.accounts.recipient;

    if !verify_root(owner.key) || !verify_admin(owner.key, &vault) {
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

  pub fn withdraw_vault_token(
    ctx: Context<WithdrawVaultTokenContext>,
    amount: u64,
  ) -> ProgramResult {
    msg!("Coin98Vault: Instruction_WithdrawToken");

    let owner = &ctx.accounts.owner;
    let vault = &ctx.accounts.vault;
    let vault_signer = &ctx.accounts.vault_signer;
    let sender = &ctx.accounts.sender;
    let recipient = &ctx.accounts.recipient;
    let token_program = &ctx.accounts.token_program;

    if !verify_root(owner.key) || !verify_admin(owner.key, &vault) {
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

  pub fn redeem_token(
    ctx: Context<RedeemTokenContext>,
    index: u16,
    proofs: Vec<[u8; 32]>,
    receiving_amount: u64,
    sending_amount: u64,
  ) -> ProgramResult {
    msg!("Coin98Vault: Instruction_RedeemToken");

    let distribution = &ctx.accounts.distribution;
    let root_signer = &ctx.accounts.root_signer;
    let root_token0 = &ctx.accounts.root_token0;
    let user = &ctx.accounts.user;
    let user_token0 = &ctx.accounts.user_token0;
    let user_index: usize = index.into();

    let redemption_params = RedemptionParams {
      index: index,
      address: *user.key,
      receiving_amount: receiving_amount,
      sending_amount: sending_amount,
    };
    let redemption_data = redemption_params.try_to_vec().unwrap();
    let leaf = hash(&redemption_data[..]);
    let root: [u8; 32] = distribution.merkle_root.clone().try_into().unwrap();
    if !verify_proof(proofs, root, leaf.to_bytes()) {
      return Err(ErrorCode::Unauthorized.into());
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

    let distribution = &mut ctx.accounts.distribution;
    distribution.redemptions[user_index] = true;

    let data = TransferTokenParams {
      instruction: 3,
      amount: receiving_amount,
    };
    let instruction = solana_program::instruction::Instruction {
      program_id: TOKEN_PROGRAM_ID,
      accounts: vec![
        solana_program::instruction::AccountMeta::new(*root_token0.key, false),
        solana_program::instruction::AccountMeta::new(*user_token0.key, false),
        solana_program::instruction::AccountMeta::new_readonly(*root_signer.key, true),
      ],
      data: data.try_to_vec().unwrap(),
    };
    let seeds: &[&[_]] = &[
      &inner_seeds[0],
      &inner_seeds[1],
      &[signer_nonce],
    ];
    let result = solana_program::program::invoke_signed(&instruction, &[root_token0.clone(), user_token0.clone(), root_signer.clone()], &[&seeds]);
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
  ) -> ProgramResult {
    msg!("Coin98Vault: Instruction_RedeemToken");

    let distribution = &ctx.accounts.distribution;
    let root_signer = &ctx.accounts.root_signer;
    let root_token0 = &ctx.accounts.root_token0;
    let root_token1 = &ctx.accounts.root_token1;
    let user = &ctx.accounts.user;
    let user_token0 = &ctx.accounts.user_token0;
    let user_token1 = &ctx.accounts.user_token1;
    let user_index: usize = index.into();

    let redemption_params = RedemptionParams {
      index: index,
      address: *user.key,
      receiving_amount: receiving_amount,
      sending_amount: sending_amount,
    };
    let redemption_data = redemption_params.try_to_vec().unwrap();
    let leaf = hash(&redemption_data[..]);
    let root: [u8; 32] = distribution.merkle_root.clone().try_into().unwrap();
    if !verify_proof(proofs, root, leaf.to_bytes()) {
      return Err(ErrorCode::Unauthorized.into());
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

    let distribution = &mut ctx.accounts.distribution;
    distribution.redemptions[user_index] = true;

    let data = TransferTokenParams {
      instruction: 3,
      amount: sending_amount,
    };
    let instruction = solana_program::instruction::Instruction {
      program_id: TOKEN_PROGRAM_ID,
      accounts: vec![
        solana_program::instruction::AccountMeta::new(*user_token1.key, false),
        solana_program::instruction::AccountMeta::new(*root_token1.key, false),
        solana_program::instruction::AccountMeta::new_readonly(*user.key, true),
      ],
      data: data.try_to_vec().unwrap(),
    };
    let result = solana_program::program::invoke(&instruction, &[user_token1.clone(), root_token1.clone(), user.clone()]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    let data = TransferTokenParams {
      instruction: 3,
      amount: receiving_amount,
    };
    let instruction = solana_program::instruction::Instruction {
      program_id: TOKEN_PROGRAM_ID,
      accounts: vec![
        solana_program::instruction::AccountMeta::new(*root_token0.key, false),
        solana_program::instruction::AccountMeta::new(*user_token0.key, false),
        solana_program::instruction::AccountMeta::new_readonly(*root_signer.key, true),
      ],
      data: data.try_to_vec().unwrap(),
    };
    let seeds: &[&[_]] = &[
      &inner_seeds[0],
      &inner_seeds[1],
      &[signer_nonce],
    ];
    let result = solana_program::program::invoke_signed(&instruction, &[root_token0.clone(), user_token0.clone(), root_signer.clone()], &[&seeds]);
    if result.is_err() {
      return Err(ErrorCode::TransactionFailed.into());
    }

    Ok(())
  }
}

#[derive(Accounts)]
#[instruction(vault_path: Vec<u8>, vault_nonce: u8, _signer_nonce: u8)]
pub struct CreateVaultContext<'info> {

  #[account(signer)]
  pub root: AccountInfo<'info>,

  #[account(init, seeds = [
    &[93, 85, 196,  21, 227, 86, 221, 123],
    &*vault_path,
  ], bump = vault_nonce, payer = root, space = 535)]
  pub vault: Account<'info, Vault>,

  pub rent: Sysvar<'info, Rent>,

  pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SetVaultContext<'info> {

  #[account(signer)]
  pub root: AccountInfo<'info>,

  #[account(mut)]
  pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
#[instruction(dist_path: Vec<u8>, dist_nonce: u8, _signer_nonce: u8, user_count: u16)]
pub struct CreateDistributionContext<'info> {

  #[account(signer)]
  pub root: AccountInfo<'info>,

  #[account(init, seeds = [
    &[93, 85, 196,  21, 227, 86, 221, 123],
    &[128, 1, 194, 116, 57, 101, 12, 92],
    &*dist_path,
  ], bump = dist_nonce, payer = root, space = 202usize + usize::from(user_count))]
  pub distribution: Account<'info, Distribution>,

  pub rent: Sysvar<'info, Rent>,

  pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SetDistributionContext<'info> {

  #[account(signer)]
  pub root: AccountInfo<'info>,

  #[account(mut)]
  pub distribution: Account<'info, Vault>,
}

#[derive(Accounts)]
pub struct WithdrawSolContext<'info> {

  #[account(signer)]
  pub root: AccountInfo<'info>,

  #[account(mut)]
  pub root_signer: AccountInfo<'info>,

  #[account(mut)]
  pub recipient: AccountInfo<'info>,

  pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct WithdrawTokenContext<'info> {

  #[account(signer)]
  pub root: AccountInfo<'info>,

  pub root_signer: AccountInfo<'info>,

  #[account(mut)]
  pub sender: AccountInfo<'info>,

  #[account(mut)]
  pub recipient: AccountInfo<'info>,

  pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct WithdrawVaultSolContext<'info> {

  #[account(signer)]
  pub owner: AccountInfo<'info>,

  pub vault: Account<'info, Vault>,

  #[account(mut, seeds = [
    &[2, 151, 229, 53, 244,  77, 229,  7],
    vault.to_account_info().key.as_ref(),
  ], bump = vault.nonce)]
  pub vault_signer: AccountInfo<'info>,

  #[account(mut)]
  pub recipient: AccountInfo<'info>,

  pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct WithdrawVaultTokenContext<'info> {

  #[account(signer)]
  pub owner: AccountInfo<'info>,

  pub vault: Account<'info, Vault>,

  #[account(seeds = [
    &[2, 151, 229, 53, 244,  77, 229,  7],
    vault.to_account_info().key.as_ref(),
  ], bump = vault.nonce)]
  pub vault_signer: AccountInfo<'info>,

  #[account(mut)]
  pub sender: AccountInfo<'info>,

  #[account(mut)]
  pub recipient: AccountInfo<'info>,

  pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RedeemTokenContext<'info> {

  #[account(mut)]
  pub distribution: Account<'info, Distribution>,

  pub root_signer: AccountInfo<'info>,

  #[account(mut)]
  pub root_token0: AccountInfo<'info>,

  pub user: AccountInfo<'info>,

  #[account(mut)]
  pub user_token0: AccountInfo<'info>,

  pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RedeemTokenWithFeeContext<'info> {

  #[account(mut)]
  pub distribution: Account<'info, Distribution>,

  pub root_signer: AccountInfo<'info>,

  #[account(mut)]
  pub root_token0: AccountInfo<'info>,

  #[account(mut)]
  pub root_token1: AccountInfo<'info>,

  #[account(signer)]
  pub user: AccountInfo<'info>,

  #[account(mut)]
  pub user_token0: AccountInfo<'info>,

  #[account(mut)]
  pub user_token1: AccountInfo<'info>,

  pub token_program: AccountInfo<'info>,
}

#[account]
pub struct Distribution {
  pub obj_type: ObjType,
  pub event_id: u64,
  pub timestamp: i64,
  pub merkle_root: Vec<u8>,
  pub receiving_token: Pubkey,
  pub receiving_token_account: Pubkey,
  pub sending_token: Pubkey,
  pub sending_token_account: Pubkey,
  pub is_active: bool,
  pub redemptions: Vec<bool>,
}

#[account]
pub struct Vault {
  pub obj_type: ObjType,
  pub nonce: u8,
  pub admins: Vec<Pubkey>,
  pub is_active: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Default)]
pub struct RedemptionParams {
  pub index: u16,
  pub address: Pubkey,
  pub receiving_amount: u64,
  pub sending_amount: u64,
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

  #[msg("Coin98Vault: Invalid signer.")]
  InvalidSigner,

  #[msg("Coin98Vault: Transaction failed.")]
  TransactionFailed,

  #[msg("Coin98Vault: Unauthorized.")]
  Unauthorized,
}

/// Returns true if the user has root priviledge of the contract
pub fn verify_root(user: &Pubkey) -> bool {
  let user_key = user.to_string();
  let result = constants::ROOT_KEYS.iter().position(|&key| key == &user_key[..]);
  result != None
}

/// Returns true if the user is an admin of a specified vault
pub fn verify_admin(user: &Pubkey, vault: &Vault) -> bool {
  let result = vault.admins.iter().position(|&key| key == *user);
  result != None
}

/// Returns true if a `leaf` can be proved to be a part of a Merkle tree
/// defined by `root`. For this, a `proof` must be provided, containing
/// sibling hashes on the branch from the leaf to the root of the tree. Each
/// pair of leaves and each pair of pre-images are assumed to be sorted.
pub fn verify_proof(proofs: Vec<[u8; 32]>, root: [u8; 32], leaf: [u8; 32]) -> bool {
  let mut computed_hash = leaf;
  for proof in proofs.into_iter() {
    if computed_hash < proof {
      // Hash(current computed hash + current element of the proof)
      computed_hash = hashv(&[&computed_hash, &proof]).to_bytes();
    } else {
      // Hash(current element of the proof + current computed hash)
      computed_hash = hashv(&[&proof, &computed_hash]).to_bytes();
    }
  }
  // Check if the computed hash (root) is equal to the provided root
  computed_hash == root
}
