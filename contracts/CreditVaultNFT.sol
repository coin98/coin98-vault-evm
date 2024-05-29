// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./interfaces/ICreditVaultNFT.sol";

import "./libraries/Initializable.sol";
import "./libraries/VRC725Enumerable.sol";

contract CreditVaultNFT is VRC725Enumerable, Initializable, ICreditVaultNFT {
    address private _factory;
    address private _vault;

    uint256 private _counter; // Counter for token IDs

    // Mapping to store minter addresses
    mapping(address => bool) private _minters;
    // Mapping of token Id to get allocation
    mapping(uint256 => Allocation) private _allocs;

    struct Allocation {
        uint256 claimedAlloc;
        uint256 totalAlloc;
    }

    event SetMinter(address minter, bool isActive);
    event Minted(address indexed to, uint256 indexed tokenId);
    event Burned(uint256 indexed tokenId);
    event SetVault(address vault);
    event UpdateTotalAlloc(uint256 indexed tokenId, uint256 totalAlloc);
    event UpdateClaimedAlloc(uint256 indexed tokenId, uint256 claimedAlloc);

    /**
     * @dev Modifier to allow only minters to execute a function.
     */
    modifier onlyMinter() {
        require(_minters[msg.sender], "CreditVaultNFT: Only from minter");
        _;
    }

    modifier onlyOwnerOrFactory() {
        require(msg.sender == owner() || msg.sender == _factory, "CreditVaultNFT: Only from owner or factory");
        _;
    }

    modifier onlyVault() {
        require(msg.sender == _vault, "CreditVaultNFT: Only from vault");
        _;
    }

    /**
     * @dev Internal function to increment the token counter.
     */
    function _incrementCounter() internal {
        _counter += 1;
    }

    function __Collection_init(string memory name, string memory symbol, address owner) external initializer {
        __VRC725_init(name, symbol, owner);
        _factory = msg.sender;
    }

    function mint(address to, uint256 totalAlloc) external onlyMinter returns (uint256 tokenId) {
        tokenId = current() + 1;
        _safeMint(to, tokenId);
        _incrementCounter();

        _allocs[tokenId].totalAlloc = totalAlloc;

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

    /**
     * Update total allocation of a token id
     * @param tokenId ID of the token
     * @param totalAlloc New total allocation of the token
     */
    function updateTotalAlloc(uint256 tokenId, uint256 totalAlloc) external onlyVault {
        _allocs[tokenId].totalAlloc = totalAlloc;
    }

    /**
     * Update claimed allocation of a token id
     * @param tokenId ID of the token
     * @param claimedAlloc New claimed allocation of the token
     */
    function updateClaimedAlloc(uint256 tokenId, uint256 claimedAlloc) external onlyVault {
        _allocs[tokenId].claimedAlloc = claimedAlloc;
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

    /**
     * @dev Function to set the vault address.
     * @param vault Address of the vault.
     */
    function setVault(address vault) external onlyOwnerOrFactory {
        _vault = vault;

        emit SetVault(vault);
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

    /**
     * @dev Function to get the vault address.
     * @return The vault address.
     */
    function getVault() external view returns (address) {
        return _vault;
    }

    /**
     * @dev Get total allocation of a token id
     * @param tokenId ID of the token
     * @return Total allocation of the token
     */
    function getTotalAlloc(uint256 tokenId) public view returns (uint256) {
        return _allocs[tokenId].totalAlloc;
    }

    /**
     * @dev Get claimed allocation of a token id
     * @param tokenId ID of the token
     * @return Claimed allocation of the token
     */
    function getClaimedAlloc(uint256 tokenId) public view returns (uint256) {
        return _allocs[tokenId].claimedAlloc;
    }

    /**
     * @dev Function to get the current value of the token counter.
     * @return The current value of the token counter.
     */
    function current() public view returns (uint256) {
        return _counter;
    }
}
