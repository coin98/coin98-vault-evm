import {
  Coin98VaultV3,
  Coin98VaultFactory,
  Coin98VaultV3__factory,
  Coin98VaultFactory__factory,
  ERC721Token,
  ERC721Token__factory,
  ERC1155Token,
  ERC1155Token__factory,
  ERC20Token,
  ERC20Token__factory

} from "../../typechain-types";

import { expect } from "chai";
import hre, { ethers, web3 } from "hardhat";


export async function _safeMintNFT721(
  nft721: ERC721Token,
  recipient_: string,
  tokenId: number,
) {
  const safeMintNFT = await nft721.mintTo(recipient_, tokenId);
  const transactionResult = await getTransaction(safeMintNFT.hash);
  expect(transactionResult?.status, "Transaction fails").is.true;

}

export async function _safeMintNFT1155(
  nft1155: ERC1155Token,
  recipient_: string,
  tokenId: number,
  amount: number
) {
  const safeMintNFT = await nft1155.mintTo(recipient_,tokenId,amount);
  const transactionResult = await getTransaction(safeMintNFT.hash);
  expect(transactionResult?.status, "Transaction fails").is.true;

}

export async function _safeMintTokenERC20(
  erc20: ERC20Token,
  recipient_: string,
  amount: string,
  owner: string
) {
  const safeMintToken = await erc20.mint(recipient_,amount);
  const transactionResult = await getTransaction(safeMintToken.hash);
  expect(transactionResult?.status, "Transaction fails").is.true;
  const balance = await erc20.balanceOf(owner);
  console.log('balance',balance);

}

export async function _approve (
  erc20: ERC20Token,
  recipient: string,
  amount: number,
  account: any
) {
  const upgradeAllowance = await erc20.connect(account).approve(recipient,amount);
  const transactionResult = await getTransaction(upgradeAllowance.hash);
  expect(transactionResult?.status, "Transaction fails").is.true;

}

export async function createVault(
  coin98VaultFactory: Coin98VaultFactory,
  owner_: string,
  salt_: string,
  sendFrom: any
) {
  const createdVault = await coin98VaultFactory.connect(sendFrom).createVault(owner_, salt_);
  const transactionResult = await getTransaction(createdVault.hash);
  expect(transactionResult?.status, "Transaction fails").is.true;

}


export async function createEvent(
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

export async function redeemNFT(
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


export async function getTransaction(
  hash: string,
) {
  const transaction = await web3.eth.getTransactionReceipt(hash);
  return transaction;

}
