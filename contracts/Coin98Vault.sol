// SPDX-License-Identifier: Apache-2.0

pragma solidity >= 0.8.0;

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


contract Coin98VestingVault is Ownable {

  address[] private _members;
  mapping(address => bool) private _memberStatuses;
  address[] private _recipients;
  mapping(address => bytes32[]) private _schedules;
  mapping(bytes32 => ScheduleData) private _scheduleDatas;

  struct ScheduleData {
    address token;
    uint256 timestamp;
    uint256 amount;
  }

  modifier onlyMember() {
    require(owner() == _msgSender() || _memberStatuses[_msgSender()], "Ownable: caller is not a member");
    _;
  }

  function setMembers(address[] memory nMembers_, bool[] memory nStatuses_) public onlyOwner {
    uint256 i;
    for(i = 0; i < nMembers_.length; i++) {
      address nMember = nMembers_[i];
      if(nStatuses_[i]) {
        _members.push(nMember);
        _memberStatuses[nMember] = nStatuses_[i];
      } else {
        uint256 j;
        for(j = 0; j < _members.length; j++) {
          if(_members[j] == nMember) {
            _members[j] = _members[_members.length - 1];
            _members.pop();
            delete _memberStatuses[nMember];
            break;
          }
        }
      }
    }
  }

  function withdraw(address token_, address destination_, uint256 amount_) public onlyMember {
    IERC20(token_).transfer(destination_, amount_);
  }

  function schedule(address token_, uint256 timestamp_, address[] memory nRecipients_, uint256[] memory nAmounts_) public {
    uint256 i;
    for(i = 0; i < nRecipients_.length; i++) {
      address nRecipient = nRecipients_[i];
      uint256 amount = nAmounts_[i];
      bool isRecipientExist = _schedules[nRecipient].length > 0;
      bytes32 scheduleKey = keccak256(abi.encodePacked(nRecipient, token_, timestamp_));

      ScheduleData memory nSchedule;
      nSchedule.token = token_;
      nSchedule.timestamp = block.timestamp;
      nSchedule.amount = amount;

      _scheduleDatas[scheduleKey] = nSchedule;
      uint256 j;
      uint256 found = 0;
      for(j = 0; j < _schedules[nRecipient].length; j++) {
        if(_schedules[nRecipient][j] == scheduleKey) {
          found = 1;
          break;
        }
      }
      if(found == 0) {
        _schedules[nRecipient].push(scheduleKey);
      }

      if(isRecipientExist) {
        _recipients.push(nRecipient);
      }
    }
  }

  function redeem(address token_) public {
    bytes32[] memory recipientSchedules = _schedules[_msgSender()];
    uint256 totalAmount;
    uint256 availableAmount = IERC20(token_).balanceOf(address(this));

    uint256 blockTime = block.timestamp;
    uint256 i;
    for(i = 0; i < _schedules[_msgSender()].length; i++) {
      bytes32 scheduleKey = _schedules[_msgSender()][i];
      if(_scheduleDatas[scheduleKey].token == token_ && _scheduleDatas[scheduleKey].timestamp <= blockTime) {
        if (totalAmount + _scheduleDatas[scheduleKey].amount > availableAmount) {
          break;
        }
        totalAmount += _scheduleDatas[scheduleKey].amount;
        _schedules[_msgSender()][i] = _schedules[_msgSender()][_schedules[_msgSender()].length - 1];
        _schedules[_msgSender()].pop();
        delete _scheduleDatas[scheduleKey];
      }
    }

    require(totalAmount > 0, "C98Vault: Nothing to redeem");

    if(_schedules[_msgSender()].length == 0) {
      for(i = 0; i < _recipients.length; i++) {
        if(_recipients[i] == _msgSender()) {
          _recipients[i] = _recipients[_recipients.length - 1];
          _recipients.pop();
        }
      }
    }
    _schedules[_msgSender()] = recipientSchedules;

    IERC20(token_).transfer(_msgSender(), totalAmount);
  }
}
