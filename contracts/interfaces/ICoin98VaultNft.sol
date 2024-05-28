// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface ICoin98VaultNft {
    struct Schedule {
        uint256 timestamp;
        uint256 percent;
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

    function mint(address receiver, uint256 tokenId, uint256 totalAlloc, bytes32[] calldata proofs) external;

    function claim(address receiver, uint256 tokenId, uint256 scheduleIndex) external;
}
