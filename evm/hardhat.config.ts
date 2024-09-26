import '@nomicfoundation/hardhat-toolbox';
import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-ethers";

module.exports = {
  solidity: {
    version: '0.8.12',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: './contracts',
    tests: './tests',
    artifacts: './artifacts',
    cache: './cache'
  }
};
