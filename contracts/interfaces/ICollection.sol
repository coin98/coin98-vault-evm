// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface ICollection {
    struct InitParams {
        address owner;
        string name;
        string symbol;
        bytes32 salt;
    }

    function mint(address to, uint256 tokenId) external;
}
