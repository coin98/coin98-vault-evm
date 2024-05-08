// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@coin98/solidity-support-library/contracts/tokens/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 decimal;

    constructor(
        string memory name,
        string memory symbol,
        uint256 supply,
        uint8 _decimal
    ) public ERC20(name, symbol, _decimal) {
        decimal = _decimal;
        _mint(msg.sender, supply);
    }

    function mint(uint256 _amount) public {
        _mint(msg.sender, _amount);
    }
}
