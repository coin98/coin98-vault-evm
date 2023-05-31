// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./lib/Common.sol";
import "./lib/Module.sol";
import "./lib/Merkle.sol";
import "./lib/Token.sol";
import "./lib/Upgradable.sol";

interface IVaultConfig {

  function fee() external view returns (uint256);
  function gasLimit() external view returns (uint256);
  function ownerReward() external view returns (uint256);
}

interface ICoin98Vault {
  function init() external;
}

/**
 * @dev Coin98Vault contract to enable vesting funds to investors
 */
contract Coin98Vault is ICoin98Vault, OwnableUpgradeable, Payable {

  using AdvancedERC20 for IERC20;

  address private _factory;
  address[] private _admins;
  mapping(address => bool) private _adminStatuses;
  mapping(uint256 => EventData) private _eventDatas;
  mapping(uint256 => mapping(uint256 => bool)) private _eventRedemptions;

  struct EventData {
    uint256 timestamp;
    bytes32 merkleRoot;
    address receivingToken;
    address sendingToken;
    uint8 isActive;
  }

  event AdminAdded(address indexed admin);
  event AdminRemoved(address indexed admin);
  event EventCreated(uint256 eventId, EventData eventData);
  event EventUpdated(uint256 eventId, uint8 isActive);
  event Redeemed(uint256 eventId, uint256 index, address indexed recipient, address indexed receivingToken, uint256 receivingTokenAmount, address indexed sendingToken, uint256 sendingTokenAmount);
  event Withdrawn(address indexed owner, address indexed recipient, address indexed token, uint256 value);

  function _setRedemption(uint256 eventId_, uint256 index_) private {
    _eventRedemptions[eventId_][index_] = true;
  }

  /// @dev Access Control, only owner and admins are able to access the specified function
  modifier onlyAdmin() {
    require(owner() == _msgSender() || _adminStatuses[_msgSender()], "Ownable: caller is not an admin");
    _;
  }

  /// @dev returns current admins who can manage the vault
  function admins() public view returns (address[] memory) {
    return _admins;
  }

  /// @dev returns info of an event
  /// @param eventId_ ID of the event
  function eventInfo(uint256 eventId_) public view returns (EventData memory) {
    return _eventDatas[eventId_];
  }

  /// @dev address of the factory
  function factory() public view returns (address) {
    return _factory;
  }

  /// @dev check an index whether it's redeemed
  /// @param eventId_ event ID
  /// @param index_ index of redemption pre-assigned to user
  function isRedeemed(uint256 eventId_, uint256 index_) public view returns (bool) {
    return _eventRedemptions[eventId_][index_];
  }

  /// @dev Initial vault
  function init() external override initializer {
    __Ownable_init();
    _factory = msg.sender;
  }

  /// @dev claim the token which user is eligible from schedule
  /// @param eventId_ event ID
  /// @param index_ index of redemption pre-assigned to user
  /// @param recipient_ index of redemption pre-assigned to user
  /// @param receivingAmount_ amount of *receivingToken* user is eligible to redeem
  /// @param sendingAmount_ amount of *sendingToken* user must send the contract to get *receivingToken*
  /// @param proofs additional data to validate that the inputted information is valid
  function redeem(uint256 eventId_, uint256 index_, address recipient_, uint256 receivingAmount_, uint256 sendingAmount_, bytes32[] calldata proofs) public payable {
    uint256 fee = IVaultConfig(_factory).fee();
    uint256 gasLimit = IVaultConfig(_factory).gasLimit();
    if(fee > 0) {
      require(_msgValue() == fee, "C98Vault: Invalid fee");
    }

    EventData storage eventData = _eventDatas[eventId_];
    require(eventData.isActive > 0, "C98Vault: Invalid event");
    require(eventData.timestamp <= block.timestamp, "C98Vault: Schedule locked");
    require(recipient_ != address(0), "C98Vault: Invalid schedule");

    bytes32 node = keccak256(abi.encodePacked(index_, recipient_, receivingAmount_, sendingAmount_));
    require(MerkleProof.verify(proofs, eventData.merkleRoot, node), "C98Vault: Invalid proof");
    require(!isRedeemed(eventId_, index_), "C98Vault: Redeemed");

    uint256 availableAmount;
    if(eventData.receivingToken == address(0)) {
      availableAmount = address(this).balance;
    } else {
      availableAmount = IERC20(eventData.receivingToken).balanceOf(address(this));
    }

    require(receivingAmount_ <= availableAmount, "C98Vault: Insufficient token");

    _setRedemption(eventId_, index_);
    if(fee > 0) {
      uint256 reward = IVaultConfig(_factory).ownerReward();
      uint256 finalFee = fee - reward;
      (bool success,) = _factory.call{value:finalFee, gas:gasLimit}("");
      require(success, "C98Vault: Unable to charge fee");
    }
    if(sendingAmount_ > 0) {
      IERC20(eventData.sendingToken).safeTransferFrom(_msgSender(), address(this), sendingAmount_);
    }
    if(eventData.receivingToken == address(0)) {
      (bool success,) = recipient_.call{value:receivingAmount_, gas:gasLimit}("");
      require(success, "C98Vault: Send ETH failed");
    } else {
      IERC20(eventData.receivingToken).safeTransfer(recipient_, receivingAmount_);
    }

    emit Redeemed(eventId_, index_, recipient_, eventData.receivingToken, receivingAmount_, eventData.sendingToken, sendingAmount_);
  }

  /// @dev withdraw the token in the vault, no limit
  /// @param token_ address of the token, use address(0) to withdraw gas token
  /// @param destination_ recipient address to receive the fund
  /// @param amount_ amount of fund to withdaw
  function withdraw(address token_, address destination_, uint256 amount_) public onlyAdmin {
    require(destination_ != address(0), "C98Vault: Destination is zero address");

    uint256 availableAmount;
    if(token_ == address(0)) {
      availableAmount = address(this).balance;
    } else {
      availableAmount = IERC20(token_).balanceOf(address(this));
    }

    require(amount_ <= availableAmount, "C98Vault: Not enough balance");

    uint256 gasLimit = IVaultConfig(_factory).gasLimit();
    if(token_ == address(0)) {
      (bool success,) = destination_.call{value:amount_, gas:gasLimit}("");
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
  function withdrawNft(address token_, address destination_, uint256 tokenId_) public onlyAdmin {
    require(destination_ != address(0), "C98Vault: destination is zero address");

    IERC721(token_).transferFrom(address(this), destination_, tokenId_);

    emit Withdrawn(_msgSender(), destination_, token_, 1);
  }

  /// @dev create an event to specify how user can claim their token
  /// @param eventId_ event ID
  /// @param timestamp_ when the token will be available for redemption
  /// @param receivingToken_ token user will be receiving, mandatory
  /// @param sendingToken_ token user need to send in order to receive *receivingToken_*
  function createEvent(uint256 eventId_, uint256 timestamp_, bytes32 merkleRoot_, address receivingToken_, address sendingToken_) public onlyAdmin {
    require(_eventDatas[eventId_].timestamp == 0, "C98Vault: Event existed");
    require(timestamp_ != 0, "C98Vault: Invalid timestamp");
    _eventDatas[eventId_].timestamp = timestamp_;
    _eventDatas[eventId_].merkleRoot = merkleRoot_;
    _eventDatas[eventId_].receivingToken = receivingToken_;
    _eventDatas[eventId_].sendingToken = sendingToken_;
    _eventDatas[eventId_].isActive = 1;

    emit EventCreated(eventId_, _eventDatas[eventId_]);
  }

  /// @dev enable/disable a particular event
  /// @param eventId_ event ID
  /// @param isActive_ zero to inactive, any number to active
  function setEventStatus(uint256 eventId_, uint8 isActive_) public onlyAdmin {
    require(_eventDatas[eventId_].timestamp != 0, "C98Vault: Invalid event");
    _eventDatas[eventId_].isActive = isActive_;

    emit EventUpdated(eventId_, isActive_);
  }

  /// @dev add/remove admin of the vault.
  /// @param nAdmins_ list to address to update
  /// @param nStatuses_ address with same index will be added if true, or remove if false
  /// admins will have access to all tokens in the vault, and can define vesting schedule
  function setAdmins(address[] memory nAdmins_, bool[] memory nStatuses_) public onlyOwner {
    require(nAdmins_.length != 0, "C98Vault: Empty arguments");
    require(nStatuses_.length != 0, "C98Vault: Empty arguments");
    require(nAdmins_.length == nStatuses_.length, "C98Vault: Invalid arguments");

    uint256 i;
    for(i = 0; i < nAdmins_.length; i++) {
      address nAdmin = nAdmins_[i];
      if(nStatuses_[i]) {
        if(!_adminStatuses[nAdmin]) {
          _admins.push(nAdmin);
          _adminStatuses[nAdmin] = nStatuses_[i];
          emit AdminAdded(nAdmin);
        }
      } else {
        uint256 j;
        for(j = 0; j < _admins.length; j++) {
          if(_admins[j] == nAdmin) {
            _admins[j] = _admins[_admins.length - 1];
            _admins.pop();
            delete _adminStatuses[nAdmin];
            emit AdminRemoved(nAdmin);
            break;
          }
        }
      }
    }
  }
}

contract Coin98VaultFactory is Ownable, Payable, IVaultConfig {

  using AdvancedERC20 for IERC20;

  uint256 private _fee;
  uint256 private _gasLimit;
  uint256 private _ownerReward;
  address private _implementation;
  address[] private _vaults;

  constructor (address _vaultImplementation) Ownable(_msgSender()) {
    _implementation = _vaultImplementation;
    _gasLimit = 9000;
  }

  /// @dev Emit `FeeUpdated` when a new vault is created
  event Created(address indexed vault);
  /// @dev Emit `FeeUpdated` when fee of the protocol is updated
  event FeeUpdated(uint256 fee);
  /// @dev Emit `OwnerRewardUpdated` when reward for vault owner is updated
  event OwnerRewardUpdated(uint256 fee);
  /// @dev Emit `Withdrawn` when owner withdraw fund from the factory
  event Withdrawn(address indexed owner, address indexed recipient, address indexed token, uint256 value);

  /// @dev get current protocol fee in gas token
  function fee() override external view returns (uint256) {
    return _fee;
  }

  /// @dev limit gas to send native token
  function gasLimit() override external view returns (uint256) {
    return _gasLimit;
  }

  /// @dev get current owner reward in gas token
  function ownerReward() override external view returns (uint256) {
    return _ownerReward;
  }

  /// @dev get list of vaults initialized through this factory
  function vaults() external view returns (address[] memory) {
    return _vaults;
  }

  /// @dev Get implementation
  function getImplementation() public view returns(address) {
    return _implementation;
  }

  /// @dev Set new implementation
  /// @param _newImplementation New implementation of vault
  function setImplementation(address _newImplementation) public onlyOwner {
    _implementation = _newImplementation;
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

  function getVaultAddress(bytes32 salt_) public view returns(address) {
    return Clones.predictDeterministicAddress(_implementation, salt_);
  }

  function setGasLimit(uint256 limit_) public onlyOwner {
    _gasLimit = limit_;
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

  /// @dev withdraw fee collected for protocol
  /// @param token_ address of the token, use address(0) to withdraw gas token
  /// @param destination_ recipient address to receive the fund
  /// @param amount_ amount of fund to withdaw
  function withdraw(address token_, address destination_, uint256 amount_) public onlyOwner {
    require(destination_ != address(0), "C98Vault: Destination is zero address");

    uint256 availableAmount;
    if(token_ == address(0)) {
      availableAmount = address(this).balance;
    } else {
      availableAmount = IERC20(token_).balanceOf(address(this));
    }

    require(amount_ <= availableAmount, "C98Vault: Not enough balance");

    if(token_ == address(0)) {
      (bool success,) = destination_.call{value:amount_, gas:_gasLimit}("");
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
}
