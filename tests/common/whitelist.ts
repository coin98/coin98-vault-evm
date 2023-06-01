import { utils } from 'ethers';
import { MerkleTreeKeccak } from '@coin98/solidity-support-library';

export interface WhitelistData {
  index: number;
  unlockTimestamp: number;
  recipientAddress: string;
  receivingAmount: number;
  sendingAmount: number;
}

export function createWhitelistTree(whitelists: WhitelistData[]): MerkleTreeKeccak {
  const hashes = whitelists.map(whitelist => {
    const hash = utils.solidityKeccak256(
      ["uint256", "uint256", "address", "uint256", "uint256"],
      [whitelist.index, whitelist.unlockTimestamp, whitelist.recipientAddress, whitelist.receivingAmount, whitelist.sendingAmount],
    );
    return Buffer.from(hash.substring(2), 'hex');
  });
  const merkleTree = new MerkleTreeKeccak(hashes);
  return merkleTree;
}
