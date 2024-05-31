import { utils } from "ethers";
import { MerkleTreeKeccak } from "@coin98/solidity-support-library";
import { BigNumberish } from "ethers";

export interface WhitelistCollectionData {
    to: string;
    merkleId: BigNumberish;
    totalAlloc: BigNumberish;
}

export function createWhitelistCollectionTree(whitelists: WhitelistCollectionData[]): MerkleTreeKeccak {
    const hashes = whitelists.map(whitelist => {
        const hash = utils.solidityKeccak256(
            ["address", "uint256", "uint256"],
            [whitelist.to, whitelist.merkleId, whitelist.totalAlloc]
        );
        return Buffer.from(hash.substring(2), "hex");
    });
    const merkleTree = new MerkleTreeKeccak(hashes);
    return merkleTree;
}
