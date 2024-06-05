// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../lib/VRC25.sol";

contract MockVRC25 is VRC25 {
    constructor(string memory name, string memory symbol, uint8 decimals) VRC25(name, symbol, decimals) {
        _mint(msg.sender, 10 ** 28);
    }

    function _estimateFee(uint256 value) internal view virtual override returns (uint256) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
