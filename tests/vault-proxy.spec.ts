import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Coin98VaultNftProxy, MockERC20, Collection, Coin98VaultNft, Coin98VaultNftFactory } from "../typechain-types";
import { Hasher, MerkleTreeKeccak, ZERO_ADDRESS } from "@coin98/solidity-support-library";
import { WhitelistCollectionData, createWhitelistCollectionTree } from "./common";
import { ethers } from "hardhat";
import { vaultProxyFixture } from "./fixtures";

let owner: SignerWithAddress;
let acc1: SignerWithAddress;
let accs: SignerWithAddress[];
let vault: Coin98VaultNft;
let vaultFactory: Coin98VaultNftFactory;
let vaultProxy: Coin98VaultNftProxy;
let collection: Collection;
let c98: MockERC20;
let tree: MerkleTreeKeccak;

describe("Coin98VaultNftProxy", function () {
    beforeEach(async () => {
        ({ owner, acc1, accs, vault, vaultFactory, vaultProxy, collection, c98, tree } = await loadFixture(
            vaultProxyFixture
        ));
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

    describe("Create Vault", async () => {
        context("Create vault with correct params", async () => {
            it("Should create vault", async () => {
                const vaultSalt = "0x" + Hasher.keccak256("vault-proxy").toString("hex");
                let whitelistData = [
                    <WhitelistCollectionData>{ to: accs[0].address, tokenId: 1, totalAlloc: 1000 },
                    <WhitelistCollectionData>{ to: accs[1].address, tokenId: 2, totalAlloc: 2000 },
                    <WhitelistCollectionData>{ to: accs[2].address, tokenId: 3, totalAlloc: 3000 }
                ];
                let tree = createWhitelistCollectionTree(whitelistData);
                const whitelistRoot = "0x" + tree.root().hash.toString("hex");
                let vaultInitParams = {
                    owner: owner.address,
                    token: c98.address,
                    collection: ZERO_ADDRESS,
                    merkleRoot: whitelistRoot,
                    salt: vaultSalt,
                    schedules: [
                        { timestamp: (await time.latest()) + 100, percent: 1000 },
                        { timestamp: (await time.latest()) + 200, percent: 2000 },
                        { timestamp: (await time.latest()) + 300, percent: 3000 },
                        { timestamp: (await time.latest()) + 400, percent: 4000 }
                    ]
                };

                const collectionSalt = "0x" + Hasher.keccak256("collection-proxy").toString("hex");
                let collectionInitParams = {
                    owner: owner.address,
                    name: "Test Collection",
                    symbol: "TC",
                    salt: collectionSalt
                };

                await vaultProxy
                    .connect(owner)
                    .createVault(vaultFactory.address, vaultInitParams, collectionInitParams);

                let vaultAddress = await vaultFactory.getVaultAddress(vaultSalt);
                let collectionAddress = await vaultFactory.getCollectionAddress(collectionSalt);

                expect(await vaultFactory.vaults()).to.include(vaultAddress);
                expect(await vaultFactory.collections()).to.include(collectionAddress);
            });
        });
    });

    describe("Create Collection", async () => {
        context("Create collection with correct params", async () => {
            it("Should create collection", async () => {
                const collectionSalt = "0x" + Hasher.keccak256("collection-proxy").toString("hex");
                let collectionInitParams = {
                    owner: owner.address,
                    name: "Test Collection",
                    symbol: "TC",
                    salt: collectionSalt
                };

                await vaultProxy.connect(owner).createCollection(vaultFactory.address, collectionInitParams);

                let collectionAddress = await vaultFactory.getCollectionAddress(collectionSalt);

                expect(await vaultFactory.collections()).to.include(collectionAddress);
            });
        });
    });
});
