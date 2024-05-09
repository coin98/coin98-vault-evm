// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface ICollection {
    function mint(address to, uint256 tokenId, uint256 totalAlloc, uint256 claimedAlloc) external;

    function ownerOf(uint256 tokenId) external view returns (address);

    function claim(uint256 tokenId, uint256 amount) external;
}
