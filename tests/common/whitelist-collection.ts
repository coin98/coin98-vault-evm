import { utils } from "ethers";
import { MerkleTreeKeccak } from "@coin98/solidity-support-library";

export interface WhitelistCollectionData {
  index: number;
  unlockTimestamp: number;
  collectionAddress: string;
  tokenId: number;
  receivingAmount: number;
  sendingAmount: number;
}

export function createWhitelistCollectionTree(whitelists: WhitelistCollectionData[]): MerkleTreeKeccak {
  const hashes = whitelists.map((whitelist) => {
    const hash = utils.solidityKeccak256(
      ["uint256", "uint256", "address", "uint256", "uint256", "uint256"],
      [
        whitelist.index,
        whitelist.unlockTimestamp,
        whitelist.collectionAddress,
        whitelist.tokenId,
        whitelist.receivingAmount,
        whitelist.sendingAmount,
      ]
    );
    return Buffer.from(hash.substring(2), "hex");
  });
  const merkleTree = new MerkleTreeKeccak(hashes);
  return merkleTree;
}
