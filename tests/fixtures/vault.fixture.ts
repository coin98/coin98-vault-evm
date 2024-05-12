import { ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { Coin98VaultNft, MockERC20, Collection } from "../../typechain-types";
import { Hasher, MerkleTreeKeccak, ZERO_ADDRESS } from "@coin98/solidity-support-library";
import { WhitelistCollectionData, createWhitelistCollectionTree } from "../common";
import { time } from "@nomicfoundation/hardhat-network-helpers";

export interface VaultFixture {
    owner: SignerWithAddress;
    acc1: SignerWithAddress;
    acc2: SignerWithAddress;
    admin: SignerWithAddress;
    accs: SignerWithAddress[];
    vault: Coin98VaultNft;
    collection: Collection;
    c98: MockERC20;
    whitelistData: WhitelistCollectionData[];
    tree: MerkleTreeKeccak;
}

export async function vaultFixture(): Promise<VaultFixture> {
    const [owner, acc1, acc2, admin, ...accs] = await ethers.getSigners();

    const C98 = await ethers.getContractFactory("MockERC20");
    const c98 = await C98.deploy("C98", "C98", "10000", 18);
    await c98.deployed();
    console.log("MockERC20 deployed to:", c98.address);

    const Coin98VaultNft = await ethers.getContractFactory("Coin98VaultNft");
    const coin98VaultNft = await Coin98VaultNft.connect(owner).deploy();
    await coin98VaultNft.deployed();

    const CollectionFactory = await ethers.getContractFactory("Collection");
    const collectionFactory = await CollectionFactory.connect(owner).deploy();
    await collectionFactory.deployed();

    const Coin98VaultNftFactory = await ethers.getContractFactory("Coin98VaultNftFactory");
    const vaultFactory = await Coin98VaultNftFactory.connect(owner).deploy(
        coin98VaultNft.address,
        collectionFactory.address
    );
    await vaultFactory.deployed();
    console.log("Coin98VaultNftFactory deployed to:", vaultFactory.address);

    const vaultSalt = "0x" + Hasher.keccak256("vault").toString("hex");
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

    const collectionSalt = "0x" + Hasher.keccak256("collection").toString("hex");
    let collectionInitParams = {
        owner: owner.address,
        name: "Test Collection",
        symbol: "TC",
        salt: collectionSalt
    };

    await vaultFactory.connect(owner).createVault(vaultInitParams, collectionInitParams);

    let vaultAddress = await vaultFactory.getVaultAddress(vaultSalt);
    console.log("Vault address:", vaultAddress);
    let collectionAddress = await vaultFactory.getCollectionAddress(collectionSalt);
    console.log("Collection address:", collectionAddress);

    const collection = collectionFactory.attach(collectionAddress);
    const vault = Coin98VaultNft.attach(vaultAddress);

    await c98.connect(owner).approve(vault.address, 10000);
    await c98.connect(owner).transfer(vault.address, 10000);

    return { owner, acc1, acc2, admin, accs, vault, collection, c98, whitelistData, tree };
}
