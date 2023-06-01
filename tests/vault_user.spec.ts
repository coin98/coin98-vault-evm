import {
  Hasher,
  ZERO_ADDRESS
} from '@coin98/solidity-support-library';
import * as hheh from '@nomicfoundation/hardhat-network-helpers';
import {
  Signer,
  utils
} from 'ethers';
import hhe from 'hardhat';
import {
  Coin98VaultV3,
  Coin98VaultV3Factory,
  ERC20,
  LegacyERC20
} from '../typechain-types';
import {
  WhitelistData,
  createWhitelistTree
} from './common';
import { expect } from 'chai';

describe('vault administrative task tests', function() {
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
  let sut: Coin98VaultV3
  let sutFactory: Coin98VaultV3Factory;

  before(async function() {
    const signers = await hhe.ethers.getSigners();
    owner = signers[0];
    ownerAddress = await signers[0].getAddress();
    account1 = signers[1];
    account1Address = await signers[1].getAddress();
    account2 = signers[2];
    account2Address = await signers[2].getAddress();
    account3 = signers[3];
    account3Address = await signers[3].getAddress();

    const tokenFactory = await hhe.ethers.getContractFactory('ERC20');
    c98Token = await tokenFactory.connect(owner).deploy('Coin98', 'C98', 6);
    await c98Token.deployed();
    const legacyTokenFactory = await hhe.ethers.getContractFactory('LegacyERC20');
    usdtToken = await legacyTokenFactory.connect(owner).deploy('Tether USD', 'USDT', 6);
    await usdtToken.deployed();
    const vaultFactory = await hhe.ethers.getContractFactory('Coin98VaultV3');
    const vault = await vaultFactory.connect(owner).deploy();
    await vault.deployed();
    const vaultFactoryFactory = await hhe.ethers.getContractFactory('Coin98VaultV3Factory');
    sutFactory = await vaultFactoryFactory.connect(owner).deploy(vault.address);
    await sutFactory.deployed();
    const salt = '0x' + Hasher.keccak256('vault_user').toString('hex');
    const deployTransaction = await sutFactory.connect(owner).createVault(ownerAddress, salt);
    await deployTransaction.wait();
    const sutAddress = await sutFactory.getVaultAddress(salt);
    sut = await hhe.ethers.getContractAt('Coin98VaultV3', sutAddress);
  });

  it('redeem token successful', async function() {
    let currentTimestamp = new Date().getTime();
    const salt = utils.solidityKeccak256(['uint256', 'uint256', 'uint256'], [currentTimestamp, Math.floor(Math.random() * 1000000000), 1001]);
    let whitelists = [
      <WhitelistData>{ index: 0, unlockTimestamp: currentTimestamp, recipientAddress: account1Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 1, unlockTimestamp: currentTimestamp, recipientAddress: account2Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 2, unlockTimestamp: currentTimestamp, recipientAddress: account3Address, receivingAmount: 1000000, sendingAmount: 0 },
    ];
    const whitelistTree = createWhitelistTree(whitelists);
    const whitelistRoot = '0x' + whitelistTree.root().hash.toString('hex');
    await sut.connect(owner).createEvent(salt, whitelistRoot, c98Token.address, ZERO_ADDRESS);

    await c98Token.connect(owner).mint(sut.address, 3000000);
    const whilelistProofs = whitelistTree.proofs(0);
    const proofs = whilelistProofs.map(node => '0x' + node.hash.toString('hex'));

    await hheh.time.increaseTo(currentTimestamp);
    const balanceBefore = await c98Token.balanceOf(account1Address);
    await sut.connect(account1).redeem(salt, 0, currentTimestamp, account1Address, 1000000, 0, proofs);
    const balanceAfter = await c98Token.balanceOf(account1Address);
    expect((balanceAfter.sub(balanceBefore)).toNumber()).eq(1000000);
  });

  it('redeem legacy token successful', async function() {
    let currentTimestamp = new Date().getTime();
    const salt = utils.solidityKeccak256(['uint256', 'uint256', 'uint256'], [currentTimestamp, Math.floor(Math.random() * 1000000000), 1002]);
    let whitelists = [
      <WhitelistData>{ index: 0, unlockTimestamp: currentTimestamp, recipientAddress: account1Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 1, unlockTimestamp: currentTimestamp, recipientAddress: account2Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 2, unlockTimestamp: currentTimestamp, recipientAddress: account3Address, receivingAmount: 1000000, sendingAmount: 0 },
    ];
    const whitelistTree = createWhitelistTree(whitelists);
    const whitelistRoot = '0x' + whitelistTree.root().hash.toString('hex');
    await sut.connect(owner).createEvent(salt, whitelistRoot, usdtToken.address, ZERO_ADDRESS);

    await usdtToken.connect(owner).mint(sut.address, 3000000);
    const whilelistProofs = whitelistTree.proofs(1);
    const proofs = whilelistProofs.map(node => '0x' + node.hash.toString('hex'));

    await hheh.time.increaseTo(currentTimestamp);
    const balanceBefore = await usdtToken.balanceOf(account2Address);
    await sut.connect(account2).redeem(salt, 1, currentTimestamp, account2Address, 1000000, 0, proofs);
    const balanceAfter = await usdtToken.balanceOf(account2Address);
    expect((balanceAfter.sub(balanceBefore)).toNumber()).eq(1000000);
  });

  it('other user claim', async function() {
    let currentTimestamp = new Date().getTime();
    const salt = utils.solidityKeccak256(['uint256', 'uint256', 'uint256'], [currentTimestamp, Math.floor(Math.random() * 1000000000), 1003]);
    let whitelists = [
      <WhitelistData>{ index: 0, unlockTimestamp: currentTimestamp, recipientAddress: account1Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 1, unlockTimestamp: currentTimestamp, recipientAddress: account2Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 2, unlockTimestamp: currentTimestamp, recipientAddress: account3Address, receivingAmount: 1000000, sendingAmount: 0 },
    ];
    const whitelistTree = createWhitelistTree(whitelists);
    const whitelistRoot = '0x' + whitelistTree.root().hash.toString('hex');
    await sut.connect(owner).createEvent(salt, whitelistRoot, c98Token.address, ZERO_ADDRESS);

    await c98Token.connect(owner).mint(sut.address, 3000000);
    const whilelistProofs = whitelistTree.proofs(0);
    const proofs = whilelistProofs.map(node => '0x' + node.hash.toString('hex'));

    await hheh.time.increaseTo(currentTimestamp);
    const balanceBefore = await c98Token.balanceOf(account1Address);
    const balanceBefore2 = await c98Token.balanceOf(account2Address);
    await sut.connect(account2).redeem(salt, 0, currentTimestamp, account1Address, 1000000, 0, proofs);
    const balanceAfter = await c98Token.balanceOf(account1Address);
    const balanceAfter2 = await c98Token.balanceOf(account2Address);
    expect((balanceAfter.sub(balanceBefore)).toNumber()).eq(1000000);
    expect((balanceAfter2.sub(balanceBefore2)).toNumber()).eq(0);
  });

  it('wrong index', async function() {
    let currentTimestamp = new Date().getTime();
    const salt = utils.solidityKeccak256(['uint256', 'uint256', 'uint256'], [currentTimestamp, Math.floor(Math.random() * 1000000000), 1004]);
    let whitelists = [
      <WhitelistData>{ index: 0, unlockTimestamp: currentTimestamp, recipientAddress: account1Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 1, unlockTimestamp: currentTimestamp, recipientAddress: account2Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 2, unlockTimestamp: currentTimestamp, recipientAddress: account3Address, receivingAmount: 1000000, sendingAmount: 0 },
    ];
    const whitelistTree = createWhitelistTree(whitelists);
    const whitelistRoot = '0x' + whitelistTree.root().hash.toString('hex');
    await sut.connect(owner).createEvent(salt, whitelistRoot, c98Token.address, ZERO_ADDRESS);

    await c98Token.connect(owner).mint(sut.address, 3000000);
    const whilelistProofs = whitelistTree.proofs(2);
    const proofs = whilelistProofs.map(node => '0x' + node.hash.toString('hex'));

    await hheh.time.increaseTo(currentTimestamp);
    await expect(sut.connect(account3).redeem(salt, 1, currentTimestamp, account3Address, 1000000, 0, proofs))
      .to.be.revertedWith('C98Vault: Invalid proof');
  });

  it('wrong timestamp', async function() {
    let currentTimestamp = new Date().getTime();
    const salt = utils.solidityKeccak256(['uint256', 'uint256', 'uint256'], [currentTimestamp, Math.floor(Math.random() * 1000000000), 1005]);
    let whitelists = [
      <WhitelistData>{ index: 0, unlockTimestamp: currentTimestamp, recipientAddress: account1Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 1, unlockTimestamp: currentTimestamp, recipientAddress: account2Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 2, unlockTimestamp: currentTimestamp, recipientAddress: account3Address, receivingAmount: 1000000, sendingAmount: 0 },
    ];
    const whitelistTree = createWhitelistTree(whitelists);
    const whitelistRoot = '0x' + whitelistTree.root().hash.toString('hex');
    await sut.connect(owner).createEvent(salt, whitelistRoot, c98Token.address, ZERO_ADDRESS);

    await c98Token.connect(owner).mint(sut.address, 3000000);
    const whilelistProofs = whitelistTree.proofs(2);
    const proofs = whilelistProofs.map(node => '0x' + node.hash.toString('hex'));

    await hheh.time.increaseTo(currentTimestamp);
    await expect(sut.connect(account3).redeem(salt, 2, currentTimestamp+1, account3Address, 1000000, 0, proofs))
      .to.be.revertedWith('C98Vault: Invalid proof');
  });

  it('wrong recipient', async function() {
    let currentTimestamp = new Date().getTime();
    const salt = utils.solidityKeccak256(['uint256', 'uint256', 'uint256'], [currentTimestamp, Math.floor(Math.random() * 1000000000), 1006]);
    let whitelists = [
      <WhitelistData>{ index: 0, unlockTimestamp: currentTimestamp, recipientAddress: account1Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 1, unlockTimestamp: currentTimestamp, recipientAddress: account2Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 2, unlockTimestamp: currentTimestamp, recipientAddress: account3Address, receivingAmount: 1000000, sendingAmount: 0 },
    ];
    const whitelistTree = createWhitelistTree(whitelists);
    const whitelistRoot = '0x' + whitelistTree.root().hash.toString('hex');
    await sut.connect(owner).createEvent(salt, whitelistRoot, c98Token.address, ZERO_ADDRESS);

    await c98Token.connect(owner).mint(sut.address, 3000000);
    const whilelistProofs = whitelistTree.proofs(2);
    const proofs = whilelistProofs.map(node => '0x' + node.hash.toString('hex'));

    await hheh.time.increaseTo(currentTimestamp);
    await expect(sut.connect(account3).redeem(salt, 2, currentTimestamp, account2Address, 1000000, 0, proofs))
      .to.be.revertedWith('C98Vault: Invalid proof');
  });

  it('wrong amount', async function() {
    let currentTimestamp = new Date().getTime();
    const salt = utils.solidityKeccak256(['uint256', 'uint256', 'uint256'], [currentTimestamp, Math.floor(Math.random() * 1000000000), 1007]);
    let whitelists = [
      <WhitelistData>{ index: 0, unlockTimestamp: currentTimestamp, recipientAddress: account1Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 1, unlockTimestamp: currentTimestamp, recipientAddress: account2Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 2, unlockTimestamp: currentTimestamp, recipientAddress: account3Address, receivingAmount: 1000000, sendingAmount: 0 },
    ];
    const whitelistTree = createWhitelistTree(whitelists);
    const whitelistRoot = '0x' + whitelistTree.root().hash.toString('hex');
    await sut.connect(owner).createEvent(salt, whitelistRoot, c98Token.address, ZERO_ADDRESS);

    await c98Token.connect(owner).mint(sut.address, 3000000);
    const whilelistProofs = whitelistTree.proofs(2);
    const proofs = whilelistProofs.map(node => '0x' + node.hash.toString('hex'));

    await hheh.time.increaseTo(currentTimestamp);
    await expect(sut.connect(account3).redeem(salt, 2, currentTimestamp, account3Address, 2000000, 0, proofs))
      .to.be.revertedWith('C98Vault: Invalid proof');
  });

  it('wrong proofs', async function() {
    let currentTimestamp = new Date().getTime();
    const salt = utils.solidityKeccak256(['uint256', 'uint256', 'uint256'], [currentTimestamp, Math.floor(Math.random() * 1000000000), 1008]);
    let whitelists = [
      <WhitelistData>{ index: 0, unlockTimestamp: currentTimestamp, recipientAddress: account1Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 1, unlockTimestamp: currentTimestamp, recipientAddress: account2Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 2, unlockTimestamp: currentTimestamp, recipientAddress: account3Address, receivingAmount: 1000000, sendingAmount: 0 },
    ];
    const whitelistTree = createWhitelistTree(whitelists);
    const whitelistRoot = '0x' + whitelistTree.root().hash.toString('hex');
    await sut.connect(owner).createEvent(salt, whitelistRoot, c98Token.address, ZERO_ADDRESS);

    await c98Token.connect(owner).mint(sut.address, 3000000);
    const whilelistProofs = whitelistTree.proofs(1);
    const proofs = whilelistProofs.map(node => '0x' + node.hash.toString('hex'));

    await hheh.time.increaseTo(currentTimestamp);
    await expect(sut.connect(account3).redeem(salt, 2, currentTimestamp, account3Address, 1000000, 0, proofs))
      .to.be.revertedWith('C98Vault: Invalid proof');
  });

  it('early claim', async function() {
    let currentTimestamp = new Date().getTime();
    const salt = utils.solidityKeccak256(['uint256', 'uint256', 'uint256'], [currentTimestamp, Math.floor(Math.random() * 1000000000), 1009]);
    let whitelists = [
      <WhitelistData>{ index: 0, unlockTimestamp: currentTimestamp + 100, recipientAddress: account1Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 1, unlockTimestamp: currentTimestamp + 100, recipientAddress: account2Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 2, unlockTimestamp: currentTimestamp + 100, recipientAddress: account3Address, receivingAmount: 1000000, sendingAmount: 0 },
    ];
    const whitelistTree = createWhitelistTree(whitelists);
    const whitelistRoot = '0x' + whitelistTree.root().hash.toString('hex');
    await sut.connect(owner).createEvent(salt, whitelistRoot, c98Token.address, ZERO_ADDRESS);

    await c98Token.connect(owner).mint(sut.address, 3000000);
    const whilelistProofs = whitelistTree.proofs(2);
    const proofs = whilelistProofs.map(node => '0x' + node.hash.toString('hex'));

    await hheh.time.increaseTo(currentTimestamp);
    await expect(sut.connect(account3).redeem(salt, 2, currentTimestamp + 100, account3Address, 1000000, 0, proofs))
      .to.be.revertedWith('C98Vault: Schedule locked');
  });

  it('user cannot redeem twice', async function() {
    let currentTimestamp = new Date().getTime();
    const salt = utils.solidityKeccak256(['uint256', 'uint256', 'uint256'], [currentTimestamp, Math.floor(Math.random() * 1000000000), 1010]);
    let whitelists = [
      <WhitelistData>{ index: 0, unlockTimestamp: currentTimestamp, recipientAddress: account1Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 1, unlockTimestamp: currentTimestamp, recipientAddress: account2Address, receivingAmount: 1000000, sendingAmount: 0 },
      <WhitelistData>{ index: 2, unlockTimestamp: currentTimestamp, recipientAddress: account3Address, receivingAmount: 1000000, sendingAmount: 0 },
    ];
    const whitelistTree = createWhitelistTree(whitelists);
    const whitelistRoot = '0x' + whitelistTree.root().hash.toString('hex');
    await sut.connect(owner).createEvent(salt, whitelistRoot, c98Token.address, ZERO_ADDRESS);

    await c98Token.connect(owner).mint(sut.address, 3000000);
    const whilelistProofs = whitelistTree.proofs(0);
    const proofs = whilelistProofs.map(node => '0x' + node.hash.toString('hex'));

    await hheh.time.increaseTo(currentTimestamp);
    const balanceBefore = await c98Token.balanceOf(account1Address);
    await sut.connect(account1).redeem(salt, 0, currentTimestamp, account1Address, 1000000, 0, proofs);
    const balanceAfter = await c98Token.balanceOf(account1Address);
    expect((balanceAfter.sub(balanceBefore)).toNumber()).eq(1000000);
    await expect(sut.connect(account1).redeem(salt, 0, currentTimestamp, account1Address, 1000000, 0, proofs))
      .to.be.revertedWith('C98Vault: Redeemed');
  });
});
