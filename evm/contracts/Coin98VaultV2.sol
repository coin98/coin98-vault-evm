// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {

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
    * @dev Moves `amount` tokens from `sender` to `recipient` using the
    * allowance mechanism. `amount` is then deducted from the caller's
    * allowance.
    *
    * Returns a boolean value indicating whether the operation succeeded.
    *
    * Emits a {Transfer} event.
    */
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

/**
 * @dev Required interface of an ERC721 compliant contract.
 */
interface IERC721 {

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
}

/**
 * @dev Collection of functions related to the address type
 */
library Address {
   /**
   * @dev Returns true if `account` is a contract.
   *
   * [IMPORTANT]
   * ====
   * It is unsafe to assume that an address for which this function returns
   * false is an externally-owned account (EOA) and not a contract.
   *
   * Among others, `isContract` will return false for the following
   * types of addresses:
   *
   * - an externally-owned account
   * - a contract in construction
   * - an address where a contract will be created
   * - an address where a contract lived, but was destroyed
   * ====
   *
   * [IMPORTANT]
   * ====
   * You shouldn't rely on `isContract` to protect against flash loan attacks!
   *
   * Preventing calls from contracts is highly discouraged. It breaks composability, breaks support for smart wallets
   * like Gnosis Safe, and does not provide security since it can be circumvented by calling from a contract
   * constructor.
   * ====
   */
   function isContract(address account) internal view returns (bool) {
     // This method relies on extcodesize/address.code.length, which returns 0
     // for contracts in construction, since the code is only stored at the end
     // of the constructor execution.

     return account.code.length > 0;
   }

   /**
   * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
   * `recipient`, forwarding all available gas and reverting on errors.
   *
   * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
   * of certain opcodes, possibly making contracts go over the 2300 gas limit
   * imposed by `transfer`, making them unable to receive funds via
   * `transfer`. {sendValue} removes this limitation.
   *
   * https://diligence.consensys.net/posts/2019/09/stop-using-soliditys-transfer-now/[Learn more].
   *
   * IMPORTANT: because control is transferred to `recipient`, care must be
   * taken to not create reentrancy vulnerabilities. Consider using
   * {ReentrancyGuard} or the
   * https://solidity.readthedocs.io/en/v0.5.11/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
   */
   function sendValue(address payable recipient, uint256 amount) internal {
     require(address(this).balance >= amount, "Address: insufficient balance");

     (bool success, ) = recipient.call{value: amount}("");
     require(success, "Address: unable to send value, recipient may have reverted");
   }

   /**
   * @dev Performs a Solidity function call using a low level `call`. A
   * plain `call` is an unsafe replacement for a function call: use this
   * function instead.
   *
   * If `target` reverts with a revert reason, it is bubbled up by this
   * function (like regular Solidity function calls).
   *
   * Returns the raw returned data. To convert to the expected return value,
   * use https://solidity.readthedocs.io/en/latest/units-and-global-variables.html?highlight=abi.decode#abi-encoding-and-decoding-functions[`abi.decode`].
   *
   * Requirements:
   *
   * - `target` must be a contract.
   * - calling `target` with `data` must not revert.
   *
   * _Available since v3.1._
   */
   function functionCall(address target, bytes memory data) internal returns (bytes memory) {
     return functionCall(target, data, "Address: low-level call failed");
   }

   /**
   * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`], but with
   * `errorMessage` as a fallback revert reason when `target` reverts.
   *
   * _Available since v3.1._
   */
   function functionCall(
     address target,
     bytes memory data,
     string memory errorMessage
   ) internal returns (bytes memory) {
     return functionCallWithValue(target, data, 0, errorMessage);
   }

   /**
   * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
   * but also transferring `value` wei to `target`.
   *
   * Requirements:
   *
   * - the calling contract must have an ETH balance of at least `value`.
   * - the called Solidity function must be `payable`.
   *
   * _Available since v3.1._
   */
   function functionCallWithValue(
     address target,
     bytes memory data,
     uint256 value
   ) internal returns (bytes memory) {
     return functionCallWithValue(target, data, value, "Address: low-level call with value failed");
   }

   /**
   * @dev Same as {xref-Address-functionCallWithValue-address-bytes-uint256-}[`functionCallWithValue`], but
   * with `errorMessage` as a fallback revert reason when `target` reverts.
   *
   * _Available since v3.1._
   */
   function functionCallWithValue(
     address target,
     bytes memory data,
     uint256 value,
     string memory errorMessage
   ) internal returns (bytes memory) {
     require(address(this).balance >= value, "Address: insufficient balance for call");
     require(isContract(target), "Address: call to non-contract");

     (bool success, bytes memory returndata) = target.call{value: value}(data);
     return verifyCallResult(success, returndata, errorMessage);
   }

   /**
   * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
   * but performing a static call.
   *
   * _Available since v3.3._
   */
   function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
     return functionStaticCall(target, data, "Address: low-level static call failed");
   }

   /**
   * @dev Same as {xref-Address-functionCall-address-bytes-string-}[`functionCall`],
   * but performing a static call.
   *
   * _Available since v3.3._
   */
   function functionStaticCall(
     address target,
     bytes memory data,
     string memory errorMessage
   ) internal view returns (bytes memory) {
     require(isContract(target), "Address: static call to non-contract");

     (bool success, bytes memory returndata) = target.staticcall(data);
     return verifyCallResult(success, returndata, errorMessage);
   }

   /**
   * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
   * but performing a delegate call.
   *
   * _Available since v3.4._
   */
   function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
     return functionDelegateCall(target, data, "Address: low-level delegate call failed");
   }

   /**
   * @dev Same as {xref-Address-functionCall-address-bytes-string-}[`functionCall`],
   * but performing a delegate call.
   *
   * _Available since v3.4._
   */
   function functionDelegateCall(
     address target,
     bytes memory data,
     string memory errorMessage
   ) internal returns (bytes memory) {
     require(isContract(target), "Address: delegate call to non-contract");

     (bool success, bytes memory returndata) = target.delegatecall(data);
     return verifyCallResult(success, returndata, errorMessage);
   }

   /**
   * @dev Tool to verifies that a low level call was successful, and revert if it wasn't, either by bubbling the
   * revert reason using the provided one.
   *
   * _Available since v4.3._
   */
   function verifyCallResult(
     bool success,
     bytes memory returndata,
     string memory errorMessage
   ) internal pure returns (bytes memory) {
     if (success) {
        return returndata;
     } else {
        // Look for revert reason and bubble it up if present
        if (returndata.length > 0) {
           // The easiest way to bubble the revert reason is using memory via assembly

           assembly {
             let returndata_size := mload(returndata)
             revert(add(32, returndata), returndata_size)
           }
        } else {
           revert(errorMessage);
        }
     }
   }
}

/**
 * @title SafeERC20
 * @dev Wrappers around ERC20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {

  using Address for address;

  function safeTransfer(IERC20 token, address to, uint256 value) internal {
    _callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
  }

  function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
    _callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
  }

  /**
    * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
    * on the return value: the return value is optional (but if data is returned, it must not be false).
    * @param token The token targeted by the call.
    * @param data The call data (encoded using abi.encode or one of its variants).
    */
  function _callOptionalReturn(IERC20 token, bytes memory data) private {
    // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
    // we're implementing it ourselves. We use {Address.functionCall} to perform this call, which verifies that
    // the target address contains contract code and also asserts for success in the low-level call.

    bytes memory returndata = address(token).functionCall(data, "SafeERC20: low-level call failed");
    if (returndata.length > 0) {
      // Return data is optional
      require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
    }
  }
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
  constructor (address owner_) {
    _owner = owner_;
    emit OwnershipTransferred(address(0), owner_);
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
 * @dev These functions deal with verification of Merkle trees (hash trees),
 */
library MerkleProof {
  /**
    * @dev Returns true if a `leaf` can be proved to be a part of a Merkle tree
    * defined by `root`. For this, a `proof` must be provided, containing
    * sibling hashes on the branch from the leaf to the root of the tree. Each
    * pair of leaves and each pair of pre-images are assumed to be sorted.
    */
  function verify(bytes32[] memory proof, bytes32 root, bytes32 leaf) internal pure returns (bool) {
    bytes32 computedHash = leaf;

    for (uint256 i = 0; i < proof.length; i++) {
      bytes32 proofElement = proof[i];

      if (computedHash <= proofElement) {
        // Hash(current computed hash + current element of the proof)
        computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
      } else {
        // Hash(current element of the proof + current computed hash)
        computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
      }
    }

    // Check if the computed hash (root) is equal to the provided root
    return computedHash == root;
  }
}

abstract contract Initializable {
  /**
  * @dev Indicates that the contract has been initialized.
  * @custom:oz-retyped-from bool
  */
  uint8 private _initialized;

  /**
  * @dev Indicates that the contract is in the process of being initialized.
  */
  bool private _initializing;

  /**
  * @dev A modifier that defines a protected initializer function that can be invoked at most once. In its scope,
  * `onlyInitializing` functions can be used to initialize parent contracts. Equivalent to `reinitializer(1)`.
  */
  modifier initializer() {
    bool isTopLevelCall = _setInitializedVersion(1);
    if (isTopLevelCall) {
        _initializing = true;
    }
    _;
    if (isTopLevelCall) {
        _initializing = false;
    }
  }

  /**
  * @dev A modifier that defines a protected reinitializer function that can be invoked at most once, and only if the
  * contract hasn't been initialized to a greater version before. In its scope, `onlyInitializing` functions can be
  * used to initialize parent contracts.
  *
  * `initializer` is equivalent to `reinitializer(1)`, so a reinitializer may be used after the original
  * initialization step. This is essential to configure modules that are added through upgrades and that require
  * initialization.
  *
  * Note that versions can jump in increments greater than 1; this implies that if multiple reinitializers coexist in
  * a contract, executing them in the right order is up to the developer or operator.
  */
  modifier reinitializer(uint8 version) {
    bool isTopLevelCall = _setInitializedVersion(version);
    if (isTopLevelCall) {
        _initializing = true;
    }
    _;
    if (isTopLevelCall) {
        _initializing = false;
    }
  }

  /**
  * @dev Modifier to protect an initialization function so that it can only be invoked by functions with the
  * {initializer} and {reinitializer} modifiers, directly or indirectly.
  */
  modifier onlyInitializing() {
    require(_initializing, "Initializable: contract is not initializing");
    _;
  }

  /**
  * @dev Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
  * Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
  * to any version. It is recommended to use this to lock implementation contracts that are designed to be called
  * through proxies.
  */
  function _disableInitializers() internal virtual {
    _setInitializedVersion(type(uint8).max);
  }

  function _setInitializedVersion(uint8 version) private returns (bool) {
    // If the contract is initializing we ignore whether _initialized is set in order to support multiple
    // inheritance patterns, but we only do this in the context of a constructor, and for the lowest level
    // of initializers, because in other contexts the contract may have been reentered.
    if (_initializing) {
        require(
            version == 1 && !Address.isContract(address(this)),
            "Initializable: contract is already initialized"
        );
        return false;
    } else {
        require(_initialized < version, "Initializable: contract is already initialized");
        _initialized = version;
        return true;
    }
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
abstract contract OwnableUpgradeable is Initializable, Context {
  address private _owner;

  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

  /**
  * @dev Initializes the contract setting the deployer as the initial owner.
  */
  function __Ownable_init() internal onlyInitializing {
    __Ownable_init_unchained();
  }

  function __Ownable_init_unchained() internal onlyInitializing {
    _transferOwnership(_msgSender());
  }

  /**
  * @dev Returns the address of the current owner.
  */
  function owner() public view virtual returns (address) {
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
  * @dev Leaves the contract without owner. It will not be possible to call
  * `onlyOwner` functions anymore. Can only be called by the current owner.
  *
  * NOTE: Renouncing ownership will leave the contract without an owner,
  * thereby removing any functionality that is only available to the owner.
  */
  function renounceOwnership() public virtual onlyOwner {
    _transferOwnership(address(0));
  }

  /**
  * @dev Transfers ownership of the contract to a new account (`newOwner`).
  * Can only be called by the current owner.
  */
  function transferOwnership(address newOwner) public virtual onlyOwner {
    require(newOwner != address(0), "Ownable: new owner is the zero address");
    _transferOwnership(newOwner);
  }

  /**
  * @dev Transfers ownership of the contract to a new account (`newOwner`).
  * Internal function without access restriction.
  */
  function _transferOwnership(address newOwner) internal virtual {
    address oldOwner = _owner;
    _owner = newOwner;
    emit OwnershipTransferred(oldOwner, newOwner);
  }

  /**
  * @dev This empty reserved space is put in place to allow future versions to add new
  * variables without shifting down storage in the inheritance chain.
  * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
  */
  uint256[49] private __gap;
}

/**
 * @dev https://eips.ethereum.org/EIPS/eip-1167[EIP 1167] is a standard for
 * deploying minimal proxy contracts, also known as "clones".
 *
 * > To simply and cheaply clone contract functionality in an immutable way, this standard specifies
 * > a minimal bytecode implementation that delegates all calls to a known, fixed address.
 *
 * The library includes functions to deploy a proxy using either `create` (traditional deployment) or `create2`
 * (salted deterministic deployment). It also includes functions to predict the addresses of clones deployed using the
 * deterministic method.
 *
 * _Available since v3.4._
 */
library Clones {
  /**
  * @dev Deploys and returns the address of a clone that mimics the behaviour of `implementation`.
  *
  * This function uses the create opcode, which should never revert.
  */
  function clone(address implementation) internal returns (address instance) {
    assembly {
      let ptr := mload(0x40)
      mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
      mstore(add(ptr, 0x14), shl(0x60, implementation))
      mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
      instance := create(0, ptr, 0x37)
    }
    require(instance != address(0), "ERC1167: create failed");
  }

  /**
  * @dev Deploys and returns the address of a clone that mimics the behaviour of `implementation`.
  *
  * This function uses the create2 opcode and a `salt` to deterministically deploy
  * the clone. Using the same `implementation` and `salt` multiple time will revert, since
  * the clones cannot be deployed twice at the same address.
  */
  function cloneDeterministic(address implementation, bytes32 salt) internal returns (address instance) {
    assembly {
      let ptr := mload(0x40)
      mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
      mstore(add(ptr, 0x14), shl(0x60, implementation))
      mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
      instance := create2(0, ptr, 0x37, salt)
    }
    require(instance != address(0), "ERC1167: create2 failed");
  }

  /**
  * @dev Computes the address of a clone deployed using {Clones-cloneDeterministic}.
  */
  function predictDeterministicAddress(
    address implementation,
    bytes32 salt,
    address deployer
  ) internal pure returns (address predicted) {
    assembly {
      let ptr := mload(0x40)
      mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
      mstore(add(ptr, 0x14), shl(0x60, implementation))
      mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf3ff00000000000000000000000000000000)
      mstore(add(ptr, 0x38), shl(0x60, deployer))
      mstore(add(ptr, 0x4c), salt)
      mstore(add(ptr, 0x6c), keccak256(ptr, 0x37))
      predicted := keccak256(add(ptr, 0x37), 0x55)
    }
  }

  /**
  * @dev Computes the address of a clone deployed using {Clones-cloneDeterministic}.
  */
  function predictDeterministicAddress(address implementation, bytes32 salt)
    internal
    view
    returns (address predicted)
  {
    return predictDeterministicAddress(implementation, salt, address(this));
  }
}

interface ICoin98Vault {
  function init() external virtual;
}

/**
 * @dev Coin98Vault contract to enable vesting funds to investors
 */
contract Coin98Vault is ICoin98Vault, OwnableUpgradeable, Payable {

  using SafeERC20 for IERC20;

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
      (bool success, bytes memory data) = _factory.call{value:finalFee, gas:gasLimit}("");
      require(success, "C98Vault: Unable to charge fee");
    }
    if(sendingAmount_ > 0) {
      IERC20(eventData.sendingToken).safeTransferFrom(_msgSender(), address(this), sendingAmount_);
    }
    if(eventData.receivingToken == address(0)) {
      recipient_.call{value:receivingAmount_, gas:gasLimit}("");
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
      destination_.call{value:amount_, gas:gasLimit}("");
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

  using SafeERC20 for IERC20;

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
    address vault = Clones.cloneDeterministic(_implementation, salt_);

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
      destination_.call{value:amount_, gas:_gasLimit}("");
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
