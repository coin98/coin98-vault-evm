import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { factoryFixture } from "./fixtures/factory.fixture";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Coin98VaultNftFactory, MockERC20 } from "../typechain-types";
import { Hasher, ZERO_ADDRESS, ZERO_BYTES32 } from "@coin98/solidity-support-library";
import { WhitelistNftData, createWhitelistNftTree } from "./common";
import { parseEther } from "ethers/lib/utils";

let owner: SignerWithAddress;
let acc1: SignerWithAddress;
let acc2: SignerWithAddress;
let accs: SignerWithAddress[];
let admin: SignerWithAddress;
let vaultFactory: Coin98VaultNftFactory;
let c98: MockERC20;

describe("Coin98VaultNftFactory", function () {
    beforeEach(async () => {
        ({ owner, acc1, acc2, admin, accs, vaultFactory, c98 } = await loadFixture(factoryFixture));
    });

    describe("Create vault", async () => {
        context("Create vault", async () => {
            let nftAddress: string;

            it("Should create vault", async () => {
                const salt = "0x" + Hasher.keccak256("vault").toString("hex");
                let whitelistData = [
                    <WhitelistNftData>{ to: accs[0].address, tokenId: 1, totalAlloc: parseEther("1000") },
                    <WhitelistNftData>{ to: accs[1].address, tokenId: 2, totalAlloc: parseEther("2000") },
                    <WhitelistNftData>{ to: accs[2].address, tokenId: 3, totalAlloc: parseEther("3000") }
                ];
                let tree = createWhitelistNftTree(whitelistData);
                const whitelistRoot = "0x" + tree.root().hash.toString("hex");
                let vaultInitParams = {
                    owner: owner.address,
                    token: c98.address,
                    merkleRoot: whitelistRoot,
                    salt: salt,
                    schedules: [
                        { timestamp: (await time.latest()) + 100, percent: 10 },
                        { timestamp: (await time.latest()) + 200, percent: 20 },
                        { timestamp: (await time.latest()) + 300, percent: 30 },
                        { timestamp: (await time.latest()) + 400, percent: 40 }
                    ]
                };

                const collectionSalt = "0x" + Hasher.keccak256("collection").toString("hex");
                let collectionInitParams = {
                    owner: owner.address,
                    name: "Test Collection",
                    symbol: "TC",
                    salt: collectionSalt
                };

                const tx = await vaultFactory.connect(owner).createVault(vaultInitParams, collectionInitParams);

                expect(tx).to.emit(vaultFactory, "VaultCreated");
            });
        });
    });
});
