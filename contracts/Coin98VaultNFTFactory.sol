// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./interfaces/IERC721.sol";
import "./interfaces/IVaultConfig.sol";
import "./interfaces/ICoin98VaultNft.sol";
import "./interfaces/ICollection.sol";

// Libraries
import "./libraries/AdvancedERC20.sol";
import "./libraries/Clones.sol";
import "./libraries/Payable.sol";
import "./libraries/Ownable.sol";
import "./Collection.sol";

contract Coin98VaultNftFactory is Ownable, Payable {
    using AdvancedERC20 for IERC20;

    uint256 private _fee;
    uint256 private _gasLimit;
    uint256 private _ownerReward;

    address private _vaultImplementation;
    address private _collectionImplementation;

    address[] private _vaults;
    address[] private _collections;

    mapping(address => address) private _collectionToVault;

    /// @dev Emit `CreatedVault` when a new vault is created
    event CreatedVault(address indexed vault);
    /// @dev Emit `CreatedCollection` when a new NFT is created
    event CreatedCollection(address indexed nft);
    /// @dev Emit `FeeUpdated` when fee of the protocol is updated
    event FeeUpdated(uint256 fee);
    /// @dev Emit `OwnerRewardUpdated` when reward for vault owner is updated
    event OwnerRewardUpdated(uint256 fee);
    /// @dev Emit `Withdrawn` when owner withdraw fund from the factory
    event Withdrawn(address indexed owner, address indexed recipient, address indexed token, uint256 value);
    /// @dev Emit `SetVaultImplementation` when new vault implementation is set
    event SetVaultImplementation(address indexed implementation);
    /// @dev Emit `SetCollectionImplementation` when new Collection implementation is set
    event SetCollectionImplementation(address indexed implementation);

    constructor(address vaultImplementation, address collectionImplementation) Ownable(_msgSender()) {
        _vaultImplementation = vaultImplementation;
        _collectionImplementation = collectionImplementation;
        _gasLimit = 9000;
    }

    /// @dev create a new vault
    /// @param vaultInitParams Initialization parameters for the vault
    /// @param collectionInitParams Initialization parameters for the vault
    function createVault(
        ICoin98VaultNft.InitParams memory vaultInitParams,
        ICollection.InitParams memory collectionInitParams
    ) external returns (address vault) {
        require(
            vaultInitParams.merkleRoot != 0x0000000000000000000000000000000000000000000000000000000000000000,
            "C98Vault: Invalid merkle"
        );
        address collection = createCollection(collectionInitParams);

        vault = Clones.cloneDeterministic(_vaultImplementation, vaultInitParams.salt);
        ICoin98VaultNft(vault).__Coin98VaultNft_init(vaultInitParams, collection);
        Ownable(vault).transferOwnership(vaultInitParams.owner);

        Collection(collection).setMinter(vault, true);
        Ownable(collection).transferOwnership(collectionInitParams.owner);

        _vaults.push(address(vault));

        _collectionToVault[collection] = vault;

        emit CreatedVault(address(vault));
    }

    function createCollection(ICollection.InitParams memory params) public returns (address collection) {
        collection = Clones.cloneDeterministic(_collectionImplementation, params.salt);

        Collection(collection).__Collection_init(params.name, params.symbol, address(this));

        _collections.push(address(collection));

        emit CreatedCollection(address(collection));
    }

    /// @dev withdraw fee collected for protocol
    /// @param token address of the token, use address(0) to withdraw gas token
    /// @param destination recipient address to receive the fund
    /// @param amount amount of fund to withdaw
    function withdraw(address token, address destination, uint256 amount) public onlyOwner {
        require(destination != address(0), "C98VaultFactory: Destination is zero address");

        uint256 availableAmount;
        if (token == address(0)) {
            availableAmount = address(this).balance;
        } else {
            availableAmount = IERC20(token).balanceOf(address(this));
        }

        require(amount <= availableAmount, "C98VaultFactory: Not enough balance");

        if (token == address(0)) {
            (bool success, ) = destination.call{ value: amount }("");
            require(success, "C98VaultFactory: Send ETH failed");
        } else {
            IERC20(token).safeTransfer(destination, amount);
        }

        emit Withdrawn(_msgSender(), destination, token, amount);
    }

    /// @dev withdraw NFT from contract
    /// @param token address of the token, use address(0) to withdraw gas token
    /// @param destination recipient address to receive the fund
    /// @param tokenId ID of NFT to withdraw
    function withdrawNft(address token, address destination, uint256 tokenId) public onlyOwner {
        require(destination != address(0), "C98VaultFactory: destination is zero address");

        IERC721(token).transferFrom(address(this), destination, tokenId);

        emit Withdrawn(_msgSender(), destination, token, 1);
    }

    // SETTERS

    function setGasLimit(uint256 limit) public onlyOwner {
        _gasLimit = limit;
    }

    /// @dev Set new vault implementation
    /// @param implementation New implementation of vault
    function setVaultImplementation(address implementation) public onlyOwner {
        _vaultImplementation = implementation;

        emit SetVaultImplementation(implementation);
    }

    /// @dev Set new NFT implementation
    /// @param implementation New implementation of NFT
    function setCollectionImplementation(address implementation) public onlyOwner {
        _collectionImplementation = implementation;

        emit SetCollectionImplementation(implementation);
    }

    // GETTERS

    /**
     * @dev Get the total allocation of a NFT
     * @param collection Contract address of the collection
     * @param tokenId ID of the NFT
     */
    function getTotalAlloc(address collection, uint256 tokenId) public view returns (uint256) {
        return ICoin98VaultNft(_collectionToVault[collection]).getTotalAlloc(tokenId);
    }

    /**
     * @dev Get the claimed allocation of a NFT
     * @param collection Contract address of the collection
     * @param tokenId ID of the NFT
     */
    function getClaimedAlloc(address collection, uint256 tokenId) public view returns (uint256) {
        return ICoin98VaultNft(_collectionToVault[collection]).getClaimedAlloc(tokenId);
    }

    /// @dev get list of vaults initialized through this factory
    function vaults() external view returns (address[] memory) {
        return _vaults;
    }

    /// @dev get list of NFTs initialized through this factory
    function collections() external view returns (address[] memory) {
        return _collections;
    }

    /// @dev Get implementation
    function getVaultImplementation() public view returns (address) {
        return _vaultImplementation;
    }

    /// @dev Get NFT implementation
    function getCollectionImplementation() public view returns (address) {
        return _collectionImplementation;
    }

    /// @dev Get vault address
    function getVaultAddress(bytes32 salt_) public view returns (address) {
        return Clones.predictDeterministicAddress(_vaultImplementation, salt_);
    }

    /// @dev Get collection address
    function getCollectionAddress(bytes32 salt_) public view returns (address) {
        return Clones.predictDeterministicAddress(_collectionImplementation, salt_);
    }
}
