import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Coin98VaultNft, MockERC20, Collection } from "../typechain-types";
import { MerkleTreeKeccak, ZERO_ADDRESS } from "@coin98/solidity-support-library";
import { vaultFixture } from "./fixtures";
import { WhitelistCollectionData } from "./common";
import { ethers } from "hardhat";

let owner: SignerWithAddress;
let acc1: SignerWithAddress;
let acc2: SignerWithAddress;
let accs: SignerWithAddress[];
let vault: Coin98VaultNft;
let c98: MockERC20;
let collection: Collection;
let tree: MerkleTreeKeccak;

describe("Coin98VaultNftFactory", function () {
    beforeEach(async () => {
        ({ owner, acc1, acc2, accs, vault, collection, c98, tree } = await loadFixture(vaultFixture));
    });

    describe("Mint", async () => {
        context("To whitelist", async () => {
            it("Should mint NFT", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                const tx = await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);
                expect(await collection.ownerOf(1)).to.equal(accs[0].address);

                expect(tx).to.emit(vault, "Minted").withArgs(accs[0].address, 1, 1000);
            });
        });

        context("Not in whitelist", async () => {
            it("Wrong address", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                await expect(vault.connect(accs[1]).mint(accs[1].address, 1, 1000, proofs)).to.be.revertedWith(
                    "Coin98VaultNft: Invalid proof"
                );
            });

            it("Wrong tokenId", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                await expect(vault.connect(accs[0]).mint(accs[0].address, 2, 1000, proofs)).to.be.revertedWith(
                    "Coin98VaultNft: Invalid proof"
                );
            });

            it("Wrong totalAlloc", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                await expect(vault.connect(accs[0]).mint(accs[0].address, 1, 2000, proofs)).to.be.revertedWith(
                    "Coin98VaultNft: Invalid proof"
                );
            });
        });

        context("Mint multiple times", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await expect(vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs)).to.be.revertedWith(
                    "ERC721: token already minted"
                );
            });
        });
    });

    describe("Claim", async () => {
        context("Receiver not owner of NFT", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                await expect(vault.connect(accs[0]).claim(accs[1].address, 1, 0)).to.be.revertedWith(
                    "Coin98VaultNft: Not owner of token"
                );
            });
        });

        context("Token Id not minted", async () => {
            it("Should revert", async () => {
                await expect(vault.connect(accs[0]).claim(accs[0].address, 1, 0)).to.be.revertedWith(
                    "VRC725: invalid token ID"
                );
            });
        });

        context("Claim before schedule", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await expect(vault.connect(accs[0]).claim(accs[0].address, 1, 0)).to.be.revertedWith(
                    "Coin98VaultNft: Schedule not available"
                );
            });
        });

        context("Already claimed", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

                await expect(vault.connect(accs[0]).claim(accs[0].address, 1, 0)).to.be.revertedWith(
                    "Coin98VaultNft: Already claimed"
                );
            });
        });

        context("Wrong schedule index", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                await expect(vault.connect(accs[0]).claim(accs[0].address, 1, 1)).to.be.revertedWith(
                    "Coin98VaultNft: Schedule not available"
                );
            });
        });

        context("Claim after schedule", async () => {
            it("Should transfer correct amount", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                const tx = await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

                await expect(tx).to.changeTokenBalances(c98, [accs[0], vault], [100, -100]);
            });

            it("Should emit claimed event", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                const tx = await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

                await expect(tx).to.emit(vault, "Claimed").withArgs(accs[0].address, 1, 0, 100);
            });
        });

        context("Claim multiple times", async () => {
            it("Should claim multiple times", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

                await time.increaseTo((await time.latest()) + 201);
                const tx = await vault.connect(accs[0]).claim(accs[0].address, 1, 1);

                await expect(tx).to.emit(vault, "Claimed").withArgs(accs[0].address, 1, 1, 200);
                await expect(tx).to.changeTokenBalances(c98, [accs[0], vault], [200, -200]);

                await time.increaseTo((await time.latest()) + 301);
                const tx2 = await vault.connect(accs[0]).claim(accs[0].address, 1, 2);
                await expect(tx2).to.emit(vault, "Claimed").withArgs(accs[0].address, 1, 2, 300);
                await expect(tx2).to.changeTokenBalances(c98, [accs[0], vault], [300, -300]);

                await time.increaseTo((await time.latest()) + 401);
                const tx3 = await vault.connect(accs[0]).claim(accs[0].address, 1, 3);
                await expect(tx3).to.emit(vault, "Claimed").withArgs(accs[0].address, 1, 3, 400);
                await expect(tx3).to.changeTokenBalances(c98, [accs[0], vault], [400, -400]);
            });
        });
    });

    describe("Withdraw", async () => {
        context("Not owner", async () => {
            it("Should revert", async () => {
                await expect(vault.connect(acc1).withdraw(c98.address, acc1.address, 1000)).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                );
            });
        });

        context("Owner", async () => {
            it("Revert if not enough balance", async () => {
                await expect(vault.connect(owner).withdraw(c98.address, owner.address, 100001)).to.be.revertedWith(
                    "Coin98VaultNft: Not enough balance"
                );
            });
        });

        context("Correct amount", async () => {
            it("Should transfer ", async () => {
                const tx = await vault.connect(owner).withdraw(c98.address, owner.address, 1000);

                await expect(tx).to.changeTokenBalances(c98, [owner, vault], [1000, -1000]);
            });

            it("Should emit withdraw event", async () => {
                await expect(vault.connect(owner).withdraw(c98.address, owner.address, 1000))
                    .to.emit(vault, "Withdrawn")
                    .withArgs(owner.address, owner.address, c98.address, 1000);
            });
        });
    });

    describe("Set collection", async () => {
        context("Not owner", async () => {
            it("Should revert", async () => {
                await expect(vault.connect(acc1).setCollection(collection.address)).to.be.revertedWith(
                    "Ownable: caller is not an admin or an owner"
                );
            });
        });

        context("Owner", async () => {
            it("Should set collection", async () => {
                const tx = await vault.connect(owner).setCollection(collection.address);

                await expect(tx).to.emit(vault, "CollectionUpdated").withArgs(collection.address);
                expect(await vault.getCollectionAddress()).to.equal(collection.address);
            });

            it("Should revert if collection is zero address", async () => {
                await expect(vault.connect(owner).setCollection(ZERO_ADDRESS)).to.be.revertedWith(
                    "Coin98VaultNft: Collection is zero address"
                );
            });
        });
    });

    describe("Set admin", async () => {
        context("Not owner", async () => {
            it("Should revert", async () => {
                await expect(vault.connect(acc1).setAdmins([acc1.address], [true])).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                );
            });
        });

        context("Owner", async () => {
            it("Should set admin to true", async () => {
                const tx = await vault.connect(owner).setAdmins([acc1.address], [true]);

                await expect(tx).to.emit(vault, "AdminsUpdated").withArgs([acc1.address], [true]);
                expect(await vault.isAdmin(acc1.address)).to.equal(true);

                // Set collection
                const tx2 = await vault.connect(acc1).setCollection(collection.address);
                await expect(tx2).to.emit(vault, "CollectionUpdated").withArgs(collection.address);
            });

            it("Should set admin to false", async () => {
                const tx = await vault.connect(owner).setAdmins([acc1.address], [false]);

                await expect(tx).to.emit(vault, "AdminsUpdated").withArgs([acc1.address], [false]);
                expect(await vault.isAdmin(acc1.address)).to.equal(false);

                // Set collection
                await expect(vault.connect(acc1).setCollection(collection.address)).to.be.revertedWith(
                    "Ownable: caller is not an admin or an owner"
                );
            });
        });

        context("Multiple admins", async () => {
            it("Should set multiple admins", async () => {
                const tx = await vault.connect(owner).setAdmins([acc1.address, acc2.address], [true, true]);

                await expect(tx).to.emit(vault, "AdminsUpdated").withArgs([acc1.address, acc2.address], [true, true]);
                expect(await vault.isAdmin(acc1.address)).to.equal(true);
                expect(await vault.isAdmin(acc2.address)).to.equal(true);
            });
        });
    });

    describe("Get", async () => {
        context("Get schedule", async () => {
            it("Should get schedule", async () => {
                const schedule = await vault.getSchedules();

                expect(schedule[0].percent).to.equal(1000);
                expect(schedule[1].percent).to.equal(2000);
                expect(schedule[2].percent).to.equal(3000);
            });
        });

        context("Get total alloc", async () => {
            it("Total alloc should be 0", async () => {
                expect(await vault.getTotalAlloc(1)).to.equal(0);
            });

            it("Should get total alloc", async () => {
                // Mint token 1
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                // Get total alloc of token 1
                const totalAlloc = await vault.getTotalAlloc(1);

                expect(totalAlloc).to.equal(1000);
            });
        });

        context("Get claimed", async () => {
            it("Claimed should be 0", async () => {
                expect(await vault.getClaimedAlloc(1)).to.equal(0);
            });

            it("Should get claimed", async () => {
                // Mint token 1
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                // Claim 100
                await time.increaseTo((await time.latest()) + 101);
                await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

                // Get claimed of token 1
                const claimed = await vault.getClaimedAlloc(1);

                expect(claimed).to.equal(100);
            });
        });

        context("Get collection address", async () => {
            it("Should get collection address", async () => {
                expect(await vault.getCollectionAddress()).to.equal(collection.address);
            });

            it("After set collection", async () => {
                // new collection
                const newCollection = await (await ethers.getContractFactory("Collection")).deploy();

                await vault.connect(owner).setCollection(newCollection.address);
                expect(await vault.getCollectionAddress()).to.equal(newCollection.address);
            });
        });

        context("Get token address", async () => {
            it("Should get token address", async () => {
                expect(await vault.getTokenAddress()).to.equal(c98.address);
            });
        });

        context("Get claimed status", async () => {
            it("Should get claimed status", async () => {
                // Mint token 1
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                expect(await vault.getClaimedStatus(1, 0)).to.equal(false);

                // Claim 100
                await time.increaseTo((await time.latest()) + 101);
                await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

                expect(await vault.getClaimedStatus(1, 0)).to.equal(true);
            });
        });
    });
});
