// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./Common.sol";
import "./Module.sol";

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
