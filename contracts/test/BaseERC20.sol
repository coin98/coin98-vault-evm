//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

import "./interfaces/IERC20Metadata.sol";

contract BaseERC20 is IERC20Metadata {

  string private _name;
  string private _symbol;
  uint8 private _decimals;

  constructor(string memory name_, string memory symbol_, uint8 decimals_) {
    _name = name_;
    _symbol = symbol_;
    _decimals = decimals_;
  }

  /**
   * @dev Returns the name of the token.
   */
  function name() public override view returns (string memory) {
    return _name;
  }

  /**
   * @dev Returns the symbol of the token.
   */
  function symbol() public override view returns (string memory) {
    return _symbol;
  }

  /**
   * @dev Returns the decimals places of the token.
   */
  function decimals() public override view returns (uint8) {
    return _decimals;
  }
}