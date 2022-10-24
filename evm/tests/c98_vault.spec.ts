import {
  NFT721,
  NFT721__factory,
  Coin98VaultV3,
  Coin98VaultFactory,
  Coin98VaultV3__factory,
  Coin98VaultFactory__factory,
  NFT1155,
  NFT1155__factory,
  ERC20Token,
  ERC20Token__factory

} from "../typechain-types";

import { Schedule, MerkleDistributionService } from "./service/merkle_distribution.service";
import { MerkleTree } from './service/merkle_tree';

import { BN } from 'bn.js';
import hre, { ethers, web3 } from "hardhat";
import { expect } from "chai";

describe("Coin98_Vault_test", function () {

  let Coin98Vault: Coin98VaultV3__factory;
  let coin98VaultAddress: string;

  let Coin98VaultFactory: Coin98VaultFactory__factory;
  let coin98VaultFactoryAddress: string;

  let NFT721: NFT721__factory;
  let NFT721Address: string;

  let NFT1155: NFT1155__factory;
  let NFT1155Address: string;

  let ERC20Token: ERC20Token__factory;
  let ERC20TokenAddress: string;

  let owner: any;
  let tree721: MerkleTree;
  let tree1155: MerkleTree;

  this.beforeAll(async function () {

    const owner_ = await ethers.getSigners();
    owner = owner_;

    Coin98Vault = await hre.ethers.getContractFactory("Coin98VaultV3");
    const coin98Vault: Coin98VaultV3 = await Coin98Vault.deploy();
    await coin98Vault.deployed();
    coin98VaultAddress = coin98Vault.address;

    Coin98VaultFactory = await hre.ethers.getContractFactory("Coin98VaultFactory");
    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.deploy(coin98VaultAddress);
    await coin98VaultFactory.deployed();
    coin98VaultFactoryAddress = coin98VaultFactory.address;

    NFT721 = await hre.ethers.getContractFactory('NFT721');
    const nft721: NFT721 = await NFT721.deploy(owner[3].address);
    await nft721.deployed();
    NFT721Address = nft721.address;

    NFT1155 = await hre.ethers.getContractFactory('NFT1155');
    const nft1155: NFT1155 = await NFT1155.deploy();
    await nft1155.deployed();
    NFT1155Address = nft1155.address;

    ERC20Token = await hre.ethers.getContractFactory('ERC20Token');
    const erc20 : ERC20Token = await ERC20Token.deploy();
    await erc20.deployed();
    ERC20TokenAddress = erc20.address;

  });


  it("Create new Vault for ERC721: ", async function () {
    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.attach(coin98VaultFactoryAddress);

    const saltHex = await web3.utils.numberToHex(99);
    const saltBytes = await ethers.utils.hexZeroPad(saltHex, 32);
    await createVault(coin98VaultFactory, owner[0].address, saltBytes, owner[0]);

  });

  it("Create new Vault for ERC1155: ", async function () {
    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.attach(coin98VaultFactoryAddress);

    const saltHex = await web3.utils.numberToHex(88);
    const saltBytes = await ethers.utils.hexZeroPad(saltHex, 32);
    await createVault(coin98VaultFactory, owner[0].address, saltBytes, owner[0]);

  });

  it("Mint sendingToken (ERC20 )", async function () {

    const erc20Token: ERC20Token = await ERC20Token.attach(ERC20TokenAddress);
    await _safeMintTokenERC20(erc20Token, owner[1].address, web3.utils.toWei(new BN(1).toString(),"ether"));
    const balance = await erc20Token.balanceOf(owner[1].address);
    console.log('Balance ERC20 :', balance)


  })

  it("Mint to vault 721 :", async function () {
    const nft721: NFT721 = await NFT721.attach(NFT721Address);
    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.attach(coin98VaultFactoryAddress);

    const saltHex = await web3.utils.numberToHex(99);
    const saltBytes = await ethers.utils.hexZeroPad(saltHex, 32);
    const vaultUsing = await coin98VaultFactory.getVaultAddress(saltBytes);

    await _safeMintNFT721(nft721, vaultUsing, "NFT_URI_1");
    await _safeMintNFT721(nft721, vaultUsing, "NFT_URI_2");
    await _safeMintNFT721(nft721, vaultUsing, "NFT_URI_3");

  });

  it("Mint to vault 1155: : " , async function() {
    const nft1155: NFT1155 = await NFT1155.attach(NFT1155Address);
    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.attach(coin98VaultFactoryAddress);

    const saltHex = await web3.utils.numberToHex(88);
    const saltBytes = await ethers.utils.hexZeroPad(saltHex, 32);
    const vaultUsing = await coin98VaultFactory.getVaultAddress(saltBytes);

    await _safeMintNFT1155(nft1155,vaultUsing,"NFT_URI_1",1000);
    await _safeMintNFT1155(nft1155,vaultUsing,"NFT_URI_2",1000);
    await _safeMintNFT1155(nft1155,vaultUsing,"NFT_URI_3",1000);

  })

  it("Valid requirement 721 :  ( Vault owned NFT )", async function () {
    const nft721: NFT721 = await NFT721.attach(NFT721Address);
    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.attach(coin98VaultFactoryAddress);

    const saltHex = await web3.utils.numberToHex(99);
    const saltBytes = await ethers.utils.hexZeroPad(saltHex, 32);
    const vaultUsing = await coin98VaultFactory.getVaultAddress(saltBytes);

    // The fist minted ID of NFT is 1,2,3. Check is Vault own there NFT
    const ownerOf0 = await nft721.ownerOf(0);
    const ownerOf1 = await nft721.ownerOf(1);
    const ownerOf2 = await nft721.ownerOf(2);

    expect(ownerOf0, "Owner isn't Vault").is.equal(vaultUsing);
    expect(ownerOf1, "Owner isn't Vault").is.equal(vaultUsing);
    expect(ownerOf2, "Owner isn't Vault").is.equal(vaultUsing);

  });

  it("Valid requirement 1155 : ", async function () {
    const nft1155: NFT1155 = await NFT1155.attach(NFT1155Address);
    const erc20Token: ERC20Token = await ERC20Token.attach(ERC20TokenAddress);
    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.attach(coin98VaultFactoryAddress);

    const saltHex = await web3.utils.numberToHex(88);
    const saltBytes = await ethers.utils.hexZeroPad(saltHex, 32);
    const vaultUsing = await coin98VaultFactory.getVaultAddress(saltBytes);

    const ownerOf01 = await nft1155.balanceOf(vaultUsing,1);
    const ownerOf02 = await nft1155.balanceOf(vaultUsing,2);
    const ownerOf03 = await nft1155.balanceOf(vaultUsing,3);

    expect(ownerOf01, "Owner isn't Vault").is.equal(1000);
    expect(ownerOf02, "Owner isn't Vault").is.equal(1000);
    expect(ownerOf03, "Owner isn't Vault").is.equal(1000);

    const balanceOfUser = await erc20Token.balanceOf(owner[1].address);

    expect(Number(web3.utils.fromWei(balanceOfUser.toString(),'ether')), "Insufficient token").is.greaterThanOrEqual(1);

  })


  it("Get all vault: ", async function () {

    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.attach(coin98VaultFactoryAddress);
    const arrVault = await coin98VaultFactory.vaults();

    expect(arrVault, "Can't get list of Vault").to.be.an('array');
  });

  it("Create new event ERC721", async function () {
    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.attach(coin98VaultFactoryAddress);
    const saltHex = await web3.utils.numberToHex(99);
    const saltBytes = await ethers.utils.hexZeroPad(saltHex, 32);
    const vaultUsing = await coin98VaultFactory.getVaultAddress(saltBytes);
    const coin98Vault = await Coin98Vault.attach(vaultUsing);


    const new_schedule: Schedule = {
      index: 0,
      address: Buffer.from(owner[0].address.substring(2),'hex'),
      receivingId: 0,
      receivingAmount: new BN(0),
      sendingAmount: new BN(0),
    }

    const new_schedule1: Schedule = {
      index: 1,
      address: Buffer.from(owner[1].address.substring(2),'hex'),
      receivingId: 1,
      receivingAmount: new BN(1),
      sendingAmount: new BN(1000),
    }

    const new_schedule2: Schedule = {
      index: 2,
      address: Buffer.from(owner[2].address.substring(2),'hex'),
      receivingId: 2,
      receivingAmount: new BN(0),
      sendingAmount: new BN(0),
    }

    tree721 = await MerkleDistributionService.createTree([new_schedule, new_schedule1, new_schedule2]);
    const root = tree721.root();

    const eventOBJ = {
      typeEvent: 1,
      eventId: 10001,
      timestamp: 1000,
      recipient:  `0x${root.hash.toString('hex')}`,
      receivingToken: NFT721Address,
      sendingToken: ERC20TokenAddress,
    }

    await createEvent(
      coin98Vault,
      eventOBJ.typeEvent,
      eventOBJ.eventId,
      eventOBJ.timestamp,
      eventOBJ.recipient,
      eventOBJ.receivingToken,
      eventOBJ.sendingToken,
      owner[0]
    );

  })

  it("Create new event ERC1155", async function () {
    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.attach(coin98VaultFactoryAddress);
    const saltHex = await web3.utils.numberToHex(88);
    const saltBytes = await ethers.utils.hexZeroPad(saltHex, 32);
    const vaultUsing = await coin98VaultFactory.getVaultAddress(saltBytes);
    const coin98Vault = await Coin98Vault.attach(vaultUsing);

    const new_schedule: Schedule = {
      index: 0,
      address: Buffer.from(owner[0].address.substring(2),'hex'),
      receivingId: 1,
      receivingAmount: new BN(500),
      sendingAmount: new BN(0),
    }
    const new_schedule1: Schedule = {
      index: 1,
      address: Buffer.from(owner[1].address.substring(2),'hex'),
      receivingId: 2,
      receivingAmount: new BN(500),
      sendingAmount: new BN(1000),
    }
    const new_schedule2: Schedule = {
      index: 2,
      address: Buffer.from(owner[2].address.substring(2),'hex'),
      receivingId: 3,
      receivingAmount: new BN(500),
      sendingAmount: new BN(0),
    }

    tree1155 = await MerkleDistributionService.createTree([new_schedule, new_schedule1, new_schedule2]);
    const root = tree1155.root();

    const eventOBJ = {
      typeEvent: 2,
      eventId: 10002,
      timestamp: 1000,
      recipient:  `0x${root.hash.toString('hex')}`,
      receivingToken: NFT1155Address,
      sendingToken: ERC20TokenAddress,
    }

    await createEvent(
      coin98Vault,
      eventOBJ.typeEvent,
      eventOBJ.eventId,
      eventOBJ.timestamp,
      eventOBJ.recipient,
      eventOBJ.receivingToken,
      eventOBJ.sendingToken,
      owner[0]
    );

  })


  it("RedeemNFT 721: ", async function () {
    const erc20Token: ERC20Token = await ERC20Token.attach(ERC20TokenAddress);
    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.attach(coin98VaultFactoryAddress);

    const saltHex = await web3.utils.numberToHex(99);
    const saltBytes = await ethers.utils.hexZeroPad(saltHex, 32);
    const vaultUsing = await coin98VaultFactory.getVaultAddress(saltBytes);
    const coin98Vault = await Coin98Vault.attach(vaultUsing);

    const proofs = await MerkleDistributionService.printProof(tree721, 1);
    let proofsConverted = [`0x${proofs[0].hash.toString('hex')}`, `0x${proofs[1].hash.toString('hex')}`]


    const redeemOBJ = {
      eventId: 10001,
      index: 1,
      recipient: owner[1].address,
      receiveId: 1,
      receiveAmount: 1,
      sendingAmount: 1000,
      proofs: proofsConverted,
      signer: owner[1],
    }

    _approve(erc20Token,vaultUsing,redeemOBJ.sendingAmount, owner[1]);

    await redeemNFT(
      coin98Vault,
      redeemOBJ.eventId,
      redeemOBJ.index,
      redeemOBJ.recipient,
      redeemOBJ.receiveId,
      redeemOBJ.receiveAmount,
      redeemOBJ.sendingAmount,
      redeemOBJ.proofs,
      redeemOBJ.signer
    )
  });

  it("RedeemNFT 1155: ", async function () {
    const erc20Token: ERC20Token = await ERC20Token.attach(ERC20TokenAddress);
    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.attach(coin98VaultFactoryAddress);

    const saltHex = await web3.utils.numberToHex(88);
    const saltBytes = await ethers.utils.hexZeroPad(saltHex, 32);
    const vaultUsing = await coin98VaultFactory.getVaultAddress(saltBytes);
    const coin98Vault = await Coin98Vault.attach(vaultUsing);

    const proofs = await MerkleDistributionService.printProof(tree1155, 1);
    let proofsConverted = [`0x${proofs[0].hash.toString('hex')}`, `0x${proofs[1].hash.toString('hex')}`]

    const redeemOBJ = {
      eventId: 10002,
      index: 1,
      recipient: owner[1].address,
      receiveId: 2,
      receiveAmount: 500,
      sendingAmount: 1000,
      proofs: proofsConverted,
      signer: owner[1],
    }

    _approve(erc20Token,vaultUsing,redeemOBJ.sendingAmount, owner[1]);

    await redeemNFT(
      coin98Vault,
      redeemOBJ.eventId,
      redeemOBJ.index,
      redeemOBJ.recipient,
      redeemOBJ.receiveId,
      redeemOBJ.receiveAmount,
      redeemOBJ.sendingAmount,
      redeemOBJ.proofs,
      redeemOBJ.signer
    )
  });

});

// Helper function ( Write function )

async function _safeMintNFT721(
  nft721: NFT721,
  recipient_: string,
  uri_: string,
) {
  const safeMintNFT = await nft721.safeMintToUser(recipient_, uri_);
  const transactionResult = await getTransaction(safeMintNFT.hash);
  expect(transactionResult?.status, "Transaction fails").is.true;

}

async function _safeMintNFT1155(
  nft1155: NFT1155,
  recipient_: string,
  uri_: string,
  amount: number
) {
  const safeMintNFT = await nft1155.mint(recipient_,amount,uri_);
  const transactionResult = await getTransaction(safeMintNFT.hash);
  expect(transactionResult?.status, "Transaction fails").is.true;

}

async function _safeMintTokenERC20(
  erc20: ERC20Token,
  recipient_: string,
  amount: string,
) {
  const safeMintToken = await erc20.mintTo(amount,recipient_);
  const transactionResult = await getTransaction(safeMintToken.hash);
  expect(transactionResult?.status, "Transaction fails").is.true;

}

async function _approve (
  erc20: ERC20Token,
  recipient: string,
  amount: number,
  account: any
) {
  const upgradeAllowance = await erc20.connect(account).approve(recipient,amount);
  const transactionResult = await getTransaction(upgradeAllowance.hash);
  expect(transactionResult?.status, "Transaction fails").is.true;

}

async function createVault(
  coin98VaultFactory: Coin98VaultFactory,
  owner_: string,
  salt_: string,
  sendFrom: any
) {
  const createdVault = await coin98VaultFactory.connect(sendFrom).createVault(owner_, salt_);
  const transactionResult = await getTransaction(createdVault.hash);
  expect(transactionResult?.status, "Transaction fails").is.true;

}


async function createEvent(
  coin98Vault: Coin98VaultV3,
  typeEvent: number,
  eventId_: number,
  timestamp_: number,
  merkleRoot_: string,
  receivingToken_: string,
  sendingToken_: string,
  sendFrom: any

) {
  const createdEvent = await coin98Vault.connect(sendFrom).createEvent(
    typeEvent,
    eventId_,
    timestamp_,
    merkleRoot_,
    receivingToken_,
    sendingToken_
  );
  const transactionResult = await getTransaction(createdEvent.hash);
  expect(transactionResult?.status, "Transaction fails").is.true;

}

async function redeemNFT(
  coin98Vault: Coin98VaultV3,
  eventId_: number,
  index_: number,
  receipient_: string,
  receivingId_: number,
  receivingAmount_: number,
  sendingAmount_: number,
  proofs: any,
  sendFrom: any
) {
  const redeemNFT = await coin98Vault.connect(sendFrom).redeemNFT(
    eventId_,
    index_,
    receipient_,
    receivingId_,
    receivingAmount_,
    sendingAmount_,
    proofs
  );
  const transactionResult = await getTransaction(redeemNFT.hash);
  expect(transactionResult?.status, "Transaction fails").is.true;

};


async function getTransaction(
  hash: string,
) {
  const transaction = await web3.eth.getTransactionReceipt(hash);
  return transaction;

}
