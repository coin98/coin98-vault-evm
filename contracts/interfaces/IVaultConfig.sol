// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface IVaultConfig {
    function fee() external view returns (uint256);

    function gasLimit() external view returns (uint256);

    function ownerReward() external view returns (uint256);
}
