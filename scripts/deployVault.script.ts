// const hhe = require("hardhat");
import hhe from "hardhat";

async function main() {
    console.log("🚀 Deploying contract...");
    try {
        const [owner] = await hhe.ethers.getSigners();
        console.log("🚀 ~ main ~ owner:", owner.address)

        //Broadcaster
        const Broadcaster = await hhe.ethers.getContractFactory("Broadcaster");
        const broadcaster = await Broadcaster.connect(owner).deploy();
        await broadcaster.deployed();
        console.log("✅ Broadcaster deployed at:", broadcaster.address);

        // vaultImplementation
        const contractVaultImplementation = await hhe.ethers.getContractFactory("Coin98VaultV2");
        const vaultImplementation = await contractVaultImplementation.connect(owner).deploy(broadcaster.address);
        await vaultImplementation.deployed();
        console.log("✅ vaultImplementation deployed at:", vaultImplementation.address);

        // vaultFactory
        const contractVaultFactory = await hhe.ethers.getContractFactory("Coin98VaultV2Factory");
        const vaultFactory = await contractVaultFactory.connect(owner).deploy(vaultImplementation.address, broadcaster.address);
        await vaultFactory.deployed();
        console.log("🚀 ~ main ~ vaultFactory:", vaultFactory.address)

        // registerProject
        const registerProject = await broadcaster.connect(owner).registerProject(vaultFactory.projectKey(), [vaultFactory.address], [vaultFactory.address]);
        console.log("🚀 ~ main ~ registerProject:", registerProject)

        // //createVault
        // const salt = hhe.ethers.utils.keccak256(hhe.ethers.utils.toUtf8Bytes("vault_admin"));
        // const deployTransaction = await vaultFactory.connect(owner).createVault(owner.address, salt);
        // await deployTransaction.wait();
        // const vaultAddress = await vaultFactory.getVaultAddress(salt);
        // console.log("🚀 ~ main ~ vaultAddress:", vaultAddress)

    } catch (error) {
        console.log("🚀 ~ main ~ error:", error)
        process.exit(1);
    }
}

main();
