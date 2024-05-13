// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./libraries/VRC25.sol";
import "./libraries/AdvancedERC20.sol";
import "./interfaces/ICoin98VaultNft.sol";

contract Coin98VaultNftProxy is VRC25 {
    using AdvancedERC20 for IERC20;

    constructor() VRC25("Coin98VaultNftProxy", "C98VNP", 18) {}

    function mint(
        address payable vaultAddress,
        address receiver,
        uint256 tokenId,
        uint256 totalAlloc,
        bytes32[] calldata proofs
    ) external {
        ICoin98VaultNft(vaultAddress).mint(receiver, tokenId, totalAlloc, proofs);
    }

    function claim(address payable vaultAddress, address receiver, uint256 tokenId, uint256 scheduleIndex) external {
        ICoin98VaultNft(vaultAddress).claim(receiver, tokenId, scheduleIndex);
    }

    // VRC25
    /**
     * @notice Calculate fee required for action related to this token
     * @param value Amount of fee
     */
    function _estimateFee(uint256 value) internal view override returns (uint256) {
        if (value > minFee()) {
            return value;
        }
        return minFee();
    }
}
