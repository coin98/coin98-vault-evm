import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { Broadcaster, Coin98VaultV2Factory, MatrixVault, MockVRC25, MockVRC725 } from "../../typechain-types";

export interface VaultFixture {
  owner: SignerWithAddress;
  account1: SignerWithAddress;
  account2: SignerWithAddress;
  account3: SignerWithAddress;
  broadcaster: Broadcaster;
  c98: MockVRC25;
  starship: MockVRC725;
  matrixVaultInstance: MatrixVault;
  matrixVaultFactory: Coin98VaultV2Factory;
}

export async function vaultFixture(): Promise<VaultFixture> {
  const [owner, account1, account2, account3] = await ethers.getSigners();

  const C98 = await ethers.getContractFactory("MockVRC25");
  const c98 = await C98.deploy("C98", "C98", 18);
  await c98.deployed();
  console.log("MockVRC25 deployed to:", c98.address);

  const Starship = await ethers.getContractFactory("MockVRC725");
  const starship = await Starship.deploy();
  await starship.deployed();
  console.log("MockVRC725 deployed to:", starship.address);

  const Broadcaster = await ethers.getContractFactory("Broadcaster");
  const broadcaster = await Broadcaster.deploy();
  console.log("Broadcaster deployed to:", broadcaster.address);

  const MatrixVault = await ethers.getContractFactory("MatrixVault");
  const matrixVault = await MatrixVault.deploy(broadcaster.address);
  await matrixVault.deployed();
  console.log("MatrixVault deployed to:", matrixVault.address);

  const MatrixVaultFactory = await ethers.getContractFactory("Coin98VaultV2Factory");
  const matrixVaultFactory = await MatrixVaultFactory.deploy(matrixVault.address, broadcaster.address);
  await matrixVaultFactory.deployed();
  console.log("MatrixVaultFactory deployed to:", matrixVaultFactory.address);

  await broadcaster.registerProject(
    matrixVaultFactory.projectKey(),
    [matrixVaultFactory.address],
    [matrixVaultFactory.address]
  );

  const salt = ethers.utils.solidityKeccak256(["string"], ["vault"]);
  const tx = await matrixVaultFactory.createVault(owner.address, salt);
  await tx.wait();

  const vaultAddress = await matrixVaultFactory.getVaultAddress(salt);
  const matrixVaultInstance = await ethers.getContractAt("MatrixVault", vaultAddress);

  await starship.connect(account1).mint(account1.address, 0);
  await starship.connect(account2).mint(account2.address, 1);

  await c98.connect(owner).mint(vaultAddress, 3000000);

  return {
    owner,
    account1,
    account2,
    account3,
    broadcaster,
    c98,
    starship,
    matrixVaultInstance,
    matrixVaultFactory,
  };
}
