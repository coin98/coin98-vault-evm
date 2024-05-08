// Wrapped smart contract
// Path: contracts/test/WETH.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@coin98/solidity-support-library/contracts/tokens/ERC20.sol";
import "../interfaces/IWETH.sol";

contract WETH is ERC20, IWETH {
    constructor() ERC20("Wrapped Ether", "WETH", 18) {}

    /**
     * @notice Deposit native token to receive equivalent wrapped ETH token
     * Amount of token received token equal `msg.value`
     */
    receive() external payable {
        deposit();
    }

    /**
     * @notice Deposit native token to receive equivalent wrapped ETH token
     * Amount of token received token equal `msg.value`
     */
    fallback() external payable {
        deposit();
    }

    /**
     * @notice Deposit native token to receive equivalent wrapped ETH token
     * Amount of token received token equal `msg.value`
     */
    function deposit() public payable override {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw native token by exchanging wrapped token
     * @param value Amount of native token to receive
     */
    function withdraw(uint256 value) public override {
        _burn(msg.sender, value);
        payable(msg.sender).transfer(value);
        emit Withdrawal(msg.sender, value);
    }
}
