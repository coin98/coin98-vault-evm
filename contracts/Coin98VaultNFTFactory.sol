// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./interfaces/IERC721.sol";
import "./interfaces/IVaultConfig.sol";
import "./interfaces/ICoin98VaultNft.sol";

// Libraries
import "./libraries/AdvancedERC20.sol";
import "./libraries/Clones.sol";
import "./libraries/Payable.sol";
import "./libraries/Ownable.sol";
import "./Collection.sol";

contract Coin98VaultNftFactory is Ownable, Payable, IVaultConfig {
    using AdvancedERC20 for IERC20;

    uint256 private _fee;
    uint256 private _gasLimit;
    uint256 private _ownerReward;

    address private _vaultImplementation;
    address private _collectionImplementation;

    address[] private _vaults;
    address[] private _nfts;

    /// @dev Emit `CreatedVault` when a new vault is created
    event CreatedVault(address indexed vault);
    /// @dev Emit `CreatedNft` when a new NFT is created
    event CreatedNft(address indexed nft);
    /// @dev Emit `FeeUpdated` when fee of the protocol is updated
    event FeeUpdated(uint256 fee);
    /// @dev Emit `OwnerRewardUpdated` when reward for vault owner is updated
    event OwnerRewardUpdated(uint256 fee);
    /// @dev Emit `Withdrawn` when owner withdraw fund from the factory
    event Withdrawn(address indexed owner, address indexed recipient, address indexed token, uint256 value);

    constructor(address vaultImplementation, address collectionImplementation) Ownable(_msgSender()) {
        _vaultImplementation = vaultImplementation;
        _collectionImplementation = collectionImplementation;
        _gasLimit = 9000;
    }

    /// @dev create a new vault
    /// @param params Owner of newly created vault
    /// @param salt an arbitrary value
    function createVault(
        string memory name,
        string memory symbol,
        address owner,
        ICoin98VaultNft.InitParams memory params,
        bytes32 salt
    ) external returns (address vault) {
        address collection = createCollection(name, symbol, owner, salt);

        require(
            params.merkleRoot != 0x0000000000000000000000000000000000000000000000000000000000000000,
            "C98Vault: Invalid merkle"
        );
        vault = Clones.cloneDeterministic(_vaultImplementation, salt);

        ICoin98VaultNft(vault).__Coin98VaultNft_init(params, collection);
        Ownable(vault).transferOwnership(owner);

        _vaults.push(address(vault));

        emit CreatedVault(address(vault));
    }

    function createCollection(
        string memory name,
        string memory symbol,
        address owner_,
        bytes32 salt_
    ) public returns (address nft) {
        nft = Clones.cloneDeterministic(_collectionImplementation, salt_);

        Collection(nft).__Collection_init(name, symbol, owner_);

        _nfts.push(address(nft));

        emit CreatedNft(address(nft));
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
            (bool success, ) = destination.call{ value: amount, gas: _gasLimit }("");
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
    }

    /// @dev Set new NFT implementation
    /// @param implementation New implementation of NFT
    function setNftImplementation(address implementation) public onlyOwner {
        _collectionImplementation = implementation;
    }

    /// @dev change protocol fee
    /// @param fee amount of gas token to charge for every redeem. can be ZERO to disable protocol fee
    /// @param reward amount of gas token to incentive vault owner. this reward will be deduce from protocol fee
    function setFee(uint256 fee, uint256 reward) public onlyOwner {
        require(fee >= reward, "C98VaultFactory: Invalid reward amount");

        _fee = fee;
        _ownerReward = reward;

        emit FeeUpdated(fee);
        emit OwnerRewardUpdated(reward);
    }

    // GETTERS

    /// @dev get current protocol fee in gas token
    function fee() external view override returns (uint256) {
        return _fee;
    }

    /// @dev limit gas to send native token
    function gasLimit() external view override returns (uint256) {
        return _gasLimit;
    }

    /// @dev get current owner reward in gas token
    function ownerReward() external view override returns (uint256) {
        return _ownerReward;
    }

    /// @dev get list of vaults initialized through this factory
    function vaults() external view returns (address[] memory) {
        return _vaults;
    }

    /// @dev Get implementation
    function getImplementation() public view returns (address) {
        return _vaultImplementation;
    }

    /// @dev Get NFT implementation
    function getCollectionImplementationntation() public view returns (address) {
        return _collectionImplementation;
    }

    function getVaultAddress(bytes32 salt_) public view returns (address) {
        return Clones.predictDeterministicAddress(_vaultImplementation, salt_);
    }

    function getCollectionAddress(bytes32 salt_) public view returns (address) {
        return Clones.predictDeterministicAddress(_collectionImplementation, salt_);
    }
}
