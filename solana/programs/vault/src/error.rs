use anchor_lang::prelude::*;

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

