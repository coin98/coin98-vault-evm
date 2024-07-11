// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "../interfaces/IBroadcaster.sol";

/**
 * @title BroadcasterHelper
 * @author Coin98 Labs
 * @notice Abstract contract for interact with Coin98 Global Broadcaster
 */
abstract contract BroadcasterHelper {
    /// @notice immutable params store broadcaster address
    IBroadcaster public immutable broadcaster;

    bytes32 public immutable projectKey;

    /**
     * @param broadcasterAddress broadcaster address
     * @param name project name
     * @param version project version
     */
    constructor(address broadcasterAddress, bytes memory name, bytes memory version) {
        broadcaster = IBroadcaster(broadcasterAddress);
        projectKey = keccak256(abi.encodePacked(name, version));
    }

    /**
     * @notice Emit event
     * @param action action of event
     * @param from caller
     * @param to smart contract address
     * @param data data of event
     */
    function _emitEvent(bytes memory action, address from, address to, bytes memory data) internal {
        broadcaster.broadcast(projectKey, action, from, to, data);
    }

    /**
     * @notice set member to broadcaster to emit event
     * @param member address of member
     * @param isActive status
     */
    function _setBroadcasterMember(address member, bool isActive) internal {
        broadcaster.setMember(projectKey, member, isActive);
    }
}
