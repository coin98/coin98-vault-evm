import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { factoryFixture } from "./fixtures";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Coin98VaultNftFactory, MockERC20 } from "../typechain-types";
import { Hasher, ZERO_ADDRESS, ZERO_BYTES32 } from "@coin98/solidity-support-library";
import { WhitelistCollectionData, createWhitelistCollectionTree } from "./common";

let owner: SignerWithAddress;
let acc1: SignerWithAddress;
let accs: SignerWithAddress[];
let vaultFactory: Coin98VaultNftFactory;
let c98: MockERC20;

async function createCollection(owner: SignerWithAddress, salt: string) {
    let initParams = {
        owner: owner.address,
        name: "Test Collection",
        symbol: "TC",
        salt: salt
    };

    await vaultFactory.connect(owner).createCollection(initParams);
    return await vaultFactory.getCollectionAddress(salt);
}

async function createVault(owner: SignerWithAddress, vaultSalt: string, collectionSalt: string) {
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

    let collectionInitParams = {
        owner: owner.address,
        name: "Test Collection",
        symbol: "TC",
        salt: collectionSalt
    };

    await vaultFactory.connect(owner).createVault(vaultInitParams, collectionInitParams);

    return await vaultFactory.getVaultAddress(vaultSalt);
}

describe("Coin98VaultNftFactory", function () {
    beforeEach(async () => {
        ({ owner, acc1, accs, vaultFactory, c98 } = await loadFixture(factoryFixture));
    });

    describe("Create collection", async () => {
        context("Right init params", async () => {
            it("Should create collection", async () => {
                let salt = "0x" + Hasher.keccak256("collection").toString("hex");
                let initParams = {
                    owner: owner.address,
                    name: "Test Collection",
                    symbol: "TC",
                    salt: salt
                };

                const tx = await vaultFactory.connect(owner).createCollection(initParams);
                await expect(tx).to.emit(vaultFactory, "CollectionCreated");
            });
            it("Should get collection", async () => {
                let salt = "0x" + Hasher.keccak256("collection").toString("hex");
                let initParams = {
                    owner: owner.address,
                    name: "Test Collection",
                    symbol: "TC",
                    salt: salt
                };

                await vaultFactory.connect(owner).createCollection(initParams);

                let collectionAddress = await vaultFactory.getCollectionAddress(salt);

                expect(await vaultFactory.getCollection(0)).to.equal(collectionAddress);
            });
        });
    });

    describe("Create vault", async () => {
        context("Create vault and collection", async () => {
            it("Should create vault", async () => {
                const salt = "0x" + Hasher.keccak256("vault").toString("hex");
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
                    salt: salt,
                    schedules: [
                        { timestamp: (await time.latest()) + 100, percent: 1000 },
                        { timestamp: (await time.latest()) + 200, percent: 2000 },
                        { timestamp: (await time.latest()) + 300, percent: 3000 },
                        { timestamp: (await time.latest()) + 400, percent: 4000 }
                    ]
                };

                const collectionSalt = "0x" + Hasher.keccak256("collection").toString("hex");
                let collectionInitParams = {
                    owner: owner.address,
                    name: "Test Collection",
                    symbol: "TC",
                    salt: collectionSalt
                };

                const tx = await vaultFactory.connect(owner).createVault(vaultInitParams, collectionInitParams);

                expect(tx).to.emit(vaultFactory, "VaultCreated");
            });
        });

        context("Merkle root is zero", async () => {
            it("Should revert", async () => {
                const salt = "0x" + Hasher.keccak256("vault").toString("hex");

                let vaultInitParams = {
                    owner: owner.address,
                    token: c98.address,
                    collection: ZERO_ADDRESS,
                    merkleRoot: ZERO_BYTES32,
                    salt: salt,
                    schedules: [
                        { timestamp: (await time.latest()) + 100, percent: 1000 },
                        { timestamp: (await time.latest()) + 200, percent: 2000 },
                        { timestamp: (await time.latest()) + 300, percent: 3000 },
                        { timestamp: (await time.latest()) + 400, percent: 4000 }
                    ]
                };

                const collectionSalt = "0x" + Hasher.keccak256("collection").toString("hex");
                let collectionInitParams = {
                    owner: owner.address,
                    name: "Test Collection",
                    symbol: "TC",
                    salt: collectionSalt
                };

                await expect(
                    vaultFactory.connect(owner).createVault(vaultInitParams, collectionInitParams)
                ).to.be.revertedWith("Coin98VaultNftFactory: Invalid merkle root");
            });
        });

        context("Create vault with exist collection", async () => {
            it("Should create vault", async () => {
                // Create collection
                let collectionSalt = "0x" + Hasher.keccak256("collection_test").toString("hex");
                let collectionInitParams = {
                    owner: owner.address,
                    name: "Test Collection",
                    symbol: "TC",
                    salt: collectionSalt
                };

                await vaultFactory.connect(owner).createCollection(collectionInitParams);
                const collectionAddress = await vaultFactory.getCollectionAddress(collectionSalt);

                const salt = "0x" + Hasher.keccak256("vault").toString("hex");
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
                    collection: collectionAddress,
                    merkleRoot: whitelistRoot,
                    salt: salt,
                    schedules: [
                        { timestamp: (await time.latest()) + 100, percent: 1000 },
                        { timestamp: (await time.latest()) + 200, percent: 2000 },
                        { timestamp: (await time.latest()) + 300, percent: 3000 },
                        { timestamp: (await time.latest()) + 400, percent: 4000 }
                    ]
                };

                const tx = await vaultFactory.connect(owner).createVault(vaultInitParams, collectionInitParams);

                let vaultAddress = await vaultFactory.getVaultAddress(salt);

                expect(tx).to.emit(vaultFactory, "VaultCreated");

                expect(await vaultFactory.getCollection(0)).to.equal(collectionAddress);
                expect(await vaultFactory.getVault(0)).to.equal(vaultAddress);
            });
        });

        context("Create multiple vault  ", async () => {
            it("Should create multiple vault", async () => {
                const salt1 = "0x" + Hasher.keccak256("vault1").toString("hex");
                const salt2 = "0x" + Hasher.keccak256("vault2").toString("hex");
                const salt3 = "0x" + Hasher.keccak256("vault3").toString("hex");

                const collectionSalt1 = "0x" + Hasher.keccak256("collection1").toString("hex");
                const collectionSalt2 = "0x" + Hasher.keccak256("collection2").toString("hex");
                const collectionSalt3 = "0x" + Hasher.keccak256("collection3").toString("hex");

                const vault1 = await createVault(owner, salt1, collectionSalt1);
                const vault2 = await createVault(owner, salt2, collectionSalt2);
                const vault3 = await createVault(owner, salt3, collectionSalt3);

                const collectionAddress1 = await vaultFactory.getCollectionAddress(collectionSalt1);
                const collectionAddress2 = await vaultFactory.getCollectionAddress(collectionSalt2);
                const collectionAddress3 = await vaultFactory.getCollectionAddress(collectionSalt3);

                expect(vault1).to.not.equal(vault2);
                expect(vault2).to.not.equal(vault3);
                expect(vault1).to.not.equal(vault3);

                expect(await vaultFactory.getVault(0)).to.equal(vault1);
                expect(await vaultFactory.getVault(1)).to.equal(vault2);
                expect(await vaultFactory.getVault(2)).to.equal(vault3);

                expect(await vaultFactory.getCollection(0)).to.equal(collectionAddress1);
                expect(await vaultFactory.getCollection(1)).to.equal(collectionAddress2);
                expect(await vaultFactory.getCollection(2)).to.equal(collectionAddress3);
            });
        });

        context("Create multiple vault with same init params", async () => {
            it("Should revert ", async () => {
                const salt = "0x" + Hasher.keccak256("vault").toString("hex");
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
                    salt: salt,
                    schedules: [
                        { timestamp: (await time.latest()) + 100, percent: 1000 },
                        { timestamp: (await time.latest()) + 200, percent: 2000 },
                        { timestamp: (await time.latest()) + 300, percent: 3000 },
                        { timestamp: (await time.latest()) + 400, percent: 4000 }
                    ]
                };

                const collectionSalt = "0x" + Hasher.keccak256("collection").toString("hex");
                let collectionInitParams = {
                    owner: owner.address,
                    name: "Test Collection",
                    symbol: "TC",
                    salt: collectionSalt
                };

                await vaultFactory.connect(owner).createVault(vaultInitParams, collectionInitParams);

                await expect(
                    vaultFactory.connect(owner).createVault(vaultInitParams, collectionInitParams)
                ).to.be.revertedWith("ERC1167: create2 failed");
            });
        });
    });

    describe("Withdraw", async () => {
        context("Token balance is enough", async () => {
            it("Should withdraw", async () => {
                await c98.connect(owner).approve(vaultFactory.address, 1000);
                await c98.connect(owner).transfer(vaultFactory.address, 1000);

                const tx = await vaultFactory.connect(owner).withdraw(c98.address, acc1.address, 1000);
                await expect(tx).to.emit(vaultFactory, "Withdrawn");
            });
        });

        context("Token balance is not enough", async () => {
            it("Should revert", async () => {
                await c98.connect(owner).approve(vaultFactory.address, 1000);
                await c98.connect(owner).transfer(vaultFactory.address, 1000);

                await expect(vaultFactory.connect(owner).withdraw(c98.address, acc1.address, 2000)).to.be.revertedWith(
                    "Coin98VaultNftFactory: Not enough balance"
                );
            });
        });

        context("Receiver is zero address", async () => {
            it("Should revert", async () => {
                await c98.connect(owner).approve(vaultFactory.address, 1000);
                await c98.connect(owner).transfer(vaultFactory.address, 1000);

                await expect(vaultFactory.connect(owner).withdraw(c98.address, ZERO_ADDRESS, 1000)).to.be.revertedWith(
                    "Coin98VaultNftFactory: Receiver is zero address"
                );
            });
        });
    });

    describe("Set vault implementation", async () => {
        context("Set implementation", async () => {
            it("Should emit implementation", async () => {
                const Coin98VaultNft = await ethers.getContractFactory("Coin98VaultNft");
                const coin98VaultNft = await Coin98VaultNft.connect(owner).deploy();
                await coin98VaultNft.deployed();

                const tx = await vaultFactory.connect(owner).setVaultImplementation(coin98VaultNft.address);
                await expect(tx).to.emit(vaultFactory, "SetVaultImplementation").withArgs(coin98VaultNft.address);
            });

            it("Should change vault implementation", async () => {
                // Get vault implementation
                const vaultImplementation = await vaultFactory.getVaultImplementation();

                const Coin98VaultNft = await ethers.getContractFactory("Coin98VaultNft");
                const coin98VaultNft = await Coin98VaultNft.connect(owner).deploy();
                await coin98VaultNft.deployed();

                await vaultFactory.connect(owner).setVaultImplementation(coin98VaultNft.address);

                const vaultImplementation2 = await vaultFactory.getVaultImplementation();

                expect(vaultImplementation2).to.not.equal(vaultImplementation);
                expect(vaultImplementation2).to.equal(coin98VaultNft.address);
            });
        });

        context("Set implementation with zero address", async () => {
            it("Should revert", async () => {
                await expect(vaultFactory.connect(owner).setVaultImplementation(ZERO_ADDRESS)).to.be.revertedWith(
                    "Coin98VaultNftFactory: Invalid implementation"
                );
            });
        });

        context("Set implementation with non-owner", async () => {
            it("Should revert", async () => {
                const Coin98VaultNft = await ethers.getContractFactory("Coin98VaultNft");
                const coin98VaultNft = await Coin98VaultNft.connect(owner).deploy();
                await coin98VaultNft.deployed();

                await expect(
                    vaultFactory.connect(acc1).setVaultImplementation(coin98VaultNft.address)
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        context("Set implementation with same implementation", async () => {
            it("Should revert", async () => {
                const vaultImplementation = await vaultFactory.getVaultImplementation();
                await expect(
                    vaultFactory.connect(owner).setVaultImplementation(vaultImplementation)
                ).to.be.revertedWith("Coin98VaultNftFactory: Same implementation");
            });
        });
    });

    describe("Set collection implementation", async () => {
        context("Set implementation", async () => {
            it("Should emit implementation", async () => {
                const Collection = await ethers.getContractFactory("Collection");
                const collection = await Collection.connect(owner).deploy();
                await collection.deployed();

                const tx = await vaultFactory.connect(owner).setCollectionImplementation(collection.address);
                await expect(tx).to.emit(vaultFactory, "SetCollectionImplementation").withArgs(collection.address);
            });

            it("Should change collection implementation", async () => {
                // Get collection implementation
                const collectionImplementation = await vaultFactory.getCollectionImplementation();

                const Collection = await ethers.getContractFactory("Collection");
                const collection = await Collection.connect(owner).deploy();
                await collection.deployed();

                await vaultFactory.connect(owner).setCollectionImplementation(collection.address);

                const collectionImplementation2 = await vaultFactory.getCollectionImplementation();

                expect(collectionImplementation2).to.not.equal(collectionImplementation);
                expect(collectionImplementation2).to.equal(collection.address);
            });
        });

        context("Set implementation with zero address", async () => {
            it("Should revert", async () => {
                await expect(vaultFactory.connect(owner).setCollectionImplementation(ZERO_ADDRESS)).to.be.revertedWith(
                    "Coin98VaultNftFactory: Invalid implementation"
                );
            });
        });

        context("Set implementation with non-owner", async () => {
            it("Should revert", async () => {
                const Collection = await ethers.getContractFactory("Collection");
                const collection = await Collection.connect(owner).deploy();
                await collection.deployed();

                await expect(
                    vaultFactory.connect(acc1).setCollectionImplementation(collection.address)
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        context("Set implementation with same implementation", async () => {
            it("Should revert", async () => {
                const collectionImplementation = await vaultFactory.getCollectionImplementation();
                await expect(
                    vaultFactory.connect(owner).setCollectionImplementation(collectionImplementation)
                ).to.be.revertedWith("Coin98VaultNftFactory: Same implementation");
            });
        });
    });

    describe("Get vault", async () => {
        context("Get vault address", async () => {
            it("Should get vault address", async () => {
                const salt = "0x" + Hasher.keccak256("vault").toString("hex");
                const collectionSalt = "0x" + Hasher.keccak256("collection").toString("hex");

                const vault = await createVault(owner, salt, collectionSalt);
                const vaultAddress = await vaultFactory.getVaultAddress(salt);

                expect(vault).to.equal(vaultAddress);
            });
        });

        context("Get list of getVault", async () => {
            it("Should get list of getVault", async () => {
                const salt1 = "0x" + Hasher.keccak256("vault1").toString("hex");
                const salt2 = "0x" + Hasher.keccak256("vault2").toString("hex");
                const salt3 = "0x" + Hasher.keccak256("vault3").toString("hex");

                const collectionSalt1 = "0x" + Hasher.keccak256("collection1").toString("hex");
                const collectionSalt2 = "0x" + Hasher.keccak256("collection2").toString("hex");
                const collectionSalt3 = "0x" + Hasher.keccak256("collection3").toString("hex");

                let vault1 = await createVault(owner, salt1, collectionSalt1);
                let vault2 = await createVault(owner, salt2, collectionSalt2);
                let vault3 = await createVault(owner, salt3, collectionSalt3);

                expect(await vaultFactory.getVault(0)).to.equal(vault1);
                expect(await vaultFactory.getVault(1)).to.equal(vault2);
                expect(await vaultFactory.getVault(2)).to.equal(vault3);
            });
        });
    });

    describe("Get collection", async () => {
        context("Get collection address", async () => {
            it("Should get collection address", async () => {
                const salt = "0x" + Hasher.keccak256("collection").toString("hex");

                const collection = await createCollection(owner, salt);
                const collectionAddress = await vaultFactory.getCollectionAddress(salt);

                expect(collection).to.equal(collectionAddress);
            });
        });

        context("Get list of getCollection", async () => {
            it("Should get list of getCollection", async () => {
                const salt1 = "0x" + Hasher.keccak256("collection1").toString("hex");
                const salt2 = "0x" + Hasher.keccak256("collection2").toString("hex");
                const salt3 = "0x" + Hasher.keccak256("collection3").toString("hex");

                let collection1 = await createCollection(owner, salt1);
                let collection2 = await createCollection(owner, salt2);
                let collection3 = await createCollection(owner, salt3);

                expect(await vaultFactory.getCollection(0)).to.equal(collection1);
                expect(await vaultFactory.getCollection(1)).to.equal(collection2);
                expect(await vaultFactory.getCollection(2)).to.equal(collection3);
            });
        });
    });

    describe("Get vault address from collection", async () => {
        context("Get vault from collection", async () => {
            it("Should get vault from collection", async () => {
                const salt = "0x" + Hasher.keccak256("vault").toString("hex");
                const collectionSalt = "0x" + Hasher.keccak256("collection").toString("hex");

                const vault = await createVault(owner, salt, collectionSalt);

                // Get collection address
                const collectionAddress = await vaultFactory.getCollectionAddress(collectionSalt);

                const vaultAddress = await vaultFactory.getVaultFromCollection(collectionAddress);

                expect(vault).to.equal(vaultAddress);
            });
        });
    });

    describe("Get total allocation", async () => {
        context("Though Coin98VaultNft", async () => {
            it("Should get total allocation", async () => {
                let whitelistData = [
                    <WhitelistCollectionData>{ to: accs[0].address, tokenId: 1, totalAlloc: 1000 },
                    <WhitelistCollectionData>{ to: accs[1].address, tokenId: 2, totalAlloc: 2000 },
                    <WhitelistCollectionData>{ to: accs[2].address, tokenId: 3, totalAlloc: 3000 }
                ];
                let tree = createWhitelistCollectionTree(whitelistData);
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                const salt = "0x" + Hasher.keccak256("vault").toString("hex");
                const collectionSalt = "0x" + Hasher.keccak256("collection").toString("hex");

                const vault = await createVault(owner, salt, collectionSalt);

                const collectionAddress = await vaultFactory.getCollectionAddress(collectionSalt);
                // Attach to vault
                const coin98VaultNft = await ethers.getContractAt("Coin98VaultNft", vault);
                // mint NFT 1
                await coin98VaultNft.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                // Get total allocation of NFT 1
                const totalAlloc = await vaultFactory.getTotalAlloc(collectionAddress, 1);

                expect(totalAlloc).to.equal(1000);
            });
        });
    });

    describe("Get claimed allocation", async () => {
        context("Though Coin98VaultNft", async () => {
            it("Should get claimed allocation", async () => {
                let whitelistData = [
                    <WhitelistCollectionData>{ to: accs[0].address, tokenId: 1, totalAlloc: 1000 },
                    <WhitelistCollectionData>{ to: accs[1].address, tokenId: 2, totalAlloc: 2000 },
                    <WhitelistCollectionData>{ to: accs[2].address, tokenId: 3, totalAlloc: 3000 }
                ];
                let tree = createWhitelistCollectionTree(whitelistData);
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                const salt = "0x" + Hasher.keccak256("vault").toString("hex");
                const collectionSalt = "0x" + Hasher.keccak256("collection").toString("hex");

                const vault = await createVault(owner, salt, collectionSalt);

                // Get vault address
                const vaultAddress = await vaultFactory.getVaultAddress(salt);
                // Get collection address
                const collectionAddress = await vaultFactory.getCollectionAddress(collectionSalt);
                // Attach to vault
                const coin98VaultNft = await ethers.getContractAt("Coin98VaultNft", vaultAddress);
                // mint NFT 1
                await coin98VaultNft.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await c98.connect(owner).approve(vaultAddress, 1000);
                await c98.connect(owner).transfer(vaultAddress, 1000);

                // Claim schedule 1
                await time.increaseTo((await time.latest()) + 101);
                await coin98VaultNft.connect(accs[0]).claim(accs[0].address, 1, 0);

                // Get claimed allocation of NFT 1
                const claimedAlloc = await vaultFactory.getClaimedAlloc(collectionAddress, 1);

                expect(claimedAlloc).to.equal(100);
            });
        });
    });
});
