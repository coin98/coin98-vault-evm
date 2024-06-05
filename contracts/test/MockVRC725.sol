// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../lib/VRC725.sol";

contract MockVRC725 is VRC725 {
    constructor() {
        __VRC725_init("MockVRC725", "MVRC725", msg.sender);
    }

    function mint(address to, uint256 tokenId) external {
        _safeMint(to, tokenId);
    }
}
