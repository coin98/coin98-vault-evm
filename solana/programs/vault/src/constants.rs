use anchor_lang::prelude::*;

pub const ROOT_KEYS: &[&str] = &[
  "5UrM9csUEDBeBqMZTuuZyHRNhbRW4vQ1MgKJDrKU1U2v",
];

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ObjType {
  Distribution = 2u8,
  Vault = 1u8,
}
