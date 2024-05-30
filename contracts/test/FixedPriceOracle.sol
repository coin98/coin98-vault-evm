// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "../interfaces/IPriceAggregator.sol";
import "../libraries/Ownable.sol";

contract FixedPriceOracle is Ownable, IPriceAggregator {
    uint8 private _decimals;
    int256 private _latestPrice;

    constructor() Ownable(msg.sender) {}

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function latestAnswer() external view override returns (int256) {
        return _latestPrice;
    }

    function updatePrice(int256 price, uint8 decimals_) external onlyOwner {
        _latestPrice = price;
        _decimals = decimals_;
    }
}
