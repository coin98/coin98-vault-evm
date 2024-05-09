import { ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { Coin98VaultNft, MockERC20, Collection } from "../../typechain-types";
import { Hasher, MerkleTreeKeccak } from "@coin98/solidity-support-library";
import { WhitelistNftData, createWhitelistNftTree } from "../common";
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
    whitelistData: WhitelistNftData[];
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
    // console.log("Coin98VaultNft deployed to:", coin98VaultNft.address);

    const CollectionFactory = await ethers.getContractFactory("Collection");
    const collectionFactory = await CollectionFactory.connect(owner).deploy();
    await collectionFactory.deployed();
    // console.log("Collection deployed to:", collectionFactory.address);

    const Coin98VaultNftFactory = await ethers.getContractFactory("Coin98VaultNftFactory");
    const vaultFactory = await Coin98VaultNftFactory.connect(owner).deploy(
        coin98VaultNft.address,
        collectionFactory.address
    );
    await vaultFactory.deployed();
    console.log("Coin98VaultNftFactory deployed to:", vaultFactory.address);

    const salt = "0x" + Hasher.keccak256("vault").toString("hex");
    let whitelistData = [
        <WhitelistNftData>{ to: accs[0].address, tokenId: 1, totalAlloc: 1000 },
        <WhitelistNftData>{ to: accs[1].address, tokenId: 2, totalAlloc: 2000 },
        <WhitelistNftData>{ to: accs[2].address, tokenId: 3, totalAlloc: 3000 }
    ];
    let tree = createWhitelistNftTree(whitelistData);

    const whitelistRoot = "0x" + tree.root().hash.toString("hex");
    let initParams = {
        token: c98.address,
        merkleRoot: whitelistRoot,
        schedules: [
            { timestamp: (await time.latest()) + 100, percent: 10 },
            { timestamp: (await time.latest()) + 200, percent: 20 },
            { timestamp: (await time.latest()) + 300, percent: 30 },
            { timestamp: (await time.latest()) + 400, percent: 40 }
        ]
    };

    await vaultFactory.connect(owner).createVault("Collection nft", "CNFT", owner.address, initParams, salt);

    let vaultAddress = await vaultFactory.getVaultAddress(salt);
    console.log("Vault address:", vaultAddress);
    let collectionAddress = await vaultFactory.getCollectionAddress(salt);
    console.log("Collection address:", collectionAddress);

    const collection = collectionFactory.attach(collectionAddress);
    const vault = Coin98VaultNft.attach(vaultAddress);

    await c98.connect(owner).approve(vault.address, 10000);
    await c98.connect(owner).transfer(vault.address, 10000);

    return { owner, acc1, acc2, admin, accs, vault, collection, c98, whitelistData, tree };
}
