// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "../interfaces/IERC20.sol";

library AdvancedERC20 {
    function safeApprove(IERC20 token, address spender, uint256 amount) internal {
        bytes4 selector = 0x095ea7b3;
        assembly {
            let emptyPtr := mload(0x40)
            mstore(emptyPtr, selector)
            mstore(add(emptyPtr, 0x04), spender)
            mstore(add(emptyPtr, 0x24), amount)
            let status := call(gas(), token, 0, emptyPtr, 0x44, 0, 0x20)
            if iszero(status) {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
            let success := or(
                iszero(returndatasize()), // empty return data
                and(gt(returndatasize(), 31), eq(mload(0), 1)) // true in return data
            )
            if iszero(success) {
                mstore(0, 0xca36f91800000000000000000000000000000000000000000000000000000000) // ERC20ApprovalFailed()
                revert(0, 4)
            }
        }
    }

    function safeTransfer(IERC20 token, address to, uint256 amount) internal {
        bytes4 selector = 0xa9059cbb;
        assembly {
            let emptyPtr := mload(0x40)
            mstore(emptyPtr, selector)
            mstore(add(emptyPtr, 0x04), to)
            mstore(add(emptyPtr, 0x24), amount)
            let status := call(gas(), token, 0, emptyPtr, 0x44, 0, 0x20)
            if iszero(status) {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
            let success := or(
                iszero(returndatasize()), // empty return data
                and(gt(returndatasize(), 31), eq(mload(0), 1)) // true in return data
            )
            if iszero(success) {
                mstore(0, 0xf27f64e400000000000000000000000000000000000000000000000000000000) // ERC20TransferFailed()
                revert(0, 4)
            }
        }
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 amount) internal {
        bytes4 selector = 0x23b872dd;
        assembly {
            let emptyPtr := mload(0x40)
            mstore(emptyPtr, selector)
            mstore(add(emptyPtr, 0x4), from)
            mstore(add(emptyPtr, 0x24), to)
            mstore(add(emptyPtr, 0x44), amount)
            let status := call(gas(), token, 0, emptyPtr, 0x64, 0, 0x20)
            if iszero(status) {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
            let success := or(
                iszero(returndatasize()), // empty return data
                and(gt(returndatasize(), 31), eq(mload(0), 1)) // true in return data
            )
            if iszero(success) {
                mstore(0, 0xa512d51e00000000000000000000000000000000000000000000000000000000) // ERC20TransferFromFailed()
                revert(0, 4)
            }
        }
    }
}
