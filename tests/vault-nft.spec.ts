import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { factoryFixture } from "./fixtures/factory.fixture";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Coin98VaultNft, MockERC20, Collection } from "../typechain-types";
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
let collection: Collection;
let whitelistData: WhitelistNftData[];
let tree: MerkleTreeKeccak;

describe("Coin98VaultNftFactory", function () {
    beforeEach(async () => {
        ({ owner, acc1, acc2, admin, accs, vault, collection, c98, whitelistData, tree } = await loadFixture(
            vaultFixture
        ));
    });

    describe("Vault", async () => {
        it("Mint NFT & claim vault", async () => {
            let whitelistProof = tree.proofs(0);
            const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

            const tx = await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);
            expect(await collection.ownerOf(1)).to.equal(accs[0].address);

            expect(tx).to.emit(vault, "Minted").withArgs(accs[0].address, 1, 1000);

            await time.increaseTo((await time.latest()) + 101);
            const tx2 = await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

            await expect(tx2).to.emit(vault, "Claimed").withArgs(accs[0].address, 1, 0, 100);
            await expect(tx2).to.changeTokenBalances(c98, [accs[0], vault], [100, -100]);

            await expect(vault.connect(accs[0]).claim(accs[0].address, 1, 0)).to.be.revertedWith(
                "Coin98VaultNft: Already claimed"
            );
            await expect(vault.connect(accs[0]).claim(accs[0].address, 1, 1)).to.be.revertedWith(
                "Coin98VaultNft: Schedule not available"
            );
        });

        it("Mint again", async () => {
            let whitelistProof = tree.proofs(0);
            const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

            await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

            await time.increaseTo((await time.latest()) + 101);
            await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

            await expect(vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs)).to.be.revertedWith(
                "ERC721: token already minted"
            );
        });

        it("Schedule not available", async () => {
            let whitelistProof = tree.proofs(0);
            const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

            await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

            await expect(vault.connect(accs[0]).claim(accs[0].address, 1, 0)).to.be.revertedWith(
                "Coin98VaultNft: Schedule not available"
            );
        });

        it("Claim multiple times", async () => {
            let whitelistProof = tree.proofs(0);
            const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

            await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

            await time.increaseTo((await time.latest()) + 101);
            await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

            await time.increaseTo((await time.latest()) + 201);
            const tx = await vault.connect(accs[0]).claim(accs[0].address, 1, 1);

            await expect(tx).to.emit(vault, "Claimed").withArgs(accs[0].address, 1, 1, 200);

            await time.increaseTo((await time.latest()) + 301);
            const tx2 = await vault.connect(accs[0]).claim(accs[0].address, 1, 2);
            await expect(tx2).to.emit(vault, "Claimed").withArgs(accs[0].address, 1, 2, 300);
        });

        it("Get total alloc", async () => {
            let whitelistProof = tree.proofs(0);
            const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

            await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

            expect(await vault.getTotalAlloc(1)).to.equal(1000);
        });

        it("Get claimed", async () => {
            let whitelistProof = tree.proofs(0);
            const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

            await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

            await time.increaseTo((await time.latest()) + 101);
            await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

            expect(await vault.getClaimedAlloc(1)).to.equal(100);
        });

        it("Get total supply", async () => {
            let whitelistProof1 = tree.proofs(0);
            const proofs1 = whitelistProof1.map(node => "0x" + node.hash.toString("hex"));

            await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs1);

            expect(await collection.totalSupply()).to.equal(1);

            let whitelistProof2 = tree.proofs(1);
            const proofs2 = whitelistProof2.map(node => "0x" + node.hash.toString("hex"));

            await vault.connect(accs[1]).mint(accs[1].address, 2, 2000, proofs2);

            expect(await collection.totalSupply()).to.equal(2);
        });
    });
});
