// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./interfaces/ICollection.sol";

import "./libraries/Merkle.sol";
import "./libraries/BitMaps.sol";
import "./libraries/Initializable.sol";
import "./libraries/VRC725Enumerable.sol";
import "./libraries/Payable.sol";
import "./libraries/OwnableUpgradeable.sol";
import "./libraries/ReentrancyGuard.sol";

contract Collection is VRC725Enumerable, Initializable, ICollection, ReentrancyGuard {
    mapping(address => bool) private _minters; // Mapping to store minter addresses

    address private _factory;

    event SetMinter(address minter, bool isActive);
    event Minted(address indexed to, uint256 indexed tokenId);
    event Burned(uint256 indexed tokenId);

    /**
     * @dev Modifier to allow only minters to execute a function.
     */
    modifier onlyMinter() {
        require(_minters[msg.sender], "Collection: Only from minter");
        _;
    }

    modifier onlyOwnerOrFactory() {
        require(msg.sender == owner() || msg.sender == _factory, "Collection: Only from owner or factory");
        _;
    }

    function __Collection_init(string memory name, string memory symbol, address owner) external initializer {
        __VRC725_init(name, symbol, owner);
        _factory = msg.sender;
    }

    function mint(address to, uint256 tokenId) external onlyMinter {
        _safeMint(to, tokenId);

        emit Minted(to, tokenId);
    }

    /**
     * @dev Function to burn a token.
     * @param tokenId ID of the token to be burned.
     */
    function burn(uint256 tokenId) external onlyMinter {
        _burn(tokenId);

        emit Burned(tokenId);
    }

    // SETTERS

    /**
     * @dev Function to set a new minter.
     * @param minter Address of the new minter.
     * @param isActive True if the minter can perform operations.
     */
    function setMinter(address minter, bool isActive) public onlyOwnerOrFactory {
        _minters[minter] = isActive;

        emit SetMinter(minter, isActive);
    }

    // GETTERS
    /**
     * @dev Function to check if an address is a minter.
     * @param minter The address to check.
     * @return True if the address is a minter, false otherwise.
     */
    function isMinter(address minter) external view returns (bool) {
        return _minters[minter];
    }

    /**
     * @dev Function to get the factory address.
     * @return The factory address.
     */
    function getFactory() external view returns (address) {
        return _factory;
    }
}
