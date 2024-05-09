import { ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { Coin98VaultNftFactory, MockERC20 } from "../../typechain-types";

export interface FactoryFixture {
    owner: SignerWithAddress;
    acc1: SignerWithAddress;
    acc2: SignerWithAddress;
    admin: SignerWithAddress;
    accs: SignerWithAddress[];
    vaultFactory: Coin98VaultNftFactory;
    c98: MockERC20;
}

export async function factoryFixture(): Promise<FactoryFixture> {
    const [owner, acc1, acc2, admin, ...accs] = await ethers.getSigners();

    const C98 = await ethers.getContractFactory("MockERC20");
    const c98 = await C98.deploy("C98", "C98", "10000", 18);
    await c98.deployed();
    console.log("MockERC20 deployed to:", c98.address);

    const Coin98VaultNft = await ethers.getContractFactory("Coin98VaultNft");
    const coin98VaultNft = await Coin98VaultNft.connect(owner).deploy();
    await coin98VaultNft.deployed();
    console.log("Coin98VaultNft deployed to:", coin98VaultNft.address);

    const Collection = await ethers.getContractFactory("Collection");
    const collection = await Collection.connect(owner).deploy();
    await collection.deployed();
    console.log("collection deployed to:", collection.address);

    const Coin98VaultNftFactory = await ethers.getContractFactory("Coin98VaultNftFactory");
    const vaultFactory = await Coin98VaultNftFactory.connect(owner).deploy(coin98VaultNft.address, collection.address);
    await vaultFactory.deployed();
    console.log("Coin98VaultNftFactory deployed to:", vaultFactory.address);

    return { owner, acc1, acc2, admin, accs, vaultFactory, c98 };
}
