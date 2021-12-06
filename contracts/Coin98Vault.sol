// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {

  /**
    * @dev Returns the amount of tokens in existence.
    */
  function totalSupply() external view returns (uint256);

  /**
    * @dev Returns the amount of tokens owned by `account`.
    */
  function balanceOf(address account) external view returns (uint256);

  /**
    * @dev Moves `amount` tokens from the caller's account to `recipient`.
    *
    * Returns a boolean value indicating whether the operation succeeded.
    *
    * Emits a {Transfer} event.
    */
  function transfer(address recipient, uint256 amount) external returns (bool);

  /**
    * @dev Returns the remaining number of tokens that `spender` will be
    * allowed to spend on behalf of `owner` through {transferFrom}. This is
    * zero by default.
    *
    * This value changes when {approve} or {transferFrom} are called.
    */
  function allowance(address owner, address spender) external view returns (uint256);

  /**
    * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
    *
    * Returns a boolean value indicating whether the operation succeeded.
    *
    * IMPORTANT: Beware that changing an allowance with this method brings the risk
    * that someone may use both the old and the new allowance by unfortunate
    * transaction ordering. One possible solution to mitigate this race
    * condition is to first reduce the spender's allowance to 0 and set the
    * desired value afterwards:
    * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
    *
    * Emits an {Approval} event.
    */
  function approve(address spender, uint256 amount) external returns (bool);

  /**
    * @dev Moves `amount` tokens from `sender` to `recipient` using the
    * allowance mechanism. `amount` is then deducted from the caller's
    * allowance.
    *
    * Returns a boolean value indicating whether the operation succeeded.
    *
    * Emits a {Transfer} event.
    */
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

  /**
    * @dev Emitted when `value` tokens are moved from one account (`from`) to
    * another (`to`).
    *
    * Note that `value` may be zero.
    */
  event Transfer(address indexed from, address indexed to, uint256 value);

  /**
    * @dev Emitted when the allowance of a `spender` for an `owner` is set by
    * a call to {approve}. `value` is the new allowance.
    */
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @dev Interface of the ERC165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[EIP].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
  /**
    * @dev Returns true if this contract implements the interface defined by
    * `interfaceId`. See the corresponding
    * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
    * to learn more about how these ids are created.
    *
    * This function call must use less than 30 000 gas.
    */
  function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

/**
 * @dev Required interface of an ERC721 compliant contract.
 */
interface IERC721 is IERC165 {
  /**
    * @dev Emitted when `tokenId` token is transferred from `from` to `to`.
    */
  event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

  /**
    * @dev Emitted when `owner` enables `approved` to manage the `tokenId` token.
    */
  event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);

  /**
    * @dev Emitted when `owner` enables or disables (`approved`) `operator` to manage all of its assets.
    */
  event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

  /**
    * @dev Returns the number of tokens in ``owner``'s account.
    */
  function balanceOf(address owner) external view returns (uint256 balance);

  /**
    * @dev Returns the owner of the `tokenId` token.
    *
    * Requirements:
    *
    * - `tokenId` must exist.
    */
  function ownerOf(uint256 tokenId) external view returns (address owner);

  /**
    * @dev Safely transfers `tokenId` token from `from` to `to`, checking first that contract recipients
    * are aware of the ERC721 protocol to prevent tokens from being forever locked.
    *
    * Requirements:
    *
    * - `from` cannot be the zero address.
    * - `to` cannot be the zero address.
    * - `tokenId` token must exist and be owned by `from`.
    * - If the caller is not `from`, it must be have been allowed to move this token by either {approve} or {setApprovalForAll}.
    * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
    *
    * Emits a {Transfer} event.
    */
  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId
  ) external;

  /**
    * @dev Transfers `tokenId` token from `from` to `to`.
    *
    * WARNING: Usage of this method is discouraged, use {safeTransferFrom} whenever possible.
    *
    * Requirements:
    *
    * - `from` cannot be the zero address.
    * - `to` cannot be the zero address.
    * - `tokenId` token must be owned by `from`.
    * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
    *
    * Emits a {Transfer} event.
    */
  function transferFrom(
    address from,
    address to,
    uint256 tokenId
  ) external;

  /**
    * @dev Gives permission to `to` to transfer `tokenId` token to another account.
    * The approval is cleared when the token is transferred.
    *
    * Only a single account can be approved at a time, so approving the zero address clears previous approvals.
    *
    * Requirements:
    *
    * - The caller must own the token or be an approved operator.
    * - `tokenId` must exist.
    *
    * Emits an {Approval} event.
    */
  function approve(address to, uint256 tokenId) external;

  /**
    * @dev Returns the account approved for `tokenId` token.
    *
    * Requirements:
    *
    * - `tokenId` must exist.
    */
  function getApproved(uint256 tokenId) external view returns (address operator);

  /**
    * @dev Approve or remove `operator` as an operator for the caller.
    * Operators can call {transferFrom} or {safeTransferFrom} for any token owned by the caller.
    *
    * Requirements:
    *
    * - The `operator` cannot be the caller.
    *
    * Emits an {ApprovalForAll} event.
    */
  function setApprovalForAll(address operator, bool _approved) external;

  /**
    * @dev Returns if the `operator` is allowed to manage all of the assets of `owner`.
    *
    * See {setApprovalForAll}
    */
  function isApprovedForAll(address owner, address operator) external view returns (bool);

  /**
    * @dev Safely transfers `tokenId` token from `from` to `to`.
    *
    * Requirements:
    *
    * - `from` cannot be the zero address.
    * - `to` cannot be the zero address.
    * - `tokenId` token must exist and be owned by `from`.
    * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
    * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
    *
    * Emits a {Transfer} event.
    */
  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    bytes calldata data
  ) external;
}

interface IVaultConfig {

  function fee() external view returns (uint256);
  function gasLimit() external view returns (uint256);
  function ownerReward() external view returns (uint256);
}

/*
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with GSN meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
  function _msgSender() internal view returns (address) {
    return msg.sender;
  }

  function _msgData() internal view returns (bytes memory) {
    this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
    return msg.data;
  }

  function _msgValue() internal view returns (uint256) {
    return msg.value;
  }
}

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
  address private _owner;
  address private _newOwner;

  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

  /**
   * @dev Initializes the contract setting the deployer as the initial owner.
   */
  constructor () {
    address msgSender = _msgSender();
    _owner = msgSender;
    emit OwnershipTransferred(address(0), msgSender);
  }

  /**
   * @dev Returns the address of the current owner.
   */
  function owner() public view returns (address) {
    return _owner;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(owner() == _msgSender(), "Ownable: caller is not the owner");
    _;
  }

  /**
   * @dev Accept the ownership transfer. This is to make sure that the contract is
   * transferred to a working address
   *
   * Can only be called by the newly transfered owner.
   */
  function acceptOwnership() public {
    require(_msgSender() == _newOwner, "Ownable: only new owner can accept ownership");
    address oldOwner = _owner;
    _owner = _newOwner;
    _newOwner = address(0);
    emit OwnershipTransferred(oldOwner, _owner);
  }

  /**
   * @dev Transfers ownership of the contract to a new account (`newOwner`).
   *
   * Can only be called by the current owner.
   */
  function transferOwnership(address newOwner) public onlyOwner {
    require(newOwner != address(0), "Ownable: new owner is the zero address");
    _newOwner = newOwner;
  }
}

/**
 * @dev Enable contract to receive gas token
 */
abstract contract Payable {

  event Deposited(address indexed sender, uint256 value);

  fallback() external payable {
    if(msg.value > 0) {
      emit Deposited(msg.sender, msg.value);
    }
  }

  /// @dev enable wallet to receive ETH
  receive() external payable {
    if(msg.value > 0) {
      emit Deposited(msg.sender, msg.value);
    }
  }
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
  constructor(address factory_) {
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
  function schedule(uint256 eventId_, address[] memory nRecipients_, uint256[] memory nAmounts_
  ) onlyAdmin public {
    require(nRecipients_.length != 0, "C98Vault: Empty arguments");
    require(nAmounts_.length != 0, "C98Vault: Empty arguments");
    require(nRecipients_.length == nAmounts_.length, "C98Vault: Invalid arguments");

    uint256 i;
    for(i = 0; i < nRecipients_.length; i++) {
      address nRecipient = nRecipients_[i];
      uint256 amount = nAmounts_[i];
      _scheduleIndex++;

      ScheduleData memory scheduleData;
      scheduleData.eventId = eventId_;
      scheduleData.recipient = nRecipient;
      scheduleData.amount = amount;
      scheduleData.isActive = 1;

      _scheduleDatas[_scheduleIndex] = scheduleData;

      emit ScheduleCreated(_scheduleIndex, scheduleData);
    }
  }

  /// @dev enable/disable a particular schedule
  /// @param scheduleId_ schedule ID
  /// @param isActive_ zero to inactive, any number to active
  function setScheduleStatus(uint256 scheduleId_, uint8 isActive_) public onlyOwner {
    require(_scheduleDatas[scheduleId_].recipient != address(0), "C98Vault: Invalid schedule");
    require(_scheduleDatas[scheduleId_].isRedeemed != 0, "C98Vault: Redeemed");
    _scheduleDatas[scheduleId_].isActive = isActive_;

    emit ScheduleUpdated(scheduleId_, isActive_);
  }

  function createEvent(uint256 eventId_, uint256 timestamp_, address token_) public onlyOwner {
    require(_eventDatas[eventId_].timestamp != 0, "C98Vault: Invalid event");
    _eventDatas[eventId_].timestamp = timestamp_;
    _eventDatas[eventId_].token = token_;
    _eventDatas[eventId_].isActive = 1;

    emit EventCreated(eventId_, _eventDatas[eventId_]);
  }

  /// @dev enable/disable a particular event
  /// @param eventId_ event ID
  /// @param isActive_ zero to inactive, any number to active
  function setEventStatus(uint256 eventId_, uint8 isActive_) public onlyOwner {
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

  constructor () {
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
  /// Address calling this function will be assigned as owner of the newly created vault
  function createVault() external returns (Coin98Vault vault) {
    vault = new Coin98Vault(address(this));
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
