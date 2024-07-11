// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.0;

/**
 * @title IBroadcaster
 * @author Coin98 Labs
 * @notice Interface for interact with Coin98 global broadcaster smart contract
 */
interface IBroadcaster {
    /**
     * @param project project key
     * @param action action of event
     * @param from caller
     * @param to smart contract emit event
     * @param data data of event
     */
    function broadcast(bytes32 project, bytes memory action, address from, address to, bytes memory data) external;

    /**
     * @notice Factory will call this function when create new child contract
     * @param project project key
     * @param member child contract address
     * @param isActive true
     */
    function setMember(bytes32 project, address member, bool isActive) external;
}
