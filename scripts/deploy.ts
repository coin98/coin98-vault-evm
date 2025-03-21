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
        await broadcaster.waitForDeployment();
        const broadcastAddr = await broadcaster.getAddress()

        console.log("✅ Broadcaster deployed at:", broadcastAddr);

        // vaultImplementation
        const contractVaultImplementation = await hhe.ethers.getContractFactory("Coin98VaultV2");
        const vaultImplementation = await contractVaultImplementation.connect(owner).deploy(broadcastAddr);
        await vaultImplementation.waitForDeployment();
        const vaultImplementAddr = await vaultImplementation.getAddress()
        console.log("✅ vaultImplementation deployed at:", vaultImplementAddr);

        // vaultFactory
        const contractVaultFactory = await hhe.ethers.getContractFactory("Coin98VaultV2Factory");
        const vaultFactory = await contractVaultFactory.connect(owner).deploy(vaultImplementAddr, broadcastAddr);
        await vaultFactory.waitForDeployment();
        const factoryAddr = await vaultFactory.getAddress()
        console.log("🚀 ~ main ~ vaultFactory:", factoryAddr)

        // registerProject
        const registerProject = await broadcaster.connect(owner).registerProject(await vaultFactory.projectKey(), [factoryAddr], [factoryAddr]);
        console.log("🚀 ~ main ~ registerProject done")
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
