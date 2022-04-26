use anchor_lang::prelude::*;

pub const ROOT_KEYS: &[&str] = &[
  "EZuvvbVWibGSQpU4urZixQho2hDWtarC9bhT5NVKFpw8",
  "5UrM9csUEDBeBqMZTuuZyHRNhbRW4vQ1MgKJDrKU1U2v",
  "GnzQDYm2gvwZ8wRVmuwVAeHx5T44ovC735vDgSNhumzQ",
];

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ObjType {
  Distribution = 2u8,
  Vault = 1u8,
}
