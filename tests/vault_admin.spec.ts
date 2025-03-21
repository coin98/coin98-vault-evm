import { Hasher, ZERO_ADDRESS, ZERO_BYTES32 } from "./shared";
import { expect } from "chai";
import { Signer, utils } from "ethers";
import hhe from "hardhat";
import { Coin98VaultV2, Coin98VaultV2Factory, ERC20 } from "../typechain-types";
import { WhitelistData, createWhitelistTree } from "./common";

describe("vault administrative task tests", function () {
  let owner: Signer;
  let ownerAddress: string;
  let account1: Signer;
  let account1Address: string;
  let account2: Signer;
  let account2Address: string;
  let account3: Signer;
  let account3Address: string;
  let token: ERC20;
  let sut: Coin98VaultV2;
  let sutFactory: Coin98VaultV2Factory;

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
    token = await tokenFactory.connect(owner).deploy("Coin98", "C98", 6);
    await token.deployed();

    const Broadcaster = await hhe.ethers.getContractFactory("Broadcaster");
    const broadcaster = await Broadcaster.connect(owner).deploy();

    const vaultFactory = await hhe.ethers.getContractFactory("Coin98VaultV2");
    const vault = await vaultFactory.connect(owner).deploy(broadcaster.address);
    await vault.deployed();
    const vaultFactoryFactory = await hhe.ethers.getContractFactory("Coin98VaultV2Factory");
    sutFactory = await vaultFactoryFactory.connect(owner).deploy(vault.address, broadcaster.address);
    await sutFactory.deployed();

    broadcaster.connect(owner).registerProject(sutFactory.projectKey(), [sutFactory.address], [sutFactory.address]);

    const salt = "0x" + Hasher.keccak256("vault_admin").toString("hex");
    const deployTransaction = await sutFactory.connect(owner).createVault(ownerAddress, salt);
    await deployTransaction.wait();
    const sutAddress = await sutFactory.getVaultAddress(salt);
    sut = await hhe.ethers.getContractAt("Coin98VaultV2", sutAddress);
  });

  it("create event successful", async function () {
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
    await sut.connect(owner).createEvent(salt, whitelistRoot, token.address, ZERO_ADDRESS);
  });

  it("cannot overwrite existing event", async function () {
    let currentTimestamp = new Date().getTime();
    const salt = utils.solidityKeccak256(
      ["uint256", "uint256", "uint256"],
      [currentTimestamp, Math.floor(Math.random() * 1000000000), 1002]
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
    await sut.connect(owner).createEvent(salt, whitelistRoot, token.address, ZERO_ADDRESS);
    await expect(sut.connect(owner).createEvent(salt, whitelistRoot, token.address, ZERO_ADDRESS)).to.be.revertedWith(
      "C98Vault: Event existed"
    );
  });

  it("zero merkle proof is invalid", async function () {
    let currentTimestamp = new Date().getTime();
    const salt = utils.solidityKeccak256(
      ["uint256", "uint256", "uint256"],
      [currentTimestamp, Math.floor(Math.random() * 1000000000), 1003]
    );
    await expect(sut.connect(owner).createEvent(salt, ZERO_BYTES32, token.address, ZERO_ADDRESS)).to.be.rejectedWith(
      "C98Vault: Invalid merkle"
    );
  });

  it("cannot disable non-existant event", async function () {
    let currentTimestamp = new Date().getTime();
    const salt = utils.solidityKeccak256(
      ["uint256", "uint256", "uint256"],
      [currentTimestamp, Math.floor(Math.random() * 1000000000), 1003]
    );
    await expect(sut.connect(owner).setEventStatus(salt, 0)).to.be.revertedWith("C98Vault: Invalid event");
  });

  it("withdraw eth successful", async function () {
    await owner.sendTransaction({ to: sut.address, value: "1000000000" });
    await sut.connect(owner).withdraw(ZERO_ADDRESS, account1Address, "1000000000");
  });

  it("withdraw eth exceeds balance", async function () {
    await owner.sendTransaction({ to: sut.address, value: "100" });
    await expect(sut.connect(owner).withdraw(ZERO_ADDRESS, account1Address, "10000000000")).to.be.revertedWith(
      "C98Vault: Not enough balance"
    );
  });

  it("withdraw token successful", async function () {
    await token.connect(owner).mint(sut.address, "10000000000");
    await sut.connect(owner).withdraw(token.address, account1Address, "10000000000");
  });

  it("withdraw token exceeds balance", async function () {
    await token.connect(owner).mint(sut.address, "100");
    await expect(sut.connect(owner).withdraw(token.address, account1Address, "10000000000")).to.be.revertedWith(
      "C98Vault: Not enough balance"
    );
  });
});
