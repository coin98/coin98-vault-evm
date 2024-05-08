// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./libraries/Merkle.sol";
import "./libraries/BitMaps.sol";
import "./libraries/Initializable.sol";
import "./libraries/VRC725.sol";
import "./libraries/Payable.sol";
import "./libraries/OwnableUpgradeable.sol";

contract VaultNft is VRC725, Initializable {
    address public vault;

    function __VaultNft_init(address _owner) external initializer {
        __VRC725_init("VaultNFT", "VNFT", _owner);
    }

    function mint(address to, uint256 tokenId) external {
        require(msg.sender == vault, "VaultNFT: You are not the vault");
        _mint(to, tokenId);
    }

    // SETTERS
    function setVault(address _vault) external onlyOwner {
        vault = _vault;
    }
}
