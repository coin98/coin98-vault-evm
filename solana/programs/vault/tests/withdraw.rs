pub mod utils;
use solana_sdk::signature::{Keypair, Signer};
use solana_program_test::*;
use utils::helpers::*;
use utils::instructions::*;
use utils::wallet::*;

#[tokio::test]
async fn owner_redeem_sol() {
    println!(">>>>>>>>>> SUCCESS: owner redeem sol <<<<<<<<<<<<<<<");
    let mut context = c98_vault_program_test().start_with_context().await;
    let payer_wallet = get_default_wallet().unwrap();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000).await.unwrap();
    let feed_path: Vec<u8> = (0..10).map(|_| { rand::random::<u8>() }).collect(); // create random path

    let authority = Keypair::new();
    airdrop(&mut context, &authority.pubkey(), 10_000_000_000).await.unwrap();

    // create user to claim
    let user1 = Keypair::new();
    airdrop(&mut context, &user1.pubkey(), 10_000_000_000).await.unwrap();
    let user2 = Keypair::new();
    airdrop(&mut context, &user2.pubkey(), 10_000_000_000).await.unwrap();

    //create vault
    let (vault_address,_) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([authority.pubkey()]));
    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();
    airdrop(&mut context, &vault_signer_address, 10_000_000_000).await.unwrap();

    let admin_withdraw_sol = withdraw_sol_data_instruction(&payer_wallet.pubkey(), &vault_address, &vault_signer_address, &payer_wallet.pubkey(), 1_000_000_000);
    process_transaction(&mut context, &Vec::from([admin_withdraw_sol]), &Vec::from([&payer_wallet])).await.unwrap();
}
#[tokio::test]
async fn owner_redeem_token() {
    println!(">>>>>>>>>> SUCCESS: owner redeem token <<<<<<<<<<<<<<<");
    let mut context = c98_vault_program_test().start_with_context().await;
    let payer_wallet = get_default_wallet().unwrap();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000).await.unwrap();
    let feed_path: Vec<u8> = (0..10).map(|_| { rand::random::<u8>() }).collect(); // create random path

    let authority = Keypair::new();
    airdrop(&mut context, &authority.pubkey(), 10_000_000_000).await.unwrap();

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
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([authority.pubkey()]));
    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

    airdrop(&mut context, &vault_signer_address, 10_000_000_000).await.unwrap();
    let vault_c98_token_account = create_associated_token_account(&mut context, &vault_signer_address, &c98_mint.pubkey()).await.unwrap();
    mint_tokens(&mut context, &c98_mint.pubkey(), &vault_c98_token_account, 1_000_000_000_000, &payer_wallet.pubkey(), Some(&payer_wallet)).await.unwrap();

    let admin_withdraw_token = withdraw_token_data_instruction(&payer_wallet.pubkey(), &vault_address, &vault_signer_address, &vault_c98_token_account, &admin_c98_token_account, 1_000_000_000);
    process_transaction(&mut context, &Vec::from([admin_withdraw_token]), &Vec::from([&payer_wallet])).await.unwrap();
}

#[tokio::test]
async fn user_redeem_sol() {
    println!(">>>>>>>>>> FAIL: user not admin redeem sol <<<<<<<<<<<<<<<");
    let mut context = c98_vault_program_test().start_with_context().await;
    let payer_wallet = get_default_wallet().unwrap();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000).await.unwrap();
    let feed_path: Vec<u8> = (0..10).map(|_| { rand::random::<u8>() }).collect(); // create random path

    let authority = Keypair::new();
    airdrop(&mut context, &authority.pubkey(), 10_000_000_000).await.unwrap();

    // create user to claim
    let user1 = Keypair::new();
    airdrop(&mut context, &user1.pubkey(), 10_000_000_000).await.unwrap();
    let user2 = Keypair::new();
    airdrop(&mut context, &user2.pubkey(), 10_000_000_000).await.unwrap();

    //create vault
    let (vault_address,_) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([authority.pubkey()]));
    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();
    airdrop(&mut context, &vault_signer_address, 10_000_000_000).await.unwrap();

    let user_withdraw_sol = withdraw_sol_data_instruction(&user1.pubkey(), &vault_address, &vault_signer_address, &user1.pubkey(), 1_000_000_000);
    let result = process_transaction_with_error(&mut context, &Vec::from([user_withdraw_sol]), &Vec::from([&user1])).await;
    match result {
      Ok(_) => assert!(result.is_err()),
      Err(_) => {},
    };
}

#[tokio::test]
async fn user_redeem_token() {
    println!(">>>>>>>>>> FAIL: user not admin redeem token <<<<<<<<<<<<<<<");
    let mut context = c98_vault_program_test().start_with_context().await;
    let payer_wallet = get_default_wallet().unwrap();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000).await.unwrap();
    let feed_path: Vec<u8> = (0..10).map(|_| { rand::random::<u8>() }).collect(); // create random path

    let authority = Keypair::new();
    airdrop(&mut context, &authority.pubkey(), 10_000_000_000).await.unwrap();

    // create user to claim
    let user1 = Keypair::new();
    airdrop(&mut context, &user1.pubkey(), 10_000_000_000).await.unwrap();
    let user2 = Keypair::new();
    airdrop(&mut context, &user2.pubkey(), 10_000_000_000).await.unwrap();

    let c98_mint = Keypair::new();
    create_mint(&mut context, &c98_mint, &payer_wallet.pubkey(), None).await.unwrap();
    let user1_c98_token_account = create_associated_token_account(&mut context, &user1.pubkey(), &c98_mint.pubkey()).await.unwrap();

    //create vault
    let (vault_address,_) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([authority.pubkey()]));
    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

    airdrop(&mut context, &vault_signer_address, 10_000_000_000).await.unwrap();
    let vault_c98_token_account = create_associated_token_account(&mut context, &vault_signer_address, &c98_mint.pubkey()).await.unwrap();
    mint_tokens(&mut context, &c98_mint.pubkey(), &vault_c98_token_account, 1_000_000_000_000, &payer_wallet.pubkey(), Some(&payer_wallet)).await.unwrap();

    let user1_withdraw_token = withdraw_token_data_instruction(&user1.pubkey(), &vault_address, &vault_signer_address, &vault_c98_token_account, &user1_c98_token_account, 1_000_000_000);
    let result = process_transaction_with_error(&mut context, &Vec::from([user1_withdraw_token]), &Vec::from([&user1])).await;
    match result {
      Ok(_) => assert!(result.is_err()),
      Err(_) => {},
    };
}
