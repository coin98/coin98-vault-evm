pub mod utils;
use anchor_lang::{solana_program::keccak::hashv};
use solana_sdk::signature::{Keypair, Signer};
use solana_program_test::*;
use utils::helpers::*;
use utils::instructions::*;
use utils::wallet::*;

#[tokio::test]
async fn transfer_ownership_to_user() {
    println!(">>>>>>>>>> SUCCESS: transfer ownership to admin <<<<<<<<<<<<<<<");
    let mut context = c98_vault_program_test().start_with_context().await;
    let payer_wallet = get_default_wallet().unwrap();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000).await.unwrap();
    let feed_path: Vec<u8> = (0..10).map(|_| { rand::random::<u8>() }).collect(); // create random path

    let admin = Keypair::new();
    airdrop(&mut context, &admin.pubkey(), 10_000_000_000).await.unwrap();

    // create user to claim
    let user1 = Keypair::new();
    airdrop(&mut context, &user1.pubkey(), 10_000_000_000).await.unwrap();
    let user2 = Keypair::new();
    airdrop(&mut context, &user2.pubkey(), 10_000_000_000).await.unwrap();

    // mint token
    let c98_mint = Keypair::new();
    create_mint(&mut context, &c98_mint, &payer_wallet.pubkey(), None).await.unwrap();
    let cusd_mint = Keypair::new();
    create_mint(&mut context, &cusd_mint, &payer_wallet.pubkey(), None).await.unwrap();

    //create vault
    let (vault_address,_) = find_vault_address(&feed_path);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([payer_wallet.pubkey()]));

    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let tranfer_ownership_data = transfer_ownership_data_instruction(&payer_wallet.pubkey(), &vault_address, &admin.pubkey());
    process_transaction(&mut context, &Vec::from([tranfer_ownership_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let accept_ownership_data = accept_ownership_data_instruction(&admin.pubkey(), &vault_address);
    process_transaction(&mut context, &Vec::from([accept_ownership_data]), &Vec::from([&admin])).await.unwrap();
}

#[tokio::test]
async fn new_owner_set_schedule() {
    println!(">>>>>>>>>> SUCCESS: validate new owner when set schedule <<<<<<<<<<<<<<<");
    let mut context = c98_vault_program_test().start_with_context().await;
    let payer_wallet = get_default_wallet().unwrap();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000).await.unwrap();
    let feed_path: Vec<u8> = (0..10).map(|_| { rand::random::<u8>() }).collect(); // create random path

    let admin = Keypair::new();
    airdrop(&mut context, &admin.pubkey(), 10_000_000_000).await.unwrap();

    // create user to claim
    let user1 = Keypair::new();
    airdrop(&mut context, &user1.pubkey(), 10_000_000_000).await.unwrap();
    let user2 = Keypair::new();
    airdrop(&mut context, &user2.pubkey(), 10_000_000_000).await.unwrap();

    // mint token
    let c98_mint = Keypair::new();
    create_mint(&mut context, &c98_mint, &payer_wallet.pubkey(), None).await.unwrap();
    let cusd_mint = Keypair::new();
    create_mint(&mut context, &cusd_mint, &payer_wallet.pubkey(), None).await.unwrap();

    let user1_c98_token_account = create_associated_token_account(&mut context, &user1.pubkey(), &c98_mint.pubkey()).await.unwrap();
    let user1_cusd_token_account = create_associated_token_account(&mut context, &user1.pubkey(), &cusd_mint.pubkey()).await.unwrap();

    //create vault
    let (vault_address,_) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([payer_wallet.pubkey()]));

    let vault_c98_token_account = create_associated_token_account(&mut context, &vault_signer_address, &c98_mint.pubkey()).await.unwrap();
    let vault_cusd_token_account = create_associated_token_account(&mut context, &vault_signer_address, &cusd_mint.pubkey()).await.unwrap();

    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let tranfer_ownership_data = transfer_ownership_data_instruction(&payer_wallet.pubkey(), &vault_address, &admin.pubkey());
    process_transaction(&mut context, &Vec::from([tranfer_ownership_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let accept_ownership_data = accept_ownership_data_instruction(&admin.pubkey(), &vault_address);
    process_transaction(&mut context, &Vec::from([accept_ownership_data]), &Vec::from([&admin])).await.unwrap();

    mint_tokens(&mut context, &c98_mint.pubkey(), &user1_c98_token_account, 1_000_000_000_000, &payer_wallet.pubkey(), Some(&payer_wallet)).await.unwrap();
    mint_tokens(&mut context, &cusd_mint.pubkey(), &user1_cusd_token_account, 1_000_000_000_000, &payer_wallet.pubkey(), Some(&payer_wallet)).await.unwrap();
    mint_tokens(&mut context, &c98_mint.pubkey(), &vault_c98_token_account, 1_000_000_000_000, &payer_wallet.pubkey(), Some(&payer_wallet)).await.unwrap();
    mint_tokens(&mut context, &cusd_mint.pubkey(), &vault_cusd_token_account, 1_000_000_000_000, &payer_wallet.pubkey(), Some(&payer_wallet)).await.unwrap();

    let user1_data = vault::state::RedemptionParams{
    index: 0,
    address: user1.pubkey(),
    receiving_amount: 1000000,
    sending_amount: 1000,
    };

    let user2_data = vault::state::RedemptionParams{
    index: 1,
    address: user2.pubkey(),
    receiving_amount: 1000000,
    sending_amount: 1000,
    };
    let hash_user1 = hash_token_redemption(user1_data);
    let hash_user2 = hash_token_redemption(user2_data);

    let merkle_root: [u8; 32] = if hash_user1 < hash_user2 { hashv(&[&hash_user1, &hash_user2]).to_bytes() }
                                                      else { hashv(&[&hash_user2, &hash_user1]).to_bytes() };
    // create schedule
    let (_schedule_address,_) = find_schedule_address(1);
    let create_schedule_data = create_schedule_data_instruction(
        &admin.pubkey(),
        &vault_address,
        2, 1, 0,
        merkle_root ,
        false,
        &c98_mint.pubkey(),
        &vault_c98_token_account,
        &cusd_mint.pubkey(),
        &vault_cusd_token_account
      );
    let set_schedule_status_data = set_schedule_status_data_instruction(&admin.pubkey(), &vault_address, 1, true);
    process_transaction(&mut context, &Vec::from([create_schedule_data, set_schedule_status_data]), &Vec::from([&admin])).await.unwrap();

    let mut user1_proofs: Vec<[u8; 32]> =  Vec::new();
    user1_proofs.push(hash_user2);
    let value : bool = vault::shared::verify_proof(user1_proofs.clone(), merkle_root, hash_user1);
    println!("{:?}", value);
    let redeem_token_data = redeem_token_data_instruction(
        &vault_address,
        &_schedule_address,
        &vault_signer_address,
        &vault_c98_token_account,
        &user1.pubkey(),
        &user1_c98_token_account,
        0,
        user1_proofs,
        1000000,
        1000,
        Vec::from([vault_cusd_token_account, user1_cusd_token_account]),
      );
    process_transaction(&mut context, &Vec::from([redeem_token_data]), &Vec::from([&user1])).await.unwrap();
}

#[tokio::test]
async fn old_owner_create_schedule() {
    println!(">>>>>>>>>> FAIL: old owner create and set schedule <<<<<<<<<<<<<<<");
    let mut context = c98_vault_program_test().start_with_context().await;
    let payer_wallet = get_default_wallet().unwrap();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000).await.unwrap();
    let feed_path: Vec<u8> = (0..10).map(|_| { rand::random::<u8>() }).collect(); // create random path

    let admin1 = Keypair::new();
    airdrop(&mut context, &admin1.pubkey(), 10_000_000_000).await.unwrap();
    let admin2 = Keypair::new();
    airdrop(&mut context, &admin2.pubkey(), 10_000_000_000).await.unwrap();

    // create user to claim
    let user1 = Keypair::new();
    airdrop(&mut context, &user1.pubkey(), 10_000_000_000).await.unwrap();
    let user2 = Keypair::new();
    airdrop(&mut context, &user2.pubkey(), 10_000_000_000).await.unwrap();

    // mint token
    let c98_mint = Keypair::new();
    create_mint(&mut context, &c98_mint, &payer_wallet.pubkey(), None).await.unwrap();
    let cusd_mint = Keypair::new();
    create_mint(&mut context, &cusd_mint, &payer_wallet.pubkey(), None).await.unwrap();

    let user1_c98_token_account = create_associated_token_account(&mut context, &user1.pubkey(), &c98_mint.pubkey()).await.unwrap();
    let user1_cusd_token_account = create_associated_token_account(&mut context, &user1.pubkey(), &cusd_mint.pubkey()).await.unwrap();

    //create vault
    let (vault_address,_) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([admin1.pubkey()]));

    let vault_c98_token_account = create_associated_token_account(&mut context, &vault_signer_address, &c98_mint.pubkey()).await.unwrap();
    let vault_cusd_token_account = create_associated_token_account(&mut context, &vault_signer_address, &cusd_mint.pubkey()).await.unwrap();

    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let tranfer_ownership_data = transfer_ownership_data_instruction(&payer_wallet.pubkey(), &vault_address, &admin2.pubkey());
    process_transaction(&mut context, &Vec::from([tranfer_ownership_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let accept_ownership_data = accept_ownership_data_instruction(&admin2.pubkey(), &vault_address);
    process_transaction(&mut context, &Vec::from([accept_ownership_data]), &Vec::from([&admin2])).await.unwrap();

    mint_tokens(&mut context, &c98_mint.pubkey(), &user1_c98_token_account, 1_000_000_000_000, &payer_wallet.pubkey(), Some(&payer_wallet)).await.unwrap();
    mint_tokens(&mut context, &cusd_mint.pubkey(), &user1_cusd_token_account, 1_000_000_000_000, &payer_wallet.pubkey(), Some(&payer_wallet)).await.unwrap();
    mint_tokens(&mut context, &c98_mint.pubkey(), &vault_c98_token_account, 1_000_000_000_000, &payer_wallet.pubkey(), Some(&payer_wallet)).await.unwrap();
    mint_tokens(&mut context, &cusd_mint.pubkey(), &vault_cusd_token_account, 1_000_000_000_000, &payer_wallet.pubkey(), Some(&payer_wallet)).await.unwrap();

    let user1_data = vault::state::RedemptionParams{
    index: 0,
    address: user1.pubkey(),
    receiving_amount: 1000000,
    sending_amount: 1000,
    };

    let user2_data = vault::state::RedemptionParams{
    index: 1,
    address: user2.pubkey(),
    receiving_amount: 1000000,
    sending_amount: 1000,
    };
    let hash_user1 = hash_token_redemption(user1_data);
    let hash_user2 = hash_token_redemption(user2_data);

    let merkle_root: [u8; 32] = if hash_user1 < hash_user2 { hashv(&[&hash_user1, &hash_user2]).to_bytes() }
                                                      else { hashv(&[&hash_user2, &hash_user1]).to_bytes() };
    // create schedule
    let (_schedule_address,_) = find_schedule_address(1);
    let create_schedule_data = create_schedule_data_instruction(
        &payer_wallet.pubkey(),
        &vault_address,
        2, 1, 0,
        merkle_root ,
        false,
        &c98_mint.pubkey(),
        &vault_c98_token_account,
        &cusd_mint.pubkey(),
        &vault_cusd_token_account
      );
    let set_schedule_status_data = set_schedule_status_data_instruction(&payer_wallet.pubkey(), &vault_address, 1, true);
    let result = process_transaction_with_error(&mut context, &Vec::from([create_schedule_data, set_schedule_status_data]), &Vec::from([&payer_wallet])).await;
     match result {
      Ok(_) => assert!(result.is_err()),
      Err(_) => {},
    };
}

#[tokio::test]
async fn new_admin_redeem_sol() {
    println!(">>>>>>>>>> SUCCESS: new admin redeem sol <<<<<<<<<<<<<<<");
    let mut context = c98_vault_program_test().start_with_context().await;
    let payer_wallet = get_default_wallet().unwrap();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000).await.unwrap();
    let feed_path: Vec<u8> = (0..10).map(|_| { rand::random::<u8>() }).collect(); // create random path

    let admin1 = Keypair::new();
    airdrop(&mut context, &admin1.pubkey(), 10_000_000_000).await.unwrap();
    let admin2 = Keypair::new();
    airdrop(&mut context, &admin2.pubkey(), 10_000_000_000).await.unwrap();

    // create user to claim
    let user1 = Keypair::new();
    airdrop(&mut context, &user1.pubkey(), 10_000_000_000).await.unwrap();
    let user2 = Keypair::new();
    airdrop(&mut context, &user2.pubkey(), 10_000_000_000).await.unwrap();

    //create vault
    let (vault_address,_) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([admin1.pubkey()]));
    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();
    airdrop(&mut context, &vault_signer_address, 10_000_000_000).await.unwrap();

    let tranfer_ownership_data = transfer_ownership_data_instruction(&payer_wallet.pubkey(), &vault_address, &admin2.pubkey());
    process_transaction(&mut context, &Vec::from([tranfer_ownership_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let accept_ownership_data = accept_ownership_data_instruction(&admin2.pubkey(), &vault_address);
    process_transaction(&mut context, &Vec::from([accept_ownership_data]), &Vec::from([&admin2])).await.unwrap();

    let admin_withdraw_sol = withdraw_sol_data_instruction(&admin2.pubkey(), &vault_address, &vault_signer_address, &payer_wallet.pubkey(), 1_000_000_000);
    process_transaction(&mut context, &Vec::from([admin_withdraw_sol]), &Vec::from([&admin2])).await.unwrap();
}

#[tokio::test]
async fn old_owner_redeem_sol() {
    println!(">>>>>>>>>> FAIL: old owner redeem sol <<<<<<<<<<<<<<<");
    let mut context = c98_vault_program_test().start_with_context().await;
    let payer_wallet = get_default_wallet().unwrap();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000).await.unwrap();
    let feed_path: Vec<u8> = (0..10).map(|_| { rand::random::<u8>() }).collect(); // create random path

    let admin1 = Keypair::new();
    airdrop(&mut context, &admin1.pubkey(), 10_000_000_000).await.unwrap();
    let admin2 = Keypair::new();
    airdrop(&mut context, &admin2.pubkey(), 10_000_000_000).await.unwrap();

    // create user to claim
    let user1 = Keypair::new();
    airdrop(&mut context, &user1.pubkey(), 10_000_000_000).await.unwrap();
    let user2 = Keypair::new();
    airdrop(&mut context, &user2.pubkey(), 10_000_000_000).await.unwrap();

    //create vault
    let (vault_address,_) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([admin1.pubkey()]));
    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();
    airdrop(&mut context, &vault_signer_address, 10_000_000_000).await.unwrap();

    let tranfer_ownership_data = transfer_ownership_data_instruction(&payer_wallet.pubkey(), &vault_address, &admin2.pubkey());
    process_transaction(&mut context, &Vec::from([tranfer_ownership_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let accept_ownership_data = accept_ownership_data_instruction(&admin2.pubkey(), &vault_address);
    process_transaction(&mut context, &Vec::from([accept_ownership_data]), &Vec::from([&admin2])).await.unwrap();

    let admin_withdraw_sol = withdraw_sol_data_instruction(&payer_wallet.pubkey(), &vault_address, &vault_signer_address, &payer_wallet.pubkey(), 1_000_000_000);
    let result = process_transaction_with_error(&mut context, &Vec::from([admin_withdraw_sol]), &Vec::from([&payer_wallet])).await;
    match result {
      Ok(_) => assert!(result.is_err()),
      Err(_) => {},
    };
}

#[tokio::test]
async fn new_owner_redeem_token() {
    println!(">>>>>>>>>> SUCCESS: new admin redeem token <<<<<<<<<<<<<<<");
    let mut context = c98_vault_program_test().start_with_context().await;
    let payer_wallet = get_default_wallet().unwrap();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000).await.unwrap();
    let feed_path: Vec<u8> = (0..10).map(|_| { rand::random::<u8>() }).collect(); // create random path

    let admin1 = Keypair::new();
    airdrop(&mut context, &admin1.pubkey(), 10_000_000_000).await.unwrap();
    let admin2 = Keypair::new();
    airdrop(&mut context, &admin2.pubkey(), 10_000_000_000).await.unwrap();

    // create user to claim
    let user1 = Keypair::new();
    airdrop(&mut context, &user1.pubkey(), 10_000_000_000).await.unwrap();
    let user2 = Keypair::new();
    airdrop(&mut context, &user2.pubkey(), 10_000_000_000).await.unwrap();

    let c98_mint = Keypair::new();
    create_mint(&mut context, &c98_mint, &payer_wallet.pubkey(), None).await.unwrap();
    let admin_c98_token_account = create_associated_token_account(&mut context, &payer_wallet.pubkey(), &c98_mint.pubkey()).await.unwrap();

    //create vault
    let (vault_address,_) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([admin1.pubkey()]));
    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let tranfer_ownership_data = transfer_ownership_data_instruction(&payer_wallet.pubkey(), &vault_address, &admin2.pubkey());
    process_transaction(&mut context, &Vec::from([tranfer_ownership_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let accept_ownership_data = accept_ownership_data_instruction(&admin2.pubkey(), &vault_address);
    process_transaction(&mut context, &Vec::from([accept_ownership_data]), &Vec::from([&admin2])).await.unwrap();

    airdrop(&mut context, &vault_signer_address, 10_000_000_000).await.unwrap();
    let vault_c98_token_account = create_associated_token_account(&mut context, &vault_signer_address, &c98_mint.pubkey()).await.unwrap();
    mint_tokens(&mut context, &c98_mint.pubkey(), &vault_c98_token_account, 1_000_000_000_000, &payer_wallet.pubkey(), Some(&payer_wallet)).await.unwrap();

    let admin_withdraw_token = withdraw_token_data_instruction(&admin2.pubkey(), &vault_address, &vault_signer_address, &vault_c98_token_account, &admin_c98_token_account, 1_000_000_000);
    process_transaction(&mut context, &Vec::from([admin_withdraw_token]), &Vec::from([&admin2])).await.unwrap();
}
#[tokio::test]
async fn old_owner_redeem_token() {
    println!(">>>>>>>>>> Success: new admin redeem token <<<<<<<<<<<<<<<");
    let mut context = c98_vault_program_test().start_with_context().await;
    let payer_wallet = get_default_wallet().unwrap();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000).await.unwrap();
    let feed_path: Vec<u8> = (0..10).map(|_| { rand::random::<u8>() }).collect(); // create random path

    let admin1 = Keypair::new();
    airdrop(&mut context, &admin1.pubkey(), 10_000_000_000).await.unwrap();
    let admin2 = Keypair::new();
    airdrop(&mut context, &admin2.pubkey(), 10_000_000_000).await.unwrap();

    // create user to claim
    let user1 = Keypair::new();
    airdrop(&mut context, &user1.pubkey(), 10_000_000_000).await.unwrap();
    let user2 = Keypair::new();
    airdrop(&mut context, &user2.pubkey(), 10_000_000_000).await.unwrap();

    let c98_mint = Keypair::new();
    create_mint(&mut context, &c98_mint, &payer_wallet.pubkey(), None).await.unwrap();
    let admin_c98_token_account = create_associated_token_account(&mut context, &payer_wallet.pubkey(), &c98_mint.pubkey()).await.unwrap();

    //create vault
    let (vault_address,_) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([admin1.pubkey()]));
    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let tranfer_ownership_data = transfer_ownership_data_instruction(&payer_wallet.pubkey(), &vault_address, &admin2.pubkey());
    process_transaction(&mut context, &Vec::from([tranfer_ownership_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let accept_ownership_data = accept_ownership_data_instruction(&admin2.pubkey(), &vault_address);
    process_transaction(&mut context, &Vec::from([accept_ownership_data]), &Vec::from([&admin2])).await.unwrap();

    airdrop(&mut context, &vault_signer_address, 10_000_000_000).await.unwrap();
    let vault_c98_token_account = create_associated_token_account(&mut context, &vault_signer_address, &c98_mint.pubkey()).await.unwrap();
    mint_tokens(&mut context, &c98_mint.pubkey(), &vault_c98_token_account, 1_000_000_000_000, &payer_wallet.pubkey(), Some(&payer_wallet)).await.unwrap();

    let admin_withdraw_token = withdraw_token_data_instruction(&payer_wallet.pubkey(), &vault_address, &vault_signer_address, &vault_c98_token_account, &admin_c98_token_account, 1_000_000_000);
    let result = process_transaction_with_error(&mut context, &Vec::from([admin_withdraw_token]), &Vec::from([&payer_wallet])).await;
    match result {
      Ok(_) => assert!(result.is_err()),
      Err(_) => {},
    };
}

