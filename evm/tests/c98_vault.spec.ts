import { BN } from 'bn.js';
import hre, { ethers, web3 } from "hardhat";
import { expect } from "chai";
import {
  Coin98VaultV3,
  Coin98VaultFactory,
  Coin98VaultV3__factory,
  Coin98VaultFactory__factory,
} from "../typechain-types";

import { Schedule,MerkleDistributionService } from "./service/merkle_distribution.service";
import { MerkleTree } from './service/merkle_tree';

describe("Coin98_Vault_test", function () {

  let Coin98Vault: Coin98VaultV3__factory;
  let coin98VaultAddress: string;
  let Coin98VaultFactory: Coin98VaultFactory__factory;
  let coin98VaultFactoryAddress: string;
  let owner: any;
  let tree: MerkleTree;

  this.beforeAll(async function () {
    Coin98Vault = await hre.ethers.getContractFactory("Coin98VaultV3");
    const coin98Vault: Coin98VaultV3 = await Coin98Vault.deploy();
    await coin98Vault.deployed();
    coin98VaultAddress = coin98Vault.address;

    Coin98VaultFactory = await hre.ethers.getContractFactory("Coin98VaultFactory");
    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.deploy(coin98VaultAddress);
    await coin98VaultFactory.deployed();
    coin98VaultFactoryAddress = coin98VaultFactory.address;
    const owner_ = await ethers.getSigners();
    owner = owner_;

  });


  it("Create new Vault : ", async function () {
    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.attach(coin98VaultFactoryAddress);
    const saltHex = await web3.utils.numberToHex(99);
    const saltBytes = await ethers.utils.hexZeroPad(saltHex, 32);
    await createVault(coin98VaultFactory, owner[0].address ,saltBytes, owner[0]);
  });

  it("Get all vault: ", async function () {
    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.attach(coin98VaultFactoryAddress);

    const arrVault = await coin98VaultFactory.vaults();
    console.log("arrVault", arrVault);
  });


  it("Create new event", async function () {
    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.attach(coin98VaultFactoryAddress);
    const saltHex = await web3.utils.numberToHex(99);
    const saltBytes = await ethers.utils.hexZeroPad(saltHex, 32);
    const vaultUsing = await coin98VaultFactory.getVaultAddress(saltBytes);
    const coin98Vault = await Coin98Vault.attach(vaultUsing);
    console.log('owner',owner[0].address);
    const new_schedule: Schedule =  {
      index: 0,
      address: Buffer.from(owner[0].address,'utf8'),
      receivingId: 1,
      receivingAmount: new BN(100),
      sendingAmount:  new BN(100),

    }
    const new_schedule1: Schedule =  {
      index: 1,
      address: Buffer.from(owner[1].address,'utf8'),
      receivingId: 2,
      receivingAmount: new BN(101),
      sendingAmount:  new BN(102),

    }
    const new_schedule2: Schedule =  {
      index: 2,
      address: Buffer.from(owner[2].address,'utf8'),
      receivingId: 3,
      receivingAmount: new BN(103),
      sendingAmount:  new BN(104),

    }
    const newTree = await MerkleDistributionService.createTree([new_schedule,new_schedule1,new_schedule2]);
    tree = newTree;
    const root = tree.root();
    const token1 = "0x9DEe5A6255aD401fA88A0BAad27A8e7869E82960"
    // console.log('node',tree.nodes());
    // const proof = await MerkleDistributionService.printProof(tree,1)
    // console.log('proof',proof)

    await createEvent(
      coin98Vault,
      1231,
      1231,
      "0x"+root.hash.toString('hex'),
      token1,
      token1,
      owner[0]
    );
  })

  it("Redeem : ", async function () {
    const coin98VaultFactory: Coin98VaultFactory = await Coin98VaultFactory.attach(coin98VaultFactoryAddress);
    const saltHex = await web3.utils.numberToHex(99);
    const saltBytes = await ethers.utils.hexZeroPad(saltHex, 32);
    const vaultUsing = await coin98VaultFactory.getVaultAddress(saltBytes);
    const coin98Vault = await Coin98Vault.attach(vaultUsing);

    const proof = await MerkleDistributionService.printProof(tree,1);
    console.log('proof',proof[0].hash)
    let proProof = ["0x"+proof[0].hash.toString('hex'), "0x"+proof[1].hash.toString('hex')]
    console.log(proProof);
    console.log('proof',proof)
    const test = await web3.utils.soliditySha3(1,`0x${owner[0].address.toString('hex')}`,2,101,102);
    console.log('test',test);
    await redeemNFT(
      coin98Vault,
      1231,
      1,
      owner[1].address,
      2,
      101,
      102,
      proProof,
      owner[0]
    )




  });

});



// Helper function ( Write function )


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
  eventId_: number, //uint256
  timestamp_: number, //uint256
  merkleRoot_: string, //byte32
  receivingToken_: string, //address
  sendingToken_: string, //address
  sendFrom: any

) {
  const createdEvent = await coin98Vault.connect(sendFrom).createEvent(
    1,
    eventId_,
    timestamp_,
    merkleRoot_,
    receivingToken_,
    sendingToken_
  );
  const transactionResult = await getTransaction(createdEvent.hash);
  expect(transactionResult?.status, "Transaction fails").is.true;
  // console.log('transactionResult');
}

async function redeemNFT(
    coin98Vault: Coin98VaultV3,
    eventId_: number,
    index_ :number,
    receipient_ : string,
    receivingId_ : number,
    receivingAmount_ :number,
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
  // console.log('transaction',transaction);
  return transaction;
}
