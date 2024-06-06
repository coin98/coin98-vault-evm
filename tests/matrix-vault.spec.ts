import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { WhitelistCollectionData, createWhitelistCollectionTree, vaultFixture } from "./common";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Coin98VaultV2Factory, MatrixVault, MockVRC25, MockVRC725 } from "../typechain-types";
import { MerkleNode, MerkleTreeKeccak, ZERO_ADDRESS } from "@coin98/solidity-support-library";

let owner: SignerWithAddress;
let account1: SignerWithAddress;
let account2: SignerWithAddress;
let account3: SignerWithAddress;
let c98: MockVRC25;
let starship: MockVRC725;
let matrixVaultInstance: MatrixVault;
let matrixVaultFactory: Coin98VaultV2Factory;

async function getProof(tree: MerkleTreeKeccak, index: number) {
  let whitelistProof = tree.proofs(index);
  const proofs = whitelistProof.map((node: MerkleNode) => "0x" + node.hash.toString("hex"));
  return proofs;
}

async function createEvent() {
  const eventId = ethers.utils.solidityKeccak256(["string"], ["event"]);
  const currentTimestamp = await time.latest();
  let whitelist = [
    <WhitelistCollectionData>{
      index: 0,
      unlockTimestamp: (await time.latest()) + 100,
      collectionAddress: starship.address,
      tokenId: 0,
      receivingAmount: 1000000,
      sendingAmount: 0,
    },
    <WhitelistCollectionData>{
      index: 1,
      unlockTimestamp: (await time.latest()) + 200,
      collectionAddress: starship.address,
      tokenId: 1,
      receivingAmount: 1000000,
      sendingAmount: 0,
    },
    <WhitelistCollectionData>{
      index: 2,
      unlockTimestamp: (await time.latest()) + 300,
      collectionAddress: starship.address,
      tokenId: 2,
      receivingAmount: 1000000,
      sendingAmount: 0,
    },
  ];

  const tree = createWhitelistCollectionTree(whitelist);
  const root = "0x" + tree.root().hash.toString("hex");

  await matrixVaultInstance.connect(owner).createEvent(eventId, root, c98.address, ZERO_ADDRESS);
  return {
    eventId,
    currentTimestamp,
    whitelist,
    root,
    tree,
  };
}

describe("MatrixVault", function () {
  beforeEach(async () => {
    ({ owner, account1, account2, account3, c98, starship, matrixVaultInstance, matrixVaultFactory } =
      await loadFixture(vaultFixture));
  });
  describe("Create event", async () => {
    context("Create event with right params", async () => {
      it("should create event successfully", async () => {
        const eventId = ethers.utils.solidityKeccak256(["string"], ["event"]);
        const currentTimestamp = await time.latest();

        let whitelist = [
          <WhitelistCollectionData>{
            index: 0,
            unlockTimestamp: currentTimestamp + 100,
            collectionAddress: starship.address,
            tokenId: 0,
            receivingAmount: 1000000,
            sendingAmount: 0,
          },
          <WhitelistCollectionData>{
            index: 1,
            unlockTimestamp: currentTimestamp + 200,
            collectionAddress: starship.address,
            tokenId: 1,
            receivingAmount: 1000000,
            sendingAmount: 0,
          },
          <WhitelistCollectionData>{
            index: 2,
            unlockTimestamp: currentTimestamp + 300,
            collectionAddress: starship.address,
            tokenId: 2,
            receivingAmount: 1000000,
            sendingAmount: 0,
          },
        ];

        const tree = createWhitelistCollectionTree(whitelist);
        const root = "0x" + tree.root().hash.toString("hex");

        const tx = await matrixVaultInstance.connect(owner).createEvent(eventId, root, c98.address, ZERO_ADDRESS);

        await expect(tx).to.emit(matrixVaultInstance, "EventCreated");
      });
    });
  });

  describe("Redeem with specific token ID", async () => {
    context("Redeem with right params", async () => {
      it("Should emit event", async () => {
        let { eventId, currentTimestamp, tree } = await loadFixture(createEvent);
        let proof = await getProof(tree, 0);

        await time.increaseTo(currentTimestamp + 101);
        const tx = await matrixVaultInstance
          .connect(account1)
          .redeemForCollectionHolder(
            eventId,
            account1.address,
            0,
            currentTimestamp + 100,
            starship.address,
            0,
            1000000,
            0,
            false,
            proof
          );

        await expect(tx).to.emit(matrixVaultInstance, "RedeemedForHolder");
      });

      it("Should transfer token to holder", async () => {
        let { eventId, currentTimestamp, tree } = await loadFixture(createEvent);
        let proof = await getProof(tree, 0);

        await time.increaseTo(currentTimestamp + 101);
        const tx = await matrixVaultInstance
          .connect(account1)
          .redeemForCollectionHolder(
            eventId,
            account1.address,
            0,
            currentTimestamp + 100,
            starship.address,
            0,
            1000000,
            0,
            false,
            proof
          );

        await expect(tx).to.changeTokenBalances(c98, [matrixVaultInstance, account1], [-1000000, 1000000]);
      });
    });

    context("Redeem redeemed event", async () => {
      it("Should revert", async () => {
        let { eventId, currentTimestamp, tree } = await loadFixture(createEvent);
        let proof = await getProof(tree, 0);

        await time.increaseTo(currentTimestamp + 101);
        await matrixVaultInstance
          .connect(account1)
          .redeemForCollectionHolder(
            eventId,
            account1.address,
            0,
            currentTimestamp + 100,
            starship.address,
            0,
            1000000,
            0,
            false,
            proof
          );

        await expect(
          matrixVaultInstance
            .connect(account1)
            .redeemForCollectionHolder(
              eventId,
              account1.address,
              0,
              currentTimestamp + 100,
              starship.address,
              0,
              1000000,
              0,
              false,
              proof
            )
        ).to.be.revertedWith("C98Vault: Claimed");
      });
    });

    context("Redeem with wrong proof", async () => {
      it("Should revert", async () => {
        let { eventId, currentTimestamp, tree } = await loadFixture(createEvent);
        let proof = await getProof(tree, 1);

        await time.increaseTo(currentTimestamp + 101);
        await expect(
          matrixVaultInstance
            .connect(account1)
            .redeemForCollectionHolder(
              eventId,
              account1.address,
              0,
              currentTimestamp + 100,
              starship.address,
              0,
              1000000,
              0,
              false,
              proof.slice(1)
            )
        ).to.be.revertedWith("C98Vault: Invalid proof");
      });
    });

    context("Redeem with wrong event id", async () => {
      it("Should revert", async () => {
        let { eventId, currentTimestamp, tree } = await loadFixture(createEvent);
        let proof = await getProof(tree, 0);

        await time.increaseTo(currentTimestamp + 101);
        await expect(
          matrixVaultInstance
            .connect(account1)
            .redeemForCollectionHolder(
              ethers.utils.solidityKeccak256(["string"], ["wrong event"]),
              account1.address,
              0,
              currentTimestamp + 100,
              starship.address,
              0,
              1000000,
              0,
              false,
              proof
            )
        ).to.be.revertedWith("C98Vault: Invalid event");
      });
    });

    context("Redeem with wrong unlock timestamp", async () => {
      it("Should revert", async () => {
        let { eventId, currentTimestamp, tree } = await loadFixture(createEvent);
        let proof = await getProof(tree, 0);

        await time.increaseTo(currentTimestamp + 101);
        await expect(
          matrixVaultInstance
            .connect(account1)
            .redeemForCollectionHolder(
              eventId,
              account1.address,
              0,
              currentTimestamp + 99,
              starship.address,
              0,
              1000000,
              0,
              false,
              proof
            )
        ).to.be.revertedWith("C98Vault: Invalid proof");
      });
    });

    context("Redeem with wrong collection address", async () => {
      it("Should revert", async () => {
        let { eventId, currentTimestamp, tree } = await loadFixture(createEvent);
        let proof = await getProof(tree, 0);

        await time.increaseTo(currentTimestamp + 101);
        await expect(
          matrixVaultInstance
            .connect(account1)
            .redeemForCollectionHolder(
              eventId,
              account1.address,
              0,
              currentTimestamp + 100,
              ethers.constants.AddressZero,
              0,
              1000000,
              0,
              false,
              proof
            )
        ).to.be.revertedWith("C98Vault: Invalid collection");
      });
    });

    context("Redeem with wrong token id", async () => {
      it("Should revert", async () => {
        let { eventId, currentTimestamp, tree } = await loadFixture(createEvent);
        let proof = await getProof(tree, 0);

        await time.increaseTo(currentTimestamp + 101);
        await expect(
          matrixVaultInstance
            .connect(account1)
            .redeemForCollectionHolder(
              eventId,
              account1.address,
              1,
              currentTimestamp + 100,
              starship.address,
              0,
              1000000,
              0,
              false,
              proof
            )
        ).to.be.revertedWith("C98Vault: Invalid proof");
      });
    });

    context("Redeem with claimed token id", async () => {
      it("Should revert", async () => {
        let { eventId, currentTimestamp, tree } = await loadFixture(createEvent);
        let proof = await getProof(tree, 0);

        await time.increaseTo(currentTimestamp + 101);
        await matrixVaultInstance
          .connect(account1)
          .redeemForCollectionHolder(
            eventId,
            account1.address,
            0,
            currentTimestamp + 100,
            starship.address,
            0,
            1000000,
            0,
            false,
            proof
          );

        await expect(
          matrixVaultInstance
            .connect(account1)
            .redeemForCollectionHolder(
              eventId,
              account1.address,
              0,
              currentTimestamp + 100,
              starship.address,
              0,
              1000000,
              0,
              false,
              proof
            )
        ).to.be.revertedWith("C98Vault: Claimed");
      });
    });
  });

  describe("Redeem with any token ID in collection", async () => {
    context("Redeem with right params", async () => {
      it("Should emit event", async () => {
        const eventId = ethers.utils.solidityKeccak256(["string"], ["event"]);
        const currentTimestamp = await time.latest();
        let whitelist = [
          <WhitelistCollectionData>{
            index: 0,
            unlockTimestamp: (await time.latest()) + 100,
            collectionAddress: starship.address,
            tokenId: 0,
            receivingAmount: 1000000,
            sendingAmount: 0,
          },
          <WhitelistCollectionData>{
            index: 1,
            unlockTimestamp: (await time.latest()) + 100,
            collectionAddress: starship.address,
            tokenId: 0,
            receivingAmount: 1000000,
            sendingAmount: 0,
          },
          <WhitelistCollectionData>{
            index: 2,
            unlockTimestamp: (await time.latest()) + 100,
            collectionAddress: starship.address,
            tokenId: 0,
            receivingAmount: 1000000,
            sendingAmount: 0,
          },
        ];

        const tree = createWhitelistCollectionTree(whitelist);
        const root = "0x" + tree.root().hash.toString("hex");

        await matrixVaultInstance.connect(owner).createEvent(eventId, root, c98.address, ZERO_ADDRESS);

        let proof = await getProof(tree, 0);
        await time.increaseTo(currentTimestamp + 101);
        const tx = await matrixVaultInstance
          .connect(account1)
          .redeemForCollectionHolder(
            eventId,
            account1.address,
            0,
            currentTimestamp + 100,
            starship.address,
            0,
            1000000,
            0,
            true,
            proof
          );

        await expect(tx).to.emit(matrixVaultInstance, "RedeemedForHolder");

        proof = await getProof(tree, 1);
        const tx1 = await matrixVaultInstance
          .connect(account2)
          .redeemForCollectionHolder(
            eventId,
            account2.address,
            1,
            currentTimestamp + 100,
            starship.address,
            1,
            1000000,
            0,
            true,
            proof
          );

        await expect(tx1).to.emit(matrixVaultInstance, "RedeemedForHolder");
      });
    });
  });
});
