// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface IVaultNft {
    function mint(address to, uint256 tokenId) external;

    function ownerOf(uint256 tokenId) external view returns (address);
}
