import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { WhitelistCollectionData, createWhitelistCollectionTree, vaultFixture } from "./common";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Broadcaster, Coin98VaultV2Factory, MatrixVault, MockVRC25, MockVRC725 } from "../typechain-types";
import { MerkleNode, MerkleTreeKeccak, ZERO_ADDRESS } from "@coin98/solidity-support-library";

let owner: SignerWithAddress;
let account1: SignerWithAddress;
let account2: SignerWithAddress;
let account3: SignerWithAddress;
let broadcaster: Broadcaster;
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
      type:"specific",
      index: 0,
      unlockTimestamp: (await time.latest()) + 100,
      collectionAddress: starship.address,
      tokenId: 0,
      receivingAmount: 1000000,
      sendingAmount: 0,
    },
    <WhitelistCollectionData>{
      type:"specific",
      index: 1,
      unlockTimestamp: (await time.latest()) + 200,
      collectionAddress: starship.address,
      tokenId: 1,
      receivingAmount: 1000000,
      sendingAmount: 0,
    },
    <WhitelistCollectionData>{
      type:"specific",
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
    ({ owner, account1, account2, account3, broadcaster, c98, starship, matrixVaultInstance, matrixVaultFactory } =
      await loadFixture(vaultFixture));
  });
  describe("Create event", async () => {
    context("Create event with right params", async () => {
      it("should create event successfully", async () => {
        const eventId = ethers.utils.solidityKeccak256(["string"], ["event"]);
        const currentTimestamp = await time.latest();

        let whitelist = [
          <WhitelistCollectionData>{
            type:"specific",
            index: 0,
            unlockTimestamp: currentTimestamp + 100,
            collectionAddress: starship.address,
            tokenId: 0,
            receivingAmount: 1000000,
            sendingAmount: 0,
          },
          <WhitelistCollectionData>{
            type:"specific",
            index: 1,
            unlockTimestamp: currentTimestamp + 200,
            collectionAddress: starship.address,
            tokenId: 1,
            receivingAmount: 1000000,
            sendingAmount: 0,
          },
          <WhitelistCollectionData>{
            type:"specific",
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

        await expect(tx).to.emit(broadcaster, "Event");
      });
    });
  });

  describe("Redeem with specific token holder", async () => {
    context("Redeem with right params", async () => {
      it("Should emit event", async () => {
        let { eventId, currentTimestamp, tree } = await loadFixture(createEvent);
        let proof = await getProof(tree, 0);

        await time.increaseTo(currentTimestamp + 101);
        const tx = await matrixVaultInstance
          .connect(account1)
          .redeemForSpecificTokenHolder(
            eventId,
            account1.address,
            0,
            currentTimestamp + 100,
            starship.address,
            0,
            1000000,
            0,
            proof
          );

        await expect(tx).to.emit(broadcaster, "Event");
      });

      it("Should transfer token to holder", async () => {
        let { eventId, currentTimestamp, tree } = await loadFixture(createEvent);
        let proof = await getProof(tree, 0);

        await time.increaseTo(currentTimestamp + 101);
        const tx = await matrixVaultInstance
          .connect(account1)
          .redeemForSpecificTokenHolder(
            eventId,
            account1.address,
            0,
            currentTimestamp + 100,
            starship.address,
            0,
            1000000,
            0,
            proof
          );

        await expect(tx).to.changeTokenBalances(c98, [matrixVaultInstance, account1], [-1000000, 1000000]);
      });
    });

    context("Sending amount is not 0", async () => {
      it("Should transfer sending token to collection (in native)", async () => {
        const eventId = ethers.utils.solidityKeccak256(["string"], ["event"]);
        const currentTimestamp = await time.latest();

        let whitelist = [
          <WhitelistCollectionData>{
            type:"specific",
            index: 0,
            unlockTimestamp: currentTimestamp + 100,
            collectionAddress: starship.address,
            tokenId: 0,
            receivingAmount: 1000000,
            sendingAmount: 1000,
          },
        ];

        const tree = createWhitelistCollectionTree(whitelist);
        const root = "0x" + tree.root().hash.toString("hex");

        await matrixVaultInstance.connect(owner).createEvent(eventId, root, c98.address, ZERO_ADDRESS);

        let proof = await getProof(tree, 0);
        await time.increaseTo(currentTimestamp + 101);

        const tx = await matrixVaultInstance
          .connect(account1)
          .redeemForSpecificTokenHolder(
            eventId,
            account1.address,
            0,
            currentTimestamp + 100,
            starship.address,
            0,
            1000000,
            1000,
            proof,
            {
              value: 1000,
            }
          );

        await expect(tx).to.changeEtherBalances([matrixVaultInstance, account1], [1000, -1000]);
      });

      it("Fee is not 0", async () => {
        await matrixVaultFactory.connect(owner).setFee(1000, 0);

        const eventId = ethers.utils.solidityKeccak256(["string"], ["event"]);
        const currentTimestamp = await time.latest();

        let whitelist = [
          <WhitelistCollectionData>{
            type:"specific",
            index: 0,
            unlockTimestamp: currentTimestamp + 100,
            collectionAddress: starship.address,
            tokenId: 0,
            receivingAmount: 1000000,
            sendingAmount: 1000,
          },
        ];

        const tree = createWhitelistCollectionTree(whitelist);
        const root = "0x" + tree.root().hash.toString("hex");

        await matrixVaultInstance.connect(owner).createEvent(eventId, root, c98.address, ZERO_ADDRESS);

        let proof = await getProof(tree, 0);
        await time.increaseTo(currentTimestamp + 101);

        const tx = await matrixVaultInstance
          .connect(account1)
          .redeemForSpecificTokenHolder(
            eventId,
            account1.address,
            0,
            currentTimestamp + 100,
            starship.address,
            0,
            1000000,
            1000,
            proof,
            {
              value: 2000,
            }
          );

        await expect(tx).to.changeEtherBalances([matrixVaultInstance, account1], [1000, -2000]);

        await expect(tx).to.changeEtherBalances([matrixVaultFactory, account1], [1000, -2000]);
      });
    });

    context("Redeem redeemed event", async () => {
      it("Should revert", async () => {
        let { eventId, currentTimestamp, tree } = await loadFixture(createEvent);
        let proof = await getProof(tree, 0);

        await time.increaseTo(currentTimestamp + 101);
        await matrixVaultInstance
          .connect(account1)
          .redeemForSpecificTokenHolder(
            eventId,
            account1.address,
            0,
            currentTimestamp + 100,
            starship.address,
            0,
            1000000,
            0,
            proof
          );

        await expect(
          matrixVaultInstance
            .connect(account1)
            .redeemForSpecificTokenHolder(
              eventId,
              account1.address,
              0,
              currentTimestamp + 100,
              starship.address,
              0,
              1000000,
              0,
              proof
            )
        ).to.be.revertedWith("C98Vault: Event is redeemed");
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
            .redeemForSpecificTokenHolder(
              eventId,
              account1.address,
              0,
              currentTimestamp + 100,
              starship.address,
              0,
              1000000,
              0,
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
            .redeemForSpecificTokenHolder(
              ethers.utils.solidityKeccak256(["string"], ["wrong event"]),
              account1.address,
              0,
              currentTimestamp + 100,
              starship.address,
              0,
              1000000,
              0,
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
            .redeemForSpecificTokenHolder(
              eventId,
              account1.address,
              0,
              currentTimestamp + 99,
              starship.address,
              0,
              1000000,
              0,
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
            .redeemForSpecificTokenHolder(
              eventId,
              account1.address,
              0,
              currentTimestamp + 100,
              ethers.constants.AddressZero,
              0,
              1000000,
              0,
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
            .redeemForSpecificTokenHolder(
              eventId,
              account1.address,
              1,
              currentTimestamp + 100,
              starship.address,
              0,
              1000000,
              0,
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
          .redeemForSpecificTokenHolder(
            eventId,
            account1.address,
            0,
            currentTimestamp + 100,
            starship.address,
            0,
            1000000,
            0,
            proof
          );

        await expect(
          matrixVaultInstance
            .connect(account1)
            .redeemForSpecificTokenHolder(
              eventId,
              account1.address,
              0,
              currentTimestamp + 100,
              starship.address,
              0,
              1000000,
              0,
              proof
            )
        ).to.be.revertedWith("C98Vault: Event is redeemed");
      });
    });

    context("Redeem with invalid schedule", async () => {
      it("Should revert", async () => {
        let { eventId, currentTimestamp, tree } = await loadFixture(createEvent);
        let proof = await getProof(tree, 0);

        await time.increaseTo(currentTimestamp + 90);
        await expect(
          matrixVaultInstance
            .connect(account1)
            .redeemForSpecificTokenHolder(
              eventId,
              account1.address,
              0,
              currentTimestamp + 100,
              starship.address,
              0,
              1000000,
              0,
              proof
            )
        ).to.be.revertedWith("C98Vault: Schedule locked");
      });
    });

    context("Redeem with token not owned by holder", async () => {
      it("Should revert", async () => {
        let { eventId, currentTimestamp, tree } = await loadFixture(createEvent);
        let proof = await getProof(tree, 0);

        await time.increaseTo(currentTimestamp + 101);
        await expect(
          matrixVaultInstance
            .connect(account1)
            .redeemForSpecificTokenHolder(
              eventId,
              account1.address,
              0,
              currentTimestamp + 100,
              starship.address,
              1,
              1000000,
              0,
              proof
            )
        ).to.be.revertedWith("C98Vault: Invalid owner");
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
            type:"collection",
            index: 0,
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
            proof
          );

        await expect(tx).to.emit(broadcaster, "Event");

        proof = await getProof(tree, 0);
        const tx1 = await matrixVaultInstance
          .connect(account2)
          .redeemForCollectionHolder(
            eventId,
            account2.address,
            0,
            currentTimestamp + 100,
            starship.address,
            1,
            1000000,
            0,
            proof
          );

        await expect(tx1).to.emit(broadcaster, "Event");

        it("Should transfer token to holder", async () => {
          const eventId = ethers.utils.solidityKeccak256(["string"], ["event"]);
          const currentTimestamp = await time.latest();
          let whitelist = [
            <WhitelistCollectionData>{
              type:"collection",
              index: 0,
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
              proof
            );

          await expect(tx).to.changeTokenBalances(c98, [matrixVaultInstance, account1], [-1000000, 1000000]);

          proof = await getProof(tree, 0);
          const tx1 = await matrixVaultInstance
            .connect(account2)
            .redeemForCollectionHolder(
              eventId,
              account2.address,
              0,
              currentTimestamp + 100,
              starship.address,
              1,
              1000000,
              0,
              proof
            );

          await expect(tx1).to.changeTokenBalances(c98, [matrixVaultInstance, account2], [-1000000, 1000000]);
        });
      });

      context("Redeem with redeemed token ID", async () => {
        it("Should revert", async () => {
          const eventId = ethers.utils.solidityKeccak256(["string"], ["event"]);
          const currentTimestamp = await time.latest();
          let whitelist = [
            <WhitelistCollectionData>{
              type:"collection",
              index: 0,
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
                proof
              )
          ).to.be.revertedWith("C98Vault: Token is claimed");
        });
      });

      context("Redeem with same event id, different index but same token id", async () => {
        it("Should change token balance", async () => {
          const eventId = ethers.utils.solidityKeccak256(["string"], ["event"]);
          const currentTimestamp = await time.latest();
          let whitelist = [
            <WhitelistCollectionData>{
              type:"collection",
              index: 0,
              unlockTimestamp: (await time.latest()) + 100,
              collectionAddress: starship.address,
              tokenId: 0,
              receivingAmount: 1000000,
              sendingAmount: 0,
            },
            <WhitelistCollectionData>{
              type:"collection",
              index: 1,
              unlockTimestamp: (await time.latest()) + 200,
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
              proof
            );

          proof = await getProof(tree, 1);
          await time.increaseTo(currentTimestamp + 201);

          const tx = await matrixVaultInstance
            .connect(account1)
            .redeemForCollectionHolder(
              eventId,
              account1.address,
              1,
              currentTimestamp + 200,
              starship.address,
              0,
              1000000,
              0,
              proof
            );

          await expect(tx).to.changeTokenBalances(c98, [matrixVaultInstance, account1], [-1000000, 1000000]);
        });
      });

      context("Redeem with wrong proof", async () => {
        it("Should revert", async () => {
          const eventId = ethers.utils.solidityKeccak256(["string"], ["event"]);
          const currentTimestamp = await time.latest();
          let whitelist = [
            <WhitelistCollectionData>{
              type:"collection",
              index: 0,
              unlockTimestamp: (await time.latest()) + 100,
              collectionAddress: starship.address,
              tokenId: 0,
              receivingAmount: 1000000,
              sendingAmount: 0,
            },
            <WhitelistCollectionData>{
              type:"collection",
              index: 1,
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
                proof.slice(1)
              )
          ).to.be.revertedWith("C98Vault: Invalid proof");
        });
      });

      context("Redeem for specific token", async () => {
        it("Should revert", async () => {
            const eventId = ethers.utils.solidityKeccak256(["string"], ["event"]);
            const currentTimestamp = await time.latest();
            let whitelist = [
              <WhitelistCollectionData>{
                type:"collection",
                index: 0,
                unlockTimestamp: (await time.latest()) + 100,
                collectionAddress: starship.address,
                tokenId: 0,
                receivingAmount: 1000000,
                sendingAmount: 0,
              },
              <WhitelistCollectionData>{
                type:"collection",
                index: 1,
                unlockTimestamp: (await time.latest()) + 200,
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
                proof
              );
              console.log("hello");
              await expect(matrixVaultInstance
              .connect(account1)
              .redeemForSpecificTokenHolder(
                eventId,
                account1.address,
                0,
                currentTimestamp + 100,
                starship.address,
                0,
                1000000,
                0,
                proof
              )).to.be.revertedWith("C98Vault: Invalid proof");
        });
      });
    });
  });

  describe("Fee", async () => {
    context("Set fee", async () => {
      it("Should set fee successfully", async () => {
        const tx = await matrixVaultFactory.connect(owner).setFee(1000, 0);

        await expect(tx).to.emit(broadcaster, "Event");
      });
    });

    context("Fee in native", async () => {
      it("Should transfer fee successfully", async () => {
        await matrixVaultFactory.connect(owner).setFee(1000, 0);
        let { eventId, currentTimestamp, tree } = await loadFixture(createEvent);
        let proof = await getProof(tree, 0);

        await time.increaseTo(currentTimestamp + 101);
        const tx = await matrixVaultInstance
          .connect(account1)
          .redeemForSpecificTokenHolder(
            eventId,
            account1.address,
            0,
            currentTimestamp + 100,
            starship.address,
            0,
            1000000,
            0,
            proof,
            {
              value: 1000,
            }
          );

        await expect(tx).to.changeEtherBalances([account1, matrixVaultFactory], [-1000, 1000]);
      });

      it("Should revert if fee is not enough", async () => {
        await matrixVaultFactory.connect(owner).setFee(1000, 0);
        let { eventId, currentTimestamp, tree } = await loadFixture(createEvent);
        let proof = await getProof(tree, 0);

        await time.increaseTo(currentTimestamp + 101);
        await expect(
          matrixVaultInstance
            .connect(account1)
            .redeemForSpecificTokenHolder(
              eventId,
              account1.address,
              0,
              currentTimestamp + 100,
              starship.address,
              0,
              1000000,
              0,
              proof,
              {
                value: 999,
              }
            )
        ).to.be.revertedWith("C98Vault: Insufficient fee");
      });
    });
  });
});
