pub mod utils;
use solana_sdk::signature::{Keypair, Signer};
use solana_program_test::*;
use utils::helpers::*;
use utils::instructions::*;
use utils::wallet::*;

#[tokio::test]
async fn owner_set_vault_token() {
    println!(">>>>>>>>>> SUCCESS: owner set vault data<<<<<<<<<<<<<<<");
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

    // mint token
    let c98_mint = Keypair::new();
    create_mint(&mut context, &c98_mint, &payer_wallet.pubkey(), None).await.unwrap();
    let cusd_mint = Keypair::new();
    create_mint(&mut context, &cusd_mint, &payer_wallet.pubkey(), None).await.unwrap();

    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([authority.pubkey()]));

    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();
}

#[tokio::test]
async fn stranger_set_vault_token() {
    println!(">>>>>>>>>> FAIL: user not set vault data<<<<<<<<<<<<<<<");
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

    // mint token
    let c98_mint = Keypair::new();
    create_mint(&mut context, &c98_mint, &payer_wallet.pubkey(), None).await.unwrap();
    let cusd_mint = Keypair::new();
    create_mint(&mut context, &cusd_mint, &payer_wallet.pubkey(), None).await.unwrap();

    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&user1.pubkey(), feed_path, Vec::from([user1.pubkey()]));

    process_transaction(&mut context, &Vec::from([create_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let result = process_transaction_with_error(&mut context, &Vec::from([set_vault_data]), &Vec::from([&user1])).await;
    match result {
      Ok(_) => assert!(result.is_err()),
      Err(_) => {},
    };
}
