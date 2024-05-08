import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { factoryFixture } from "./fixtures/factory.fixture";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Coin98VaultNft, MockERC20, VaultNft } from "../typechain-types";
import { Hasher, MerkleTreeKeccak, ZERO_ADDRESS, ZERO_BYTES32 } from "@coin98/solidity-support-library";
import { vaultFixture } from "./fixtures/vault.fixture";
import { WhitelistNftData, createWhitelistNftTree } from "./common";
import { parse } from "dotenv";
import { parseEther } from "ethers/lib/utils";

let owner: SignerWithAddress;
let acc1: SignerWithAddress;
let acc2: SignerWithAddress;
let admin: SignerWithAddress;
let accs: SignerWithAddress[];
let vault: Coin98VaultNft;
let c98: MockERC20;
let nft: VaultNft;
let whitelistData: WhitelistNftData[];
let tree: MerkleTreeKeccak;

describe("Coin98VaultNftFactory", function () {
    beforeEach(async () => {
        ({ owner, acc1, acc2, admin, accs, vault, nft, c98, whitelistData, tree } = await loadFixture(vaultFixture));
    });

    describe("Vault", async () => {
        it("Mint NFT & claim vault", async () => {
            let whitelistProof = tree.proofs(0);
            const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

            const tx = await vault.connect(accs[0]).mint(proofs, accs[0].address, 1, 1000);

            expect(await nft.ownerOf(1)).to.equal(accs[0].address);

            expect(tx).to.emit(vault, "Minted").withArgs(accs[0].address, 1, 1000);

            await time.increaseTo((await time.latest()) + 101);
            const tx2 = await vault.connect(accs[0]).claim(1, 0);

            expect(tx2).to.emit(vault, "Claimed").withArgs(accs[0].address, 1, 1000);
            expect(tx2).to.changeTokenBalances(c98, [accs[0], vault], [1000, -1000]);

            await expect(vault.connect(accs[0]).claim(1, 0)).to.be.revertedWith("Coin98Vault: Already claimed");
            await expect(vault.connect(accs[0]).claim(1, 1)).to.be.revertedWith("Coin98Vault: Schedule not available");
        });

        it("Mint again", async () => {
            let nodes = tree.nodes();
            let whitelistProof = tree.proofs(0);
            const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

            await vault.connect(accs[0]).mint(proofs, accs[0].address, 1, 1000);

            await time.increaseTo((await time.latest()) + 101);
            await vault.connect(accs[0]).claim(1, 0);

            await expect(vault.connect(accs[0]).mint(proofs, accs[0].address, 1, 1000)).to.be.revertedWith(
                "ERC721: token already minted"
            );
        });

        it("Schedule not available", async () => {
            let whitelistProof = tree.proofs(0);
            const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

            await vault.connect(accs[0]).mint(proofs, accs[0].address, 1, 1000);

            await expect(vault.connect(accs[0]).claim(1, 0)).to.be.revertedWith("Coin98Vault: Schedule not available");
        });
    });
});
