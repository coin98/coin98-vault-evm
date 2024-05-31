import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Coin98VaultNft, MockERC20, CreditVaultNFT, FixedPriceOracle } from "../typechain-types";
import { MerkleTreeKeccak, ZERO_ADDRESS } from "@coin98/solidity-support-library";
import { vaultFixture } from "./fixtures";
import { WhitelistCollectionData } from "./common";
import { ethers } from "hardhat";

let owner: SignerWithAddress;
let acc1: SignerWithAddress;
let acc2: SignerWithAddress;
let accs: SignerWithAddress[];
let vault: Coin98VaultNft;
let fixedPriceOracle: FixedPriceOracle;
let c98: MockERC20;
let usdt: MockERC20;
let collection: CreditVaultNFT;
let tree: MerkleTreeKeccak;

describe("Coin98VaultNft", function () {
    beforeEach(async () => {
        ({ owner, acc1, acc2, accs, vault, collection, fixedPriceOracle, c98, usdt, tree } = await loadFixture(
            vaultFixture
        ));
    });

    describe("Mint", async () => {
        context("To whitelist", async () => {
            it("Should mint NFT", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                const tx = await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);
                expect(await collection.ownerOf(1)).to.equal(accs[0].address);

                expect(tx).to.emit(vault, "Minted").withArgs(accs[0].address, 1, 1000);
            });
        });

        context("Not in whitelist", async () => {
            it("Wrong address", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                await expect(vault.connect(accs[1]).mint(accs[1].address, 1, 1000, proofs)).to.be.revertedWith(
                    "Coin98VaultNft: Invalid proof"
                );
            });

            it("Wrong tokenId", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                await expect(vault.connect(accs[0]).mint(accs[0].address, 2, 1000, proofs)).to.be.revertedWith(
                    "Coin98VaultNft: Invalid proof"
                );
            });

            it("Wrong totalAlloc", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));

                await expect(vault.connect(accs[0]).mint(accs[0].address, 1, 2000, proofs)).to.be.revertedWith(
                    "Coin98VaultNft: Invalid proof"
                );
            });
        });

        context("Mint multiple times", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await expect(vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs)).to.be.revertedWith(
                    "Coin98VaultNft: Already minted"
                );
            });
        });

        context("Transfer NFT", async () => {
            it("Should transfer NFT", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await collection.connect(accs[0]).transferFrom(accs[0].address, acc1.address, 1);

                expect(await collection.ownerOf(1)).to.equal(acc1.address);
            });
        });
    });

    describe("Claim", async () => {
        context("Receiver not owner of NFT", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                await expect(vault.connect(accs[0]).claim(accs[1].address, 1, 0)).to.be.revertedWith(
                    "Coin98VaultNft: Receiver not owner of token"
                );
            });
        });

        context("Token Id not minted", async () => {
            it("Should revert", async () => {
                await expect(vault.connect(accs[0]).claim(accs[0].address, 1, 0)).to.be.revertedWith(
                    "VRC725: invalid token ID"
                );
            });
        });

        context("Claim before schedule", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await expect(vault.connect(accs[0]).claim(accs[0].address, 1, 0)).to.be.revertedWith(
                    "Coin98VaultNft: Schedule not available"
                );
            });
        });

        context("Already claimed", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

                await expect(vault.connect(accs[0]).claim(accs[0].address, 1, 0)).to.be.revertedWith(
                    "Coin98VaultNft: Already claimed"
                );
            });
        });

        context("Wrong schedule index", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                await expect(vault.connect(accs[0]).claim(accs[0].address, 1, 1)).to.be.revertedWith(
                    "Coin98VaultNft: Schedule not available"
                );
            });
        });

        context("Claim after schedule", async () => {
            it("Should transfer correct amount", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                const tx = await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

                await expect(tx).to.changeTokenBalances(c98, [accs[0], vault], [100, -100]);
            });

            it("Should emit claimed event", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                const tx = await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

                await expect(tx).to.emit(vault, "Claimed").withArgs(accs[0].address, 1, 0, 100);
            });
        });

        context("Claim multiple times", async () => {
            it("Should claim multiple times", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

                await time.increaseTo((await time.latest()) + 201);
                const tx = await vault.connect(accs[0]).claim(accs[0].address, 1, 1);

                await expect(tx).to.emit(vault, "Claimed").withArgs(accs[0].address, 1, 1, 200);
                await expect(tx).to.changeTokenBalances(c98, [accs[0], vault], [200, -200]);

                await time.increaseTo((await time.latest()) + 301);
                const tx2 = await vault.connect(accs[0]).claim(accs[0].address, 1, 2);
                await expect(tx2).to.emit(vault, "Claimed").withArgs(accs[0].address, 1, 2, 300);
                await expect(tx2).to.changeTokenBalances(c98, [accs[0], vault], [300, -300]);

                await time.increaseTo((await time.latest()) + 401);
                const tx3 = await vault.connect(accs[0]).claim(accs[0].address, 1, 3);
                await expect(tx3).to.emit(vault, "Claimed").withArgs(accs[0].address, 1, 3, 400);
                await expect(tx3).to.changeTokenBalances(c98, [accs[0], vault], [400, -400]);
            });
        });

        context("Transfer NFT", async () => {
            it("Should claim after transfer NFT", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await collection.connect(accs[0]).transferFrom(accs[0].address, acc1.address, 1);

                await time.increaseTo((await time.latest()) + 101);
                const tx = await vault.connect(acc1).claim(acc1.address, 1, 0);

                await expect(tx).to.emit(vault, "Claimed").withArgs(acc1.address, 1, 0, 100);
                await expect(tx).to.changeTokenBalances(c98, [acc1, vault], [100, -100]);
            });

            it("Should revert claimed schedule after transfer NFT", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

                await collection.connect(accs[0]).transferFrom(accs[0].address, acc1.address, 1);

                await time.increaseTo((await time.latest()) + 201);
                await expect(vault.connect(acc1).claim(acc1.address, 1, 0)).to.be.revertedWith(
                    "Coin98VaultNft: Already claimed"
                );

                await expect(vault.connect(acc1).claim(acc1.address, 1, 1)).to.be.emit(vault, "Claimed");
            });
        });
    });

    describe("Split", async () => {
        context("Not owner", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await expect(vault.connect(acc1).split(acc1.address, 1, 6000, usdt.address)).to.be.revertedWith(
                    "Coin98VaultNft: Receiver not owner of token"
                );
            });
        });

        context("Invalid rate", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await expect(vault.connect(accs[0]).split(accs[0].address, 1, 11000, usdt.address)).to.be.revertedWith(
                    "Coin98VaultNft: Invalid rate"
                );
            });
        });

        context("Invalid token ID", async () => {
            it("Should revert", async () => {
                await expect(vault.connect(accs[0]).split(accs[0].address, 2, 6000, usdt.address)).to.be.revertedWith(
                    "VRC725: invalid token ID"
                );
            });
        });

        context("Invalid fee token", async () => {
            it("Should revert", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await expect(vault.connect(accs[0]).split(accs[0].address, 1, 6000, c98.address)).to.be.revertedWith(
                    "Coin98VaultNft: Invalid fee token"
                );
            });
        });

        context("Split correctly", async () => {
            it("Should emit event", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await usdt.connect(owner).mint(accs[0].address, ethers.utils.parseEther("1"));
                await usdt.connect(accs[0]).approve(vault.address, ethers.utils.parseEther("1"));

                const tx = await vault.connect(accs[0]).split(accs[0].address, 1, 6000, usdt.address);

                await expect(tx).to.emit(vault, "Splitted").withArgs(accs[0].address, 1, 2, 3, 6000);
            });

            it("Should burn NFT and mint new NFTs correctly", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await usdt.connect(owner).mint(accs[0].address, ethers.utils.parseEther("100"));
                await usdt.connect(accs[0]).approve(vault.address, ethers.utils.parseEther("100"));

                await vault.connect(accs[0]).split(accs[0].address, 1, 6000, usdt.address);

                await expect(collection.ownerOf(1)).to.be.revertedWith("VRC725: invalid token ID");
                expect(await collection.ownerOf(2)).to.equal(accs[0].address);
                expect(await collection.ownerOf(3)).to.equal(accs[0].address);
            });

            it("Should update total alloc", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await usdt.connect(owner).mint(accs[0].address, ethers.utils.parseEther("100"));
                await usdt.connect(accs[0]).approve(vault.address, ethers.utils.parseEther("100"));

                await vault.connect(accs[0]).split(accs[0].address, 1, 6000, usdt.address);

                expect(await collection.getTotalAlloc(2)).to.equal(600);
                expect(await collection.getTotalAlloc(3)).to.equal(400);
            });

            it("Should update claimed allocation", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

                await usdt.connect(owner).mint(accs[0].address, ethers.utils.parseEther("100"));
                await usdt.connect(accs[0]).approve(vault.address, ethers.utils.parseEther("100"));

                await vault.connect(accs[0]).split(accs[0].address, 1, 6000, usdt.address);

                expect(await collection.getClaimedAlloc(2)).to.equal(60);
                expect(await collection.getClaimedAlloc(3)).to.equal(40);
            });

            it("Should update claimed alloc multiple times", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

                await time.increaseTo((await time.latest()) + 201);
                await vault.connect(accs[0]).claim(accs[0].address, 1, 1);

                await usdt.connect(owner).mint(accs[0].address, ethers.utils.parseEther("100"));
                await usdt.connect(accs[0]).approve(vault.address, ethers.utils.parseEther("100"));

                await vault.connect(accs[0]).split(accs[0].address, 1, 6000, usdt.address);

                expect(await collection.getClaimedAlloc(2)).to.equal(180);
                expect(await collection.getClaimedAlloc(3)).to.equal(120);
            });
        });

        context("Transfer NFT after split", async () => {
            it("Should transfer NFT after split", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await usdt.connect(owner).mint(accs[0].address, ethers.utils.parseEther("100"));
                await usdt.connect(accs[0]).approve(vault.address, ethers.utils.parseEther("100"));

                await vault.connect(accs[0]).split(accs[0].address, 1, 6000, usdt.address);

                await collection.connect(accs[0]).transferFrom(accs[0].address, acc1.address, 2);

                expect(await collection.ownerOf(2)).to.equal(acc1.address);
            });

            it("Should claim token after transfer", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await usdt.connect(owner).mint(accs[0].address, ethers.utils.parseEther("100"));
                await usdt.connect(accs[0]).approve(vault.address, ethers.utils.parseEther("100"));

                await vault.connect(accs[0]).split(accs[0].address, 1, 6000, usdt.address);

                await collection.connect(accs[0]).transferFrom(accs[0].address, acc1.address, 2);

                await time.increaseTo((await time.latest()) + 101);
                await vault.connect(acc1).claim(acc1.address, 2, 0);

                expect(await collection.getClaimedAlloc(2)).to.equal(60);
            });

            it("Should revert claimed schedule after transfer", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

                await usdt.connect(owner).mint(accs[0].address, ethers.utils.parseEther("100"));
                await usdt.connect(accs[0]).approve(vault.address, ethers.utils.parseEther("100"));

                await vault.connect(accs[0]).split(accs[0].address, 1, 6000, usdt.address);

                await collection.connect(accs[0]).transferFrom(accs[0].address, acc1.address, 2);

                await time.increaseTo((await time.latest()) + 201);
                await expect(vault.connect(acc1).claim(acc1.address, 2, 0)).to.be.revertedWith(
                    "Coin98VaultNft: Already claimed"
                );

                await expect(vault.connect(acc1).claim(acc1.address, 2, 1)).to.be.emit(vault, "Claimed");
            });
        });
    });

    describe("Fee", async () => {
        context("Fee in USD > 0", async () => {
            it("Should charge fee correctly", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await usdt.connect(owner).mint(accs[0].address, ethers.utils.parseEther("1"));
                await usdt.connect(accs[0]).approve(vault.address, ethers.utils.parseEther("1"));
                const tx = await vault.connect(accs[0]).split(accs[0].address, 1, 6000, usdt.address);

                await expect(tx).to.changeTokenBalances(
                    usdt,
                    [accs[0], owner],
                    [ethers.utils.parseEther("-1"), ethers.utils.parseEther("1")]
                );
            });

            it("Should revert if not enough fee", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await usdt.connect(owner).mint(accs[0].address, ethers.utils.parseEther("0.5"));
                await usdt.connect(accs[0]).approve(vault.address, ethers.utils.parseEther("0.5"));

                await expect(vault.connect(accs[0]).split(accs[0].address, 1, 6000, usdt.address)).to.be.revertedWith(
                    "ERC20: insufficient allowance"
                );
            });

            it("Oracle price change", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await fixedPriceOracle.connect(owner).updatePrice(ethers.utils.parseEther("10"), 18);

                await usdt.connect(owner).mint(accs[0].address, ethers.utils.parseEther("0.1"));
                await usdt.connect(accs[0]).approve(vault.address, ethers.utils.parseEther("0.1"));

                const tx = await vault.connect(accs[0]).split(accs[0].address, 1, 6000, usdt.address);

                await expect(tx).to.changeTokenBalances(
                    usdt,
                    [accs[0], owner],
                    [ethers.utils.parseEther("-0.1"), ethers.utils.parseEther("0.1")]
                );
            });
        });

        context("Fee in token > 0", async () => {
            it("Should charge fee correctly", async () => {
                await vault.connect(owner).setFeeTokenInfos(
                    [usdt.address],
                    [
                        {
                            oracle: fixedPriceOracle.address,
                            feeInToken: ethers.utils.parseEther("1"),
                            feeInUsd: 0
                        }
                    ]
                );

                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await usdt.connect(owner).mint(accs[0].address, ethers.utils.parseEther("1"));
                await usdt.connect(accs[0]).approve(vault.address, ethers.utils.parseEther("1"));

                const tx = await vault.connect(accs[0]).split(accs[0].address, 1, 6000, usdt.address);

                await expect(tx).to.changeTokenBalances(
                    usdt,
                    [accs[0], owner],
                    [ethers.utils.parseEther("-1"), ethers.utils.parseEther("1")]
                );
            });

            it("Should revert if not enough fee", async () => {
                await vault.connect(owner).setFeeTokenInfos(
                    [usdt.address],
                    [
                        {
                            oracle: fixedPriceOracle.address,
                            feeInToken: 0,
                            feeInUsd: ethers.utils.parseEther("1")
                        }
                    ]
                );

                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await usdt.connect(owner).mint(accs[0].address, ethers.utils.parseEther("0.5"));
                await usdt.connect(accs[0]).approve(vault.address, ethers.utils.parseEther("0.5"));

                await expect(vault.connect(accs[0]).split(accs[0].address, 1, 6000, usdt.address)).to.be.revertedWith(
                    "ERC20: insufficient allowance"
                );
            });
        });

        context("Fee in native ETH", async () => {
            it("Should charge fee correctly", async () => {
                await vault.connect(owner).setFeeTokenInfos(
                    [ZERO_ADDRESS],
                    [
                        {
                            oracle: fixedPriceOracle.address,
                            feeInToken: 0,
                            feeInUsd: ethers.utils.parseEther("1")
                        }
                    ]
                );

                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                const tx = await vault
                    .connect(accs[0])
                    .split(accs[0].address, 1, 6000, ZERO_ADDRESS, { value: ethers.utils.parseEther("1") });

                await expect(tx).to.changeEtherBalances(
                    [accs[0], owner],
                    [ethers.utils.parseEther("-1"), ethers.utils.parseEther("1")]
                );
            });

            it("Should revert if not enough fee", async () => {
                await vault.connect(owner).setFeeTokenInfos(
                    [ZERO_ADDRESS],
                    [
                        {
                            oracle: fixedPriceOracle.address,
                            feeInToken: 0,
                            feeInUsd: ethers.utils.parseEther("1")
                        }
                    ]
                );

                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await expect(
                    vault
                        .connect(accs[0])
                        .split(accs[0].address, 1, 6000, ZERO_ADDRESS, { value: ethers.utils.parseEther("0.5") })
                ).to.be.revertedWith("Coin98VaultNft: Invalid fee amount");
            });
        });
    });

    describe("Withdraw", async () => {
        context("Not owner", async () => {
            it("Should revert", async () => {
                await expect(vault.connect(acc1).withdraw(c98.address, acc1.address, 1000)).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                );
            });
        });

        context("Owner", async () => {
            it("Revert if not enough balance", async () => {
                await expect(vault.connect(owner).withdraw(c98.address, owner.address, 100001)).to.be.revertedWith(
                    "Coin98VaultNft: Not enough balance"
                );
            });
        });

        context("Correct amount", async () => {
            it("Should transfer ", async () => {
                const tx = await vault.connect(owner).withdraw(c98.address, owner.address, 1000);

                await expect(tx).to.changeTokenBalances(c98, [owner, vault], [1000, -1000]);
            });

            it("Should emit withdraw event", async () => {
                await expect(vault.connect(owner).withdraw(c98.address, owner.address, 1000))
                    .to.emit(vault, "Withdrawn")
                    .withArgs(owner.address, owner.address, c98.address, 1000);
            });
        });
    });

    describe("Set admin", async () => {
        context("Not owner", async () => {
            it("Should revert", async () => {
                await expect(vault.connect(acc1).setAdmins([acc1.address], [true])).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                );
            });
        });

        context("Owner", async () => {
            it("Should set admin to true", async () => {
                const tx = await vault.connect(owner).setAdmins([acc1.address], [true]);

                await expect(tx).to.emit(vault, "AdminsUpdated").withArgs([acc1.address], [true]);
                expect(await vault.isAdmin(acc1.address)).to.equal(true);
            });

            it("Should set admin to false", async () => {
                const tx = await vault.connect(owner).setAdmins([acc1.address], [false]);

                await expect(tx).to.emit(vault, "AdminsUpdated").withArgs([acc1.address], [false]);
                expect(await vault.isAdmin(acc1.address)).to.equal(false);
            });
        });

        context("Multiple admins", async () => {
            it("Should set multiple admins", async () => {
                const tx = await vault.connect(owner).setAdmins([acc1.address, acc2.address], [true, true]);

                await expect(tx).to.emit(vault, "AdminsUpdated").withArgs([acc1.address, acc2.address], [true, true]);
                expect(await vault.isAdmin(acc1.address)).to.equal(true);
                expect(await vault.isAdmin(acc2.address)).to.equal(true);
            });
        });
    });

    describe("Set fee", async () => {
        context("Set fee token correctly", async () => {
            it("Should charge new fee token", async () => {
                await vault.connect(owner).setFeeTokenInfos(
                    [usdt.address],
                    [
                        {
                            oracle: fixedPriceOracle.address,
                            feeInToken: 0,
                            feeInUsd: ethers.utils.parseEther("0.5")
                        }
                    ]
                );

                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await usdt.connect(owner).mint(accs[0].address, ethers.utils.parseEther("0.5"));
                await usdt.connect(accs[0]).approve(vault.address, ethers.utils.parseEther("0.5"));

                const tx = await vault.connect(accs[0]).split(accs[0].address, 1, 6000, usdt.address);

                await expect(tx).to.changeTokenBalances(
                    usdt,
                    [accs[0], owner],
                    [ethers.utils.parseEther("-0.5"), ethers.utils.parseEther("0.5")]
                );
            });
        });

        context("Non owner", async () => {
            it("Should revert", async () => {
                await expect(
                    vault.connect(acc1).setFeeTokenInfos(
                        [usdt.address],
                        [
                            {
                                oracle: fixedPriceOracle.address,
                                feeInToken: 0,
                                feeInUsd: ethers.utils.parseEther("0.5")
                            }
                        ]
                    )
                ).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });
    });

    describe("Collection", async () => {
        context("Get total allocation of token", async () => {
            it("Should get total allocation of token", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                expect(await collection.getTotalAlloc(1)).to.equal(1000);
            });
        });

        context("Get claimed allocation of token", async () => {
            it("Should get claimed allocation of token", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);
                expect(await collection.getClaimedAlloc(1)).to.equal(0);
            });

            it("Should get claimed allocation of token", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                await time.increaseTo((await time.latest()) + 101);
                await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

                expect(await collection.getClaimedAlloc(1)).to.equal(100);
            });
        });
    });

    describe("Get", async () => {
        context("Get schedule", async () => {
            it("Should get schedule", async () => {
                const schedule = await vault.getSchedules();

                expect(schedule[0].percent).to.equal(1000);
                expect(schedule[1].percent).to.equal(2000);
                expect(schedule[2].percent).to.equal(3000);
            });
        });

        context("Get total alloc", async () => {
            it("Total alloc should be 0", async () => {
                expect(await collection.getTotalAlloc(1)).to.equal(0);
            });

            it("Should get total alloc", async () => {
                // Mint token 1
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                // Get total alloc of token 1
                const totalAlloc = await collection.getTotalAlloc(1);

                expect(totalAlloc).to.equal(1000);
            });
        });

        context("Get collection address", async () => {
            it("Should get collection address", async () => {
                expect(await vault.getCollectionAddress()).to.equal(collection.address);
            });
        });

        context("Get token address", async () => {
            it("Should get token address", async () => {
                expect(await vault.getTokenAddress()).to.equal(c98.address);
            });
        });

        context("Get claimed status", async () => {
            it("Should get claimed status", async () => {
                // Mint token 1
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                expect(await vault.getClaimed(1, 0)).to.equal(false);

                // Claim 100
                await time.increaseTo((await time.latest()) + 101);
                await vault.connect(accs[0]).claim(accs[0].address, 1, 0);

                expect(await vault.getClaimed(1, 0)).to.equal(true);
            });
        });

        context("Get token ID from merkle id", async () => {
            it("Should get token ID", async () => {
                let whitelistProof = tree.proofs(0);
                const proofs = whitelistProof.map(node => "0x" + node.hash.toString("hex"));
                await vault.connect(accs[0]).mint(accs[0].address, 1, 1000, proofs);

                expect(await vault.getTokenId(1)).to.equal(1);
            });
        });
    });
});
