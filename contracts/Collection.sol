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

import "hardhat/console.sol";

contract Collection is VRC725Enumerable, Initializable, ICollection, ReentrancyGuard {
    mapping(address => bool) private _minters; // Mapping to store minter addresses

    mapping(uint256 => uint256) private _totalAlloc;
    mapping(uint256 => uint256) private _claimedAlloc;

    event SetMinter(address minter, bool isActive);
    event Minted(address indexed to, uint256 indexed tokenId);
    event Burned(uint256 indexed tokenId);

    /**
     * @dev Modifier to allow only minters to execute a function.
     */
    modifier onlyMinter() {
        require(_minters[msg.sender], "Only from minter");
        _;
    }

    function __Collection_init(string memory name, string memory symbol, address owner) external initializer {
        console.log("Collection init");
        __VRC725_init(name, symbol, owner);
    }

    function mint(address to, uint256 tokenId, uint256 totalAlloc, uint256 claimedAlloc) external onlyMinter {
        _totalAlloc[tokenId] = totalAlloc;
        _claimedAlloc[tokenId] = claimedAlloc;

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

    function claim(uint256 tokenId, uint256 claimedAmount) external nonReentrant {
        _claimedAlloc[tokenId] = claimedAmount;
    }

    // SETTERS

    /**
     * @dev Function to set a new minter.
     * @param minter Address of the new minter.
     * @param isActive True if the minter can perform operations.
     */
    function setMinter(address minter, bool isActive) public onlyOwner {
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
     * @dev Get total allocation of a token id
     * @param tokenId ID of the token
     * @return Allocation of the token
     */
    function getTotalAlloc(uint256 tokenId) public view returns (uint256) {
        return _totalAlloc[tokenId];
    }

    /**
     * @dev Get claimed allocation of a token id
     * @param tokenId ID of the token
     * @return Allocation of the token
     */
    function getClaimedAlloc(uint256 tokenId) public view returns (uint256) {
        return _claimedAlloc[tokenId];
    }

    function ownerOf(uint256 tokenId) public view virtual override(ICollection, IERC721, VRC725) returns (address) {
        address owner = _ownerOf(tokenId);

        require(owner != address(0), "VRC725: invalid token ID");
        return owner;
    }
}
