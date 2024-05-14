// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./ICoin98VaultNft.sol";
import "./ICollection.sol";

interface ICoin98VaultNftFactory {
    struct InitParams {
        address owner;
        address token;
        address collection;
        bytes32 merkleRoot;
        bytes32 salt;
        ICoin98VaultNft.Schedule[] schedules;
    }

    function createVault(
        ICoin98VaultNft.InitParams memory vaultInitParams,
        ICollection.InitParams memory collectionInitParams
    ) external returns (address vault);

    function createCollection(ICollection.InitParams memory params) external returns (address collection);
}
