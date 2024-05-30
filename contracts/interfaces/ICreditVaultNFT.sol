// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface ICreditVaultNFT {
    struct InitParams {
        address owner;
        string name;
        string symbol;
        bytes32 salt;
    }

    function mint(address to, uint256 totalAlloc) external returns (uint256 tokenId);

    function burn(uint256 tokenId) external;

    function updateTotalAlloc(uint256 tokenId, uint256 totalAlloc) external;

    function updateClaimedAlloc(uint256 tokenId, uint256 claimedAlloc) external;

    function getTotalAlloc(uint256 tokenId) external view returns (uint256);

    function getClaimedAlloc(uint256 tokenId) external view returns (uint256);

    function current() external view returns (uint256);
}
