// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// Interfaces
import "./interfaces/ICoin98VaultNft.sol";
import "./interfaces/IVaultNft.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/IVaultConfig.sol";
import "./interfaces/IVRC725.sol";

// Libraries
import "./libraries/AdvancedERC20.sol";
import "./libraries/Payable.sol";
import "./libraries/OwnableUpgradeable.sol";
import "./libraries/BitMaps.sol";
import "./libraries/Initializable.sol";
import "./libraries/Merkle.sol";

contract Coin98VaultNft is ICoin98VaultNft, Payable, OwnableUpgradeable {
    using AdvancedERC20 for IERC20;

    address private _factory;
    address[] private _admins;
    mapping(address => bool) private _adminStatuses;

    // TokenID -> claimedSchedules
    mapping(uint256 => BitMaps.BitMap) private claimedSchedules; // Store claimed schedules.

    // TokenID -> Allocation
    mapping(uint256 => Allocation) public allocs;

    // Index -> Schedule
    Schedule[] public schedules;

    // Merkle root
    bytes32 public merkleRoot;

    address public token;
    address public vaultNft;
    address public WETH_ADDRESS;

    struct Allocation {
        uint256 claimedAlloc;
        uint256 totalAlloc;
    }

    event Minted(address indexed to, uint256 indexed tokenId, uint256 totalAlloc);
    event Claimed(uint256 indexed tokenId, uint256 indexed scheduleIndex, uint256 amount);
    event Withdrawn(address indexed owner, address indexed recipient, address indexed token, uint256 value);

    /// @dev Initial vault
    function __Coin98VaultNft_init(InitParams memory params) external initializer {
        __Ownable_init();

        token = params.token;
        vaultNft = params.nft;
        merkleRoot = params.merkleRoot;
        WETH_ADDRESS = params.weth;

        for (uint256 i = 0; i < params.schedules.length; i++) {
            schedules.push(params.schedules[i]);
        }

        _factory = msg.sender;
    }

    /// @dev Access Control, only owner and admins are able to access the specified function
    modifier onlyAdmin() {
        require(owner() == _msgSender() || _adminStatuses[_msgSender()], "Ownable: caller is not an admin");
        _;
    }

    function mint(bytes32[] calldata proofs, address to, uint256 tokenId, uint256 _totalAlloc) external {
        bytes32 leaf = keccak256(abi.encodePacked(to, tokenId, _totalAlloc));
        require(MerkleProof.verify(proofs, merkleRoot, leaf), "Coin98Vault: Invalid proof");

        IVaultNft(vaultNft).mint(to, tokenId);

        allocs[tokenId].totalAlloc = _totalAlloc;

        emit Minted(to, tokenId, _totalAlloc);
    }

    function claim(uint256 tokenId, uint256 scheduleIndex) external {
        require(IVaultNft(vaultNft).ownerOf(tokenId) == msg.sender, "Coin98Vault: Not owner of token");
        require(schedules[scheduleIndex].timestamp <= block.timestamp, "Coin98Vault: Schedule not available");
        require(!BitMaps.get(claimedSchedules[tokenId], scheduleIndex), "Coin98Vault: Already claimed");

        BitMaps.setTo(claimedSchedules[tokenId], scheduleIndex, true);

        uint256 amount = (allocs[tokenId].totalAlloc * schedules[scheduleIndex].percent) / 100;

        _transferOrUnwrapTo(IERC20(token), msg.sender, amount);

        allocs[tokenId].claimedAlloc += amount;

        emit Claimed(tokenId, scheduleIndex, amount);
    }

    /**
     * @notice Transfer or unwrap the native token
     * @param token_ Address of the native token
     * @param recipient Address of the recipient
     * @param amount Amount to transfer
     */
    function _transferOrUnwrapTo(IERC20 token_, address recipient, uint256 amount) internal {
        if (address(token) == WETH_ADDRESS) {
            IWETH(WETH_ADDRESS).withdraw(amount);
            payable(recipient).transfer(amount);
        } else {
            token_.transfer(recipient, amount);
        }
    }

    /// @dev withdraw the token in the vault, no limit
    /// @param token_ address of the token, use address(0) to withdraw gas token
    /// @param destination_ recipient address to receive the fund
    /// @param amount_ amount of fund to withdaw
    function withdraw(address token_, address destination_, uint256 amount_) public onlyAdmin {
        require(destination_ != address(0), "C98Vault: Destination is zero address");

        uint256 availableAmount;
        if (token_ == address(0)) {
            availableAmount = address(this).balance;
        } else {
            availableAmount = IERC20(token_).balanceOf(address(this));
        }

        require(amount_ <= availableAmount, "C98Vault: Not enough balance");

        uint256 gasLimit = IVaultConfig(_factory).gasLimit();

        _transferOrUnwrapTo(IERC20(token_), destination_, amount_);

        emit Withdrawn(_msgSender(), destination_, token_, amount_);
    }

    /// @dev withdraw NFT from contract
    /// @param token_ address of the token, use address(0) to withdraw gas token
    /// @param destination_ recipient address to receive the fund
    /// @param tokenId_ ID of NFT to withdraw
    function withdrawNft(address token_, address destination_, uint256 tokenId_) public onlyAdmin {
        require(destination_ != address(0), "C98Vault: destination is zero address");

        IVRC725(token_).transferFrom(address(this), destination_, tokenId_);

        emit Withdrawn(_msgSender(), destination_, token_, 1);
    }

    // SETTERS
    function setNft(address _vaultNft) external onlyAdmin {
        vaultNft = _vaultNft;
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

    function getSchedules() public view returns (Schedule[] memory) {
        return schedules;
    }
}
