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

    address private _vaultImplementation;
    address private _collectionImplementation;

    address[] private _vaults;
    address[] private _collections;

    mapping(address => address) private _collectionToVault;

    /** @dev Emit `CreatedVault` when a new vault is created */
    event VaultCreated(address indexed vault);

    /** @dev Emit `CreatedCollection` when a new NFT is created */
    event CollectionCreated(address indexed nft);

    /** @dev Emit `Withdrawn` when owner withdraw fund from the factory */
    event Withdrawn(address indexed owner, address indexed recipient, address indexed token, uint256 value);

    /** @dev Emit `SetVaultImplementation` when new vault implementation is set */
    event SetVaultImplementation(address indexed implementation);

    /** @dev Emit `SetCollectionImplementation` when new Collection implementation is set */
    event SetCollectionImplementation(address indexed implementation);

    constructor(address vaultImplementation, address collectionImplementation) Ownable(_msgSender()) {
        _vaultImplementation = vaultImplementation;
        _collectionImplementation = collectionImplementation;
    }

    function createVaultWithCollection(
        ICoin98VaultNft.InitParams memory vaultInitParams
    ) internal returns (address vault) {
        vault = Clones.cloneDeterministic(_vaultImplementation, vaultInitParams.salt);
        ICoin98VaultNft(vault).__Coin98VaultNft_init(vaultInitParams);
        Ownable(vault).transferOwnership(vaultInitParams.owner);
    }

    /** @dev create a new vault
     * @param vaultInitParams Initialization parameters for the vault
     * @param collectionInitParams Initialization parameters for the vault
     */
    function createVault(
        ICoin98VaultNft.InitParams memory vaultInitParams,
        ICollection.InitParams memory collectionInitParams
    ) external returns (address vault) {
        require(
            vaultInitParams.merkleRoot != 0x0000000000000000000000000000000000000000000000000000000000000000,
            "Coin98VaultNftFactory: Invalid merkle root"
        );

        if (vaultInitParams.collection == address(0)) {
            address collection = createCollection(collectionInitParams);
            vaultInitParams.collection = collection;

            vault = createVaultWithCollection(vaultInitParams);

            Collection(vaultInitParams.collection).setMinter(vault, true);
            Ownable(vaultInitParams.collection).transferOwnership(collectionInitParams.owner);
        } else {
            vault = createVaultWithCollection(vaultInitParams);
        }

        _vaults.push(address(vault));

        _collectionToVault[vaultInitParams.collection] = vault;

        emit VaultCreated(address(vault));
    }

    function createCollection(ICollection.InitParams memory params) public returns (address collection) {
        collection = Clones.cloneDeterministic(_collectionImplementation, params.salt);

        Collection(collection).__Collection_init(params.name, params.symbol, address(this));

        _collections.push(address(collection));

        emit CollectionCreated(address(collection));
    }

    /** @dev withdraw token from protocol
     * @param token address of the token, use address(0) to withdraw gas token
     * @param receiver recipient address to receive the fund
     * @param amount amount of fund to withdaw
     */
    function withdraw(address token, address receiver, uint256 amount) public onlyOwner {
        require(receiver != address(0), "Coin98VaultNftFactory: Receiver is zero address");

        uint256 availableAmount;
        if (token == address(0)) {
            availableAmount = address(this).balance;
        } else {
            availableAmount = IERC20(token).balanceOf(address(this));
        }

        require(amount <= availableAmount, "Coin98VaultNftFactory: Not enough balance");

        if (token == address(0)) {
            (bool success, ) = receiver.call{ value: amount }("");
            require(success, "Coin98VaultNftFactory: Send ETH failed");
        } else {
            IERC20(token).safeTransfer(receiver, amount);
        }

        emit Withdrawn(_msgSender(), receiver, token, amount);
    }

    /** @dev withdraw NFT from contract
     * @param token address of the token, use address(0) to withdraw gas token
     * @param receiver recipient address to receive the fund
     * @param tokenId ID of NFT to withdraw
     */
    function withdrawNft(address token, address receiver, uint256 tokenId) public onlyOwner {
        require(receiver != address(0), "Coin98VaultNftFactory: Receiver is zero address");

        IERC721(token).transferFrom(address(this), receiver, tokenId);

        emit Withdrawn(_msgSender(), receiver, token, 1);
    }

    // SETTERS

    /** @dev Set new vault implementation
     * @param implementation New implementation of vault
     */
    function setVaultImplementation(address implementation) public onlyOwner {
        _vaultImplementation = implementation;

        emit SetVaultImplementation(implementation);
    }

    /** @dev Set new NFT implementation
     * @param implementation New implementation of NFT
     */
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

    /** @dev get list of vaults initialized through this factory */
    function vaults() external view returns (address[] memory) {
        return _vaults;
    }

    /** @dev get list of collections initialized through this factory */
    function collections() external view returns (address[] memory) {
        return _collections;
    }

    /** @dev Get implementation */
    function getVaultImplementation() public view returns (address) {
        return _vaultImplementation;
    }

    /** @dev Get NFT implementation */
    function getCollectionImplementation() public view returns (address) {
        return _collectionImplementation;
    }

    /** @dev Get vault address */
    function getVaultAddress(bytes32 salt) public view returns (address) {
        return Clones.predictDeterministicAddress(_vaultImplementation, salt);
    }

    /** @dev Get collection address */
    function getCollectionAddress(bytes32 salt) public view returns (address) {
        return Clones.predictDeterministicAddress(_collectionImplementation, salt);
    }

    /** @dev Get vault address from collection */
    function getVaultFromCollection(address collection) public view returns (address) {
        return _collectionToVault[collection];
    }
}
