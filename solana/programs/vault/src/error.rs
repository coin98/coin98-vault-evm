use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {

  #[msg("Coin98Vault: Invalid account")]
  InvalidAccount,

  #[msg("Coin98Vault: Invalid input")]
  InvalidInput,

  #[msg("Coin98Vault: Redeemed.")]
  Redeemed,

  #[msg("Coin98Vault: Schedule locked.")]
  ScheduleLocked,

  #[msg("Coin98Vault: Schedule unavailable.")]
  ScheduleUnavailable,

  #[msg("Coin98Vault: Unauthorized.")]
  Unauthorized,
}

