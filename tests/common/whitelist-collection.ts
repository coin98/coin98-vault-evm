import { utils } from "ethers";
import { MerkleTreeKeccak } from "../shared";

export interface WhitelistCollectionData {
  type: string;
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
      ["string","uint256", "uint256", "address", "uint256", "uint256", "uint256"],
      [
        whitelist.type,
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
