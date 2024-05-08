import { ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { Coin98VaultNft, MockERC20, VaultNft } from "../../typechain-types";
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
    nft: VaultNft;
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

    const saltNft = "0x" + Hasher.keccak256("nft").toString("hex");
    await vaultFactory.connect(owner).createNft(owner.address, saltNft);
    let nftAddress = await vaultFactory.getNftAddress(saltNft);
    const nft = VaultNft.attach(nftAddress);

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
        nft: nftAddress,
        weth: weth.address,
        merkleRoot: whitelistRoot,
        schedules: [
            { timestamp: (await time.latest()) + 100, percent: 10 },
            { timestamp: (await time.latest()) + 200, percent: 20 },
            { timestamp: (await time.latest()) + 300, percent: 30 },
            { timestamp: (await time.latest()) + 400, percent: 40 }
        ]
    };

    await vaultFactory.connect(owner).createVault(owner.address, initParams, salt);
    let vaultAddress = await vaultFactory.getVaultAddress(salt);

    const vault = Coin98VaultNft.attach(vaultAddress);

    await c98.connect(owner).approve(vault.address, 10000);
    await c98.connect(owner).transfer(vault.address, 10000);

    await nft.connect(owner).setVault(vault.address);

    return { owner, acc1, acc2, admin, accs, vault, nft, c98, whitelistData, tree };
}
