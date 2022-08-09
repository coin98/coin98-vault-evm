use solana_program::{
  account_info::{
    AccountInfo
  },
  program::{
    invoke,
    invoke_signed,
  },
  program_error::{
    ProgramError,
  },
  system_instruction::{
    transfer,
  },
};

pub fn transfer_lamport<'a>(
  owner: &AccountInfo<'a>,
  recipient: &AccountInfo<'a>,
  amount: u64,
  signer_seeds: &[&[&[u8]]],
) -> std::result::Result<(), ProgramError> {

  let instruction = transfer(
    &owner.key,
    &recipient.key,
    amount,
  );
  if signer_seeds.len() == 0 {
    invoke(&instruction, &[owner.clone(), recipient.clone()])
  }
  else {
    invoke_signed(&instruction, &[owner.clone(), recipient.clone()], &signer_seeds)
  }
}
