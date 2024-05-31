import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import {
    Coin98VaultNft,
    MockERC20,
    CreditVaultNFT,
    Coin98VaultNftFactory,
    Coin98VaultNftProxy,
    FixedPriceOracle
} from "../../typechain-types";
import { Hasher, MerkleTreeKeccak, ZERO_ADDRESS } from "@coin98/solidity-support-library";
import { WhitelistCollectionData, createWhitelistCollectionTree } from "../common";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { factoryFixture } from "./factory.fixture";

export interface VaultFixture {
    owner: SignerWithAddress;
    acc1: SignerWithAddress;
    acc2: SignerWithAddress;
    accs: SignerWithAddress[];
    vault: Coin98VaultNft;
    vaultProxy: Coin98VaultNftProxy;
    collection: CreditVaultNFT;
    fixedPriceOracle: FixedPriceOracle;
    c98: MockERC20;
    usdt: MockERC20;
    tree: MerkleTreeKeccak;
}

export async function vaultFixture(): Promise<VaultFixture> {
    let owner: SignerWithAddress;
    let acc1: SignerWithAddress;
    let acc2: SignerWithAddress;
    let accs: SignerWithAddress[];
    let coin98VaultNft: Coin98VaultNft;
    let vaultFactory: Coin98VaultNftFactory;
    let vaultProxy: Coin98VaultNftProxy;
    let collectionFactory: CreditVaultNFT;
    let fixedPriceOracle: FixedPriceOracle;
    let c98: MockERC20;
    let usdt: MockERC20;
    tree: MerkleTreeKeccak;
    ({
        owner,
        acc1,
        acc2,
        accs,
        vaultFactory,
        vaultProxy,
        collectionFactory,
        coin98VaultNft,
        fixedPriceOracle,
        c98,
        usdt
    } = await loadFixture(factoryFixture));

    const vaultSalt = "0x" + Hasher.keccak256("vault").toString("hex");
    let whitelistData = [
        <WhitelistCollectionData>{ to: accs[0].address, merkleId: 1, totalAlloc: 1000 },
        <WhitelistCollectionData>{ to: accs[1].address, merkleId: 2, totalAlloc: 2000 },
        <WhitelistCollectionData>{ to: accs[2].address, merkleId: 3, totalAlloc: 3000 }
    ];
    let tree = createWhitelistCollectionTree(whitelistData);
    const whitelistRoot = "0x" + tree.root().hash.toString("hex");
    let vaultInitParams = {
        owner: owner.address,
        token: c98.address,
        collection: ZERO_ADDRESS,
        maxSplitRate: 7000,
        minSplitRate: 3000,
        merkleRoot: whitelistRoot,
        salt: vaultSalt,
        schedules: [
            { timestamp: (await time.latest()) + 100, percent: 1000 },
            { timestamp: (await time.latest()) + 200, percent: 2000 },
            { timestamp: (await time.latest()) + 300, percent: 3000 },
            { timestamp: (await time.latest()) + 400, percent: 4000 }
        ],
        feeTokenAddresses: [usdt.address],
        feeTokenInfos: [
            {
                oracle: fixedPriceOracle.address,
                feeInToken: 0,
                feeInUsd: ethers.utils.parseEther("1")
            }
        ],
        feeReceiver: owner.address,
        proxy: vaultProxy.address
    };

    const collectionSalt = "0x" + Hasher.keccak256("collection").toString("hex");
    let collectionInitParams = {
        owner: owner.address,
        name: "Test CreditVaultNFT",
        symbol: "TC",
        salt: collectionSalt
    };

    await vaultFactory.connect(owner).createVault(vaultInitParams, collectionInitParams);

    let vaultAddress = await vaultFactory.getVaultAddress(vaultSalt);
    console.log("Vault address:", vaultAddress);
    let collectionAddress = await vaultFactory.getCollectionAddress(collectionSalt);
    console.log("CreditVaultNFT address:", collectionAddress);

    const collection = collectionFactory.attach(collectionAddress);
    const vault = coin98VaultNft.attach(vaultAddress);

    await c98.connect(owner).approve(vault.address, 10000);
    await c98.connect(owner).transfer(vault.address, 10000);

    await fixedPriceOracle.connect(owner).updatePrice(ethers.utils.parseEther("1"), 18);

    return { owner, acc1, acc2, accs, vault, collection, fixedPriceOracle, vaultProxy, c98, usdt, tree };
}
