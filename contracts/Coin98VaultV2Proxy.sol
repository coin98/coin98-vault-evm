// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;
import "./lib/VRC25.sol";
import "./Coin98VaultV2.sol";
import "./lib/Token.sol";

contract Coin98V2VaultProxy is VRC25 {
    using AdvancedERC20 for IERC20;

    constructor() VRC25("Coin98 Vault Proxy", "C98VP", 18) {
    }
    function redeem(address payable vaultAddress, uint256 eventId_, uint256 index_, uint256 timestamp_, address recipient_, uint256 receivingAmount_, uint256 sendingAmount_, bytes32[] calldata proofs) public payable {
        Coin98VaultV2.EventData memory eventData = Coin98VaultV2(vaultAddress).eventInfo(eventId_);

        if (sendingAmount_ > 0) {
            IERC20(eventData.sendingToken).safeTransferFrom(msg.sender, address(this), sendingAmount_);
            IERC20(eventData.sendingToken).safeApprove(vaultAddress, sendingAmount_);
        }
        Coin98VaultV2(vaultAddress).redeem{value: msg.value}(eventId_, index_, timestamp_, recipient_, receivingAmount_, sendingAmount_, proofs);
    }

    // VRC25

    /**
     * @notice Calculate fee required for action related to this token
     * @param value Amount of fee
     */
    function _estimateFee(uint256 value) internal view override returns (uint256) {
        return 0;
    }
}
