import { utils } from "ethers";
import { MerkleTreeKeccak } from "@coin98/solidity-support-library";
import { BigNumberish } from "ethers";

export interface WhitelistNftData {
    to: string;
    tokenId: BigNumberish;
    totalAlloc: BigNumberish;
}

export function createWhitelistNftTree(whitelists: WhitelistNftData[]): MerkleTreeKeccak {
    const hashes = whitelists.map(whitelist => {
        const hash = utils.solidityKeccak256(
            ["address", "uint256", "uint256"],
            [whitelist.to, whitelist.tokenId, whitelist.totalAlloc]
        );
        return Buffer.from(hash.substring(2), "hex");
    });
    const merkleTree = new MerkleTreeKeccak(hashes);
    return merkleTree;
}
