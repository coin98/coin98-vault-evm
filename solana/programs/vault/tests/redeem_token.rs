pub mod utils;
use anchor_lang::{solana_program::keccak::hashv};
use solana_sdk::signature::{Keypair, Signer};
use solana_program_test::*;
use utils::helpers::*;
use utils::instructions::*;
use utils::wallet::*;

#[tokio::test]
async fn user_redeem_token() {
    println!(">>>>>>>>>> SUCCESS: user in schedule redeem token <<<<<<<<<<<<<<<");
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

    let user1_c98_token_account = create_associated_token_account(&mut context, &user1.pubkey(), &c98_mint.pubkey()).await.unwrap();
    let user1_cusd_token_account = create_associated_token_account(&mut context, &user1.pubkey(), &cusd_mint.pubkey()).await.unwrap();

    //create vault
    let (vault_address,_) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([authority.pubkey()]));

    let vault_c98_token_account = create_associated_token_account(&mut context, &vault_signer_address, &c98_mint.pubkey()).await.unwrap();
    let vault_cusd_token_account = create_associated_token_account(&mut context, &vault_signer_address, &cusd_mint.pubkey()).await.unwrap();

    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

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
    process_transaction(&mut context, &Vec::from([create_schedule_data, set_schedule_status_data]), &Vec::from([&payer_wallet])).await.unwrap();

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
async fn stranger_redeem_token() {
    println!(">>>>>>>>>> FAIL: user not in schedule redeem token  <<<<<<<<<<<<<<<");
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
    let stranger = Keypair::new();
    airdrop(&mut context, &user1.pubkey(), 10_000_000_000).await.unwrap();
    // mint token
    let c98_mint = Keypair::new();
    create_mint(&mut context, &c98_mint, &payer_wallet.pubkey(), None).await.unwrap();
    let cusd_mint = Keypair::new();
    create_mint(&mut context, &cusd_mint, &payer_wallet.pubkey(), None).await.unwrap();

    let stranger_c98_token_account = create_associated_token_account(&mut context, &stranger.pubkey(), &c98_mint.pubkey()).await.unwrap();
    let stranger_cusd_token_account = create_associated_token_account(&mut context, &stranger.pubkey(), &cusd_mint.pubkey()).await.unwrap();

    //create vault
    let (vault_address,_) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([authority.pubkey()]));

    let vault_c98_token_account = create_associated_token_account(&mut context, &vault_signer_address, &c98_mint.pubkey()).await.unwrap();
    let vault_cusd_token_account = create_associated_token_account(&mut context, &vault_signer_address, &cusd_mint.pubkey()).await.unwrap();

    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

    mint_tokens(&mut context, &c98_mint.pubkey(), &stranger_c98_token_account, 1_000_000_000_000, &payer_wallet.pubkey(), Some(&payer_wallet)).await.unwrap();
    mint_tokens(&mut context, &cusd_mint.pubkey(), &stranger_cusd_token_account, 1_000_000_000_000, &payer_wallet.pubkey(), Some(&payer_wallet)).await.unwrap();
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
    process_transaction(&mut context, &Vec::from([create_schedule_data, set_schedule_status_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let mut stranger_proofs: Vec<[u8; 32]> =  Vec::new();
    stranger_proofs.push(hash_user2);
    let redeem_token_data = redeem_token_data_instruction(
        &vault_address,
        &_schedule_address,
        &vault_signer_address,
        &vault_c98_token_account,
        &stranger.pubkey(),
        &stranger_c98_token_account,
        1,
        stranger_proofs,
        1000000,
        1000,
        Vec::from([vault_cusd_token_account, stranger_cusd_token_account]),
      );
    let result = process_transaction_with_error(&mut context, &Vec::from([redeem_token_data]), &Vec::from([&stranger])).await;
    match result {
      Ok(_) => assert!(result.is_err()),
      Err(_) => {},
    };
}
#[tokio::test]
async fn user_redeem_before_schedule() {
    println!(">>>>>>>>>> FAIL: user redeem token before schedule<<<<<<<<<<<<<<<");
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

    let user1_c98_token_account = create_associated_token_account(&mut context, &user1.pubkey(), &c98_mint.pubkey()).await.unwrap();
    let user1_cusd_token_account = create_associated_token_account(&mut context, &user1.pubkey(), &cusd_mint.pubkey()).await.unwrap();

    //create vault
    let (vault_address,_) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([authority.pubkey()]));

    let vault_c98_token_account = create_associated_token_account(&mut context, &vault_signer_address, &c98_mint.pubkey()).await.unwrap();
    let vault_cusd_token_account = create_associated_token_account(&mut context, &vault_signer_address, &cusd_mint.pubkey()).await.unwrap();

    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

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
        2, 1, 1670885281,
        merkle_root ,
        false,
        &c98_mint.pubkey(),
        &vault_c98_token_account,
        &cusd_mint.pubkey(),
        &vault_cusd_token_account
      );
    let set_schedule_status_data = set_schedule_status_data_instruction(&payer_wallet.pubkey(), &vault_address, 1, true);
    process_transaction(&mut context, &Vec::from([create_schedule_data, set_schedule_status_data]), &Vec::from([&payer_wallet])).await.unwrap();

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
    let result =process_transaction_with_error(&mut context, &Vec::from([redeem_token_data]), &Vec::from([&user1])).await;
    match result {
      Ok(_) => assert!(result.is_err()),
      Err(_) => {},
    };
}

#[tokio::test]
async fn user_claim_token_twice() {
    println!(">>>>>>>>>> FAIL: user claim twice <<<<<<<<<<<<<<<");
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

    let user1_c98_token_account = create_associated_token_account(&mut context, &user1.pubkey(), &c98_mint.pubkey()).await.unwrap();
    let user1_cusd_token_account = create_associated_token_account(&mut context, &user1.pubkey(), &cusd_mint.pubkey()).await.unwrap();

    //create vault
    let (vault_address,_) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([authority.pubkey()]));

    let vault_c98_token_account = create_associated_token_account(&mut context, &vault_signer_address, &c98_mint.pubkey()).await.unwrap();
    let vault_cusd_token_account = create_associated_token_account(&mut context, &vault_signer_address, &cusd_mint.pubkey()).await.unwrap();

    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

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
    process_transaction(&mut context, &Vec::from([create_schedule_data, set_schedule_status_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let mut user1_proofs: Vec<[u8; 32]> =  Vec::new();
    user1_proofs.push(hash_user2);
    let proof = user1_proofs.clone();
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
    let redeem_token_data2 = redeem_token_data_instruction(
        &vault_address,
        &_schedule_address,
        &vault_signer_address,
        &vault_c98_token_account,
        &user1.pubkey(),
        &user1_c98_token_account,
        0,
        proof,
        100000,
        1000,
        Vec::from([vault_cusd_token_account, user1_cusd_token_account]),
      );
    process_transaction(&mut context, &Vec::from([redeem_token_data]), &Vec::from([&user1])).await.unwrap();

    let result = process_transaction_with_error(&mut context, &Vec::from([redeem_token_data2]), &Vec::from([&user1])).await;
    match result {
      Ok(_) => assert!(result.is_err()),
      Err(_) => {},
    };
}

#[tokio::test]
async fn user_redeem_token_amount() {
    println!(">>>>>>>>>> FAIL: user redeem wrong token amount <<<<<<<<<<<<<<<");
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

    let user1_c98_token_account = create_associated_token_account(&mut context, &user1.pubkey(), &c98_mint.pubkey()).await.unwrap();
    let user1_cusd_token_account = create_associated_token_account(&mut context, &user1.pubkey(), &cusd_mint.pubkey()).await.unwrap();

    //create vault
    let (vault_address,_) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(), feed_path, Vec::from([authority.pubkey()]));

    let vault_c98_token_account = create_associated_token_account(&mut context, &vault_signer_address, &c98_mint.pubkey()).await.unwrap();
    let vault_cusd_token_account = create_associated_token_account(&mut context, &vault_signer_address, &cusd_mint.pubkey()).await.unwrap();

    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

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
    process_transaction(&mut context, &Vec::from([create_schedule_data, set_schedule_status_data]), &Vec::from([&payer_wallet])).await.unwrap();

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
        2000000,
        1000,
        Vec::from([vault_cusd_token_account, user1_cusd_token_account]),
      );
    let result = process_transaction_with_error(&mut context, &Vec::from([redeem_token_data]), &Vec::from([&user1])).await;
    match result {
      Ok(_) => assert!(result.is_err()),
      Err(_) => {},
    };
}
