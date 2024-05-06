// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./lib/Token.sol";
import "./lib/Upgradable.sol";

import "./interfaces/IVaultConfig.sol";
import "./interfaces/ICoin98Vault.sol";

contract Coin98VaultV3Factory is Ownable, Payable, IVaultConfig {
    using AdvancedERC20 for IERC20;

    uint256 private _fee;
    uint256 private _gasLimit;
    uint256 private _ownerReward;
    address private _implementation;
    address[] private _vaults;

    /// @dev Emit `FeeUpdated` when a new vault is created
    event Created(address indexed vault);
    /// @dev Emit `FeeUpdated` when fee of the protocol is updated
    event FeeUpdated(uint256 fee);
    /// @dev Emit `OwnerRewardUpdated` when reward for vault owner is updated
    event OwnerRewardUpdated(uint256 fee);
    /// @dev Emit `Withdrawn` when owner withdraw fund from the factory
    event Withdrawn(address indexed owner, address indexed recipient, address indexed token, uint256 value);

    constructor(address _vaultImplementation) Ownable(_msgSender()) {
        _implementation = _vaultImplementation;
        _gasLimit = 9000;
    }

    /// @dev create a new vault
    /// @param owner_ Owner of newly created vault
    /// @param salt_ an arbitrary value
    function createVault(address owner_, bytes32 salt_) external returns (address vault) {
        vault = Clones.cloneDeterministic(_implementation, salt_);

        ICoin98Vault(vault).init();
        Ownable(vault).transferOwnership(owner_);

        _vaults.push(address(vault));
        emit Created(address(vault));
    }

    /// @dev withdraw fee collected for protocol
    /// @param token_ address of the token, use address(0) to withdraw gas token
    /// @param destination_ recipient address to receive the fund
    /// @param amount_ amount of fund to withdaw
    function withdraw(address token_, address destination_, uint256 amount_) public onlyOwner {
        require(destination_ != address(0), "C98Vault: Destination is zero address");

        uint256 availableAmount;
        if (token_ == address(0)) {
            availableAmount = address(this).balance;
        } else {
            availableAmount = IERC20(token_).balanceOf(address(this));
        }

        require(amount_ <= availableAmount, "C98Vault: Not enough balance");

        if (token_ == address(0)) {
            (bool success, ) = destination_.call{ value: amount_, gas: _gasLimit }("");
            require(success, "C98Vault: Send ETH failed");
        } else {
            IERC20(token_).safeTransfer(destination_, amount_);
        }

        emit Withdrawn(_msgSender(), destination_, token_, amount_);
    }

    /// @dev withdraw NFT from contract
    /// @param token_ address of the token, use address(0) to withdraw gas token
    /// @param destination_ recipient address to receive the fund
    /// @param tokenId_ ID of NFT to withdraw
    function withdrawNft(address token_, address destination_, uint256 tokenId_) public onlyOwner {
        require(destination_ != address(0), "C98Vault: destination is zero address");

        IERC721(token_).transferFrom(address(this), destination_, tokenId_);

        emit Withdrawn(_msgSender(), destination_, token_, 1);
    }

    function setGasLimit(uint256 limit_) public onlyOwner {
        _gasLimit = limit_;
    }

    /// @dev Set new implementation
    /// @param _newImplementation New implementation of vault
    function setImplementation(address _newImplementation) public onlyOwner {
        _implementation = _newImplementation;
    }

    /// @dev change protocol fee
    /// @param fee_ amount of gas token to charge for every redeem. can be ZERO to disable protocol fee
    /// @param reward_ amount of gas token to incentive vault owner. this reward will be deduce from protocol fee
    function setFee(uint256 fee_, uint256 reward_) public onlyOwner {
        require(fee_ >= reward_, "C98Vault: Invalid reward amount");

        _fee = fee_;
        _ownerReward = reward_;

        emit FeeUpdated(fee_);
        emit OwnerRewardUpdated(reward_);
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
        return _implementation;
    }

    function getVaultAddress(bytes32 salt_) public view returns (address) {
        return Clones.predictDeterministicAddress(_implementation, salt_);
    }
}
