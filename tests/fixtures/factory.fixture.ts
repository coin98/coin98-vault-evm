import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import {
    Coin98VaultNft,
    Coin98VaultNftFactory,
    Coin98VaultNftProxy,
    CreditVaultNFT,
    FixedPriceOracle,
    MockERC20
} from "../../typechain-types";

export interface FactoryFixture {
    owner: SignerWithAddress;
    acc1: SignerWithAddress;
    acc2: SignerWithAddress;
    accs: SignerWithAddress[];
    coin98VaultNft: Coin98VaultNft;
    vaultFactory: Coin98VaultNftFactory;
    vaultProxy: Coin98VaultNftProxy;
    collectionFactory: CreditVaultNFT;
    fixedPriceOracle: FixedPriceOracle;
    c98: MockERC20;
    usdt: MockERC20;
}

export async function factoryFixture(): Promise<FactoryFixture> {
    const [owner, acc1, acc2, ...accs] = await ethers.getSigners();

    const C98 = await ethers.getContractFactory("MockERC20");
    const c98 = await C98.deploy("C98", "C98", "10000", 18);
    await c98.deployed();
    console.log("MockERC20 deployed to:", c98.address);

    const USDT = await ethers.getContractFactory("MockERC20");
    const usdt = await USDT.deploy("USDT", "USDT", "10000", 18);
    await usdt.deployed();

    const Coin98VaultNft = await ethers.getContractFactory("Coin98VaultNft");
    const coin98VaultNft = await Coin98VaultNft.connect(owner).deploy();
    await coin98VaultNft.deployed();
    console.log("Coin98VaultNft deployed to:", coin98VaultNft.address);

    const CreditVaultNFT = await ethers.getContractFactory("CreditVaultNFT");
    const collectionFactory = await CreditVaultNFT.connect(owner).deploy();
    await collectionFactory.deployed();
    console.log("collection deployed to:", collectionFactory.address);

    const Coin98VaultNftFactory = await ethers.getContractFactory("Coin98VaultNftFactory");
    const vaultFactory = await Coin98VaultNftFactory.connect(owner).deploy(
        coin98VaultNft.address,
        collectionFactory.address
    );
    await vaultFactory.deployed();
    console.log("Coin98VaultNftFactory deployed to:", vaultFactory.address);

    const Coin98VaultNftProxy = await ethers.getContractFactory("Coin98VaultNftProxy");
    const vaultProxy = await Coin98VaultNftProxy.connect(owner).deploy("Coin98VaultNftProxy", "C98VNP");
    await vaultProxy.deployed();
    console.log("Coin98VaultNftProxy deployed to:", vaultProxy.address);

    const FixedPriceOracle = await ethers.getContractFactory("FixedPriceOracle");
    const fixedPriceOracle = await FixedPriceOracle.connect(owner).deploy();
    await fixedPriceOracle.deployed();
    console.log("FixedPriceOracle deployed to:", fixedPriceOracle.address);

    return {
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
    };
}
