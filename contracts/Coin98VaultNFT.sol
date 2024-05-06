// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// import "./lib/Merkle.sol";
// import "./lib/Upgradable.sol";
import "./VaultNFT.sol";

interface ICoin98Vault {
    function init(address _token) external;
}

contract Coin98VaultV3 is ICoin98Vault, Payable, VaultNFT {
    using AdvancedERC20 for IERC20;

    address private _factory;
    address[] private _admins;
    mapping(address => bool) private _adminStatuses;

    // Index -> Schedule
    mapping(uint256 => Schedule) public schedules;

    address public token;

    struct Schedule {
        uint256 timestamp;
        uint256 percent;
    }

    event Claimed(uint256 indexed tokenId, uint256 indexed scheduleIndex, uint256 amount);

    /// @dev Initial vault
    function init(address _token) external initializer {
        __Ownable_init();
        __VaultNFT_init();
        token = _token;
        _factory = msg.sender;
    }

    /// @dev Access Control, only owner and admins are able to access the specified function
    modifier onlyAdmin() {
        require(owner() == _msgSender() || _adminStatuses[_msgSender()], "Ownable: caller is not an admin");
        _;
    }

    function claim(uint256 tokenId, uint256 scheduleIndex) external {
        require(ownerOf(tokenId) == msg.sender, "Coin98Vault: Not owner of token");
        require(_exists(tokenId), "Coin98Vault: Token not exist");
        require(schedules[scheduleIndex].timestamp <= block.timestamp, "Coin98Vault: Schedule not available");
        require(!BitMaps.get(claimedSchedules[tokenId], scheduleIndex), "Coin98Vault: Already claimed");

        BitMaps.setTo(claimedSchedules[tokenId], scheduleIndex, true);

        uint256 amount = (totalAlloc[tokenId] * schedules[scheduleIndex].percent) / 100;

        IERC20(token).safeTransfer(msg.sender, amount);

        claimedAlloc[tokenId] += amount;

        emit Claimed(tokenId, scheduleIndex, amount);
    }

    // GETTERS

    /// @dev returns current admins who can manage the vault
    function admins() public view returns (address[] memory) {
        return _admins;
    }

    /// @dev address of the factory
    function factory() public view returns (address) {
        return _factory;
    }
}
