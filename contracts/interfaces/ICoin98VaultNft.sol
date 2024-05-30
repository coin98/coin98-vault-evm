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
        uint256 maxSplitRate;
        bytes32 merkleRoot;
        bytes32 salt;
        address[] feeTokenAddresses;
        FeeTokenInfo[] feeTokenInfos;
        address feeReceiver;
        Schedule[] schedules;
    }

    struct FeeTokenInfo {
        address oracle;
        uint256 feeInToken;
        uint256 feeInUsd;
    }

    function __Coin98VaultNft_init(InitParams memory params) external;

    function mint(address receiver, uint256 tokenId, uint256 totalAlloc, bytes32[] calldata proofs) external;

    function claim(address receiver, uint256 tokenId, uint256 scheduleIndex) external;

    function split(address receiver, uint256 tokenId, uint256 rate, address feeToken) external payable;
}
