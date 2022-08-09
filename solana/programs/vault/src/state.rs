use anchor_lang::prelude::*;

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ObjType {
  Distribution = 2u8,
  DistributionMulti = 3u8,
  Vault = 1u8,
}

#[account]
pub struct Schedule {
  pub obj_type: ObjType,
  pub nonce: u8,
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
    1 + 1 + 8 + 32 + 8 + 36 + 32 + 32 + 32 + 32 + 1 + (4 + usize::from(user_count))
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
    1 + 1 + 32 + 32 + (4 + 32 * 16)
  }
}

#[derive(AnchorSerialize, AnchorDeserialize, Default)]
pub struct RedemptionParams {
  pub index: u16,
  pub address: Pubkey,
  pub receiving_amount: u64,
  pub sending_amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Default)]
pub struct RedemptionMultiParams {
  pub index: u16,
  pub address: Pubkey,
  pub receiving_token_mint: Pubkey,
  pub receiving_amount: u64,
  pub sending_amount: u64,
}
