import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Coin98VaultNftProxy, MockERC20, Collection, Coin98VaultNft } from "../typechain-types";
import { MerkleTreeKeccak, ZERO_ADDRESS } from "@coin98/solidity-support-library";
import { WhitelistCollectionData } from "./common";
import { ethers } from "hardhat";
import { vaultProxyFixture } from "./fixtures";

let owner: SignerWithAddress;
let acc1: SignerWithAddress;
let accs: SignerWithAddress[];
let vault: Coin98VaultNft;
let vaultProxy: Coin98VaultNftProxy;
let collection: Collection;
let c98: MockERC20;
let tree: MerkleTreeKeccak;

describe("Coin98VaultNftProxy", function () {
    beforeEach(async () => {
        ({ owner, acc1, accs, vault, vaultProxy, collection, c98, tree } = await loadFixture(vaultProxyFixture));
    });

    describe("VRC25", async () => {
        context("Get name", async () => {
            it("Should get name", async () => {
                expect(await vaultProxy.name()).to.equal("Coin98VaultNftProxy");
            });
        });

        context("Get symbol", async () => {
            it("Should get symbol", async () => {
                expect(await vaultProxy.symbol()).to.equal("C98VNP");
            });
        });

        context("Get owner", async () => {
            it("Should get owner", async () => {
                expect(await vaultProxy.owner()).to.equal(owner.address);
            });
        });

        context("Transfer ownership", async () => {
            it("Should transfer ownership", async () => {
                await vaultProxy.transferOwnership(acc1.address);
                await vaultProxy.connect(acc1).acceptOwnership();
                expect(await vaultProxy.owner()).to.equal(acc1.address);
            });
        });
    });

    describe("Mint", async () => {
        context("Mint with correct params", async () => {
            it("Should mint", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                const tx = await vaultProxy.connect(accs[0]).mint(vault.address, accs[0].address, 1, 1000, proofs);
                expect(await collection.ownerOf(1)).to.equal(accs[0].address);

                expect(tx).to.emit(vault, "Minted").withArgs(accs[0].address, 1, 1000);
            });
        });

        context("Mint with invalid token id", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                await expect(
                    vaultProxy.connect(accs[0]).mint(vault.address, accs[0].address, 0, 1000, proofs)
                ).to.be.revertedWith("Coin98VaultNft: Invalid proof");
            });
        });

        context("Mint with invalid amount", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                await expect(
                    vaultProxy.connect(accs[0]).mint(vault.address, accs[0].address, 1, 1001, proofs)
                ).to.be.revertedWith("Coin98VaultNft: Invalid proof");
            });
        });

        context("Mint with invalid recipient", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                await expect(
                    vaultProxy.connect(accs[0]).mint(vault.address, accs[1].address, 1, 1000, proofs)
                ).to.be.revertedWith("Coin98VaultNft: Invalid proof");
            });
        });

        context("Wrong vault address", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                await expect(vaultProxy.connect(accs[0]).mint(ZERO_ADDRESS, accs[0].address, 1, 1000, proofs)).to.be
                    .reverted;
            });
        });
    });

    describe("Claim", async () => {
        context("Claim with correct params", async () => {
            it("Should claim", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                await vaultProxy.connect(accs[0]).mint(vault.address, accs[0].address, 1, 1000, proofs);
                await time.increaseTo((await time.latest()) + 101);

                const tx = await vaultProxy.connect(accs[0]).claim(vault.address, accs[0].address, 1, 0);
                expect(tx).to.changeTokenBalances(c98, [accs[0].address, vault], [100, -100]);
            });
        });

        context("Claim with invalid token id", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                await vaultProxy.connect(accs[0]).mint(vault.address, accs[0].address, 1, 1000, proofs);
                await time.increaseTo((await time.latest()) + 101);

                await expect(
                    vaultProxy.connect(accs[0]).claim(vault.address, accs[0].address, 0, 0)
                ).to.be.revertedWith("VRC725: invalid token ID");
            });
        });

        context("Claim before schedule", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                await vaultProxy.connect(accs[0]).mint(vault.address, accs[0].address, 1, 1000, proofs);

                await expect(
                    vaultProxy.connect(accs[0]).claim(vault.address, accs[0].address, 1, 0)
                ).to.be.revertedWith("Coin98VaultNft: Schedule not available");
            });
        });

        context("Receiver not owner of NFT", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                await vaultProxy.connect(accs[0]).mint(vault.address, accs[0].address, 1, 1000, proofs);
                await time.increaseTo((await time.latest()) + 101);

                await expect(
                    vaultProxy.connect(accs[1]).claim(vault.address, accs[1].address, 1, 0)
                ).to.be.revertedWith("Coin98VaultNft: Not owner of token");
            });
        });
    });
});
