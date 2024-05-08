// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface ICoin98VaultNft {
    struct Schedule {
        uint256 timestamp;
        uint256 percent;
    }

    struct InitParams {
        address token;
        address nft;
        address weth;
        bytes32 merkleRoot;
        Schedule[] schedules;
    }

    function __Coin98VaultNft_init(InitParams memory params) external;
}
