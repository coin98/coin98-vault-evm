import {
  Hasher,
  ZERO_ADDRESS,
  ZERO_BYTES32,
} from "@coin98/solidity-support-library";
import { expect } from "chai";
import { Signer, utils } from "ethers";
import hhe from "hardhat";
import {
  Coin98VaultV2,
  Coin98VaultV2Factory,
  ERC20,
  Coin98V2VaultProxy,
  LegacyERC20,
} from "../typechain-types";
import { WhitelistData, createWhitelistTree } from "./common";
import * as hheh from "@nomicfoundation/hardhat-network-helpers";

describe("Vault redeem proxy start test", function () {
  let owner: Signer;
  let ownerAddress: string;
  let account1: Signer;
  let account1Address: string;
  let account2: Signer;
  let account2Address: string;
  let account3: Signer;
  let account3Address: string;
  let c98Token: ERC20;
  let usdtToken: LegacyERC20;
  let sut: Coin98VaultV2;
  let sutFactory: Coin98VaultV2Factory;
  let vaultProxy: Coin98V2VaultProxy;

  before(async function () {
    const signers = await hhe.ethers.getSigners();
    owner = signers[0];
    ownerAddress = await signers[0].getAddress();
    account1 = signers[1];
    account1Address = await signers[1].getAddress();
    account2 = signers[2];
    account2Address = await signers[2].getAddress();
    account3 = signers[3];
    account3Address = await signers[3].getAddress();

    const tokenFactory = await hhe.ethers.getContractFactory("ERC20");
    c98Token = await tokenFactory.connect(owner).deploy("Coin98", "C98", 6);
    await c98Token.deployed();

    const legacyTokenFactory = await hhe.ethers.getContractFactory(
      "LegacyERC20"
    );
    usdtToken = await legacyTokenFactory
      .connect(owner)
      .deploy("Tether USD", "USDT", 6);
    await usdtToken.deployed();

    const vaultFactory = await hhe.ethers.getContractFactory("Coin98VaultV2");
    const vault = await vaultFactory.connect(owner).deploy();
    await vault.deployed();

    const vaultFactoryFactory = await hhe.ethers.getContractFactory(
      "Coin98VaultV2Factory"
    );
    sutFactory = await vaultFactoryFactory.connect(owner).deploy(vault.address);
    await sutFactory.deployed();

    const salt = "0x" + Hasher.keccak256("vault_user").toString("hex");
    const deployTransaction = await sutFactory
      .connect(owner)
      .createVault(ownerAddress, salt);
    await deployTransaction.wait();
    const sutAddress = await sutFactory.getVaultAddress(salt);
    sut = await hhe.ethers.getContractAt("Coin98VaultV2", sutAddress);

    const vaultProxyFactory = await hhe.ethers.getContractFactory(
      "Coin98V2VaultProxy"
    );
    vaultProxy = await vaultProxyFactory.connect(owner).deploy();
    await vaultProxy.deployed();
    console.log("vaultProxy address: ", vaultProxy.address);
  });

  it("redeem proxy start successful", async function () {
    let currentTimestamp = new Date().getTime();
    const salt = utils.solidityKeccak256(
      ["uint256", "uint256", "uint256"],
      [currentTimestamp, Math.floor(Math.random() * 1000000000), 1001]
    );
    let whitelists = [
      <WhitelistData>{
        index: 0,
        unlockTimestamp: currentTimestamp,
        recipientAddress: account1Address,
        receivingAmount: 1000000,
        sendingAmount: 0,
      },
      <WhitelistData>{
        index: 1,
        unlockTimestamp: currentTimestamp,
        recipientAddress: account2Address,
        receivingAmount: 1000000,
        sendingAmount: 0,
      },
      <WhitelistData>{
        index: 2,
        unlockTimestamp: currentTimestamp,
        recipientAddress: account3Address,
        receivingAmount: 1000000,
        sendingAmount: 0,
      },
    ];
    const whitelistTree = createWhitelistTree(whitelists);
    const whitelistRoot = "0x" + whitelistTree.root().hash.toString("hex");
    await sut
      .connect(owner)
      .createEvent(salt, whitelistRoot, c98Token.address, ZERO_ADDRESS);

    await c98Token.connect(owner).mint(sut.address, 3000000);
    const whilelistProofs = whitelistTree.proofs(0);
    const proofs = whilelistProofs.map(
      (node) => "0x" + node.hash.toString("hex")
    );

    await hheh.time.increaseTo(currentTimestamp);
    const balanceBefore = await c98Token.balanceOf(account1Address);

    await vaultProxy
      .connect(account1)
      .redeem(
        sut.address,
        salt,
        0,
        currentTimestamp,
        account1Address,
        1000000,
        0,
        proofs
      );
    const balanceAfter = await c98Token.balanceOf(account1Address);
    expect(balanceAfter.sub(balanceBefore).toNumber()).eq(1000000);
  });

  it("redeem proxy start successful with sending token", async function () {
    let currentTimestamp = new Date().getTime();
    const salt = utils.solidityKeccak256(
      ["uint256", "uint256", "uint256"],
      [currentTimestamp, Math.floor(Math.random() * 1000000000), 1001]
    );
    let whitelists = [
      <WhitelistData>{
        index: 0,
        unlockTimestamp: currentTimestamp,
        recipientAddress: account1Address,
        receivingAmount: 1000000,
        sendingAmount: 1000,
      },
      <WhitelistData>{
        index: 1,
        unlockTimestamp: currentTimestamp,
        recipientAddress: account2Address,
        receivingAmount: 1000000,
        sendingAmount: 0,
      },
      <WhitelistData>{
        index: 2,
        unlockTimestamp: currentTimestamp,
        recipientAddress: account3Address,
        receivingAmount: 1000000,
        sendingAmount: 0,
      },
    ];
    const whitelistTree = createWhitelistTree(whitelists);
    const whitelistRoot = "0x" + whitelistTree.root().hash.toString("hex");
    await sut
      .connect(owner)
      .createEvent(salt, whitelistRoot, c98Token.address, usdtToken.address);

    // Mint for account 1 usdt
    await usdtToken.connect(owner).mint(account1Address, 1000);
    const balanceusdtAccount1 = await usdtToken.balanceOf(account1Address);
    expect(balanceusdtAccount1.toNumber()).eq(1000);

    const balanceVaultBefore = await usdtToken.balanceOf(sut.address);

    await usdtToken.connect(account1).approve(vaultProxy.address, 1000);

    await c98Token.connect(owner).mint(sut.address, 3000000);
    const whilelistProofs = whitelistTree.proofs(0);
    const proofs = whilelistProofs.map(
      (node) => "0x" + node.hash.toString("hex")
    );

    await hheh.time.increaseTo(currentTimestamp);
    const balanceBefore = await c98Token.balanceOf(account1Address);

    await vaultProxy
      .connect(account1)
      .redeem(
        sut.address,
        salt,
        0,
        currentTimestamp,
        account1Address,
        1000000,
        1000,
        proofs
      );
    const balanceAfter = await c98Token.balanceOf(account1Address);
    const balanceVaultAfter = await usdtToken.balanceOf(sut.address);

    expect(balanceVaultAfter.sub(balanceVaultBefore).toNumber()).eq(1000);
    expect(balanceAfter.sub(balanceBefore).toNumber()).eq(1000000);
  });
});
