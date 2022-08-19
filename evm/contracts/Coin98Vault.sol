// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./lib/Common.sol";
import "./lib/Token.sol";
import "./lib/Module.sol";

interface IVaultConfig {

  function fee() external view returns (uint256);
  function gasLimit() external view returns (uint256);
  function ownerReward() external view returns (uint256);
}

/**
 * @dev Coin98Vault contract to enable vesting funds to investors
 */
contract Coin98Vault is Ownable, Payable {

  address private _factory;
  address[] private _admins;
  mapping(address => bool) private _adminStatuses;
  mapping(uint256 => EventData) private _eventDatas;
  uint256 private _scheduleIndex;
  mapping(uint256 => ScheduleData) private _scheduleDatas;

  /// @dev Initialize a new vault
  /// @param factory_ Back reference to the factory initialized this vault for global configuration
  /// @param owner_ Owner of this vault
  constructor(address factory_, address owner_) Ownable(owner_) {
    _factory = factory_;
  }

  struct EventData {
    uint256 timestamp;
    address token;
    uint8 isActive;
  }

  struct ScheduleData {
    uint256 eventId;
    uint256 amount;
    address recipient;
    uint8 isActive;
    uint8 isRedeemed;
  }

  event AdminAdded(address indexed admin);
  event AdminRemoved(address indexed admin);
  event EventCreated(uint256 eventId, EventData eventData);
  event EventUpdated(uint256 eventId, uint8 isActive);
  event Redeemed(uint256 schedule, address indexed recipient, address indexed token, uint256 value);
  event ScheduleCreated(uint256 scheduleId, ScheduleData scheduleData);
  event ScheduleUpdated(uint256 scheduleId, uint8 isActive);
  event Withdrawn(address indexed owner, address indexed recipient, address indexed token, uint256 value);

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

  /// @dev return current schedule index, next schedule ID will be (schedule index + 1)
  function scheduleIndex() public view returns (uint256) {
    return _scheduleIndex;
  }

  /// @dev returns detail of a schedule
  /// @param scheduleId_ address of the recipent
  function scheduleInfo(uint256 scheduleId_) public view returns (ScheduleData memory, EventData memory) {
    ScheduleData memory scheduleData = _scheduleDatas[scheduleId_];
    EventData memory eventData = _eventDatas[scheduleData.eventId];
    return (scheduleData, eventData);
  }

  /// @dev claim the token user is eligible from schedule
  /// user must use the address whitelisted in schedule
  function redeem(uint256 scheduleId_) public payable {
    uint256 fee = IVaultConfig(_factory).fee();
    uint256 gasLimit = IVaultConfig(_factory).gasLimit();
    if(fee > 0) {
      require(_msgValue() == fee, "C98Vault: Invalid fee");
    }

    ScheduleData storage scheduleData = _scheduleDatas[scheduleId_];
    require(scheduleData.recipient != address(0), "C98Vault: Invalid schedule");
    require(scheduleData.recipient == _msgSender(), "C98Vault: Unauthorized");
    require(scheduleData.isActive != 0 && scheduleData.isRedeemed == 0, "C98Vault: Invalid schedule");
    EventData storage eventData = _eventDatas[scheduleData.eventId];
    require(eventData.isActive > 0, "C98Vault: Invalid schedule");
    require(eventData.timestamp <= block.timestamp, "C98Vault: Schedule locked");

    uint256 availableAmount;
    if(eventData.token == address(0)) {
      availableAmount = address(this).balance;
    } else {
      availableAmount = IERC20(eventData.token).balanceOf(address(this));
    }

    require(scheduleData.amount <= availableAmount, "C98Vault: Insufficient token");

    scheduleData.isRedeemed = 1;
    if(fee > 0) {
      uint256 reward = IVaultConfig(_factory).ownerReward();
      uint256 finalFee = fee - reward;
      (bool success, bytes memory data) = _factory.call{value:finalFee, gas:gasLimit}("");
      require(success, "C98Vault: Unable to charge fee");
    }
    if(eventData.token == address(0)) {
      _msgSender().call{value:scheduleData.amount, gas:gasLimit}("");
    } else {
      IERC20(eventData.token).transfer(_msgSender(), scheduleData.amount);
    }

    emit Redeemed(scheduleId_, _msgSender(), eventData.token, scheduleData.amount);
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
      destination_.call{value:amount_, gas:gasLimit}("");
    } else {
      IERC20(token_).transfer(destination_, amount_);
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

  /// @dev set the schedule for a specified token
  /// @param nRecipients_ list of recepient for a vesting batch
  /// @param nAmounts_ amount of token to be redeemed for a recipient with the same index
  /// Only owner can use this function
  function schedule(uint256 eventId_, address[] memory nRecipients_, uint256[] memory nAmounts_) public onlyAdmin {
    require(nRecipients_.length != 0, "C98Vault: Empty arguments");
    require(nAmounts_.length != 0, "C98Vault: Empty arguments");
    require(nRecipients_.length == nAmounts_.length, "C98Vault: Invalid arguments");

    uint256 i;
    uint256 index = _scheduleIndex;
    for(i = 0; i < nRecipients_.length; i++) {
      address nRecipient = nRecipients_[i];
      uint256 amount = nAmounts_[i];
      require(nRecipient != address(0), "C98Vault: recipient is zero address");

      index++;
      ScheduleData memory scheduleData;
      scheduleData.eventId = eventId_;
      scheduleData.recipient = nRecipient;
      scheduleData.amount = amount;
      scheduleData.isActive = 1;

      _scheduleDatas[index] = scheduleData;

      emit ScheduleCreated(index, scheduleData);
    }
    _scheduleIndex = index;
  }

  /// @dev enable/disable a particular schedule
  /// @param scheduleId_ schedule ID
  /// @param isActive_ zero to inactive, any number to active
  function setScheduleStatus(uint256 scheduleId_, uint8 isActive_) public onlyAdmin {
    require(_scheduleDatas[scheduleId_].recipient != address(0), "C98Vault: Invalid schedule");
    require(_scheduleDatas[scheduleId_].isRedeemed == 0, "C98Vault: Redeemed");
    _scheduleDatas[scheduleId_].isActive = isActive_;

    emit ScheduleUpdated(scheduleId_, isActive_);
  }

  function createEvent(uint256 eventId_, uint256 timestamp_, address token_) public onlyAdmin {
    require(_eventDatas[eventId_].timestamp == 0, "C98Vault: Event existed");
    require(timestamp_ != 0, "C98Vault: Invalid timestamp");
    _eventDatas[eventId_].timestamp = timestamp_;
    _eventDatas[eventId_].token = token_;
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

  uint256 private _fee;
  uint256 private _gasLimit;
  uint256 private _ownerReward;
  address[] private _vaults;

  constructor () Ownable(_msgSender()) {
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

  /// @dev create a new vault
  /// @param owner_ Owner of newly created vault
  function createVault(address owner_) external returns (Coin98Vault vault) {
    vault = new Coin98Vault(address(this), owner_);
    _vaults.push(address(vault));
    emit Created(address(vault));
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
      destination_.call{value:amount_, gas:_gasLimit}("");
    } else {
      IERC20(token_).transfer(destination_, amount_);
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
