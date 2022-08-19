pub mod utils;
use anchor_lang::{solana_program::keccak::hashv};
use solana_sdk::signature::{Keypair, Signer};
use solana_program_test::*;
use utils::helpers::*;
use utils::instructions::*;
use utils::wallet::*;


#[tokio::test]
async fn user_redeem_nft() {
    println!(">>>>>>>>>> SUCCESS: user in schedule redeem NFT <<<<<<<<<<<<<<<");
    let mut context = c98_vault_program_test().start_with_context().await;
    let payer_wallet = get_default_wallet().unwrap();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000)
        .await
        .unwrap();
    let feed_path: Vec<u8> = (0..10).map(|_| rand::random::<u8>()).collect(); // create random path

    let authority = Keypair::new();
    airdrop(&mut context, &authority.pubkey(), 10_000_000_000).await.unwrap();

    // create user to claim
    let user1 = Keypair::new();
    airdrop(&mut context, &user1.pubkey(), 10_000_000_000).await.unwrap();
    let user2 = Keypair::new();
    airdrop(&mut context, &user2.pubkey(), 10_000_000_000).await.unwrap();

    // mint token
    let nft_c98 = Keypair::new();
    create_mint(&mut context, &nft_c98, &payer_wallet.pubkey(), None).await.unwrap();
    let nft_sol = Keypair::new();
    create_mint(&mut context, &nft_sol, &payer_wallet.pubkey(), None).await.unwrap();

    let cusd_mint = Keypair::new();
    create_mint(&mut context, &cusd_mint, &payer_wallet.pubkey(), None).await.unwrap();

    let user1_nft_c98_account = create_associated_token_account(&mut context, &user1.pubkey(), &nft_c98.pubkey()).await.unwrap();
    let user2_nft_sol_account = create_associated_token_account(&mut context, &user2.pubkey(), &nft_sol.pubkey()).await.unwrap();

    let user1_cusd_account = create_associated_token_account(&mut context, &user1.pubkey(), &cusd_mint.pubkey()).await.unwrap();
    let user2_cusd_account = create_associated_token_account(&mut context, &user2.pubkey(), &cusd_mint.pubkey()).await.unwrap();
    // mint token cusd to user
    mint_tokens(&mut context,&cusd_mint.pubkey(),&user1_cusd_account,1_000_000,&payer_wallet.pubkey(),Some(&payer_wallet)).await.unwrap();
    mint_tokens(&mut context,&cusd_mint.pubkey(),&user2_cusd_account,1_000_000,&payer_wallet.pubkey(),Some(&payer_wallet)).await.unwrap();

    //create vault
    let (vault_address, _) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(),feed_path,Vec::from([authority.pubkey()]),);
    let vault_cusd_token_account = create_associated_token_account(&mut context, &vault_signer_address, &cusd_mint.pubkey()).await.unwrap();
    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

    // mint nft to vault
    let vault_c98_token_account = create_associated_token_account(&mut context, &vault_signer_address, &nft_c98.pubkey()).await.unwrap();
    mint_tokens(&mut context, &nft_c98.pubkey(), &vault_c98_token_account,1, &payer_wallet.pubkey(),Some(&payer_wallet)).await.unwrap();
    let vault_sol_token_account = create_associated_token_account(&mut context, &vault_signer_address, &nft_sol.pubkey()).await.unwrap();
    mint_tokens(&mut context, &nft_sol.pubkey(), &vault_sol_token_account,1, &payer_wallet.pubkey(),Some(&payer_wallet),).await.unwrap();

    // create data
    let user1_data = vault::state::RedemptionMultiParams {
        index: 0,
        address: user1.pubkey(),
        receiving_token_mint: nft_c98.pubkey(),
        receiving_amount: 1,
        sending_amount: 1000,
    };

    let user2_data = vault::state::RedemptionMultiParams {
        index: 1,
        address: user2.pubkey(),
        receiving_token_mint: nft_sol.pubkey(),
        receiving_amount: 1,
        sending_amount: 1000,
    };

    let hash_user1 = hash_nft_redemption(user1_data);
    let hash_user2 = hash_nft_redemption(user2_data);
    let merkle_root: [u8; 32] = if hash_user1 < hash_user2 { hashv(&[&hash_user1, &hash_user2]).to_bytes() }
                                                      else { hashv(&[&hash_user2, &hash_user1]).to_bytes() };

    // create schedule
    let (_schedule_address, _) = find_schedule_address(1);

    let create_schedule_data = create_schedule_data_instruction(
        &payer_wallet.pubkey(),
        &vault_address,
        2,
        1,
        0,
        merkle_root,
        true,
        &nft_c98.pubkey(),
        &vault_c98_token_account,
        &cusd_mint.pubkey(),
        &vault_cusd_token_account);
    let set_schedule_status_data = set_schedule_status_data_instruction(&payer_wallet.pubkey(), &vault_address, 1, true);
    process_transaction(&mut context, &Vec::from([create_schedule_data, set_schedule_status_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let mut user1_proofs: Vec<[u8; 32]> =  Vec::new();
    user1_proofs.push(hash_user2);
    let mut user2_proofs: Vec<[u8; 32]> =  Vec::new();
    user2_proofs.push(hash_user1);

    let user1_redeem_nft_data = redeem_nft_data_instruction(
        &vault_address,
        &_schedule_address,
        &vault_signer_address,
        &vault_c98_token_account,
        &user1.pubkey(),
        &user1_nft_c98_account,
        0,
        user1_proofs,
        &nft_c98.pubkey(),
        1,
        1000,
        Vec::from([vault_cusd_token_account, user1_cusd_account])
      );
    process_transaction(&mut context, &Vec::from([user1_redeem_nft_data]), &Vec::from([&user1])).await.unwrap();

    let user2_redeem_nft_data = redeem_nft_data_instruction(
        &vault_address,
        &_schedule_address,
        &vault_signer_address,
        &vault_sol_token_account,
        &user2.pubkey(),
        &user2_nft_sol_account,
        1,
        user2_proofs,
        &nft_sol.pubkey(),
        1,
        1000,
        Vec::from([vault_cusd_token_account, user2_cusd_account])
      );
    process_transaction(&mut context, &Vec::from([user2_redeem_nft_data]), &Vec::from([&user2])).await.unwrap();
}

#[tokio::test]
async fn stranger_redeem_nft() {
    println!(">>>>>>>>>> FAIL: user not in schedule redeem NFT <<<<<<<<<<<<<<<");
    let mut context = c98_vault_program_test().start_with_context().await;
    let payer_wallet = get_default_wallet().unwrap();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000)
        .await
        .unwrap();
    let feed_path: Vec<u8> = (0..10).map(|_| rand::random::<u8>()).collect(); // create random path

    let authority = Keypair::new();
    airdrop(&mut context, &authority.pubkey(), 10_000_000_000).await.unwrap();

    // create user to claim
    let user1 = Keypair::new();
    airdrop(&mut context, &user1.pubkey(), 10_000_000_000).await.unwrap();
    let user2 = Keypair::new();
    airdrop(&mut context, &user2.pubkey(), 10_000_000_000).await.unwrap();
    let stranger = Keypair::new();
    airdrop(&mut context, &stranger.pubkey(), 10_000_000_000).await.unwrap();
    // mint token
    let nft_c98 = Keypair::new();
    create_mint(&mut context, &nft_c98, &payer_wallet.pubkey(), None).await.unwrap();
    let nft_sol = Keypair::new();
    create_mint(&mut context, &nft_sol, &payer_wallet.pubkey(), None).await.unwrap();

    let cusd_mint = Keypair::new();
    create_mint(&mut context, &cusd_mint, &payer_wallet.pubkey(), None).await.unwrap();

    let stranger_nft_c98_account = create_associated_token_account(&mut context, &stranger.pubkey(), &nft_c98.pubkey()).await.unwrap();

    let user1_cusd_account = create_associated_token_account(&mut context, &user1.pubkey(), &cusd_mint.pubkey()).await.unwrap();
    let user2_cusd_account = create_associated_token_account(&mut context, &user2.pubkey(), &cusd_mint.pubkey()).await.unwrap();
    let stranger_cusd_account = create_associated_token_account(&mut context, &stranger.pubkey(), &cusd_mint.pubkey()).await.unwrap();
    // mint token cusd to user
    mint_tokens(&mut context,&cusd_mint.pubkey(),&user1_cusd_account,1_000_000,&payer_wallet.pubkey(),Some(&payer_wallet)).await.unwrap();
    mint_tokens(&mut context,&cusd_mint.pubkey(),&user2_cusd_account,1_000_000,&payer_wallet.pubkey(),Some(&payer_wallet)).await.unwrap();
        mint_tokens(&mut context,&cusd_mint.pubkey(),&stranger_cusd_account,1_000_000,&payer_wallet.pubkey(),Some(&payer_wallet)).await.unwrap();
    //create vault
    let (vault_address, _) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(),feed_path,Vec::from([authority.pubkey()]),);
    let vault_cusd_token_account = create_associated_token_account(&mut context, &vault_signer_address, &cusd_mint.pubkey()).await.unwrap();
    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

    // mint nft to vault
    let vault_c98_token_account = create_associated_token_account(&mut context, &vault_signer_address, &nft_c98.pubkey()).await.unwrap();
    mint_tokens(&mut context, &nft_c98.pubkey(), &vault_c98_token_account,1, &payer_wallet.pubkey(),Some(&payer_wallet)).await.unwrap();
    let vault_sol_token_account = create_associated_token_account(&mut context, &vault_signer_address, &nft_sol.pubkey()).await.unwrap();
    mint_tokens(&mut context, &nft_sol.pubkey(), &vault_sol_token_account,1, &payer_wallet.pubkey(),Some(&payer_wallet),).await.unwrap();

    // create data
    let user1_data = vault::state::RedemptionMultiParams {
        index: 0,
        address: user1.pubkey(),
        receiving_token_mint: nft_c98.pubkey(),
        receiving_amount: 1,
        sending_amount: 1000,
    };

    let user2_data = vault::state::RedemptionMultiParams {
        index: 1,
        address: user2.pubkey(),
        receiving_token_mint: nft_sol.pubkey(),
        receiving_amount: 1,
        sending_amount: 1000,
    };

    let hash_user1 = hash_nft_redemption(user1_data);
    let hash_user2 = hash_nft_redemption(user2_data);
    let merkle_root: [u8; 32] = if hash_user1 < hash_user2 { hashv(&[&hash_user1, &hash_user2]).to_bytes() }
                                                      else { hashv(&[&hash_user2, &hash_user1]).to_bytes() };

    // create schedule
    let (_schedule_address, _) = find_schedule_address(1);

    let create_schedule_data = create_schedule_data_instruction(
        &payer_wallet.pubkey(),
        &vault_address,
        2,
        1,
        0,
        merkle_root,
        true,
        &nft_c98.pubkey(),
        &vault_c98_token_account,
        &cusd_mint.pubkey(),
        &vault_cusd_token_account);
    let set_schedule_status_data = set_schedule_status_data_instruction(&payer_wallet.pubkey(), &vault_address, 1, true);
    process_transaction(&mut context, &Vec::from([create_schedule_data, set_schedule_status_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let mut user1_proofs: Vec<[u8; 32]> =  Vec::new();
    user1_proofs.push(hash_user2);
    let mut user2_proofs: Vec<[u8; 32]> =  Vec::new();
    user2_proofs.push(hash_user1);

    let stranger_redeem_nft_data = redeem_nft_data_instruction(
        &vault_address,
        &_schedule_address,
        &vault_signer_address,
        &vault_c98_token_account,
        &stranger.pubkey(),
        &stranger_nft_c98_account,
        0,
        user1_proofs,
        &nft_c98.pubkey(),
        1,
        1000,
        Vec::from([vault_cusd_token_account, stranger_cusd_account])
      );
    let result = process_transaction_with_error(&mut context, &Vec::from([stranger_redeem_nft_data]), &Vec::from([&stranger])).await;
    match result {
      Ok(_) => assert!(result.is_err()),
      Err(_) => {},
    };
}

#[tokio::test]
async fn user_claim_before_schedule() {
    println!(">>>>>>>>>> FAIL: user claim nft before schedule <<<<<<<<<<<<<<<");
    let mut context = c98_vault_program_test().start_with_context().await;
    let payer_wallet = get_default_wallet().unwrap();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000)
        .await
        .unwrap();
    let feed_path: Vec<u8> = (0..10).map(|_| rand::random::<u8>()).collect(); // create random path

    let authority = Keypair::new();
    airdrop(&mut context, &authority.pubkey(), 10_000_000_000).await.unwrap();

    // create user to claim
    let user1 = Keypair::new();
    airdrop(&mut context, &user1.pubkey(), 10_000_000_000).await.unwrap();
    let user2 = Keypair::new();
    airdrop(&mut context, &user2.pubkey(), 10_000_000_000).await.unwrap();

    // mint token
    let nft_c98 = Keypair::new();
    create_mint(&mut context, &nft_c98, &payer_wallet.pubkey(), None).await.unwrap();
    let nft_sol = Keypair::new();
    create_mint(&mut context, &nft_sol, &payer_wallet.pubkey(), None).await.unwrap();

    let cusd_mint = Keypair::new();
    create_mint(&mut context, &cusd_mint, &payer_wallet.pubkey(), None).await.unwrap();

    let user1_nft_c98_account = create_associated_token_account(&mut context, &user1.pubkey(), &nft_c98.pubkey()).await.unwrap();
    let user2_nft_sol_account = create_associated_token_account(&mut context, &user2.pubkey(), &nft_sol.pubkey()).await.unwrap();

    let user1_cusd_account = create_associated_token_account(&mut context, &user1.pubkey(), &cusd_mint.pubkey()).await.unwrap();
    let user2_cusd_account = create_associated_token_account(&mut context, &user2.pubkey(), &cusd_mint.pubkey()).await.unwrap();
    // mint token cusd to user
    mint_tokens(&mut context,&cusd_mint.pubkey(),&user1_cusd_account,1_000_000,&payer_wallet.pubkey(),Some(&payer_wallet)).await.unwrap();
    mint_tokens(&mut context,&cusd_mint.pubkey(),&user2_cusd_account,1_000_000,&payer_wallet.pubkey(),Some(&payer_wallet)).await.unwrap();

    //create vault
    let (vault_address, _) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(),feed_path,Vec::from([authority.pubkey()]),);
    let vault_cusd_token_account = create_associated_token_account(&mut context, &vault_signer_address, &cusd_mint.pubkey()).await.unwrap();
    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

    // mint nft to vault
    let vault_c98_token_account = create_associated_token_account(&mut context, &vault_signer_address, &nft_c98.pubkey()).await.unwrap();
    mint_tokens(&mut context, &nft_c98.pubkey(), &vault_c98_token_account,1, &payer_wallet.pubkey(),Some(&payer_wallet)).await.unwrap();
    let vault_sol_token_account = create_associated_token_account(&mut context, &vault_signer_address, &nft_sol.pubkey()).await.unwrap();
    mint_tokens(&mut context, &nft_sol.pubkey(), &vault_sol_token_account,1, &payer_wallet.pubkey(),Some(&payer_wallet),).await.unwrap();

    // create data
    let user1_data = vault::state::RedemptionMultiParams {
        index: 0,
        address: user1.pubkey(),
        receiving_token_mint: nft_c98.pubkey(),
        receiving_amount: 1,
        sending_amount: 1000,
    };

    let user2_data = vault::state::RedemptionMultiParams {
        index: 1,
        address: user2.pubkey(),
        receiving_token_mint: nft_sol.pubkey(),
        receiving_amount: 1,
        sending_amount: 1000,
    };

    let hash_user1 = hash_nft_redemption(user1_data);
    let hash_user2 = hash_nft_redemption(user2_data);
    let merkle_root: [u8; 32] = if hash_user1 < hash_user2 { hashv(&[&hash_user1, &hash_user2]).to_bytes() }
                                                      else { hashv(&[&hash_user2, &hash_user1]).to_bytes() };

    // create schedule
    let (_schedule_address, _) = find_schedule_address(1);

    let create_schedule_data = create_schedule_data_instruction(
        &payer_wallet.pubkey(),
        &vault_address,
        2,
        1,
        100000000000000000,
        merkle_root,
        true,
        &nft_c98.pubkey(),
        &vault_c98_token_account,
        &cusd_mint.pubkey(),
        &vault_cusd_token_account);
    let set_schedule_status_data = set_schedule_status_data_instruction(&payer_wallet.pubkey(), &vault_address, 1, true);
    process_transaction(&mut context, &Vec::from([create_schedule_data, set_schedule_status_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let mut user1_proofs: Vec<[u8; 32]> =  Vec::new();
    user1_proofs.push(hash_user2);
    let mut user2_proofs: Vec<[u8; 32]> =  Vec::new();
    user2_proofs.push(hash_user1);

    let user1_redeem_nft_data = redeem_nft_data_instruction(
        &vault_address,
        &_schedule_address,
        &vault_signer_address,
        &vault_c98_token_account,
        &user1.pubkey(),
        &user1_nft_c98_account,
        0,
        user1_proofs,
        &nft_c98.pubkey(),
        1,
        1000,
        Vec::from([vault_cusd_token_account, user1_cusd_account])
      );
    let user1_result = process_transaction_with_error(&mut context, &Vec::from([user1_redeem_nft_data]), &Vec::from([&user1])).await;
    match user1_result {
      Ok(_) => assert!(user1_result.is_err()),
      Err(_) => {},
    };

    let user2_redeem_nft_data = redeem_nft_data_instruction(
        &vault_address,
        &_schedule_address,
        &vault_signer_address,
        &vault_sol_token_account,
        &user2.pubkey(),
        &user2_nft_sol_account,
        1,
        user2_proofs,
        &nft_sol.pubkey(),
        1,
        1000,
        Vec::from([vault_cusd_token_account, user2_cusd_account])
      );
    let user2_result = process_transaction_with_error(&mut context, &Vec::from([user2_redeem_nft_data]), &Vec::from([&user2])).await;
    match user2_result {
      Ok(_) => assert!(user2_result.is_err()),
      Err(_) => {},
    };
}
#[tokio::test]
async fn test_claim_wrong_token() {
    println!(">>>>>>>>>> FAIL: user 1 claim user2's NFT <<<<<<<<<<<<<<<");
    let mut context = c98_vault_program_test().start_with_context().await;
    let payer_wallet = get_default_wallet().unwrap();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000)
        .await
        .unwrap();
    let feed_path: Vec<u8> = (0..10).map(|_| rand::random::<u8>()).collect(); // create random path

    let authority = Keypair::new();
    airdrop(&mut context, &authority.pubkey(), 10_000_000_000).await.unwrap();

    // create user to claim
    let user1 = Keypair::new();
    airdrop(&mut context, &user1.pubkey(), 10_000_000_000).await.unwrap();
    let user2 = Keypair::new();
    airdrop(&mut context, &user2.pubkey(), 10_000_000_000).await.unwrap();

    // mint token
    let nft_c98 = Keypair::new();
    create_mint(&mut context, &nft_c98, &payer_wallet.pubkey(), None).await.unwrap();
    let nft_sol = Keypair::new();
    create_mint(&mut context, &nft_sol, &payer_wallet.pubkey(), None).await.unwrap();

    let cusd_mint = Keypair::new();
    create_mint(&mut context, &cusd_mint, &payer_wallet.pubkey(), None).await.unwrap();

    let user1_nft_sol_account = create_associated_token_account(&mut context, &user1.pubkey(), &nft_sol.pubkey()).await.unwrap();
    let user2_nft_c98_account = create_associated_token_account(&mut context, &user2.pubkey(), &nft_c98.pubkey()).await.unwrap();

    let user1_cusd_account = create_associated_token_account(&mut context, &user1.pubkey(), &cusd_mint.pubkey()).await.unwrap();
    let user2_cusd_account = create_associated_token_account(&mut context, &user2.pubkey(), &cusd_mint.pubkey()).await.unwrap();
    // mint token cusd to user
    mint_tokens(&mut context,&cusd_mint.pubkey(),&user1_cusd_account,1_000_000,&payer_wallet.pubkey(),Some(&payer_wallet)).await.unwrap();
    mint_tokens(&mut context,&cusd_mint.pubkey(),&user2_cusd_account,1_000_000,&payer_wallet.pubkey(),Some(&payer_wallet)).await.unwrap();

    //create vault
    let (vault_address, _) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(),feed_path,Vec::from([authority.pubkey()]),);
    let vault_cusd_token_account = create_associated_token_account(&mut context, &vault_signer_address, &cusd_mint.pubkey()).await.unwrap();
    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

    // mint nft to vault
    let vault_c98_token_account = create_associated_token_account(&mut context, &vault_signer_address, &nft_c98.pubkey()).await.unwrap();
    mint_tokens(&mut context, &nft_c98.pubkey(), &vault_c98_token_account,1, &payer_wallet.pubkey(),Some(&payer_wallet)).await.unwrap();
    let vault_sol_token_account = create_associated_token_account(&mut context, &vault_signer_address, &nft_sol.pubkey()).await.unwrap();
    mint_tokens(&mut context, &nft_sol.pubkey(), &vault_sol_token_account,1, &payer_wallet.pubkey(),Some(&payer_wallet),).await.unwrap();

    // create data
    let user1_data = vault::state::RedemptionMultiParams {
        index: 0,
        address: user1.pubkey(),
        receiving_token_mint: nft_c98.pubkey(),
        receiving_amount: 1,
        sending_amount: 1000,
    };

    let user2_data = vault::state::RedemptionMultiParams {
        index: 1,
        address: user2.pubkey(),
        receiving_token_mint: nft_sol.pubkey(),
        receiving_amount: 1,
        sending_amount: 1000,
    };

    let hash_user1 = hash_nft_redemption(user1_data);
    let hash_user2 = hash_nft_redemption(user2_data);
    let merkle_root: [u8; 32] = if hash_user1 < hash_user2 { hashv(&[&hash_user1, &hash_user2]).to_bytes() }
                                                      else { hashv(&[&hash_user2, &hash_user1]).to_bytes() };

    // create schedule
    let (_schedule_address, _) = find_schedule_address(1);

    let create_schedule_data = create_schedule_data_instruction(
        &payer_wallet.pubkey(),
        &vault_address,
        2,
        1,
        0,
        merkle_root,
        true,
        &nft_c98.pubkey(),
        &vault_c98_token_account,
        &cusd_mint.pubkey(),
        &vault_cusd_token_account);
    let set_schedule_status_data = set_schedule_status_data_instruction(&payer_wallet.pubkey(), &vault_address, 1, true);
    process_transaction(&mut context, &Vec::from([create_schedule_data, set_schedule_status_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let mut user1_proofs: Vec<[u8; 32]> =  Vec::new();
    user1_proofs.push(hash_user2);
    let mut user2_proofs: Vec<[u8; 32]> =  Vec::new();
    user2_proofs.push(hash_user1);

    let user1_redeem_nft_data = redeem_nft_data_instruction(
        &vault_address,
        &_schedule_address,
        &vault_signer_address,
        &vault_sol_token_account,
        &user1.pubkey(),
        &user1_nft_sol_account,
        0,
        user1_proofs,
        &nft_sol.pubkey(),
        1,
        1000,
        Vec::from([vault_cusd_token_account, user1_cusd_account])
      );
    let user1_result = process_transaction_with_error(&mut context, &Vec::from([user1_redeem_nft_data]), &Vec::from([&user1])).await;
    match user1_result {
      Ok(_) => assert!(user1_result.is_err()),
      Err(_) => {},
    };

    let user2_redeem_nft_data = redeem_nft_data_instruction(
        &vault_address,
        &_schedule_address,
        &vault_signer_address,
        &vault_c98_token_account,
        &user2.pubkey(),
        &user2_nft_c98_account,
        1,
        user2_proofs,
        &nft_c98.pubkey(),
        1,
        1000,
        Vec::from([vault_cusd_token_account, user2_cusd_account])
      );
    let user2_result = process_transaction_with_error(&mut context, &Vec::from([user2_redeem_nft_data]), &Vec::from([&user2])).await;
    match user2_result {
      Ok(_) => assert!(user2_result.is_err()),
      Err(_) => {},
    };
}
#[tokio::test]
async fn user_claim_nft_twice() {
    println!(">>>>>>>>>> FAIL: user claim twice <<<<<<<<<<<<<<<");
    let mut context = c98_vault_program_test().start_with_context().await;
    let payer_wallet = get_default_wallet().unwrap();
    airdrop(&mut context, &payer_wallet.pubkey(), 10_000_000_000)
        .await
        .unwrap();
    let feed_path: Vec<u8> = (0..10).map(|_| rand::random::<u8>()).collect(); // create random path

    let authority = Keypair::new();
    airdrop(&mut context, &authority.pubkey(), 10_000_000_000).await.unwrap();

    // create user to claim
    let user1 = Keypair::new();
    airdrop(&mut context, &user1.pubkey(), 10_000_000_000).await.unwrap();
    let user2 = Keypair::new();
    airdrop(&mut context, &user2.pubkey(), 10_000_000_000).await.unwrap();

    // mint token
    let nft_c98 = Keypair::new();
    create_mint(&mut context, &nft_c98, &payer_wallet.pubkey(), None).await.unwrap();
    let nft_sol = Keypair::new();
    create_mint(&mut context, &nft_sol, &payer_wallet.pubkey(), None).await.unwrap();

    let cusd_mint = Keypair::new();
    create_mint(&mut context, &cusd_mint, &payer_wallet.pubkey(), None).await.unwrap();

    let user1_nft_c98_account = create_associated_token_account(&mut context, &user1.pubkey(), &nft_c98.pubkey()).await.unwrap();

    let user1_cusd_account = create_associated_token_account(&mut context, &user1.pubkey(), &cusd_mint.pubkey()).await.unwrap();
    let user2_cusd_account = create_associated_token_account(&mut context, &user2.pubkey(), &cusd_mint.pubkey()).await.unwrap();
    // mint token cusd to user
    mint_tokens(&mut context,&cusd_mint.pubkey(),&user1_cusd_account,1_000_000,&payer_wallet.pubkey(),Some(&payer_wallet)).await.unwrap();
    mint_tokens(&mut context,&cusd_mint.pubkey(),&user2_cusd_account,1_000_000,&payer_wallet.pubkey(),Some(&payer_wallet)).await.unwrap();

    //create vault
    let (vault_address, _) = find_vault_address(&feed_path);
    let (vault_signer_address, _) = find_vault_signer_address(&vault_address);
    let create_vault_data = create_vault_data_instruction(&payer_wallet.pubkey(), feed_path.clone());
    let set_vault_data = set_vault_data_instruction(&payer_wallet.pubkey(),feed_path,Vec::from([authority.pubkey()]),);
    let vault_cusd_token_account = create_associated_token_account(&mut context, &vault_signer_address, &cusd_mint.pubkey()).await.unwrap();
    process_transaction(&mut context, &Vec::from([create_vault_data, set_vault_data]), &Vec::from([&payer_wallet])).await.unwrap();

    // mint nft to vault
    let vault_c98_token_account = create_associated_token_account(&mut context, &vault_signer_address, &nft_c98.pubkey()).await.unwrap();
    mint_tokens(&mut context, &nft_c98.pubkey(), &vault_c98_token_account,1, &payer_wallet.pubkey(),Some(&payer_wallet)).await.unwrap();
    let vault_sol_token_account = create_associated_token_account(&mut context, &vault_signer_address, &nft_sol.pubkey()).await.unwrap();
    mint_tokens(&mut context, &nft_sol.pubkey(), &vault_sol_token_account,1, &payer_wallet.pubkey(),Some(&payer_wallet),).await.unwrap();

    // create data
    let user1_data = vault::state::RedemptionMultiParams {
        index: 0,
        address: user1.pubkey(),
        receiving_token_mint: nft_c98.pubkey(),
        receiving_amount: 1,
        sending_amount: 1000,
    };

    let user2_data = vault::state::RedemptionMultiParams {
        index: 1,
        address: user2.pubkey(),
        receiving_token_mint: nft_sol.pubkey(),
        receiving_amount: 1,
        sending_amount: 1000,
    };

    let hash_user1 = hash_nft_redemption(user1_data);
    let hash_user2 = hash_nft_redemption(user2_data);
    let merkle_root: [u8; 32] = if hash_user1 < hash_user2 { hashv(&[&hash_user1, &hash_user2]).to_bytes() }
                                                      else { hashv(&[&hash_user2, &hash_user1]).to_bytes() };

    // create schedule
    let (_schedule_address, _) = find_schedule_address(1);

    let create_schedule_data = create_schedule_data_instruction(
        &payer_wallet.pubkey(),
        &vault_address,
        2,
        1,
        0,
        merkle_root,
        true,
        &nft_c98.pubkey(),
        &vault_c98_token_account,
        &cusd_mint.pubkey(),
        &vault_cusd_token_account);
    let set_schedule_status_data = set_schedule_status_data_instruction(&payer_wallet.pubkey(), &vault_address, 1, true);
    process_transaction(&mut context, &Vec::from([create_schedule_data, set_schedule_status_data]), &Vec::from([&payer_wallet])).await.unwrap();

    let mut user1_proofs: Vec<[u8; 32]> =  Vec::new();
    user1_proofs.push(hash_user2);
    let mut user2_proofs: Vec<[u8; 32]> =  Vec::new();
    user2_proofs.push(hash_user1);
    let proof = user1_proofs.clone();
    let user1_redeem_nft_data = redeem_nft_data_instruction(
        &vault_address,
        &_schedule_address,
        &vault_signer_address,
        &vault_c98_token_account,
        &user1.pubkey(),
        &user1_nft_c98_account,
        0,
        user1_proofs,
        &nft_c98.pubkey(),
        1,
        1000,
        Vec::from([vault_cusd_token_account, user1_cusd_account])
      );
    process_transaction(&mut context, &Vec::from([user1_redeem_nft_data]), &Vec::from([&user1])).await.unwrap();

    let user1_redeem_nft_data2 = redeem_nft_data_instruction(
        &vault_address,
        &_schedule_address,
        &vault_signer_address,
        &vault_c98_token_account,
        &user1.pubkey(),
        &user1_nft_c98_account,
        0,
        proof,
        &nft_c98.pubkey(),
        1,
        100,
        Vec::from([vault_cusd_token_account, user1_cusd_account])
      );
    let result = process_transaction_with_error(&mut context, &Vec::from([user1_redeem_nft_data2]), &Vec::from([&user1])).await;
    match result {
      Ok(_) => assert!(result.is_err()),
      Err(_) => {},
    };
}
