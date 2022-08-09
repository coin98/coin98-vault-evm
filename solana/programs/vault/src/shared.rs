use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak::{
  hashv,
};
use std::convert::TryInto;

#[derive(AnchorSerialize, AnchorDeserialize, Default)]
pub struct DeriveEventIdParam {
  pub event_id: u64,
}

pub fn derive_event_id(event_id: u64) -> [u8; 8] {
  let data = DeriveEventIdParam {
    event_id: event_id,
  };
  let vec = data.try_to_vec().unwrap();
  let arr: [u8; 8] = vec.try_into().unwrap();
  arr
}

/// Returns true if a `leaf` can be proved to be a part of a Merkle tree
/// defined by `root`. For this, a `proof` must be provided, containing
/// sibling hashes on the branch from the leaf to the root of the tree. Each
/// pair of leaves and each pair of pre-images are assumed to be sorted.
pub fn verify_proof(proofs: Vec<[u8; 32]>, root: [u8; 32], leaf: [u8; 32]) -> bool {
  let mut computed_hash = leaf;
  for proof in proofs.into_iter() {
    if computed_hash < proof {
      // Hash(current computed hash + current element of the proof)
      computed_hash = hashv(&[&computed_hash, &proof]).to_bytes();
    } else {
      // Hash(current element of the proof + current computed hash)
      computed_hash = hashv(&[&proof, &computed_hash]).to_bytes();
    }
  }
  // Check if the computed hash (root) is equal to the provided root
  computed_hash == root
}
