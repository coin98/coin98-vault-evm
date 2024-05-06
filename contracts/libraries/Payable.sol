// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

/**
 * @dev Enable contract to receive gas token
 */
abstract contract Payable {
    event Deposited(address indexed sender, uint256 value);

    fallback() external payable {
        if (msg.value > 0) {
            emit Deposited(msg.sender, msg.value);
        }
    }

    /// @dev enable wallet to receive ETH
    receive() external payable {
        if (msg.value > 0) {
            emit Deposited(msg.sender, msg.value);
        }
    }
}
