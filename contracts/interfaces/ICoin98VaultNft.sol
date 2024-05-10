// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface ICoin98VaultNft {
    struct Schedule {
        uint256 timestamp;
        uint256 percent;
    }

    struct Allocation {
        uint256 claimedAlloc;
        uint256 totalAlloc;
    }

    struct InitParams {
        address owner;
        address token;
        address collection;
        bytes32 merkleRoot;
        bytes32 salt;
        Schedule[] schedules;
    }

    function __Coin98VaultNft_init(InitParams memory params) external;

    function getTotalAlloc(uint256 tokenId) external view returns (uint256);

    function getClaimedAlloc(uint256 tokenId) external view returns (uint256);
}
