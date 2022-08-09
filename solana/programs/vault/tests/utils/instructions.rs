use anchor_lang::*;
use anchor_lang::solana_program::system_program;
use solana_program::instruction::{Instruction, AccountMeta};
use solana_sdk::pubkey::Pubkey;

const CREATE_VAULT_SEEDS: &[u8] = &[93, 85, 196,  21, 227, 86, 221, 123];
const CREATE_SCHEDULE_SEEDS: &[u8]= &[244, 131, 10, 29, 174, 41, 128, 68];
const REDEEM_VAULT_SIGNER_SEEDS: &[u8]= &[2, 151, 229, 53, 244,  77, 229,  7];
pub const TOKEN_PROGRAM_ID: Pubkey = Pubkey::new_from_array([6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121, 172, 28, 180, 133, 237, 95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0, 169]);
pub fn find_vault_address(path: &Vec<u8>) -> (Pubkey, u8) {
    let vault_seeds = &[CREATE_VAULT_SEEDS, path];
    Pubkey::find_program_address(vault_seeds, &vault::id())
}

pub fn find_schedule_address(event_id: u64) -> (Pubkey, u8) {
    let vault_seeds = &[CREATE_SCHEDULE_SEEDS, &vault::shared::derive_event_id(event_id)];
    Pubkey::find_program_address(vault_seeds, &vault::id())
}
pub fn find_vault_signer_address(vault_address:  &Pubkey) -> (Pubkey, u8) {
    let vault_seeds = &[REDEEM_VAULT_SIGNER_SEEDS, vault_address.as_ref()];
    Pubkey::find_program_address(vault_seeds, &vault::id())
}
// pub fn find_root_signer_address() -> (Pubkey, u8) {
//     let seeds = &[ROOT_SIGNER_SEED_1, ROOT_SIGNER_SEED_2];
//     Pubkey::find_program_address(seeds, &coin98_dollar_mint_burn::id())
// }

pub fn create_vault_data_instruction(
    owner: &Pubkey,
    path: Vec<u8>,
    signer_nonce: u8,
)-> Instruction{
    let (vault, _): (Pubkey, u8) = find_vault_address(&path);
    let accounts = vault::accounts::CreateVaultContext{
        owner: *owner,
        vault,
        system_program: system_program::id()
    }.to_account_metas(None);

    let data = vault::instruction::CreateVault {
        _vault_path: path,
        signer_nonce: signer_nonce
    }.data();


    let instruction = Instruction {
        program_id: vault::id(),
        data,
        accounts
    };

    instruction
}

pub fn set_vault_data_instruction(
    owner: &Pubkey,
    path: Vec<u8>,
    adimins: Vec<Pubkey>)-> Instruction{
    let (vault, _): (Pubkey, u8) = find_vault_address(&path);
    let accounts = vault::accounts::SetVaultContext {
        owner: *owner,
        vault: vault,
    }.to_account_metas(None);
    let data = vault::instruction::SetVault{
        admins:  adimins
    }.data();
    let instruction = Instruction {
        program_id: vault::id(),
        data,
        accounts
    };

    instruction
}

pub fn create_schedule_data_instruction(
    admin: &Pubkey,
    vault: &Pubkey,
    user_count: u16,
    event_id: u64,
    timestamp: i64,
    merkle_root: [u8; 32],
    receiving_token_mint: &Pubkey,
    receiving_token_account: &Pubkey,
    sending_token_mint: &Pubkey,
    sending_token_account: &Pubkey,
)->Instruction{
    let(schedule, _): (Pubkey, u8) = find_schedule_address(event_id);
    let accounts = vault::accounts::CreateScheduleContext {
        admin: *admin,
        vault: *vault,
        schedule: schedule,
        system_program: system_program::id()
    }.to_account_metas(None);

    let data = vault::instruction::CreateSchedule{
        user_count: user_count,
        event_id: event_id,
        timestamp: timestamp,
        merkle_root: merkle_root,
        receiving_token_mint: *receiving_token_mint,
        receiving_token_account: *receiving_token_account,
        sending_token_mint: *sending_token_mint,
        sending_token_account: *sending_token_account,
    }.data();

    let instruction = Instruction {
        program_id: vault::id(),
        data,
        accounts
    };

    instruction
}

pub fn set_schedule_status_data_instruction( 
    admin: &Pubkey,
    vault: &Pubkey,
    event_id: u64,
    is_active: bool,)->Instruction{
    let(schedule, _): (Pubkey, u8) = find_schedule_address(event_id);

    let accounts = vault::accounts::SetScheduleContext {
        admin: *admin,
        vault: *vault,
        schedule: schedule,
    }.to_account_metas(None);

    let data = vault::instruction::SetScheduleStatus{
        is_active: is_active
    }.data();
    let instruction = Instruction {
        program_id: vault::id(),
        data,
        accounts
    };

    instruction
}

pub fn redeem_token_data_instruction(
    vault: &Pubkey,
    schedule: &Pubkey,
    vault_signer: &Pubkey,
    vault_token0: &Pubkey,
    user: &Pubkey,
    user_token0: &Pubkey,
    index: u16,
    proofs: Vec<[u8; 32]>,
    receiving_amount: u64,
    sending_amount: u64,
    )->Instruction{

    let accounts = vault::accounts::RedeemTokenContext {
        vault: *vault,
        schedule: *schedule,
        vault_signer: *vault_signer,
        vault_token0: *vault_token0,
        user: *user,
        user_token0: *user_token0,
        token_program: TOKEN_PROGRAM_ID,
    }.to_account_metas(None);

    let data = vault::instruction::RedeemToken{
        index: index,
        proofs: proofs,
        receiving_amount: receiving_amount,
        sending_amount: sending_amount
    }.data();
    let instruction = Instruction {
        program_id: vault::id(),
        data,
        accounts
    };

    instruction

}