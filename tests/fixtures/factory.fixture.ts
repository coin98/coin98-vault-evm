import { ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { Coin98VaultNftFactory, MockERC20, WETH } from "../../typechain-types";

export interface FactoryFixture {
    owner: SignerWithAddress;
    acc1: SignerWithAddress;
    acc2: SignerWithAddress;
    admin: SignerWithAddress;
    accs: SignerWithAddress[];
    vaultFactory: Coin98VaultNftFactory;
    c98: MockERC20;
    weth: WETH;
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

    const VaultNft = await ethers.getContractFactory("VaultNft");
    const vaultNft = await VaultNft.connect(owner).deploy();
    await vaultNft.deployed();
    console.log("VaultNft deployed to:", vaultNft.address);

    const WETH = await ethers.getContractFactory("WETH");
    const weth = await WETH.connect(owner).deploy();
    await weth.deployed();

    const Coin98VaultNftFactory = await ethers.getContractFactory("Coin98VaultNftFactory");
    const vaultFactory = await Coin98VaultNftFactory.connect(owner).deploy(coin98VaultNft.address, vaultNft.address);
    await vaultFactory.deployed();
    console.log("Coin98VaultNftFactory deployed to:", vaultFactory.address);

    return { owner, acc1, acc2, admin, accs, vaultFactory, c98, weth };
}
