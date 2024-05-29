// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// Interfaces
import "./interfaces/ICoin98VaultNft.sol";
import "./interfaces/ICoin98VaultNftFactory.sol";

// Libraries
import "./libraries/VRC25.sol";
import "./libraries/AdvancedERC20.sol";

contract Coin98VaultNftProxy is VRC25 {
    using AdvancedERC20 for IERC20;

    constructor(string memory name, string memory symbol) VRC25(name, symbol, 18) {}

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

    function split(address payable vaultAddress, address receiver, uint256 tokenId, uint256 rate) external {
        ICoin98VaultNft(vaultAddress).split(receiver, tokenId, rate);
    }

    function createVault(
        address payable factory,
        ICoin98VaultNft.InitParams memory vaultInitParams,
        ICreditVaultNFT.InitParams memory collectionInitParams
    ) external returns (address vault) {
        return ICoin98VaultNftFactory(factory).createVault(vaultInitParams, collectionInitParams);
    }

    function createCollection(
        address payable factory,
        ICreditVaultNFT.InitParams memory params
    ) external returns (address collection) {
        return ICoin98VaultNftFactory(factory).createCollection(params);
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
